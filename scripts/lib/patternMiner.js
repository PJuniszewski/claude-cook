#!/usr/bin/env node

/**
 * Pattern Miner for Cook Audit Logs
 *
 * Analyzes audit history to find patterns, recurring issues,
 * and opportunities for improvement.
 */

const auditLogger = require("./auditLogger");

// ============ Analysis Functions ============

/**
 * Find recurring blockers across orders
 * Returns blockers that appear in multiple orders
 */
function findRecurringBlockers(minOccurrences = 2) {
  const entries = auditLogger.getAllAuditEntries();
  const blockerEntries = entries.filter((e) => e.event_type === "blocker");

  // Group by blocker type
  const blockerCounts = {};
  for (const entry of blockerEntries) {
    for (const blocker of entry.blockers || []) {
      const key = `${blocker.type}:${blocker.severity}`;
      if (!blockerCounts[key]) {
        blockerCounts[key] = {
          type: blocker.type,
          severity: blocker.severity,
          count: 0,
          orders: new Set(),
          examples: [],
        };
      }
      blockerCounts[key].count++;
      blockerCounts[key].orders.add(entry.order_id);
      if (blockerCounts[key].examples.length < 3) {
        blockerCounts[key].examples.push(blocker.description);
      }
    }
  }

  // Filter to recurring only
  return Object.values(blockerCounts)
    .filter((b) => b.orders.size >= minOccurrences)
    .map((b) => ({
      ...b,
      orders: [...b.orders],
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Find escalation patterns
 * Which chefs escalate most often and to whom
 */
function findEscalationPatterns() {
  const entries = auditLogger.getAllAuditEntries();
  const escalations = entries.filter((e) => e.event_type === "escalation");

  const patterns = {};
  for (const entry of escalations) {
    const esc = entry.escalation;
    if (!esc) continue;

    const key = `${esc.from_chef} → ${esc.to_chef}`;
    if (!patterns[key]) {
      patterns[key] = {
        from_chef: esc.from_chef,
        to_chef: esc.to_chef,
        count: 0,
        reasons: {},
        conditions: {},
      };
    }
    patterns[key].count++;

    if (esc.reason) {
      patterns[key].reasons[esc.reason] =
        (patterns[key].reasons[esc.reason] || 0) + 1;
    }
    if (esc.condition) {
      patterns[key].conditions[esc.condition] =
        (patterns[key].conditions[esc.condition] || 0) + 1;
    }
  }

  return Object.values(patterns).sort((a, b) => b.count - a.count);
}

/**
 * Find phase completion statistics
 * Which phases take longest, which block most often
 */
function findPhaseStatistics() {
  const entries = auditLogger.getAllAuditEntries();

  const stats = {};
  const phaseStarts = {};

  for (const entry of entries) {
    if (entry.event_type === "phase_start") {
      const key = `${entry.order_id}:${entry.phase}`;
      phaseStarts[key] = new Date(entry.timestamp);
    } else if (entry.event_type === "phase_complete") {
      const phase = entry.phase;
      if (!stats[phase]) {
        stats[phase] = {
          phase,
          total_count: 0,
          verdicts: {},
          durations: [],
          avg_duration: 0,
        };
      }

      stats[phase].total_count++;
      stats[phase].verdicts[entry.verdict] =
        (stats[phase].verdicts[entry.verdict] || 0) + 1;

      // Calculate duration if we have start time
      const key = `${entry.order_id}:${entry.phase}`;
      if (phaseStarts[key]) {
        const duration =
          (new Date(entry.timestamp) - phaseStarts[key]) / 1000;
        stats[phase].durations.push(duration);
      } else if (entry.duration_seconds) {
        stats[phase].durations.push(entry.duration_seconds);
      }
    }
  }

  // Calculate averages
  for (const stat of Object.values(stats)) {
    if (stat.durations.length > 0) {
      stat.avg_duration =
        stat.durations.reduce((a, b) => a + b, 0) / stat.durations.length;
    }
    stat.block_rate =
      ((stat.verdicts.block || 0) / stat.total_count) * 100;
  }

  return Object.values(stats);
}

/**
 * Analyze pre-mortem prediction accuracy
 * Compare predicted risks with actual blockers
 */
function findPredictionAccuracy() {
  const entries = auditLogger.getAllAuditEntries();
  const orderIds = auditLogger.getOrderIds();

  const results = [];

  for (const orderId of orderIds) {
    const orderEntries = entries.filter((e) => e.order_id === orderId);

    // Find predicted risks (from early phases)
    const predictedRisks = orderEntries
      .filter((e) => e.risks_identified && e.risks_identified.length > 0)
      .flatMap((e) => e.risks_identified);

    // Find actual blockers
    const actualBlockers = orderEntries
      .filter((e) => e.event_type === "blocker")
      .flatMap((e) => e.blockers || []);

    if (predictedRisks.length === 0 && actualBlockers.length === 0) {
      continue;
    }

    // Simple matching: check if predicted risks materialized
    const materialized = actualBlockers.filter((blocker) =>
      predictedRisks.some(
        (risk) =>
          risk.description &&
          blocker.description &&
          risk.description.toLowerCase().includes(blocker.type.toLowerCase())
      )
    );

    results.push({
      order_id: orderId,
      predicted_count: predictedRisks.length,
      actual_blockers: actualBlockers.length,
      correctly_predicted: materialized.length,
      accuracy:
        predictedRisks.length > 0
          ? (materialized.length / predictedRisks.length) * 100
          : null,
      unpredicted: actualBlockers.length - materialized.length,
    });
  }

  // Overall accuracy
  const totalPredicted = results.reduce((a, r) => a + r.predicted_count, 0);
  const totalCorrect = results.reduce((a, r) => a + r.correctly_predicted, 0);

  return {
    orders: results,
    overall: {
      total_predictions: totalPredicted,
      correct_predictions: totalCorrect,
      accuracy: totalPredicted > 0 ? (totalCorrect / totalPredicted) * 100 : null,
    },
  };
}

/**
 * Suggest improvements based on patterns
 */
function suggestImprovements() {
  const suggestions = [];

  // Analyze recurring blockers
  const recurringBlockers = findRecurringBlockers(2);
  for (const blocker of recurringBlockers.slice(0, 3)) {
    if (blocker.severity === "HIGH") {
      suggestions.push({
        type: "recurring_blocker",
        priority: "high",
        message: `HIGH severity blocker "${blocker.type}" occurred ${blocker.count} times across ${blocker.orders.length} orders. Consider adding automated check.`,
        data: blocker,
      });
    }
  }

  // Analyze escalation patterns
  const escalations = findEscalationPatterns();
  for (const pattern of escalations.slice(0, 3)) {
    if (pattern.count >= 3) {
      suggestions.push({
        type: "escalation_pattern",
        priority: "medium",
        message: `${pattern.from_chef} frequently escalates to ${pattern.to_chef} (${pattern.count} times). Consider adjusting thresholds or adding guidance.`,
        data: pattern,
      });
    }
  }

  // Analyze phase statistics
  const phaseStats = findPhaseStatistics();
  for (const stat of phaseStats) {
    if (stat.block_rate > 30) {
      suggestions.push({
        type: "high_block_rate",
        priority: "medium",
        message: `Phase "${stat.phase}" has ${stat.block_rate.toFixed(1)}% block rate. Consider improving input quality.`,
        data: stat,
      });
    }
  }

  // Analyze prediction accuracy
  const accuracy = findPredictionAccuracy();
  if (accuracy.overall.accuracy !== null && accuracy.overall.accuracy < 30) {
    suggestions.push({
      type: "low_prediction_accuracy",
      priority: "low",
      message: `Pre-mortem prediction accuracy is ${accuracy.overall.accuracy.toFixed(1)}%. Consider improving risk identification.`,
      data: accuracy.overall,
    });
  }

  return suggestions.sort((a, b) => {
    const priority = { high: 0, medium: 1, low: 2 };
    return priority[a.priority] - priority[b.priority];
  });
}

/**
 * Generate a summary report
 */
function generateReport() {
  const orderIds = auditLogger.getOrderIds();
  const allEntries = auditLogger.getAllAuditEntries();

  return {
    summary: {
      total_orders: orderIds.length,
      total_events: allEntries.length,
      date_range: {
        first:
          allEntries.length > 0
            ? allEntries[0].timestamp
            : null,
        last:
          allEntries.length > 0
            ? allEntries[allEntries.length - 1].timestamp
            : null,
      },
    },
    recurring_blockers: findRecurringBlockers(2),
    escalation_patterns: findEscalationPatterns(),
    phase_statistics: findPhaseStatistics(),
    prediction_accuracy: findPredictionAccuracy(),
    suggestions: suggestImprovements(),
  };
}

/**
 * Find similar features based on metadata
 * Used by memory retrieval to identify relevant historical patterns
 *
 * @param {Object} currentFeature - Current feature metadata
 * @param {number} minMatches - Minimum number of matching attributes
 * @returns {Array} Similar order IDs with match scores
 */
function findSimilarFeatures(currentFeature, minMatches = 1) {
  const entries = auditLogger.getAllAuditEntries();
  const orderIds = auditLogger.getOrderIds();

  const similarities = [];

  for (const orderId of orderIds) {
    const orderEntries = entries.filter((e) => e.order_id === orderId);
    let matchScore = 0;
    const matches = [];

    // Check for file overlap in metadata
    if (currentFeature.files && currentFeature.files.length > 0) {
      const orderFiles = [];
      for (const entry of orderEntries) {
        if (entry.metadata && entry.metadata.files_to_modify) {
          orderFiles.push(...entry.metadata.files_to_modify);
        }
      }

      const fileOverlap = currentFeature.files.filter((f) =>
        orderFiles.some((of) => of.includes(f) || f.includes(of))
      );

      if (fileOverlap.length > 0) {
        matchScore += fileOverlap.length;
        matches.push({ type: "file_overlap", count: fileOverlap.length });
      }
    }

    // Check for keyword matches in descriptions
    if (currentFeature.keywords && currentFeature.keywords.length > 0) {
      const orderDescriptions = orderEntries
        .filter((e) => e.metadata && e.metadata.feature_description)
        .map((e) => e.metadata.feature_description.toLowerCase())
        .join(" ");

      const keywordMatches = currentFeature.keywords.filter((keyword) =>
        orderDescriptions.includes(keyword.toLowerCase())
      );

      if (keywordMatches.length > 0) {
        matchScore += keywordMatches.length;
        matches.push({ type: "keyword_match", count: keywordMatches.length });
      }
    }

    // Check for phase pattern similarity
    const currentPhases = currentFeature.phases || [];
    const orderPhases = [
      ...new Set(orderEntries.filter((e) => e.phase).map((e) => e.phase)),
    ];

    if (currentPhases.length > 0) {
      const phaseOverlap = currentPhases.filter((p) =>
        orderPhases.includes(p)
      );
      if (phaseOverlap.length > 0) {
        matchScore += phaseOverlap.length * 0.5; // Lower weight
        matches.push({ type: "phase_overlap", count: phaseOverlap.length });
      }
    }

    if (matchScore >= minMatches) {
      similarities.push({
        order_id: orderId,
        match_score: matchScore,
        matches: matches,
        entries: orderEntries,
      });
    }
  }

  return similarities.sort((a, b) => b.match_score - a.match_score);
}

module.exports = {
  findRecurringBlockers,
  findEscalationPatterns,
  findPhaseStatistics,
  findPredictionAccuracy,
  suggestImprovements,
  generateReport,
  findSimilarFeatures,
};

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "blockers":
      console.log(JSON.stringify(findRecurringBlockers(), null, 2));
      break;
    case "escalations":
      console.log(JSON.stringify(findEscalationPatterns(), null, 2));
      break;
    case "phases":
      console.log(JSON.stringify(findPhaseStatistics(), null, 2));
      break;
    case "accuracy":
      console.log(JSON.stringify(findPredictionAccuracy(), null, 2));
      break;
    case "suggest":
      console.log(JSON.stringify(suggestImprovements(), null, 2));
      break;
    case "report":
      console.log(JSON.stringify(generateReport(), null, 2));
      break;
    case "similar":
      const files = args[1] ? args[1].split(",") : [];
      const keywords = args[2] ? args[2].split(",") : [];
      const feature = { files, keywords };
      console.log(JSON.stringify(findSimilarFeatures(feature), null, 2));
      break;
    default:
      console.log(
        "Usage: patternMiner.js [blockers|escalations|phases|accuracy|suggest|report|similar <files> <keywords>]"
      );
  }
}
