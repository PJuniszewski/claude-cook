/**
 * Artifact Indexer for cook analytics
 *
 * Scans cook/*.cook.md files and builds a searchable index
 * with metadata extraction for analytics and similarity matching.
 */

const fs = require('fs');
const path = require('path');
const { parseArtifact, parseHeader, parseSections } = require('./artifactParser');

/**
 * Scan directory for cook artifacts
 *
 * @param {string} cookDir - Path to cook directory
 * @returns {string[]} Array of artifact file paths
 */
function scanArtifacts(cookDir) {
  const resolvedDir = path.resolve(cookDir);

  if (!fs.existsSync(resolvedDir)) {
    return [];
  }

  return fs.readdirSync(resolvedDir)
    .filter(f => f.endsWith('.cook.md'))
    .map(f => path.join(resolvedDir, f))
    .sort((a, b) => {
      // Sort by date in filename (newer first)
      const dateA = extractDateFromFilename(a);
      const dateB = extractDateFromFilename(b);
      if (dateA && dateB) return dateB.localeCompare(dateA);
      return a.localeCompare(b);
    });
}

/**
 * Extract date from artifact filename
 * @param {string} filename
 * @returns {string|null}
 */
function extractDateFromFilename(filename) {
  const basename = path.basename(filename);
  const dateMatch = basename.match(/\.(\d{4}-\d{2}-\d{2})\.cook\.md$/);
  return dateMatch ? dateMatch[1] : null;
}

/**
 * Extract slug from artifact filename
 * @param {string} filename
 * @returns {string}
 */
function extractSlugFromFilename(filename) {
  const basename = path.basename(filename);
  const match = basename.match(/^(.+)\.\d{4}-\d{2}-\d{2}\.cook\.md$/);
  return match ? match[1] : basename.replace('.cook.md', '');
}

/**
 * Extract files mentioned in implementation plan
 *
 * @param {Map<string, string>} sections - Parsed sections
 * @returns {string[]} List of file paths mentioned
 */
function extractFilesTouched(sections) {
  const files = new Set();

  // Look in Implementation Plan section
  const implSection = sections.get('Implementation Plan') || '';
  const patchSection = sections.get('Patch Plan') || '';
  const combined = implSection + '\n' + patchSection;

  // Match file paths: various patterns
  const patterns = [
    /`([^`]+\.[a-z]{2,4})`/g,           // `file.ext`
    /^[-*]\s*`?([^\s`]+\.[a-z]{2,4})`?/gm,  // - file.ext or * file.ext
    /\|\s*`?([^\s|`]+\.[a-z]{2,4})`?\s*\|/g  // | file.ext |
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(combined)) !== null) {
      const file = match[1].trim();
      // Filter out common non-file patterns
      if (!file.includes('http') && !file.startsWith('#')) {
        files.add(file);
      }
    }
  }

  return Array.from(files);
}

/**
 * Extract risk level from artifact
 *
 * @param {Map<string, string>} sections - Parsed sections
 * @returns {string} Risk level: low, medium, high, or unknown
 */
function extractRiskLevel(sections) {
  const securitySection = sections.get('Security Review') ||
                          sections.get('Security Status') || '';

  const riskMatch = securitySection.match(/Risk level:\s*(low|medium|high)/i);
  if (riskMatch) {
    return riskMatch[1].toLowerCase();
  }

  // Infer from other signals
  const blastRadius = sections.get('Blast Radius & Rollout') || '';
  if (blastRadius.toLowerCase().includes('high')) return 'high';
  if (blastRadius.toLowerCase().includes('medium')) return 'medium';

  return 'unknown';
}

/**
 * Extract blockers from artifact
 *
 * @param {string} content - Raw content
 * @param {Map<string, string>} sections - Parsed sections
 * @returns {Object[]} Array of blocker info
 */
function extractBlockers(content, sections) {
  const blockers = [];

  // Check for blocked status
  const statusMatch = content.match(/^## Status\s*\n+blocked/mi);
  if (statusMatch) {
    // Look for blocker details
    const blockerMatch = content.match(/blocked by[:\s]+(.+)/i);
    if (blockerMatch) {
      blockers.push({
        type: 'status',
        reason: blockerMatch[1].trim()
      });
    }
  }

  // Check for needs-more-cooking with reason
  const needsMoreMatch = content.match(/^## Status\s*\n+needs-more-cooking/mi);
  if (needsMoreMatch) {
    const reasonMatch = content.match(/reason:\s*(.+)/i);
    blockers.push({
      type: 'needs-more-cooking',
      reason: reasonMatch ? reasonMatch[1].trim() : 'unspecified'
    });
  }

  // Extract chef blockers from decision log
  const decisionLog = sections.get('Decision Log') || '';
  const chefBlockerRegex = /\|\s*\d{4}-\d{2}-\d{2}\s*\|[^|]*blocked[^|]*\|([^|]+)\|/gi;
  let match;
  while ((match = chefBlockerRegex.exec(decisionLog)) !== null) {
    blockers.push({
      type: 'chef',
      reason: match[1].trim()
    });
  }

  return blockers;
}

/**
 * Extract pre-mortem scenarios from artifact
 *
 * @param {Map<string, string>} sections - Parsed sections
 * @returns {Object[]} Array of pre-mortem scenarios
 */
function extractPremortem(sections) {
  const scenarios = [];
  const section = sections.get('Pre-mortem (3 scenarios required)') ||
                  sections.get('Pre-mortem') ||
                  sections.get('Risk Management') || '';

  // Match numbered scenarios with mitigation
  const scenarioRegex = /\|\s*(\d+)\s*\|([^|]+)\|[^|]*\|[^|]*\|([^|]+)\|/g;
  let match;
  while ((match = scenarioRegex.exec(section)) !== null) {
    scenarios.push({
      id: parseInt(match[1]),
      risk: match[2].trim(),
      mitigation: match[3].trim()
    });
  }

  // Also match bullet format: 1. <scenario> -> mitigation: <action>
  const bulletRegex = /^\d+\.\s+\*\*?([^*]+)\*\*?\s*-?>?\s*mitigation:\s*(.+)$/gim;
  while ((match = bulletRegex.exec(section)) !== null) {
    scenarios.push({
      risk: match[1].trim(),
      mitigation: match[2].trim()
    });
  }

  return scenarios;
}

/**
 * Extract decisions from decision log
 *
 * @param {Map<string, string>} sections - Parsed sections
 * @returns {Object[]} Array of decisions
 */
function extractDecisions(sections) {
  const decisions = [];
  const log = sections.get('Decision Log') || '';

  // Match table rows: | date | decision | rationale |
  // Also handle: | date | phase | decision | rationale |
  const rowRegex = /\|\s*(\d{4}-\d{2}-\d{2})\s*\|([^|]+)\|([^|]+)\|([^|]*)?\|?/g;
  let match;
  while ((match = rowRegex.exec(log)) !== null) {
    const hasPhase = match[4] !== undefined && match[4].trim() !== '';
    decisions.push({
      date: match[1],
      phase: hasPhase ? match[2].trim() : null,
      decision: hasPhase ? match[3].trim() : match[2].trim(),
      rationale: hasPhase ? match[4].trim() : match[3].trim()
    });
  }

  return decisions;
}

/**
 * Index a single artifact file
 *
 * @param {string} filePath - Path to artifact file
 * @returns {Object} Indexed artifact metadata
 */
function indexArtifact(filePath) {
  const artifact = parseArtifact(filePath);

  return {
    // Identity
    path: artifact.path,
    filename: artifact.filename,
    slug: extractSlugFromFilename(artifact.filename),
    date: artifact.date,

    // Status
    status: artifact.header.status || 'unknown',
    mode: artifact.header.mode || 'unknown',

    // Metadata
    title: artifact.header.title,
    owner: artifact.header.owner,

    // Analysis
    filesTouched: extractFilesTouched(artifact.sections),
    riskLevel: extractRiskLevel(artifact.sections),
    blockers: extractBlockers(artifact.raw, artifact.sections),
    premortem: extractPremortem(artifact.sections),
    decisions: extractDecisions(artifact.sections),

    // Timestamps
    indexedAt: new Date().toISOString()
  };
}

/**
 * Build complete index of all artifacts
 *
 * @param {string} cookDir - Path to cook directory
 * @returns {Object} Complete index
 */
function buildIndex(cookDir) {
  const artifactPaths = scanArtifacts(cookDir);
  const artifacts = [];
  const errors = [];

  for (const filePath of artifactPaths) {
    try {
      artifacts.push(indexArtifact(filePath));
    } catch (err) {
      errors.push({
        file: filePath,
        error: err.message
      });
    }
  }

  return {
    version: '1.0.0',
    generatedAt: new Date().toISOString(),
    cookDir: path.resolve(cookDir),
    artifacts,
    errors,
    stats: {
      total: artifacts.length,
      byStatus: countBy(artifacts, a => a.status),
      byMode: countBy(artifacts, a => a.mode),
      byRisk: countBy(artifacts, a => a.riskLevel)
    }
  };
}

/**
 * Count items by a key function
 *
 * @param {Array} items
 * @param {Function} keyFn
 * @returns {Object}
 */
function countBy(items, keyFn) {
  const counts = {};
  for (const item of items) {
    const key = keyFn(item) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

/**
 * Save index to file
 *
 * @param {Object} index - Index object
 * @param {string} outputPath - Output file path
 */
function saveIndex(index, outputPath) {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, JSON.stringify(index, null, 2));
}

/**
 * Load index from file
 *
 * @param {string} indexPath - Path to index file
 * @returns {Object|null} Index object or null if not found
 */
function loadIndex(indexPath) {
  if (!fs.existsSync(indexPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
}

module.exports = {
  scanArtifacts,
  extractSlugFromFilename,
  extractDateFromFilename,
  extractFilesTouched,
  extractRiskLevel,
  extractBlockers,
  extractPremortem,
  extractDecisions,
  indexArtifact,
  buildIndex,
  saveIndex,
  loadIndex,
  countBy
};
