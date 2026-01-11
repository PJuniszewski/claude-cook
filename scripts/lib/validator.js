/**
 * Validator for cook artifacts
 *
 * Validates artifacts against mode-specific requirements.
 * Detects "AI went too fast" patterns before implementation.
 */

const { parseArtifact, parseSections, parseHeader } = require('./artifactParser');

// Required sections by cooking mode
const REQUIRED_SECTIONS = {
  'well-done': [
    'Dish',
    'Status',
    'Cooking Mode',
    'Ownership',
    'Scope',
    'Pre-mortem',
    'Trade-offs',
    'Implementation Plan',
    'QA Plan',
    'Security Review'
  ],
  'microwave': [
    'Dish',
    'Status',
    'Cooking Mode',
    'Problem Statement',
    'Fix Plan',
    'Why Safe',
    'Tests'
  ]
};

// Check definitions with metadata
const CHECK_DEFINITIONS = {
  'no-scope': {
    description: 'Missing In/Out scope definition',
    modes: ['well-done'],
    severity: 'ERROR'
  },
  'no-premortem': {
    description: 'Missing pre-mortem section',
    modes: ['well-done', 'microwave'],
    severity: 'ERROR'
  },
  'thin-premortem': {
    description: 'Pre-mortem has < 3 scenarios',
    modes: ['well-done'],
    severity: 'WARNING'
  },
  'no-alternatives': {
    description: 'No rejected alternatives documented',
    modes: ['well-done'],
    severity: 'WARNING'
  },
  'missing-tests': {
    description: 'Insufficient test cases',
    modes: ['well-done', 'microwave'],
    severity: 'ERROR'
  },
  'no-rollback': {
    description: 'Missing rollback plan',
    modes: ['well-done'],
    severity: 'WARNING'
  },
  'no-owner': {
    description: 'No Decision Owner assigned',
    modes: ['well-done'],
    severity: 'ERROR'
  },
  'tbd-sections': {
    description: 'Section contains TBD placeholder',
    modes: ['well-done', 'microwave'],
    severity: 'ERROR'
  },
  'empty-section': {
    description: 'Required section is empty',
    modes: ['well-done', 'microwave'],
    severity: 'ERROR'
  },
  'scope-creep': {
    description: 'Out-of-scope items in implementation',
    modes: ['well-done', 'microwave'],
    severity: 'WARNING'
  }
};

/**
 * Check for In Scope and Out of Scope subsections
 */
function checkNoScope(artifact, mode) {
  if (mode !== 'well-done') return null;

  const scopeSection = artifact.sections.get('Scope') || '';
  const hasInScope = /### In Scope/i.test(scopeSection);
  const hasOutScope = /### Out of Scope/i.test(scopeSection);

  if (!hasInScope || !hasOutScope) {
    const missing = [];
    if (!hasInScope) missing.push('In Scope');
    if (!hasOutScope) missing.push('Out of Scope');
    return {
      checkId: 'no-scope',
      passed: false,
      severity: 'ERROR',
      message: `Missing ${missing.join(' and ')} subsection(s)`,
      details: 'Add ### In Scope and ### Out of Scope under ## Scope'
    };
  }

  return { checkId: 'no-scope', passed: true, severity: 'ERROR', message: 'Scope sections present' };
}

/**
 * Check for Pre-mortem section existence
 */
function checkNoPremortem(artifact, mode) {
  // Look for Pre-mortem section with various naming patterns
  let premortem = null;
  for (const [name] of artifact.sections) {
    if (/pre-?mortem/i.test(name)) {
      premortem = artifact.sections.get(name);
      break;
    }
  }

  if (!premortem) {
    return {
      checkId: 'no-premortem',
      passed: false,
      severity: 'ERROR',
      message: 'Missing Pre-mortem section',
      details: 'Add ## Pre-mortem with failure scenarios and mitigations'
    };
  }

  return { checkId: 'no-premortem', passed: true, severity: 'ERROR', message: 'Pre-mortem present' };
}

/**
 * Check that well-done has at least 3 pre-mortem scenarios
 */
function checkThinPremortem(artifact, mode) {
  if (mode !== 'well-done') return null;

  // Find Pre-mortem section
  let premortem = '';
  for (const [name, content] of artifact.sections) {
    if (/pre-?mortem/i.test(name)) {
      premortem = content;
      break;
    }
  }

  if (!premortem) return null; // Handled by no-premortem check

  // Count numbered scenarios (e.g., "1. ", "2. ", "3. ")
  const scenarios = premortem.match(/^\d+\.\s+\*?\*?[^*\n]/gm) || [];

  if (scenarios.length < 3) {
    return {
      checkId: 'thin-premortem',
      passed: false,
      severity: 'WARNING',
      message: `Pre-mortem has ${scenarios.length} scenario(s), need 3+`,
      details: 'Add more failure scenarios with mitigations'
    };
  }

  return { checkId: 'thin-premortem', passed: true, severity: 'WARNING', message: `Pre-mortem (${scenarios.length} scenarios)` };
}

/**
 * Check for rejected alternatives in Trade-offs section
 */
function checkNoAlternatives(artifact, mode) {
  if (mode !== 'well-done') return null;

  const tradeoffs = artifact.sections.get('Trade-offs') || '';

  // Look for "rejected" or "Rejected alternatives" patterns
  const hasAlternatives = /rejected\s+(alternative|because|due)/i.test(tradeoffs) ||
                         /alternatives?\s*:?[\s\S]*?-/i.test(tradeoffs);

  if (!hasAlternatives) {
    return {
      checkId: 'no-alternatives',
      passed: false,
      severity: 'WARNING',
      message: 'No rejected alternatives documented',
      details: 'Document at least one alternative that was considered'
    };
  }

  return { checkId: 'no-alternatives', passed: true, severity: 'WARNING', message: 'Alternatives documented' };
}

/**
 * Check for minimum test cases (3 for well-done, 1 for microwave)
 */
function checkMissingTests(artifact, mode) {
  const qaSection = artifact.sections.get('QA Plan') || '';
  const testsSection = artifact.sections.get('Tests') || '';
  const qaPlanSection = artifact.sections.get('QA Status') || '';

  // Look for Test Cases subsection or general test items
  const testCasesMatch = qaSection.match(/### Test Cases[\s\S]*?(?=###|$)/i) || [''];
  const combinedTests = testCasesMatch[0] + testsSection + qaPlanSection;

  // Count test items - numbered items (1. or 1)) or bullet items (- or *)
  // Pattern: optional whitespace, then either (number + period/paren) or (dash/asterisk), then space, then content
  const testItems = combinedTests.match(/^\s*(?:\d+[.)]\s+|[-*]\s+).+/gm) || [];

  const minTests = mode === 'well-done' ? 3 : 1;

  if (testItems.length < minTests) {
    return {
      checkId: 'missing-tests',
      passed: false,
      severity: 'ERROR',
      message: `Found ${testItems.length} test case(s), need ${minTests}+`,
      details: `${mode} mode requires at least ${minTests} test case(s)`
    };
  }

  return { checkId: 'missing-tests', passed: true, severity: 'ERROR', message: `Test cases (${testItems.length} defined)` };
}

/**
 * Check for rollback plan
 */
function checkNoRollback(artifact, mode) {
  if (mode !== 'well-done') return null;

  const blastRadius = artifact.sections.get('Blast Radius & Rollout') || '';
  const hasRollback = /### Rollback/i.test(blastRadius) ||
                      /rollback\s+(step|plan)/i.test(blastRadius) ||
                      /^\s*\d+\.\s+.+rollback/im.test(blastRadius);

  if (!hasRollback) {
    return {
      checkId: 'no-rollback',
      passed: false,
      severity: 'WARNING',
      message: 'Missing rollback plan',
      details: 'Add ### Rollback Steps with numbered steps'
    };
  }

  return { checkId: 'no-rollback', passed: true, severity: 'WARNING', message: 'Rollback plan present' };
}

/**
 * Check for Decision Owner in Ownership section
 */
function checkNoOwner(artifact, mode) {
  if (mode !== 'well-done') return null;

  // Use header.owner from parseHeader
  if (artifact.header && artifact.header.owner) {
    return { checkId: 'no-owner', passed: true, severity: 'ERROR', message: 'Ownership assigned' };
  }

  const ownership = artifact.sections.get('Ownership') || '';
  const hasOwner = /Decision Owner:\s*\S+/i.test(ownership);

  if (!hasOwner) {
    return {
      checkId: 'no-owner',
      passed: false,
      severity: 'ERROR',
      message: 'No Decision Owner assigned',
      details: 'Add "- Decision Owner: @name" in Ownership section'
    };
  }

  return { checkId: 'no-owner', passed: true, severity: 'ERROR', message: 'Ownership assigned' };
}

/**
 * Check for TBD/TODO/FIXME placeholders in sections
 */
function checkTbdSections(artifact, mode) {
  const tbdSections = [];

  for (const [name, content] of artifact.sections) {
    // Match TBD, TODO, FIXME as placeholders (case insensitive, word boundary)
    // Exclude common false positives in comments
    if (/\bTBD\b|\bTODO\b|\bFIXME\b/i.test(content)) {
      // Don't flag if it's in a comment explaining what NOT to do
      if (!/<!--[\s\S]*?(TBD|TODO|FIXME)[\s\S]*?-->/i.test(content)) {
        tbdSections.push(name);
      }
    }
  }

  if (tbdSections.length > 0) {
    return {
      checkId: 'tbd-sections',
      passed: false,
      severity: 'ERROR',
      message: `TBD/TODO found in ${tbdSections.length} section(s)`,
      details: `Sections: ${tbdSections.join(', ')}`
    };
  }

  return { checkId: 'tbd-sections', passed: true, severity: 'ERROR', message: 'No TBD placeholders' };
}

/**
 * Find section content by name, handling variants like "Pre-mortem (3 scenarios)"
 */
function findSectionContent(sections, baseName) {
  // Try exact match first
  if (sections.has(baseName)) {
    return sections.get(baseName);
  }
  // Try prefix match for variants like "Pre-mortem (3 scenarios)"
  for (const [name, content] of sections) {
    if (name.toLowerCase().startsWith(baseName.toLowerCase())) {
      return content;
    }
  }
  return '';
}

/**
 * Check that required sections are not empty
 */
function checkEmptySection(artifact, mode) {
  const requiredSections = REQUIRED_SECTIONS[mode] || REQUIRED_SECTIONS['well-done'];
  const emptySections = [];

  for (const sectionName of requiredSections) {
    const content = findSectionContent(artifact.sections, sectionName);
    // Remove comments and trim
    const stripped = content.replace(/<!--[\s\S]*?-->/g, '').trim();

    // Empty if only whitespace, placeholder markers, or very short
    if (stripped.length < 5 || /^<.*>$/.test(stripped)) {
      emptySections.push(sectionName);
    }
  }

  if (emptySections.length > 0) {
    return {
      checkId: 'empty-section',
      passed: false,
      severity: 'ERROR',
      message: `${emptySections.length} required section(s) empty`,
      details: `Empty: ${emptySections.join(', ')}`
    };
  }

  return { checkId: 'empty-section', passed: true, severity: 'ERROR', message: 'Required sections populated' };
}

/**
 * Check if out-of-scope items appear in implementation plan
 */
function checkScopeCreep(artifact, mode) {
  const scope = artifact.sections.get('Scope') || '';
  const implPlan = artifact.sections.get('Implementation Plan') ||
                   artifact.sections.get('Fix Plan') ||
                   artifact.sections.get('Patch Plan') || '';

  // Extract out-of-scope items
  const outOfScopeMatch = scope.match(/### Out of Scope[\s\S]*?(?=###|$)/i);
  if (!outOfScopeMatch) return null;

  const outOfScopeItems = outOfScopeMatch[0]
    .split('\n')
    .filter(line => /^\s*[-*]/.test(line))
    .map(line => line.replace(/^\s*[-*]\s*/, '').trim().toLowerCase())
    .filter(item => item.length > 0);

  if (outOfScopeItems.length === 0) return null;

  // Check if any out-of-scope keywords appear in implementation
  // Use specific matching: require longer keywords (8+ chars) to reduce false positives
  // Common words like "feature", "future", "work" are excluded
  const commonWords = ['feature', 'future', 'work', 'later', 'scope', 'phase', 'version', 'release', 'nothing'];
  const implLower = implPlan.toLowerCase();

  const creepItems = outOfScopeItems.filter(item => {
    // Extract significant keywords (8+ chars, not common words)
    const keywords = item.split(/\s+/)
      .map(w => w.replace(/[^a-z]/g, '')) // Remove non-alpha
      .filter(w => w.length >= 8 && !commonWords.includes(w));
    return keywords.some(keyword => implLower.includes(keyword));
  });

  if (creepItems.length > 0) {
    return {
      checkId: 'scope-creep',
      passed: false,
      severity: 'WARNING',
      message: 'Potential scope creep detected',
      details: `Out-of-scope items may be in implementation: ${creepItems.slice(0, 2).join(', ')}`
    };
  }

  return { checkId: 'scope-creep', passed: true, severity: 'WARNING', message: 'No scope creep detected' };
}

// All check functions
const checks = {
  checkNoScope,
  checkNoPremortem,
  checkThinPremortem,
  checkNoAlternatives,
  checkMissingTests,
  checkNoRollback,
  checkNoOwner,
  checkTbdSections,
  checkEmptySection,
  checkScopeCreep
};

/**
 * Get counts of errors, warnings, and passed checks
 *
 * @param {Object} result - Validation result
 * @returns {{errors: number, warnings: number, passed: number}}
 */
function getSeverityCounts(result) {
  let errors = 0;
  let warnings = 0;
  let passed = 0;

  for (const check of result.results) {
    if (check.passed) {
      passed++;
    } else if (check.severity === 'ERROR') {
      errors++;
    } else {
      warnings++;
    }
  }

  return { errors, warnings, passed };
}

/**
 * Format validation result for console output
 *
 * @param {Object} result - Validation result
 * @param {Object} options - Formatting options
 * @returns {string} Formatted output string
 */
function formatResult(result, options = {}) {
  const lines = [];

  for (const check of result.results) {
    if (check.passed && !options.verbose) continue;

    const icon = check.passed ? '[PASS]' : (check.severity === 'ERROR' ? '[FAIL]' : '[WARN]');
    lines.push(`${icon} ${check.message}`);

    if (!check.passed && check.details && options.verbose) {
      lines.push(`       ${check.details}`);
    }
  }

  return lines.join('\n');
}

/**
 * Validate a cook artifact
 *
 * @param {Object} artifact - Parsed artifact from parseArtifact()
 * @param {Object} options - Validation options
 * @param {string} [options.mode] - Override mode detection
 * @param {string[]} [options.skipChecks] - Check IDs to skip
 * @returns {Object} Validation result
 */
function validateArtifact(artifact, options = {}) {
  // Detect mode from artifact or use override
  const mode = options.mode || (artifact.header && artifact.header.mode) || 'well-done';
  const skipChecks = options.skipChecks || [];

  const results = [];

  // Run all checks
  const checkFunctions = [
    checkNoScope,
    checkNoPremortem,
    checkThinPremortem,
    checkNoAlternatives,
    checkMissingTests,
    checkNoRollback,
    checkNoOwner,
    checkTbdSections,
    checkEmptySection,
    checkScopeCreep
  ];

  for (const checkFn of checkFunctions) {
    const result = checkFn(artifact, mode);

    // Skip if check returns null (not applicable to mode)
    if (result === null) continue;

    // Skip if in skipChecks list
    if (skipChecks.includes(result.checkId)) continue;

    results.push(result);
  }

  // Calculate validity (valid if no ERRORs)
  const counts = getSeverityCounts({ results });
  const valid = counts.errors === 0;

  return {
    valid,
    mode,
    results,
    errorCount: counts.errors,
    warningCount: counts.warnings
  };
}

module.exports = {
  validateArtifact,
  checks,
  REQUIRED_SECTIONS,
  CHECK_DEFINITIONS,
  formatResult,
  getSeverityCounts
};
