/**
 * Change Monitor for Sous Chef
 *
 * Detects commits that touch sensitive files without an associated cook artifact.
 * Alerts when changes slip through without proper planning.
 */

const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { loadIndex, buildIndex, saveIndex } = require('./indexer');

// Default sensitive file patterns
const DEFAULT_SENSITIVE_PATTERNS = [
  'src/auth',
  'src/security',
  'lib/auth',
  'lib/crypto',
  'api/auth',
  'middleware/auth',
  'config/security',
  '.env',
  'credentials',
  'secrets',
  'migrations/',
  'schema',
  'database',
  'payment',
  'billing',
  'subscription'
];

// Default paths
const DEFAULT_INDEX_PATH = '.claude/data/cook-index.json';
const DEFAULT_COOK_DIR = 'cook';

/**
 * Get list of sensitive file patterns
 *
 * @param {Object} config - Optional config with custom patterns
 * @returns {string[]} List of sensitive patterns
 */
function getSensitivePatterns(config = {}) {
  return config.sensitivePatterns || DEFAULT_SENSITIVE_PATTERNS;
}

/**
 * Check if a file path matches any sensitive pattern
 *
 * @param {string} filePath - File path to check
 * @param {string[]} patterns - Sensitive patterns
 * @returns {boolean} True if file is sensitive
 */
function isSensitiveFile(filePath, patterns) {
  const normalizedPath = filePath.toLowerCase();
  return patterns.some(pattern => normalizedPath.includes(pattern.toLowerCase()));
}

/**
 * Get commits in a range
 *
 * @param {string} since - Start commit/date (e.g., 'HEAD~10', '2026-01-01')
 * @param {string} until - End commit (default: HEAD)
 * @returns {Object[]} Array of commit objects
 */
function getCommits(since = 'HEAD~10', until = 'HEAD') {
  try {
    // Get commit hashes and messages
    const logOutput = execFileSync('git', [
      'log',
      '--pretty=format:%H|%s|%ai',
      `${since}..${until}`
    ], { encoding: 'utf8' }).trim();

    if (!logOutput) return [];

    return logOutput.split('\n').map(line => {
      const [hash, message, date] = line.split('|');
      return { hash, message, date };
    });
  } catch (err) {
    // If range doesn't work, try as count
    if (since.startsWith('HEAD~')) {
      try {
        const logOutput = execFileSync('git', [
          'log',
          '--pretty=format:%H|%s|%ai',
          since
        ], { encoding: 'utf8' }).trim();

        if (!logOutput) return [];

        return logOutput.split('\n').map(line => {
          const [hash, message, date] = line.split('|');
          return { hash, message, date };
        });
      } catch (innerErr) {
        return [];
      }
    }
    return [];
  }
}

/**
 * Get files changed in a commit
 *
 * @param {string} commitHash - Git commit hash
 * @returns {string[]} Array of file paths
 */
function getCommitFiles(commitHash) {
  try {
    const output = execFileSync('git', [
      'diff-tree',
      '--no-commit-id',
      '--name-only',
      '-r',
      commitHash
    ], { encoding: 'utf8' }).trim();

    return output ? output.split('\n') : [];
  } catch (err) {
    return [];
  }
}

/**
 * Check if a commit has an associated artifact
 *
 * @param {Object} commit - Commit object
 * @param {Object[]} artifacts - Indexed artifacts
 * @param {string[]} commitFiles - Files changed in commit
 * @returns {Object|null} Matching artifact or null
 */
function findArtifactForCommit(commit, artifacts, commitFiles) {
  // Check if commit message references an artifact slug
  for (const artifact of artifacts) {
    // Check if commit message mentions the artifact slug
    if (commit.message.toLowerCase().includes(artifact.slug.toLowerCase())) {
      return artifact;
    }

    // Check if artifact files overlap with commit files
    if (artifact.filesTouched && artifact.filesTouched.length > 0) {
      const artifactFiles = artifact.filesTouched.map(f => f.toLowerCase());
      const hasOverlap = commitFiles.some(cf =>
        artifactFiles.some(af =>
          cf.toLowerCase().includes(af) || af.includes(cf.toLowerCase())
        )
      );
      if (hasOverlap) {
        return artifact;
      }
    }
  }

  return null;
}

/**
 * Analyze commits for uncooked changes
 *
 * @param {Object} options
 * @param {string} options.since - Start point (default: HEAD~10)
 * @param {string} options.until - End point (default: HEAD)
 * @param {string[]} options.sensitivePatterns - Custom sensitive patterns
 * @returns {Object} Analysis result
 */
function analyzeCommits(options = {}) {
  const {
    since = 'HEAD~10',
    until = 'HEAD',
    sensitivePatterns = DEFAULT_SENSITIVE_PATTERNS,
    indexPath = DEFAULT_INDEX_PATH,
    cookDir = DEFAULT_COOK_DIR
  } = options;

  // Load or build index
  let index = loadIndex(indexPath);
  if (!index) {
    index = buildIndex(cookDir);
    saveIndex(index, indexPath);
  }

  const artifacts = index.artifacts || [];
  const commits = getCommits(since, until);

  const results = {
    totalCommits: commits.length,
    uncookedCommits: [],
    cookedCommits: [],
    sensitiveChanges: []
  };

  for (const commit of commits) {
    const files = getCommitFiles(commit.hash);
    const sensitiveFiles = files.filter(f => isSensitiveFile(f, sensitivePatterns));
    const artifact = findArtifactForCommit(commit, artifacts, files);

    if (artifact) {
      results.cookedCommits.push({
        commit,
        files,
        artifact: artifact.slug
      });
    } else if (sensitiveFiles.length > 0) {
      results.uncookedCommits.push({
        commit,
        files,
        sensitiveFiles
      });
      results.sensitiveChanges.push({
        commit,
        sensitiveFiles
      });
    }
  }

  return results;
}

/**
 * Format change monitor report for console
 *
 * @param {Object} results - Results from analyzeCommits
 * @returns {string} Formatted report
 */
function formatChangeReport(results) {
  const lines = [];

  lines.push('');
  lines.push('======================================');
  lines.push('  SOUS CHEF - Change Monitor Report');
  lines.push('======================================');
  lines.push('');

  if (results.uncookedCommits.length === 0) {
    lines.push('All clear! No uncooked sensitive changes detected.');
    lines.push('');
    lines.push(`Analyzed: ${results.totalCommits} commit(s)`);
    lines.push(`Cooked:   ${results.cookedCommits.length} commit(s) with artifacts`);
    lines.push('');
    return lines.join('\n');
  }

  lines.push(`Found ${results.uncookedCommits.length} commit(s) with uncooked sensitive changes:`);
  lines.push('');

  for (const { commit, sensitiveFiles } of results.uncookedCommits) {
    lines.push(`  ${commit.hash.substring(0, 7)} - ${commit.message.substring(0, 50)}`);
    lines.push(`    Date: ${commit.date}`);
    lines.push(`    Sensitive files:`);
    for (const file of sensitiveFiles.slice(0, 5)) {
      lines.push(`      - ${file}`);
    }
    if (sensitiveFiles.length > 5) {
      lines.push(`      ... and ${sensitiveFiles.length - 5} more`);
    }
    lines.push('');
  }

  lines.push('--------------------------------------');
  lines.push('Recommendation: Run /cook for these changes');
  lines.push('');

  return lines.join('\n');
}

module.exports = {
  getSensitivePatterns,
  isSensitiveFile,
  getCommits,
  getCommitFiles,
  findArtifactForCommit,
  analyzeCommits,
  formatChangeReport,
  DEFAULT_SENSITIVE_PATTERNS
};
