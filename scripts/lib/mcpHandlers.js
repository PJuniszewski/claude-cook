/**
 * MCP Handlers for Cook Dashboard
 *
 * Implements tool handlers for the MCP server.
 */

const fs = require('fs');
const path = require('path');
const { loadIndex, buildIndex, saveIndex } = require('./indexer');
const { parseArtifact } = require('./artifactParser');
const { searchArtifacts } = require('./analytics');

const DEFAULT_INDEX_PATH = '.claude/data/cook-index.json';
const DEFAULT_COOK_DIR = 'cook';

/**
 * Ensure fresh index
 */
function getIndex() {
  let index = loadIndex(DEFAULT_INDEX_PATH);
  if (!index) {
    index = buildIndex(DEFAULT_COOK_DIR);
    saveIndex(index, DEFAULT_INDEX_PATH);
  }
  return index;
}

/**
 * Tool: cook_list
 * List all cook artifacts with optional status filter
 */
function handleCookList(params = {}) {
  const { status, limit = 10 } = params;
  const index = getIndex();

  let artifacts = index.artifacts || [];

  // Filter by status if provided
  if (status) {
    artifacts = artifacts.filter(a => a.status === status);
  }

  // Limit results
  artifacts = artifacts.slice(0, limit);

  // Format output
  const result = {
    total: index.stats?.total || 0,
    filtered: artifacts.length,
    artifacts: artifacts.map(a => ({
      slug: a.slug,
      title: a.title,
      status: a.status,
      mode: a.mode,
      date: a.date,
      owner: a.owner
    }))
  };

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }
    ]
  };
}

/**
 * Tool: cook_status
 * Get detailed status of a specific artifact
 */
function handleCookStatus(params) {
  const { artifact } = params;

  if (!artifact) {
    return {
      content: [{ type: 'text', text: 'Error: artifact parameter required' }],
      isError: true
    };
  }

  // Find artifact
  const index = getIndex();
  const found = index.artifacts?.find(a =>
    a.slug === artifact ||
    a.filename === artifact ||
    a.path.includes(artifact)
  );

  if (!found) {
    return {
      content: [{ type: 'text', text: `Error: Artifact not found: ${artifact}` }],
      isError: true
    };
  }

  // Load full artifact for details
  let details = { ...found };

  try {
    if (fs.existsSync(found.path)) {
      const parsed = parseArtifact(found.path);
      details.sections = Array.from(parsed.sections.keys());
      details.hasPreMortem = parsed.sections.has('Pre-mortem');
      details.hasTestPlan = parsed.sections.has('QA Plan');
    }
  } catch (err) {
    // Continue with basic info
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(details, null, 2)
      }
    ]
  };
}

/**
 * Tool: cook_blockers
 * List all blocked artifacts with reasons
 */
function handleCookBlockers() {
  const index = getIndex();
  const blocked = (index.artifacts || []).filter(a =>
    a.status === 'blocked' ||
    a.status === 'needs-more-cooking' ||
    (a.blockers && a.blockers.length > 0)
  );

  const result = {
    count: blocked.length,
    blockers: blocked.map(a => ({
      slug: a.slug,
      title: a.title,
      status: a.status,
      blockers: a.blockers || [],
      date: a.date
    }))
  };

  return {
    content: [
      {
        type: 'text',
        text: blocked.length === 0
          ? 'No blocked artifacts. Kitchen is running smoothly!'
          : JSON.stringify(result, null, 2)
      }
    ]
  };
}

/**
 * Tool: cook_search
 * Search artifacts by keyword
 */
function handleCookSearch(params) {
  const { query } = params;

  if (!query) {
    return {
      content: [{ type: 'text', text: 'Error: query parameter required' }],
      isError: true
    };
  }

  const index = getIndex();
  const results = searchArtifacts(query, { index, limit: 10 });

  return {
    content: [
      {
        type: 'text',
        text: results.length === 0
          ? `No artifacts found matching: ${query}`
          : JSON.stringify({
              query,
              count: results.length,
              results: results.map(a => ({
                slug: a.slug,
                title: a.title,
                status: a.status,
                date: a.date
              }))
            }, null, 2)
      }
    ]
  };
}

/**
 * Tool definitions for MCP
 */
const TOOLS = [
  {
    name: 'cook_list',
    description: 'List all cook artifacts with status. Use to see what features are cooking.',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Filter by status (raw, cooking, blocked, well-done, ready-for-merge, plated)'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 10)'
        }
      }
    }
  },
  {
    name: 'cook_status',
    description: 'Get detailed status of a specific cook artifact.',
    inputSchema: {
      type: 'object',
      properties: {
        artifact: {
          type: 'string',
          description: 'Artifact slug, filename, or path'
        }
      },
      required: ['artifact']
    }
  },
  {
    name: 'cook_blockers',
    description: 'List all blocked artifacts with their blockers. Use to see what is stuck.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'cook_search',
    description: 'Search cook artifacts by keyword.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search keyword'
        }
      },
      required: ['query']
    }
  }
];

/**
 * Handle tool call
 */
function handleToolCall(name, params) {
  switch (name) {
    case 'cook_list':
      return handleCookList(params);
    case 'cook_status':
      return handleCookStatus(params);
    case 'cook_blockers':
      return handleCookBlockers();
    case 'cook_search':
      return handleCookSearch(params);
    default:
      return {
        content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        isError: true
      };
  }
}

module.exports = {
  TOOLS,
  handleToolCall,
  handleCookList,
  handleCookStatus,
  handleCookBlockers,
  handleCookSearch
};
