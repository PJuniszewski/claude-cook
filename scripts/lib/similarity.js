/**
 * Similarity Engine for Recipe Library
 *
 * Finds similar past artifacts during /cook to enable pattern reuse
 * and decision recall.
 */

const path = require('path');
const { buildIndex, loadIndex, saveIndex } = require('./indexer');

// Default paths
const DEFAULT_COOK_DIR = 'cook';
const DEFAULT_INDEX_PATH = '.claude/data/cook-index.json';

/**
 * Ensure index exists and is fresh
 *
 * @param {Object} options
 * @returns {Object} Index
 */
function ensureIndex(options = {}) {
  const cookDir = options.cookDir || DEFAULT_COOK_DIR;
  const indexPath = options.indexPath || DEFAULT_INDEX_PATH;

  let index = loadIndex(indexPath);

  // Check if rebuild needed
  if (!index || isIndexStale(index, cookDir)) {
    index = buildIndex(cookDir);
    saveIndex(index, indexPath);
  }

  return index;
}

/**
 * Check if index is stale
 *
 * @param {Object} index
 * @param {string} cookDir
 * @returns {boolean}
 */
function isIndexStale(index, cookDir) {
  const fs = require('fs');

  if (!index.generatedAt) return true;

  const indexTime = new Date(index.generatedAt).getTime();

  try {
    const resolvedDir = path.resolve(cookDir);
    if (!fs.existsSync(resolvedDir)) return false;

    const files = fs.readdirSync(resolvedDir).filter(f => f.endsWith('.cook.md'));
    for (const file of files) {
      const filePath = path.join(resolvedDir, file);
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs > indexTime) {
        return true;
      }
    }
  } catch (err) {
    return true;
  }

  return false;
}

/**
 * Calculate Jaccard similarity between two sets
 *
 * @param {Set|Array} setA
 * @param {Set|Array} setB
 * @returns {number} Similarity 0-1
 */
function jaccardSimilarity(setA, setB) {
  const a = new Set(setA);
  const b = new Set(setB);

  if (a.size === 0 && b.size === 0) return 0;

  const intersection = [...a].filter(x => b.has(x));
  const union = new Set([...a, ...b]);

  return intersection.length / union.size;
}

/**
 * Calculate title/keyword similarity
 *
 * @param {string} titleA
 * @param {string} titleB
 * @returns {number} Similarity 0-1
 */
function titleSimilarity(titleA, titleB) {
  if (!titleA || !titleB) return 0;

  // Extract keywords (words 4+ chars, lowercase)
  const extractKeywords = (text) => {
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter(w => w.length >= 4)
      .filter(w => !['with', 'from', 'that', 'this', 'have', 'been'].includes(w));
  };

  const keywordsA = new Set(extractKeywords(titleA));
  const keywordsB = new Set(extractKeywords(titleB));

  return jaccardSimilarity(keywordsA, keywordsB);
}

/**
 * Extract keywords from feature description
 *
 * @param {string} description
 * @returns {string[]}
 */
function extractKeywords(description) {
  if (!description) return [];

  return description
    .toLowerCase()
    .split(/\W+/)
    .filter(w => w.length >= 4)
    .filter(w => !['with', 'from', 'that', 'this', 'have', 'been', 'will', 'should', 'could', 'would'].includes(w));
}

/**
 * Find similar artifacts for a new feature
 *
 * @param {Object} options
 * @param {string} options.description - Feature description
 * @param {string[]} options.files - Files that will be touched (optional)
 * @param {string} options.exclude - Artifact slug to exclude (current artifact)
 * @param {number} options.limit - Max results (default: 3)
 * @param {number} options.minSimilarity - Min similarity % to include (default: 20)
 * @returns {Object[]} Similar artifacts with scores
 */
function findSimilarArtifacts(options = {}) {
  const {
    description = '',
    files = [],
    exclude = null,
    limit = 3,
    minSimilarity = 20
  } = options;

  const index = ensureIndex(options);

  if (!index.artifacts || index.artifacts.length === 0) {
    return [];
  }

  const keywords = extractKeywords(description);
  const fileSet = new Set(files.map(f => f.toLowerCase()));

  const results = [];

  for (const artifact of index.artifacts) {
    // Skip excluded artifact
    if (exclude && artifact.slug === exclude) continue;

    // Calculate similarity scores
    const fileSim = fileSet.size > 0
      ? jaccardSimilarity(fileSet, (artifact.filesTouched || []).map(f => f.toLowerCase()))
      : 0;

    const titleSim = titleSimilarity(description, artifact.title);

    const keywordSim = keywords.length > 0
      ? jaccardSimilarity(keywords, extractKeywords(artifact.title))
      : 0;

    // Weighted combined score
    // Files: 50%, Title: 30%, Keywords: 20%
    const combinedScore = (fileSim * 0.5) + (titleSim * 0.3) + (keywordSim * 0.2);
    const similarityPercent = Math.round(combinedScore * 100);

    if (similarityPercent >= minSimilarity) {
      results.push({
        artifact,
        similarity: similarityPercent,
        scores: {
          files: Math.round(fileSim * 100),
          title: Math.round(titleSim * 100),
          keywords: Math.round(keywordSim * 100)
        },
        matchingFiles: files.filter(f =>
          (artifact.filesTouched || []).some(af =>
            af.toLowerCase().includes(f.toLowerCase()) ||
            f.toLowerCase().includes(af.toLowerCase())
          )
        ),
        keyDecision: extractKeyDecision(artifact)
      });
    }
  }

  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity);

  return results.slice(0, limit);
}

/**
 * Extract the most relevant decision from an artifact
 *
 * @param {Object} artifact - Indexed artifact
 * @returns {string|null} Key decision or null
 */
function extractKeyDecision(artifact) {
  const decisions = artifact.decisions || [];

  if (decisions.length === 0) {
    return null;
  }

  // Prefer decisions with "selected", "chose", "use" in them
  const priorityKeywords = ['selected', 'chose', 'use', 'decided', 'approved'];

  for (const keyword of priorityKeywords) {
    const match = decisions.find(d =>
      d.decision && d.decision.toLowerCase().includes(keyword)
    );
    if (match) {
      return truncate(match.decision, 60);
    }
  }

  // Return the most recent non-trivial decision
  const meaningful = decisions.filter(d =>
    d.decision &&
    !d.decision.toLowerCase().includes('artifact created') &&
    !d.decision.toLowerCase().includes('complete')
  );

  if (meaningful.length > 0) {
    return truncate(meaningful[meaningful.length - 1].decision, 60);
  }

  return null;
}

/**
 * Truncate string to max length
 *
 * @param {string} str
 * @param {number} maxLen
 * @returns {string}
 */
function truncate(str, maxLen) {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

/**
 * Format similar artifacts for console display
 *
 * @param {Object[]} results - Results from findSimilarArtifacts
 * @returns {string} Formatted output
 */
function formatSimilarArtifacts(results) {
  if (results.length === 0) {
    return null;
  }

  const lines = [];
  lines.push('');
  lines.push('🔍 Similar dishes found in your kitchen:');
  lines.push('┌' + '─'.repeat(62) + '┐');

  for (let i = 0; i < results.length; i++) {
    const { artifact, similarity, matchingFiles, keyDecision } = results[i];

    if (i > 0) {
      lines.push('├' + '─'.repeat(62) + '┤');
    }

    // Line 1: Filename and similarity
    const filename = artifact.filename || `${artifact.slug}.cook.md`;
    lines.push(`│ ${i + 1}. ${truncate(filename, 45)} (${similarity}% similar)`.padEnd(63) + '│');

    // Line 2: Title
    const title = truncate(artifact.title || 'No title', 58);
    lines.push(`│    "${title}"`.padEnd(63) + '│');

    // Line 3: Files (if any)
    if (matchingFiles && matchingFiles.length > 0) {
      const filesStr = truncate(matchingFiles.join(', '), 50);
      lines.push(`│    Files: ${filesStr}`.padEnd(63) + '│');
    } else if (artifact.filesTouched && artifact.filesTouched.length > 0) {
      const filesStr = truncate(artifact.filesTouched.slice(0, 3).join(', '), 50);
      lines.push(`│    Files: ${filesStr}`.padEnd(63) + '│');
    }

    // Line 4: Key decision (if any)
    if (keyDecision) {
      lines.push(`│    Key decision: ${truncate(keyDecision, 42)}`.padEnd(63) + '│');
    }
  }

  lines.push('└' + '─'.repeat(62) + '┘');
  lines.push('💡 Consider reusing patterns from these artifacts.');
  lines.push('');

  return lines.join('\n');
}

/**
 * Get similar artifacts summary for SKILL.md integration
 *
 * @param {string} featureDescription - The feature being cooked
 * @param {string[]} filesToTouch - Files mentioned in the feature (optional)
 * @param {string} currentSlug - Current artifact slug to exclude
 * @returns {string|null} Formatted output or null if no matches
 */
function getSimilarDishesDisplay(featureDescription, filesToTouch = [], currentSlug = null) {
  const results = findSimilarArtifacts({
    description: featureDescription,
    files: filesToTouch,
    exclude: currentSlug,
    limit: 3,
    minSimilarity: 20
  });

  return formatSimilarArtifacts(results);
}

module.exports = {
  findSimilarArtifacts,
  formatSimilarArtifacts,
  getSimilarDishesDisplay,
  extractKeyDecision,
  extractKeywords,
  jaccardSimilarity,
  titleSimilarity,
  ensureIndex
};
