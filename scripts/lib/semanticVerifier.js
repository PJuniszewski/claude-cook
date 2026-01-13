/**
 * Semantic Verifier - LLM-Judge Verification Layer
 *
 * Layer 2 of 2-layer verification (Layer 1 is Coverage Checker)
 *
 * This module:
 * - Prepares verification prompts for LLM analysis
 * - Parses LLM verification responses
 * - Generates semantic verification reports
 *
 * Note: Actual LLM calls happen within Claude Code context.
 * This module provides the framework and utilities.
 */

const fs = require('fs');
const path = require('path');
const { extractPatchPlan, parseArtifact, parseSections } = require('./artifactParser');

/**
 * Verification result types
 */
const VerificationResult = {
  PASS: 'PASS',
  PARTIAL: 'PARTIAL',
  FAIL: 'FAIL',
  SKIP: 'SKIP'
};

/**
 * Verdict levels
 */
const Verdict = {
  READY: 'READY',           // All items PASS
  NEEDS_REVIEW: 'NEEDS_REVIEW', // All PASS but has PARTIAL
  NEEDS_WORK: 'NEEDS_WORK'  // Any FAIL
};

/**
 * Extract verification items from artifact
 * Gets items from Patch Plan with their intent/description
 *
 * @param {string} artifactPath - Path to artifact file
 * @returns {Array<{id: number, file: string, intent: string, action: string}>}
 */
function extractVerificationItems(artifactPath) {
  const artifact = parseArtifact(artifactPath);
  const patchPlan = extractPatchPlan(artifact.raw);

  return patchPlan.map((item, index) => ({
    id: index + 1,
    file: item.file,
    intent: item.description || `${item.action} ${item.file}`,
    action: item.action
  }));
}

/**
 * Read file content for verification
 *
 * @param {string} filePath - Path to file
 * @returns {string|null} File content or null if not readable
 */
function readFileContent(filePath) {
  const resolvedPath = path.resolve(filePath);

  if (!fs.existsSync(resolvedPath)) {
    return null;
  }

  try {
    return fs.readFileSync(resolvedPath, 'utf-8');
  } catch {
    return null;
  }
}

/**
 * Build verification prompt for a single item
 *
 * @param {Object} item - Verification item
 * @param {string} fileContent - Content of the file
 * @returns {string} Prompt for LLM verification
 */
function buildItemVerificationPrompt(item, fileContent) {
  return `
Verify if this implementation matches the stated intent.

INTENT: "${item.intent}"
FILE: ${item.file}
ACTION: ${item.action}

FILE CONTENT:
\`\`\`
${fileContent}
\`\`\`

Analyze if the file content fulfills the stated intent. Consider:
1. Does the code implement what was described?
2. Are there any obvious logic errors?
3. Is the implementation complete or partial?

Respond with one of:
- PASS: Implementation fully matches intent
- PARTIAL: Implementation exists but incomplete or has minor issues
- FAIL: Implementation missing or doesn't match intent

Format your response as:
RESULT: <PASS|PARTIAL|FAIL>
REASON: <1-2 sentence explanation>
SUGGESTION: <optional improvement suggestion>
`.trim();
}

/**
 * Build full verification prompt for all items
 *
 * @param {string} artifactPath - Path to artifact file
 * @returns {Object} { prompt, items, fileContents }
 */
function buildFullVerificationPrompt(artifactPath) {
  const items = extractVerificationItems(artifactPath);
  const fileContents = {};

  // Collect file contents
  for (const item of items) {
    const content = readFileContent(item.file);
    if (content !== null) {
      fileContents[item.file] = content;
    }
  }

  // Build comprehensive prompt
  let prompt = `
# Semantic Verification

Verify that the implementation matches the planned changes from the Patch Plan.

## Patch Plan Items to Verify:

`;

  for (const item of items) {
    const hasContent = fileContents[item.file] !== undefined;
    prompt += `
### Item ${item.id}: ${item.file}
- Intent: ${item.intent}
- Action: ${item.action}
- File exists: ${hasContent ? 'Yes' : 'No'}
`;

    if (hasContent) {
      // Truncate very large files
      let content = fileContents[item.file];
      if (content.length > 5000) {
        content = content.substring(0, 5000) + '\n... (truncated)';
      }
      prompt += `
\`\`\`
${content}
\`\`\`
`;
    }
  }

  prompt += `
## Instructions

For each item, determine if the implementation matches the stated intent.

Respond in this format for EACH item:

ITEM <number>:
- RESULT: <PASS|PARTIAL|FAIL>
- REASON: <brief explanation>
- SUGGESTION: <optional, only if PARTIAL or FAIL>

After all items, provide:

SUMMARY:
- PASS: <count>
- PARTIAL: <count>
- FAIL: <count>
- VERDICT: <READY|NEEDS_REVIEW|NEEDS_WORK>
`;

  return { prompt, items, fileContents };
}

/**
 * Parse LLM verification response
 *
 * @param {string} response - LLM response text
 * @param {Array} items - Original verification items
 * @returns {Object} Parsed verification results
 */
function parseVerificationResponse(response, items) {
  const results = [];

  // Parse individual item results
  const itemPattern = /ITEM\s*(\d+):?\s*\n-?\s*RESULT:\s*(PASS|PARTIAL|FAIL)\s*\n-?\s*REASON:\s*(.+?)(?=\n-?\s*SUGGESTION:|ITEM|\nSUMMARY|$)/gis;

  let match;
  while ((match = itemPattern.exec(response)) !== null) {
    const itemNum = parseInt(match[1], 10);
    const result = match[2].toUpperCase();
    const reason = match[3].trim();

    // Find suggestion if present
    const suggestionMatch = response.substring(match.index).match(/SUGGESTION:\s*(.+?)(?=\nITEM|\nSUMMARY|$)/is);
    const suggestion = suggestionMatch ? suggestionMatch[1].trim() : null;

    const item = items.find(i => i.id === itemNum);

    results.push({
      id: itemNum,
      file: item?.file || `Item ${itemNum}`,
      intent: item?.intent || '',
      result: VerificationResult[result] || VerificationResult.SKIP,
      reason,
      suggestion
    });
  }

  // Parse summary
  const summaryMatch = response.match(/SUMMARY:[\s\S]*?VERDICT:\s*(READY|NEEDS_REVIEW|NEEDS_WORK)/i);
  const verdict = summaryMatch
    ? Verdict[summaryMatch[1].toUpperCase()] || Verdict.NEEDS_REVIEW
    : calculateVerdict(results);

  // Count results
  const counts = {
    pass: results.filter(r => r.result === VerificationResult.PASS).length,
    partial: results.filter(r => r.result === VerificationResult.PARTIAL).length,
    fail: results.filter(r => r.result === VerificationResult.FAIL).length,
    skip: results.filter(r => r.result === VerificationResult.SKIP).length
  };

  return {
    results,
    counts,
    verdict,
    total: items.length,
    verified: results.length
  };
}

/**
 * Calculate verdict from results
 *
 * @param {Array} results - Verification results
 * @returns {string} Verdict
 */
function calculateVerdict(results) {
  const hasFail = results.some(r => r.result === VerificationResult.FAIL);
  const hasPartial = results.some(r => r.result === VerificationResult.PARTIAL);

  if (hasFail) return Verdict.NEEDS_WORK;
  if (hasPartial) return Verdict.NEEDS_REVIEW;
  return Verdict.READY;
}

/**
 * Format verification result as report
 *
 * @param {Object} parsed - Parsed verification result
 * @returns {string} Formatted report
 */
function formatVerificationReport(parsed) {
  const lines = [];

  lines.push('Semantic Verification (LLM-Judge)');
  lines.push('=================================');
  lines.push('');

  // Individual results
  for (const item of parsed.results) {
    const icon = item.result === VerificationResult.PASS ? '✓'
               : item.result === VerificationResult.PARTIAL ? '⚠'
               : '✗';

    lines.push(`${item.id}. "${item.intent}"`);
    lines.push(`   ${icon} ${item.result} - ${item.reason}`);

    if (item.suggestion) {
      lines.push(`     Suggestion: ${item.suggestion}`);
    }
    lines.push('');
  }

  // Summary
  lines.push('---');
  lines.push(`Semantic Score: ${parsed.counts.pass}/${parsed.total} PASS, ${parsed.counts.partial} PARTIAL, ${parsed.counts.fail} FAIL`);
  lines.push(`Verdict: ${parsed.verdict}`);

  // Verdict explanation
  switch (parsed.verdict) {
    case Verdict.READY:
      lines.push('→ All items verified, ready for PR');
      break;
    case Verdict.NEEDS_REVIEW:
      lines.push('→ Some items need attention, proceed with caution');
      break;
    case Verdict.NEEDS_WORK:
      lines.push('→ Critical issues found, address FAIL items before PR');
      break;
  }

  return lines.join('\n');
}

/**
 * Create a mock/simplified verification for quick checks
 * (when LLM verification is not available)
 *
 * @param {string} artifactPath - Path to artifact file
 * @returns {Object} Simplified verification result
 */
function runSimplifiedVerification(artifactPath) {
  const items = extractVerificationItems(artifactPath);
  const results = [];

  for (const item of items) {
    const content = readFileContent(item.file);

    if (content === null) {
      results.push({
        id: item.id,
        file: item.file,
        intent: item.intent,
        result: VerificationResult.FAIL,
        reason: 'File not found or not readable',
        suggestion: 'Create the file or check the path'
      });
      continue;
    }

    // Basic checks based on action type
    const isEmpty = content.trim().length === 0;
    const hasCode = content.length > 50; // Very basic heuristic

    if (isEmpty) {
      results.push({
        id: item.id,
        file: item.file,
        intent: item.intent,
        result: VerificationResult.FAIL,
        reason: 'File is empty',
        suggestion: 'Implement the planned functionality'
      });
    } else if (!hasCode && item.action !== 'delete') {
      results.push({
        id: item.id,
        file: item.file,
        intent: item.intent,
        result: VerificationResult.PARTIAL,
        reason: 'File exists but appears minimal',
        suggestion: 'Verify implementation is complete'
      });
    } else {
      results.push({
        id: item.id,
        file: item.file,
        intent: item.intent,
        result: VerificationResult.PASS,
        reason: 'File exists with content (basic check only)',
        suggestion: null
      });
    }
  }

  const verdict = calculateVerdict(results);
  const counts = {
    pass: results.filter(r => r.result === VerificationResult.PASS).length,
    partial: results.filter(r => r.result === VerificationResult.PARTIAL).length,
    fail: results.filter(r => r.result === VerificationResult.FAIL).length,
    skip: 0
  };

  return {
    results,
    counts,
    verdict,
    total: items.length,
    verified: results.length,
    isSimplified: true
  };
}

/**
 * Combine structural and semantic verification results
 *
 * @param {Object} structural - Result from coverageChecker
 * @param {Object} semantic - Result from semantic verification
 * @returns {Object} Combined verification result
 */
function combineVerificationResults(structural, semantic) {
  // Take the worse verdict
  const verdictPriority = {
    [Verdict.NEEDS_WORK]: 3,
    [Verdict.NEEDS_REVIEW]: 2,
    [Verdict.READY]: 1
  };

  const structuralVerdict = structural.verdict || Verdict.READY;
  const semanticVerdict = semantic.verdict || Verdict.READY;

  const combinedVerdict = verdictPriority[structuralVerdict] >= verdictPriority[semanticVerdict]
    ? structuralVerdict
    : semanticVerdict;

  return {
    structural,
    semantic,
    combinedVerdict,
    canProceed: combinedVerdict !== Verdict.NEEDS_WORK,
    summary: {
      structuralCoverage: structural.coverage?.formatted || 'N/A',
      semanticScore: semantic.counts
        ? `${semantic.counts.pass}/${semantic.total}`
        : 'N/A',
      verdict: combinedVerdict
    }
  };
}

module.exports = {
  // Constants
  VerificationResult,
  Verdict,

  // Prompt building
  extractVerificationItems,
  buildItemVerificationPrompt,
  buildFullVerificationPrompt,

  // Response parsing
  parseVerificationResponse,
  calculateVerdict,

  // Reporting
  formatVerificationReport,

  // Simplified verification
  runSimplifiedVerification,

  // Combining results
  combineVerificationResults,

  // Utilities
  readFileContent
};
