#!/usr/bin/env node

/**
 * Memory Retrieval System for Cook Workflow
 *
 * Queries audit logs for similar features and provides contextual insights
 * to optimize future cooking runs.
 */

const auditLogger = require("./auditLogger");
const patternMiner = require("./patternMiner");

// ============ Feature Similarity ============

/**
 * Calculate similarity score between two features based on file overlap
 */
function calculateFileSimilarity(files1, files2) {
  if (!files1 || !files2 || files1.length === 0 || files2.length === 0) {
    return 0;
  }

  const set1 = new Set(files1.map((f) => f.toLowerCase()));
  const set2 = new Set(files2.map((f) => f.toLowerCase()));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size; // Jaccard similarity
}

/**
 * Calculate keyword similarity (simple keyword matching)
 */
function calculateKeywordSimilarity(text1, text2) {
  if (!text1 || !text2) return 0;

  const keywords1 = extractKeywords(text1);
  const keywords2 = extractKeywords(text2);

  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Extract keywords from text (simple tokenization)
 */
function extractKeywords(text) {
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "will",
    "would",
    "should",
    "could",
    "may",
    "might",
    "must",
    "can",
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

// ============ Query Functions ============

/**
 * Query similar features from audit log
 * @param {Object} currentFeature - { description, files, keywords }
 * @param {number} minSimilarity - Minimum similarity threshold (0-1)
 * @param {number} maxResults - Maximum number of results
 * @returns {Array} Similar features with similarity scores
 */
function querySimilarFeatures(
  currentFeature,
  minSimilarity = 0.3,
  maxResults = 5
) {
  const allEntries = auditLogger.getAllAuditEntries();
  const orderIds = auditLogger.getOrderIds();

  const similarities = [];

  for (const orderId of orderIds) {
    const orderEntries = allEntries.filter((e) => e.order_id === orderId);

    // Extract feature info from order entries
    const featureFiles = [];
    const featureKeywords = [];

    for (const entry of orderEntries) {
      // Collect files from metadata
      if (entry.metadata && entry.metadata.files_to_modify) {
        featureFiles.push(...entry.metadata.files_to_modify);
      }
      // Collect keywords from descriptions
      if (entry.metadata && entry.metadata.feature_description) {
        featureKeywords.push(
          ...extractKeywords(entry.metadata.feature_description)
        );
      }
    }

    // Calculate similarity
    const fileSim = calculateFileSimilarity(
      currentFeature.files || [],
      featureFiles
    );
    const keywordSim = calculateKeywordSimilarity(
      currentFeature.description || "",
      featureKeywords.join(" ")
    );

    // Weighted average (files 60%, keywords 40%)
    const totalSimilarity = fileSim * 0.6 + keywordSim * 0.4;

    if (totalSimilarity >= minSimilarity) {
      similarities.push({
        order_id: orderId,
        similarity: totalSimilarity,
        file_similarity: fileSim,
        keyword_similarity: keywordSim,
        entries: orderEntries,
      });
    }
  }

  // Sort by similarity descending
  similarities.sort((a, b) => b.similarity - a.similarity);

  return similarities.slice(0, maxResults);
}

/**
 * Get insights for a specific phase based on historical patterns
 * @param {string} phase - Phase name (scope, ux, plan, test, security, docs)
 * @param {Object} context - Current feature context
 * @returns {Object} Insights for this phase
 */
function getInsightsForPhase(phase, context) {
  const similarFeatures = querySimilarFeatures(context);

  if (similarFeatures.length === 0) {
    return {
      has_insights: false,
      message: "No similar features found in history",
    };
  }

  // Analyze patterns across similar features
  const phaseStats = patternMiner.findPhaseStatistics();
  const recurringBlockers = patternMiner.findRecurringBlockers(2);
  const escalationPatterns = patternMiner.findEscalationPatterns();

  // Find phase-specific stats
  const phaseStat = phaseStats.find((s) => s.phase === phase);

  const insights = {
    has_insights: true,
    similar_features_count: similarFeatures.length,
    phase: phase,
    warnings: [],
    suggestions: [],
    recurring_issues: [],
  };

  // Add phase statistics warning
  if (phaseStat && phaseStat.block_rate > 30) {
    insights.warnings.push({
      type: "high_block_rate",
      message: `⚠️ Phase '${phase}' blocks ${phaseStat.block_rate.toFixed(1)}% of similar features`,
      severity: "medium",
    });
  }

  // Add recurring blocker warnings
  for (const blocker of recurringBlockers.slice(0, 3)) {
    if (blocker.severity === "HIGH" || blocker.count >= 3) {
      insights.recurring_issues.push({
        type: blocker.type,
        count: blocker.count,
        severity: blocker.severity,
        message: `🔁 Recurring issue: ${blocker.type} (${blocker.count} occurrences)`,
      });
    }
  }

  // Add escalation suggestions
  const relevantEscalations = escalationPatterns.filter((p) =>
    p.from_chef.includes(phase)
  );
  for (const esc of relevantEscalations.slice(0, 2)) {
    if (esc.count >= 3) {
      insights.suggestions.push({
        type: "escalation_pattern",
        message: `Consider pre-review: ${esc.from_chef} frequently escalates to ${esc.to_chef}`,
      });
    }
  }

  return insights;
}

/**
 * Format insights for artifact output
 * @param {Array} similarFeatures - Similar features from query
 * @param {Object} phaseInsights - Phase-specific insights
 * @returns {string} Formatted markdown
 */
function formatInsightsForArtifact(similarFeatures, phaseInsights = null) {
  if (!similarFeatures || similarFeatures.length === 0) {
    return "";
  }

  let output = "## 📊 Historical Insights\n\n";

  output += `Found ${similarFeatures.length} similar feature(s) in history:\n\n`;

  // List similar features
  for (const feature of similarFeatures.slice(0, 3)) {
    const simPercent = (feature.similarity * 100).toFixed(0);
    output += `- **${feature.order_id}** (${simPercent}% similar)\n`;

    // Extract key outcomes
    const blockers = feature.entries.filter((e) => e.event_type === "blocker");
    const escalations = feature.entries.filter(
      (e) => e.event_type === "escalation"
    );
    const completions = feature.entries.filter(
      (e) => e.event_type === "phase_complete"
    );

    if (blockers.length > 0) {
      output += `  - Blocked ${blockers.length} time(s)\n`;
    }
    if (escalations.length > 0) {
      output += `  - Escalated ${escalations.length} time(s)\n`;
    }

    const blockVerdict = completions.filter((c) => c.verdict === "block");
    if (blockVerdict.length > 0) {
      output += `  - ${blockVerdict.length} phase(s) blocked\n`;
    }
  }

  // Add phase-specific insights
  if (phaseInsights && phaseInsights.has_insights) {
    output += "\n### Patterns to Consider:\n\n";

    for (const warning of phaseInsights.warnings || []) {
      output += `- ${warning.message}\n`;
    }

    for (const issue of phaseInsights.recurring_issues || []) {
      output += `- ${issue.message}\n`;
    }

    for (const suggestion of phaseInsights.suggestions || []) {
      output += `- ${suggestion.message}\n`;
    }
  }

  output += "\n";
  return output;
}

// ============ Memory Feedback ============

const fs = require("fs");
const path = require("path");

const FEEDBACK_FILE = ".claude/data/memory-feedback.jsonl";

/**
 * Get the feedback file path
 */
function getFeedbackPath() {
  const auditPath = auditLogger.getAuditPath();
  const dir = path.dirname(auditPath);
  return path.join(dir, path.basename(FEEDBACK_FILE));
}

/**
 * Log user feedback on insight quality
 * @param {string} orderId - Current order ID
 * @param {string} insightType - Type of insight (similar_features, phase_warning, recurring_issue)
 * @param {string} feedback - User feedback (helpful, not_helpful, wrong)
 * @param {Object} context - Additional context
 */
function logFeedback(orderId, insightType, feedback, context = {}) {
  const validFeedback = ["helpful", "not_helpful", "wrong"];
  if (!validFeedback.includes(feedback)) {
    throw new Error(`Invalid feedback: ${feedback}. Must be one of: ${validFeedback.join(", ")}`);
  }

  const feedbackPath = getFeedbackPath();
  const dir = path.dirname(feedbackPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const entry = {
    timestamp: new Date().toISOString(),
    order_id: orderId,
    insight_type: insightType,
    feedback: feedback,
    context: context,
  };

  const line = JSON.stringify(entry) + "\n";
  fs.appendFileSync(feedbackPath, line, "utf8");

  return entry;
}

/**
 * Get feedback statistics
 */
function getFeedbackStats() {
  const feedbackPath = getFeedbackPath();
  if (!fs.existsSync(feedbackPath)) {
    return {
      total: 0,
      helpful: 0,
      not_helpful: 0,
      wrong: 0,
      by_type: {},
    };
  }

  const content = fs.readFileSync(feedbackPath, "utf8");
  const lines = content.trim().split("\n").filter(Boolean);

  const stats = {
    total: 0,
    helpful: 0,
    not_helpful: 0,
    wrong: 0,
    by_type: {},
  };

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      stats.total++;
      stats[entry.feedback]++;

      if (!stats.by_type[entry.insight_type]) {
        stats.by_type[entry.insight_type] = {
          helpful: 0,
          not_helpful: 0,
          wrong: 0,
        };
      }
      stats.by_type[entry.insight_type][entry.feedback]++;
    } catch (e) {
      // Skip invalid lines
    }
  }

  return stats;
}

// ============ Exports ============

module.exports = {
  querySimilarFeatures,
  getInsightsForPhase,
  formatInsightsForArtifact,
  calculateFileSimilarity,
  calculateKeywordSimilarity,
  extractKeywords,
  logFeedback,
  getFeedbackStats,
  getFeedbackPath,
};

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "query":
      const description = args[1] || "";
      const keywords = args.slice(2);
      const results = querySimilarFeatures({
        description,
        keywords,
        files: [],
      });
      console.log(JSON.stringify(results, null, 2));
      break;

    case "insights":
      const phase = args[1] || "plan";
      const context = {
        description: args[2] || "",
        files: [],
        keywords: [],
      };
      const insights = getInsightsForPhase(phase, context);
      console.log(JSON.stringify(insights, null, 2));
      break;

    case "feedback-stats":
      console.log(JSON.stringify(getFeedbackStats(), null, 2));
      break;

    case "feedback-path":
      console.log(getFeedbackPath());
      break;

    default:
      console.log(
        "Usage: memoryRetrieval.js [query <description> <keywords...>|insights <phase> <description>|feedback-stats|feedback-path]"
      );
  }
}
