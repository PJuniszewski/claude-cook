#!/usr/bin/env node

/**
 * MCP Server for Cook Dashboard
 *
 * Provides cook artifact visibility via Model Context Protocol.
 * Uses stdio transport for Claude Code integration.
 *
 * Tools:
 *   - cook_list: List all artifacts
 *   - cook_status: Get artifact details
 *   - cook_blockers: List blocked items
 *   - cook_search: Search artifacts
 */

const readline = require('readline');
const { TOOLS, handleToolCall } = require('./lib/mcpHandlers');

// Server info
const SERVER_INFO = {
  name: 'cook-dashboard',
  version: '1.0.0',
  protocolVersion: '2024-11-05'
};

// Capabilities
const CAPABILITIES = {
  tools: {}
};

/**
 * Send JSON-RPC response
 */
function sendResponse(id, result) {
  const response = {
    jsonrpc: '2.0',
    id,
    result
  };
  console.log(JSON.stringify(response));
}

/**
 * Send JSON-RPC error
 */
function sendError(id, code, message) {
  const response = {
    jsonrpc: '2.0',
    id,
    error: { code, message }
  };
  console.log(JSON.stringify(response));
}

/**
 * Handle incoming JSON-RPC request
 */
function handleRequest(request) {
  const { id, method, params } = request;

  try {
    switch (method) {
      case 'initialize':
        sendResponse(id, {
          ...SERVER_INFO,
          capabilities: CAPABILITIES
        });
        break;

      case 'initialized':
        // Notification, no response needed
        break;

      case 'tools/list':
        sendResponse(id, { tools: TOOLS });
        break;

      case 'tools/call':
        const { name, arguments: args } = params || {};
        const result = handleToolCall(name, args || {});
        sendResponse(id, result);
        break;

      case 'resources/list':
        // No resources for now
        sendResponse(id, { resources: [] });
        break;

      case 'prompts/list':
        sendResponse(id, {
          prompts: [
            {
              name: 'whats_cooking',
              description: 'Get overview of all cooking activity',
              arguments: []
            },
            {
              name: 'show_blockers',
              description: 'List all blocked artifacts',
              arguments: []
            }
          ]
        });
        break;

      case 'prompts/get':
        const promptName = params?.name;
        if (promptName === 'whats_cooking') {
          sendResponse(id, {
            description: 'Overview of cooking activity',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: 'What cook artifacts are currently in progress? Use cook_list to check.'
                }
              }
            ]
          });
        } else if (promptName === 'show_blockers') {
          sendResponse(id, {
            description: 'Blocked artifacts',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: 'What artifacts are blocked? Use cook_blockers to check.'
                }
              }
            ]
          });
        } else {
          sendError(id, -32602, `Unknown prompt: ${promptName}`);
        }
        break;

      case 'ping':
        sendResponse(id, {});
        break;

      default:
        sendError(id, -32601, `Method not found: ${method}`);
    }
  } catch (err) {
    sendError(id, -32603, err.message);
  }
}

/**
 * Main server loop
 */
function main() {
  // Read from stdin line by line
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', (line) => {
    if (!line.trim()) return;

    try {
      const request = JSON.parse(line);
      handleRequest(request);
    } catch (err) {
      // Invalid JSON
      sendError(null, -32700, 'Parse error');
    }
  });

  rl.on('close', () => {
    process.exit(0);
  });

  // Log to stderr for debugging (won't interfere with MCP protocol)
  process.stderr.write('Cook Dashboard MCP Server started\n');
}

main();
