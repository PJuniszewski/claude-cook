/**
 * Analytics Engine for cook artifacts
 *
 * Calculates statistics and insights from indexed artifacts.
 */

const { countBy } = require('./indexer');

/**
 * Calculate basic statistics from index
 *
 * @param {Object} index - Artifact index
 * @param {Object} options - Options (dateRange, etc.)
 * @returns {Object} Statistics
 */
function calculateStats(index, options = {}) {
  let artifacts = index.artifacts || [];

  // Apply date filter if specified
  if (options.since) {
    const sinceDate = new Date(options.since);
    artifacts = artifacts.filter(a => {
      if (!a.date) return false;
      return new Date(a.date) >= sinceDate;
    });
  }

  if (options.until) {
    const untilDate = new Date(options.until);
    artifacts = artifacts.filter(a => {
      if (!a.date) return false;
      return new Date(a.date) <= untilDate;
    });
  }

  const total = artifacts.length;

  // Status breakdown
  const byStatus = countBy(artifacts, a => a.status);

  // Mode breakdown
  const byMode = countBy(artifacts, a => a.mode);

  // Risk breakdown
  const byRisk = countBy(artifacts, a => a.riskLevel);

  // Files most frequently touched
  const fileCounts = {};
  for (const artifact of artifacts) {
    for (const file of artifact.filesTouched || []) {
      fileCounts[file] = (fileCounts[file] || 0) + 1;
    }
  }
  const hotFiles = Object.entries(fileCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([file, count]) => ({ file, count }));

  // Blockers analysis
  const blockerCounts = {};
  const blockerReasons = [];
  for (const artifact of artifacts) {
    for (const blocker of artifact.blockers || []) {
      const type = blocker.type || 'unknown';
      blockerCounts[type] = (blockerCounts[type] || 0) + 1;
      if (blocker.reason) {
        blockerReasons.push({
          artifact: artifact.slug,
          type: blocker.type,
          reason: blocker.reason
        });
      }
    }
  }

  // Chef blocker breakdown (extract chef name from reason if present)
  const chefBlockers = {};
  for (const reason of blockerReasons) {
    const chefMatch = (reason.reason || '').match(/(\w+)_chef/i);
    if (chefMatch) {
      const chef = chefMatch[1].toLowerCase() + '_chef';
      chefBlockers[chef] = (chefBlockers[chef] || 0) + 1;
    }
  }

  // Pre-mortem analysis
  let totalPremortems = 0;
  let artifactsWithPremortem = 0;
  for (const artifact of artifacts) {
    const count = (artifact.premortem || []).length;
    totalPremortems += count;
    if (count > 0) artifactsWithPremortem++;
  }

  // Decision analysis
  let totalDecisions = 0;
  for (const artifact of artifacts) {
    totalDecisions += (artifact.decisions || []).length;
  }

  return {
    period: {
      since: options.since || null,
      until: options.until || null,
      label: getPeriodLabel(options.since)
    },
    total,
    byStatus,
    byMode,
    byRisk,
    hotFiles,
    blockers: {
      total: blockerReasons.length,
      byType: blockerCounts,
      byChef: chefBlockers,
      recent: blockerReasons.slice(0, 5)
    },
    premortem: {
      total: totalPremortems,
      artifactsWithPremortem,
      avgPerArtifact: total > 0 ? (totalPremortems / total).toFixed(1) : 0
    },
    decisions: {
      total: totalDecisions,
      avgPerArtifact: total > 0 ? (totalDecisions / total).toFixed(1) : 0
    }
  };
}

/**
 * Get human-readable period label
 *
 * @param {string} since - Since date
 * @returns {string} Period label
 */
function getPeriodLabel(since) {
  if (!since) return 'all time';

  const sinceDate = new Date(since);
  const now = new Date();
  const daysDiff = Math.floor((now - sinceDate) / (1000 * 60 * 60 * 24));

  if (daysDiff <= 7) return 'last 7 days';
  if (daysDiff <= 30) return 'last 30 days';
  if (daysDiff <= 90) return 'last 90 days';
  return `since ${since}`;
}

/**
 * Calculate completion rate
 *
 * @param {Object} stats - Statistics object
 * @returns {number} Completion rate percentage
 */
function calculateCompletionRate(stats) {
  const completed = (stats.byStatus['well-done'] || 0) +
                    (stats.byStatus['ready-for-merge'] || 0) +
                    (stats.byStatus['plated'] || 0);
  return stats.total > 0 ? Math.round((completed / stats.total) * 100) : 0;
}

/**
 * Calculate block rate
 *
 * @param {Object} stats - Statistics object
 * @returns {number} Block rate percentage
 */
function calculateBlockRate(stats) {
  const blocked = (stats.byStatus['blocked'] || 0) +
                  (stats.byStatus['needs-more-cooking'] || 0);
  return stats.total > 0 ? Math.round((blocked / stats.total) * 100) : 0;
}

/**
 * Find similar artifacts based on files touched
 *
 * @param {Object} index - Artifact index
 * @param {string[]} files - List of files to match
 * @param {Object} options - Options
 * @returns {Object[]} Similar artifacts with similarity scores
 */
function findSimilarByFiles(index, files, options = {}) {
  const limit = options.limit || 5;
  const exclude = options.exclude || [];

  const fileSet = new Set(files);
  const results = [];

  for (const artifact of index.artifacts || []) {
    if (exclude.includes(artifact.slug)) continue;

    const artifactFiles = new Set(artifact.filesTouched || []);
    const intersection = [...fileSet].filter(f => artifactFiles.has(f));
    const union = new Set([...fileSet, ...artifactFiles]);

    // Jaccard similarity
    const similarity = union.size > 0 ? intersection.length / union.size : 0;

    if (similarity > 0) {
      results.push({
        artifact,
        similarity: Math.round(similarity * 100),
        matchingFiles: intersection
      });
    }
  }

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit);
}

/**
 * Find artifacts by keyword search
 *
 * @param {Object} index - Artifact index
 * @param {string} query - Search query
 * @param {Object} options - Options
 * @returns {Object[]} Matching artifacts
 */
function searchArtifacts(index, query, options = {}) {
  const limit = options.limit || 10;
  const queryLower = query.toLowerCase();

  const results = [];

  for (const artifact of index.artifacts || []) {
    const matches = [];
    let score = 0;

    // Title match (highest weight)
    if (artifact.title && artifact.title.toLowerCase().includes(queryLower)) {
      score += 10;
      matches.push('title');
    }

    // Slug match
    if (artifact.slug && artifact.slug.toLowerCase().includes(queryLower)) {
      score += 5;
      matches.push('slug');
    }

    // Files match
    for (const file of artifact.filesTouched || []) {
      if (file.toLowerCase().includes(queryLower)) {
        score += 2;
        matches.push(`file:${file}`);
        break;
      }
    }

    // Decision match
    for (const decision of artifact.decisions || []) {
      if (decision.decision && decision.decision.toLowerCase().includes(queryLower)) {
        score += 3;
        matches.push('decision');
        break;
      }
    }

    if (score > 0) {
      results.push({ artifact, score, matches });
    }
  }

  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/**
 * Get timeline of artifact activity
 *
 * @param {Object} index - Artifact index
 * @param {Object} options - Options
 * @returns {Object[]} Timeline entries
 */
function getTimeline(index, options = {}) {
  const limit = options.limit || 20;

  const events = [];

  for (const artifact of index.artifacts || []) {
    // Artifact creation
    if (artifact.date) {
      events.push({
        date: artifact.date,
        type: 'created',
        artifact: artifact.slug,
        title: artifact.title
      });
    }

    // Decision events
    for (const decision of artifact.decisions || []) {
      if (decision.date) {
        events.push({
          date: decision.date,
          type: 'decision',
          artifact: artifact.slug,
          summary: decision.decision
        });
      }
    }
  }

  return events
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit);
}

/**
 * Format stats for console output
 *
 * @param {Object} stats - Statistics object
 * @returns {string} Formatted output
 */
function formatStatsConsole(stats) {
  const lines = [];

  lines.push('📊 Cook Analytics (' + stats.period.label + ')');
  lines.push('─'.repeat(40));
  lines.push('');

  // Totals
  const completionRate = calculateCompletionRate(stats);
  const blockRate = calculateBlockRate(stats);
  lines.push(`Total cooks: ${stats.total}`);

  // Mode breakdown
  const wellDone = stats.byMode['well-done'] || 0;
  const microwave = stats.byMode['microwave'] || 0;
  if (wellDone > 0 || microwave > 0) {
    lines.push(`  • ${wellDone} well-done, ${microwave} microwave`);
  }
  lines.push('');

  // Status breakdown
  lines.push('Status breakdown:');
  const statusOrder = ['well-done', 'ready-for-merge', 'plated', 'cooking', 'raw', 'blocked', 'needs-more-cooking'];
  for (const status of statusOrder) {
    const count = stats.byStatus[status];
    if (count) {
      const icon = getStatusIcon(status);
      lines.push(`  ${icon} ${status}: ${count}`);
    }
  }
  lines.push('');

  lines.push(`Completion rate: ${completionRate}%`);
  if (blockRate > 0) {
    lines.push(`Block rate: ${blockRate}%`);
  }
  lines.push('');

  // Blockers
  if (stats.blockers.total > 0) {
    lines.push('Most common blockers:');
    const chefEntries = Object.entries(stats.blockers.byChef)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    for (const [chef, count] of chefEntries) {
      lines.push(`  • ${chef}: ${count}`);
    }
    lines.push('');
  }

  // Hot files
  if (stats.hotFiles.length > 0) {
    lines.push('Hot files:');
    for (const { file, count } of stats.hotFiles.slice(0, 5)) {
      lines.push(`  • ${file} (${count} cooks)`);
    }
    lines.push('');
  }

  // Pre-mortem stats
  if (stats.premortem.total > 0) {
    lines.push(`Pre-mortem scenarios: ${stats.premortem.total} total (avg ${stats.premortem.avgPerArtifact}/artifact)`);
  }

  return lines.join('\n');
}

/**
 * Get status icon
 *
 * @param {string} status
 * @returns {string}
 */
function getStatusIcon(status) {
  const icons = {
    'well-done': '✅',
    'ready-for-merge': '🚀',
    'plated': '🍽️',
    'cooking': '🔥',
    'raw': '🥩',
    'blocked': '🚫',
    'needs-more-cooking': '⏪',
    'unknown': '❓'
  };
  return icons[status] || '•';
}

module.exports = {
  calculateStats,
  calculateCompletionRate,
  calculateBlockRate,
  findSimilarByFiles,
  searchArtifacts,
  getTimeline,
  formatStatsConsole,
  getStatusIcon
};
