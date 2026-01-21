/**
 * Drift Detector for Sous Chef
 *
 * Compares implementation (actual files changed) against the artifact plan.
 * Detects scope creep, missing changes, and unplanned modifications.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { parseArtifact } = require('./artifactParser');

/**
 * Load and parse artifact plan
 *
 * @param {string} artifactPath - Path to cook artifact
 * @returns {Object} Parsed artifact with planned files
 */
function loadArtifactPlan(artifactPath) {
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}`);
  }

  // parseArtifact expects a file path, not content
  const artifact = parseArtifact(artifactPath);

  // Extract planned files from the raw content
  const plannedFiles = extractPlannedFiles(artifact.raw);

  return {
    ...artifact,
    plannedFiles,
    path: artifactPath
  };
}

/**
 * Extract planned files from artifact content
 *
 * @param {string} content - Artifact content
 * @returns {string[]} List of planned file paths
 */
function extractPlannedFiles(content) {
  const files = new Set();

  // Pattern 1: Files to modify/create tables
  // | `file/path.js` | ... |
  const tableFilePattern = /\|\s*`([^`]+)`\s*\|/g;
  let match;
  while ((match = tableFilePattern.exec(content)) !== null) {
    const filePath = match[1].trim();
    if (filePath.includes('/') || filePath.includes('.')) {
      files.add(filePath);
    }
  }

  // Pattern 2: Bullet points with file paths
  // - file/path.js - description
  // - `file/path.js` - description
  const bulletFilePattern = /^[\s-*]+`?([a-zA-Z0-9_./\-]+\.[a-zA-Z0-9]+)`?\s*[-–—]/gm;
  while ((match = bulletFilePattern.exec(content)) !== null) {
    files.add(match[1].trim());
  }

  // Pattern 3: Files in code blocks with paths
  // scripts/lib/something.js
  const pathPattern = /(?:^|\s)((?:scripts|src|lib|\.claude|test|docs)\/[a-zA-Z0-9_./\-]+\.[a-zA-Z0-9]+)/gm;
  while ((match = pathPattern.exec(content)) !== null) {
    files.add(match[1].trim());
  }

  return Array.from(files);
}

/**
 * Get files changed in a commit range or PR
 *
 * @param {string} range - Git commit range (e.g., 'main..feature-branch')
 * @returns {string[]} List of changed files
 */
function getImplementedFiles(range) {
  try {
    const output = execFileSync('git', [
      'diff',
      '--name-only',
      range
    ], { encoding: 'utf8' }).trim();

    return output ? output.split('\n') : [];
  } catch (err) {
    // Try as single commit
    try {
      const output = execFileSync('git', [
        'diff-tree',
        '--no-commit-id',
        '--name-only',
        '-r',
        range
      ], { encoding: 'utf8' }).trim();

      return output ? output.split('\n') : [];
    } catch (innerErr) {
      return [];
    }
  }
}

/**
 * Get files changed since a specific date
 *
 * @param {string} since - Date string (e.g., '2026-01-01')
 * @returns {string[]} List of changed files
 */
function getFilesSince(since) {
  try {
    const output = execFileSync('git', [
      'log',
      '--since', since,
      '--name-only',
      '--pretty=format:'
    ], { encoding: 'utf8' }).trim();

    if (!output) return [];

    // Deduplicate files
    const files = new Set(output.split('\n').filter(f => f.trim()));
    return Array.from(files);
  } catch (err) {
    return [];
  }
}

/**
 * Normalize file path for comparison
 *
 * @param {string} filePath - File path
 * @returns {string} Normalized path
 */
function normalizePath(filePath) {
  return filePath.toLowerCase().replace(/\\/g, '/');
}

/**
 * Check if two file paths match (fuzzy)
 *
 * @param {string} planned - Planned file path
 * @param {string} implemented - Implemented file path
 * @returns {boolean} True if paths match
 */
function pathsMatch(planned, implemented) {
  const normPlanned = normalizePath(planned);
  const normImpl = normalizePath(implemented);

  // Exact match
  if (normPlanned === normImpl) return true;

  // One contains the other
  if (normPlanned.includes(normImpl) || normImpl.includes(normPlanned)) return true;

  // Same filename in different locations
  const plannedName = path.basename(normPlanned);
  const implName = path.basename(normImpl);
  if (plannedName === implName) return true;

  return false;
}

/**
 * Detect drift between planned and implemented files
 *
 * @param {string[]} planned - Planned file paths
 * @param {string[]} implemented - Actually changed file paths
 * @returns {Object} Drift analysis
 */
function detectDrift(planned, implemented) {
  const drift = {
    planned: planned.length,
    implemented: implemented.length,
    matched: [],
    unplanned: [],
    missing: [],
    hasDrift: false
  };

  const matchedPlanned = new Set();
  const matchedImpl = new Set();

  // Find matches
  for (const p of planned) {
    for (const i of implemented) {
      if (pathsMatch(p, i)) {
        drift.matched.push({ planned: p, implemented: i });
        matchedPlanned.add(p);
        matchedImpl.add(i);
      }
    }
  }

  // Find unplanned (scope creep)
  for (const i of implemented) {
    if (!matchedImpl.has(i)) {
      drift.unplanned.push(i);
    }
  }

  // Find missing (not implemented)
  for (const p of planned) {
    if (!matchedPlanned.has(p)) {
      drift.missing.push(p);
    }
  }

  drift.hasDrift = drift.unplanned.length > 0 || drift.missing.length > 0;

  return drift;
}

/**
 * Analyze drift for an artifact
 *
 * @param {string} artifactPath - Path to artifact
 * @param {Object} options - Analysis options
 * @returns {Object} Full drift analysis
 */
function analyzeDrift(artifactPath, options = {}) {
  const artifact = loadArtifactPlan(artifactPath);

  let implemented;
  if (options.range) {
    implemented = getImplementedFiles(options.range);
  } else if (options.since) {
    implemented = getFilesSince(options.since);
  } else if (artifact.date) {
    // Use artifact date as default
    implemented = getFilesSince(artifact.date);
  } else {
    // Default to last 10 commits
    implemented = getImplementedFiles('HEAD~10..HEAD');
  }

  const drift = detectDrift(artifact.plannedFiles, implemented);

  // Extract slug from filename
  const slug = artifact.filename ? artifact.filename.replace('.cook.md', '') : path.basename(artifactPath, '.cook.md');

  return {
    artifact: {
      path: artifactPath,
      slug: slug,
      title: artifact.header ? artifact.header.title : null,
      date: artifact.date,
      status: artifact.header ? artifact.header.status : null
    },
    plannedFiles: artifact.plannedFiles,
    implementedFiles: implemented,
    drift
  };
}

/**
 * Format drift report for console
 *
 * @param {Object} analysis - Drift analysis result
 * @returns {string} Formatted report
 */
function formatDriftReport(analysis) {
  const lines = [];
  const { artifact, drift } = analysis;

  lines.push('');
  lines.push('======================================');
  lines.push('  SOUS CHEF - Drift Detection Report');
  lines.push('======================================');
  lines.push('');
  lines.push(`Artifact: ${artifact.slug}`);
  lines.push(`Status:   ${artifact.status}`);
  lines.push(`Date:     ${artifact.date}`);
  lines.push('');

  if (!drift.hasDrift) {
    lines.push('No drift detected! Implementation matches plan.');
    lines.push('');
    lines.push(`Planned files:     ${drift.planned}`);
    lines.push(`Implemented files: ${drift.implemented}`);
    lines.push(`Matched:           ${drift.matched.length}`);
    lines.push('');
    return lines.join('\n');
  }

  lines.push('DRIFT DETECTED');
  lines.push('');

  if (drift.unplanned.length > 0) {
    lines.push(`Unplanned changes (scope creep): ${drift.unplanned.length}`);
    for (const file of drift.unplanned.slice(0, 10)) {
      lines.push(`  + ${file}`);
    }
    if (drift.unplanned.length > 10) {
      lines.push(`  ... and ${drift.unplanned.length - 10} more`);
    }
    lines.push('');
  }

  if (drift.missing.length > 0) {
    lines.push(`Missing from implementation: ${drift.missing.length}`);
    for (const file of drift.missing.slice(0, 10)) {
      lines.push(`  - ${file}`);
    }
    if (drift.missing.length > 10) {
      lines.push(`  ... and ${drift.missing.length - 10} more`);
    }
    lines.push('');
  }

  if (drift.matched.length > 0) {
    lines.push(`Matched (as planned): ${drift.matched.length}`);
    for (const { planned } of drift.matched.slice(0, 5)) {
      lines.push(`  = ${planned}`);
    }
    if (drift.matched.length > 5) {
      lines.push(`  ... and ${drift.matched.length - 5} more`);
    }
    lines.push('');
  }

  lines.push('--------------------------------------');
  lines.push('Recommendation: Review unplanned changes');
  lines.push('Consider updating artifact if changes are intentional');
  lines.push('');

  return lines.join('\n');
}

module.exports = {
  loadArtifactPlan,
  extractPlannedFiles,
  getImplementedFiles,
  getFilesSince,
  detectDrift,
  analyzeDrift,
  formatDriftReport,
  pathsMatch,
  normalizePath
};
