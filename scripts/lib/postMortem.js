/**
 * Post-Mortem Analyzer for Sous Chef
 *
 * Compares pre-mortem predictions from artifacts against actual outcomes.
 * Helps improve future risk assessments by learning from past predictions.
 */

const fs = require('fs');
const path = require('path');
const { parseArtifact } = require('./artifactParser');

/**
 * Extract pre-mortem scenarios from artifact
 *
 * @param {string} artifactPath - Path to cook artifact
 * @returns {Object[]} Array of pre-mortem scenarios
 */
function extractPreMortem(artifactPath) {
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}`);
  }

  const content = fs.readFileSync(artifactPath, 'utf8');

  // Find Pre-mortem section
  const preMortemMatch = content.match(/##\s*Pre-?mortem[\s\S]*?(?=##|$)/i);
  if (!preMortemMatch) {
    return [];
  }

  const preMortemSection = preMortemMatch[0];
  const scenarios = [];

  // Pattern 1: Numbered list with mitigation
  // 1. **Scenario** -> mitigation: action
  // 1. Scenario -> mitigation: action
  const numberedPattern = /^\d+\.\s*\*?\*?([^*\n]+)\*?\*?\s*(?:->|→|:)\s*(?:mitigation:?\s*)?(.+)$/gim;
  let match;

  while ((match = numberedPattern.exec(preMortemSection)) !== null) {
    scenarios.push({
      scenario: match[1].trim(),
      mitigation: match[2].trim(),
      materialized: null,
      notes: null
    });
  }

  // Pattern 2: Table format
  // | # | What Could Go Wrong | ... | Mitigation |
  const tablePattern = /\|\s*\d+\s*\|\s*([^|]+)\|[^|]*\|[^|]*\|\s*([^|]+)\|/g;
  while ((match = tablePattern.exec(preMortemSection)) !== null) {
    scenarios.push({
      scenario: match[1].trim(),
      mitigation: match[2].trim(),
      materialized: null,
      notes: null
    });
  }

  return scenarios;
}

/**
 * Load artifact metadata
 *
 * @param {string} artifactPath - Path to artifact
 * @returns {Object} Artifact metadata
 */
function loadArtifactMetadata(artifactPath) {
  // parseArtifact expects a file path, not content
  const artifact = parseArtifact(artifactPath);

  return {
    path: artifactPath,
    slug: artifact.filename ? artifact.filename.replace('.cook.md', '') : path.basename(artifactPath, '.cook.md'),
    title: artifact.header ? artifact.header.title : null,
    date: artifact.date,
    status: artifact.header ? artifact.header.status : null,
    mode: artifact.header ? artifact.header.mode : null
  };
}

/**
 * Analyze outcome against pre-mortem predictions
 *
 * @param {Object[]} scenarios - Pre-mortem scenarios
 * @param {Object} outcome - Outcome data
 * @returns {Object} Analysis result
 */
function analyzeOutcome(scenarios, outcome = {}) {
  const {
    incidents = [],
    issues = [],
    notes = ''
  } = outcome;

  const analysis = {
    totalPredictions: scenarios.length,
    materialized: [],
    avoided: [],
    unpredicted: [],
    accuracy: 0
  };

  // Keywords for matching incidents to predictions
  const incidentKeywords = new Set();
  for (const incident of [...incidents, ...issues]) {
    const words = incident.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    words.forEach(w => incidentKeywords.add(w));
  }

  // Check each prediction
  for (const scenario of scenarios) {
    const scenarioWords = scenario.scenario.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const matchCount = scenarioWords.filter(w => incidentKeywords.has(w)).length;

    if (matchCount >= 2 || incidents.some(i => i.toLowerCase().includes(scenario.scenario.toLowerCase().substring(0, 20)))) {
      scenario.materialized = true;
      analysis.materialized.push(scenario);
    } else {
      scenario.materialized = false;
      analysis.avoided.push(scenario);
    }
  }

  // Find unpredicted issues
  const predictedKeywords = new Set();
  for (const s of scenarios) {
    s.scenario.toLowerCase().split(/\W+/).filter(w => w.length > 3).forEach(w => predictedKeywords.add(w));
  }

  for (const incident of [...incidents, ...issues]) {
    const incidentWords = incident.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const matchCount = incidentWords.filter(w => predictedKeywords.has(w)).length;

    if (matchCount < 2) {
      analysis.unpredicted.push(incident);
    }
  }

  // Calculate accuracy
  if (analysis.totalPredictions > 0) {
    // Accuracy = (materialized predictions that helped + avoided risks) / total
    // Higher is better - means we predicted actual risks OR successfully avoided them
    const useful = analysis.materialized.length + analysis.avoided.length;
    analysis.accuracy = Math.round((useful / analysis.totalPredictions) * 100);
  }

  return analysis;
}

/**
 * Generate interactive post-mortem report
 *
 * @param {string} artifactPath - Path to artifact
 * @param {Object} outcome - Optional outcome data (if not provided, generates template)
 * @returns {Object} Post-mortem report
 */
function generatePostMortem(artifactPath, outcome = null) {
  const metadata = loadArtifactMetadata(artifactPath);
  const scenarios = extractPreMortem(artifactPath);

  const report = {
    artifact: metadata,
    preMortem: scenarios,
    outcome: null,
    analysis: null,
    template: null
  };

  if (outcome) {
    report.outcome = outcome;
    report.analysis = analyzeOutcome(scenarios, outcome);
  } else {
    // Generate template for user to fill in
    report.template = generateOutcomeTemplate(scenarios);
  }

  return report;
}

/**
 * Generate outcome template for user input
 *
 * @param {Object[]} scenarios - Pre-mortem scenarios
 * @returns {string} Template markdown
 */
function generateOutcomeTemplate(scenarios) {
  const lines = [];

  lines.push('# Post-Mortem Outcome Template');
  lines.push('');
  lines.push('Fill in the sections below to analyze your pre-mortem predictions.');
  lines.push('');
  lines.push('## Incidents (issues that occurred)');
  lines.push('');
  lines.push('List any incidents, bugs, or issues that occurred:');
  lines.push('');
  lines.push('- ');
  lines.push('- ');
  lines.push('');
  lines.push('## Pre-mortem Review');
  lines.push('');
  lines.push('For each prediction, mark if it materialized:');
  lines.push('');

  for (let i = 0; i < scenarios.length; i++) {
    const s = scenarios[i];
    lines.push(`### ${i + 1}. ${s.scenario}`);
    lines.push(`- Mitigation planned: ${s.mitigation}`);
    lines.push('- Materialized: [ ] Yes  [ ] No');
    lines.push('- Notes: ');
    lines.push('');
  }

  lines.push('## Unpredicted Issues');
  lines.push('');
  lines.push('List any issues that were NOT predicted in the pre-mortem:');
  lines.push('');
  lines.push('- ');
  lines.push('');
  lines.push('## Lessons Learned');
  lines.push('');
  lines.push('- ');
  lines.push('');

  return lines.join('\n');
}

/**
 * Format post-mortem report for console
 *
 * @param {Object} report - Post-mortem report
 * @returns {string} Formatted output
 */
function formatPostMortemReport(report) {
  const lines = [];

  lines.push('');
  lines.push('======================================');
  lines.push('  SOUS CHEF - Post-Mortem Analysis');
  lines.push('======================================');
  lines.push('');
  lines.push(`Artifact: ${report.artifact.slug}`);
  lines.push(`Title:    ${report.artifact.title || 'N/A'}`);
  lines.push(`Date:     ${report.artifact.date}`);
  lines.push('');

  if (report.preMortem.length === 0) {
    lines.push('No pre-mortem scenarios found in artifact.');
    lines.push('');
    return lines.join('\n');
  }

  lines.push(`Pre-mortem predictions: ${report.preMortem.length}`);
  lines.push('');

  for (let i = 0; i < report.preMortem.length; i++) {
    const s = report.preMortem[i];
    lines.push(`${i + 1}. ${s.scenario}`);
    lines.push(`   Mitigation: ${s.mitigation}`);
    lines.push('');
  }

  if (report.template) {
    lines.push('--------------------------------------');
    lines.push('');
    lines.push('To complete the post-mortem, provide outcome data:');
    lines.push('');
    lines.push('  sous-chef postmortem <artifact> --incidents "issue1,issue2"');
    lines.push('');
    lines.push('Or generate a template file:');
    lines.push('');
    lines.push('  sous-chef postmortem <artifact> --template > postmortem.md');
    lines.push('');
  }

  if (report.analysis) {
    lines.push('--------------------------------------');
    lines.push('ANALYSIS RESULTS');
    lines.push('');
    lines.push(`Predictions accuracy: ${report.analysis.accuracy}%`);
    lines.push('');

    if (report.analysis.materialized.length > 0) {
      lines.push(`Risks that materialized: ${report.analysis.materialized.length}`);
      for (const s of report.analysis.materialized) {
        lines.push(`  [!] ${s.scenario}`);
      }
      lines.push('');
    }

    if (report.analysis.avoided.length > 0) {
      lines.push(`Risks avoided: ${report.analysis.avoided.length}`);
      for (const s of report.analysis.avoided) {
        lines.push(`  [+] ${s.scenario}`);
      }
      lines.push('');
    }

    if (report.analysis.unpredicted.length > 0) {
      lines.push(`Unpredicted issues: ${report.analysis.unpredicted.length}`);
      for (const issue of report.analysis.unpredicted) {
        lines.push(`  [-] ${issue}`);
      }
      lines.push('');
    }

    lines.push('--------------------------------------');
    lines.push('Recommendation: Add unpredicted issues to future pre-mortems');
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = {
  extractPreMortem,
  loadArtifactMetadata,
  analyzeOutcome,
  generatePostMortem,
  generateOutcomeTemplate,
  formatPostMortemReport
};
