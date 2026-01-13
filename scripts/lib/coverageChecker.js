/**
 * Coverage Checker - Structural Verification Layer
 *
 * Compares Patch Plan (planned files) against actual changes (git diff)
 * to verify implementation coverage.
 *
 * Layer 1 of 2-layer verification (Layer 2 is Semantic Verification)
 */

const fs = require('fs');
const path = require('path');
const { extractPatchPlan, parseArtifact } = require('./artifactParser');
const { getChangedFiles, getCurrentBranch, getMainBranch } = require('./gitOperations');

/**
 * Normalize file path for comparison
 * Removes leading ./ and normalizes separators
 */
function normalizePath(filePath) {
  return path.normalize(filePath)
    .replace(/^\.\//, '')
    .replace(/\\/g, '/');
}

/**
 * Get coverage comparison between Patch Plan and actual changes
 *
 * @param {string} artifactPath - Path to artifact file
 * @param {string} branch - Branch to check (optional)
 * @param {string} baseBranch - Base branch (optional)
 * @returns {Object} Coverage report
 */
function getCoverage(artifactPath, branch = null, baseBranch = null) {
  // Parse artifact to get Patch Plan
  const artifact = parseArtifact(artifactPath);
  const patchPlan = extractPatchPlan(artifact.raw);

  if (patchPlan.length === 0) {
    return {
      error: 'No Patch Plan found in artifact',
      planned: [],
      changed: [],
      coverage: { covered: 0, total: 0, percentage: 0 },
      missing: [],
      unplanned: [],
      matched: []
    };
  }

  // Get actual changed files from git
  const changedFiles = getChangedFiles(branch, baseBranch);

  // Normalize paths for comparison
  const plannedPaths = new Map(
    patchPlan.map(p => [normalizePath(p.file), p])
  );
  const changedPaths = new Map(
    changedFiles.map(c => [normalizePath(c.file), c])
  );

  // Calculate coverage
  const matched = [];      // Files in both planned AND changed
  const missing = [];      // Files planned but NOT changed
  const unplanned = [];    // Files changed but NOT planned

  for (const [plannedPath, plannedItem] of plannedPaths) {
    if (changedPaths.has(plannedPath)) {
      matched.push({
        file: plannedPath,
        planned: plannedItem,
        actual: changedPaths.get(plannedPath),
        status: 'covered'
      });
    } else {
      missing.push({
        file: plannedPath,
        planned: plannedItem,
        status: 'missing'
      });
    }
  }

  for (const [changedPath, changedItem] of changedPaths) {
    if (!plannedPaths.has(changedPath)) {
      unplanned.push({
        file: changedPath,
        actual: changedItem,
        status: 'unplanned'
      });
    }
  }

  const covered = matched.length;
  const total = patchPlan.length;
  const percentage = total > 0 ? Math.round((covered / total) * 100) : 0;

  return {
    planned: patchPlan,
    changed: changedFiles,
    coverage: {
      covered,
      total,
      percentage,
      formatted: `${covered}/${total}`
    },
    matched,
    missing,
    unplanned,
    hasMissing: missing.length > 0,
    hasUnplanned: unplanned.length > 0,
    isComplete: missing.length === 0
  };
}

/**
 * Scan files for TODO/FIXME comments
 *
 * @param {Array<string>} files - File paths to scan
 * @returns {Array<{file: string, line: number, text: string, type: string}>}
 */
function scanTodos(files) {
  const todos = [];
  const patterns = [
    { regex: /\/\/\s*TODO:?\s*(.+)/gi, type: 'TODO' },
    { regex: /\/\/\s*FIXME:?\s*(.+)/gi, type: 'FIXME' },
    { regex: /\/\/\s*HACK:?\s*(.+)/gi, type: 'HACK' },
    { regex: /\/\/\s*XXX:?\s*(.+)/gi, type: 'XXX' },
    { regex: /#\s*TODO:?\s*(.+)/gi, type: 'TODO' },
    { regex: /#\s*FIXME:?\s*(.+)/gi, type: 'FIXME' }
  ];

  for (const filePath of files) {
    const resolvedPath = path.resolve(filePath);

    if (!fs.existsSync(resolvedPath)) {
      continue;
    }

    try {
      const content = fs.readFileSync(resolvedPath, 'utf-8');
      const lines = content.split('\n');

      for (let lineNum = 0; lineNum < lines.length; lineNum++) {
        const line = lines[lineNum];

        for (const { regex, type } of patterns) {
          regex.lastIndex = 0; // Reset regex state
          const match = regex.exec(line);

          if (match) {
            todos.push({
              file: filePath,
              line: lineNum + 1,
              text: match[1].trim(),
              type
            });
          }
        }
      }
    } catch (error) {
      // Skip files that can't be read
    }
  }

  return todos;
}

/**
 * Detect unplanned changes (scope creep)
 *
 * @param {string} artifactPath - Path to artifact file
 * @param {Array<string>} changedFiles - List of changed file paths
 * @returns {Array<{file: string, reason: string}>}
 */
function detectUnplannedChanges(artifactPath, changedFiles) {
  const artifact = parseArtifact(artifactPath);
  const patchPlan = extractPatchPlan(artifact.raw);

  const plannedPaths = new Set(
    patchPlan.map(p => normalizePath(p.file))
  );

  const unplanned = [];

  for (const file of changedFiles) {
    const normalizedFile = normalizePath(typeof file === 'string' ? file : file.file);

    if (!plannedPaths.has(normalizedFile)) {
      unplanned.push({
        file: normalizedFile,
        reason: 'Not in Patch Plan'
      });
    }
  }

  return unplanned;
}

/**
 * Check if a file edit is within scope of active cook
 *
 * @param {string} artifactPath - Path to artifact file
 * @param {string} targetFile - File being edited
 * @returns {Object} { inScope: boolean, reason: string }
 */
function isFileInScope(artifactPath, targetFile) {
  const artifact = parseArtifact(artifactPath);
  const patchPlan = extractPatchPlan(artifact.raw);

  const normalizedTarget = normalizePath(targetFile);
  const plannedPaths = patchPlan.map(p => normalizePath(p.file));

  const isPlanned = plannedPaths.includes(normalizedTarget);

  if (isPlanned) {
    return {
      inScope: true,
      reason: 'File is in Patch Plan'
    };
  }

  // Check if it's a related file (same directory as planned files)
  const plannedDirs = new Set(plannedPaths.map(p => path.dirname(p)));
  const targetDir = path.dirname(normalizedTarget);

  if (plannedDirs.has(targetDir)) {
    return {
      inScope: false,
      reason: 'File is in same directory as planned files but not explicitly planned',
      suggestion: 'Consider adding to Patch Plan via re-cook'
    };
  }

  return {
    inScope: false,
    reason: 'File is outside the scope of this cook',
    suggestion: 'Use --force-untracked or create a new cook'
  };
}

/**
 * Generate coverage report as formatted string
 *
 * @param {Object} coverageResult - Result from getCoverage()
 * @returns {string} Formatted report
 */
function formatCoverageReport(coverageResult) {
  const lines = [];

  lines.push('Coverage Report');
  lines.push('===============');
  lines.push('');

  // Summary
  const { coverage, matched, missing, unplanned } = coverageResult;
  const status = coverage.percentage === 100 ? '✓' : coverage.percentage >= 50 ? '⚠' : '✗';
  lines.push(`${status} Coverage: ${coverage.formatted} (${coverage.percentage}%)`);
  lines.push('');

  // Matched files
  if (matched.length > 0) {
    lines.push('Covered (planned → changed):');
    for (const item of matched) {
      lines.push(`  ✓ ${item.file}`);
    }
    lines.push('');
  }

  // Missing files
  if (missing.length > 0) {
    lines.push('Missing (planned but NOT changed):');
    for (const item of missing) {
      lines.push(`  ✗ ${item.file}`);
      if (item.planned.description) {
        lines.push(`    → ${item.planned.description}`);
      }
    }
    lines.push('');
  }

  // Unplanned files
  if (unplanned.length > 0) {
    lines.push('Unplanned (changed but NOT in plan):');
    for (const item of unplanned) {
      lines.push(`  ⚠ ${item.file} (${item.actual.status})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate verification verdict
 *
 * @param {Object} coverageResult - Result from getCoverage()
 * @param {Array} todos - Result from scanTodos()
 * @returns {Object} { verdict, reasons, canProceed }
 */
function getVerdict(coverageResult, todos = []) {
  const reasons = [];
  let verdict = 'READY';

  // Check coverage
  if (coverageResult.hasMissing) {
    verdict = 'NEEDS_WORK';
    reasons.push(`${coverageResult.missing.length} planned files not modified`);
  }

  // Check unplanned changes
  if (coverageResult.hasUnplanned) {
    if (verdict !== 'NEEDS_WORK') {
      verdict = 'NEEDS_REVIEW';
    }
    reasons.push(`${coverageResult.unplanned.length} unplanned files modified`);
  }

  // Check TODOs
  const criticalTodos = todos.filter(t => t.type === 'FIXME' || t.type === 'XXX');
  if (criticalTodos.length > 0) {
    if (verdict !== 'NEEDS_WORK') {
      verdict = 'NEEDS_REVIEW';
    }
    reasons.push(`${criticalTodos.length} FIXME/XXX comments found`);
  }

  if (todos.length > 0 && verdict === 'READY') {
    reasons.push(`${todos.length} TODO comments found (non-blocking)`);
  }

  return {
    verdict,
    reasons,
    canProceed: verdict !== 'NEEDS_WORK',
    summary: verdict === 'READY'
      ? 'All planned files covered, ready for PR'
      : verdict === 'NEEDS_REVIEW'
        ? 'Coverage complete but has warnings'
        : 'Missing coverage, fix before PR'
  };
}

/**
 * Run full structural verification
 *
 * @param {string} artifactPath - Path to artifact file
 * @param {string} branch - Branch to check (optional)
 * @returns {Object} Full verification result
 */
function runStructuralVerification(artifactPath, branch = null) {
  // Get coverage
  const coverageResult = getCoverage(artifactPath, branch);

  if (coverageResult.error) {
    return {
      error: coverageResult.error,
      verdict: 'ERROR',
      canProceed: false
    };
  }

  // Scan TODOs in changed files
  const changedFilePaths = coverageResult.changed.map(c => c.file);
  const todos = scanTodos(changedFilePaths);

  // Get verdict
  const verdictResult = getVerdict(coverageResult, todos);

  return {
    coverage: coverageResult,
    todos,
    ...verdictResult,
    report: formatCoverageReport(coverageResult)
  };
}

module.exports = {
  // Core functions
  getCoverage,
  scanTodos,
  detectUnplannedChanges,
  isFileInScope,

  // Reporting
  formatCoverageReport,
  getVerdict,

  // Full verification
  runStructuralVerification,

  // Utilities
  normalizePath
};
