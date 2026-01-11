#!/usr/bin/env node

/**
 * Tests for cook-validate and validator.js
 *
 * Run with: node test/cook-validate.test.js
 */

const assert = require('assert');
const path = require('path');
const {
  validateArtifact,
  checks,
  REQUIRED_SECTIONS,
  CHECK_DEFINITIONS,
  getSeverityCounts
} = require('../scripts/lib/validator');
const { parseArtifact, parseSections, parseHeader } = require('../scripts/lib/artifactParser');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (error) {
    console.log(`  [FAIL] ${name}`);
    console.log(`         ${error.message}`);
    failed++;
  }
}

function suite(name, fn) {
  console.log(`\n${name}`);
  console.log('='.repeat(name.length));
  fn();
}

// Helper to create mock artifact
function mockArtifact(overrides = {}) {
  const sections = new Map([
    ['Dish', 'Test feature'],
    ['Status', 'cooking'],
    ['Cooking Mode', 'well-done'],
    ['Ownership', '- Decision Owner: @testuser\n- Reviewers: auto'],
    ['Scope', '### In Scope\n- Item A\n\n### Out of Scope\n- Item B'],
    ['Pre-mortem', '1. **Problem A** -> mitigation: Fix A\n2. **Problem B** -> mitigation: Fix B\n3. **Problem C** -> mitigation: Fix C'],
    ['Trade-offs', '- Sacrificing: Time\n- Reason: Speed\n- Rejected alternatives:\n  - Alt A - rejected because X'],
    ['Implementation Plan', '### Files to Modify\n1. src/app.js'],
    ['QA Plan', '### Test Cases\n1. Test A\n2. Test B\n3. Test C'],
    ['Security Review', '- Reviewed: yes\n- Issues found: none']
  ]);

  // Apply overrides
  for (const [key, value] of Object.entries(overrides.sections || {})) {
    if (value === null) {
      sections.delete(key);
    } else {
      sections.set(key, value);
    }
  }

  return {
    path: '/test/artifact.cook.md',
    filename: 'artifact.cook.md',
    date: '2026-01-10',
    header: {
      title: 'Test feature',
      status: 'cooking',
      mode: 'well-done',
      owner: '@testuser',
      ...overrides.header
    },
    sections,
    changelog: [],
    raw: ''
  };
}

// Tests

suite('Configuration', () => {
  test('REQUIRED_SECTIONS has well-done sections', () => {
    assert.ok(REQUIRED_SECTIONS['well-done'].includes('Dish'));
    assert.ok(REQUIRED_SECTIONS['well-done'].includes('Scope'));
    assert.ok(REQUIRED_SECTIONS['well-done'].includes('QA Plan'));
  });

  test('REQUIRED_SECTIONS has microwave sections', () => {
    assert.ok(REQUIRED_SECTIONS['microwave'].includes('Dish'));
    assert.ok(REQUIRED_SECTIONS['microwave'].includes('Problem Statement'));
    assert.ok(REQUIRED_SECTIONS['microwave'].includes('Fix Plan'));
  });

  test('CHECK_DEFINITIONS has all 10 checks', () => {
    const checkIds = Object.keys(CHECK_DEFINITIONS);
    assert.strictEqual(checkIds.length, 10);
    assert.ok(checkIds.includes('no-scope'));
    assert.ok(checkIds.includes('no-premortem'));
    assert.ok(checkIds.includes('missing-tests'));
  });
});

suite('checkNoScope', () => {
  test('passes when In Scope and Out of Scope present', () => {
    const artifact = mockArtifact();
    const result = checks.checkNoScope(artifact, 'well-done');
    assert.strictEqual(result.passed, true);
  });

  test('fails when In Scope missing', () => {
    const artifact = mockArtifact({
      sections: { 'Scope': '### Out of Scope\n- Item B' }
    });
    const result = checks.checkNoScope(artifact, 'well-done');
    assert.strictEqual(result.passed, false);
    assert.strictEqual(result.severity, 'ERROR');
  });

  test('fails when Out of Scope missing', () => {
    const artifact = mockArtifact({
      sections: { 'Scope': '### In Scope\n- Item A' }
    });
    const result = checks.checkNoScope(artifact, 'well-done');
    assert.strictEqual(result.passed, false);
  });

  test('skipped for microwave mode', () => {
    const artifact = mockArtifact();
    const result = checks.checkNoScope(artifact, 'microwave');
    assert.strictEqual(result, null);
  });
});

suite('checkNoPremortem', () => {
  test('passes when Pre-mortem section exists', () => {
    const artifact = mockArtifact();
    const result = checks.checkNoPremortem(artifact, 'well-done');
    assert.strictEqual(result.passed, true);
  });

  test('fails when Pre-mortem missing', () => {
    const artifact = mockArtifact({ sections: { 'Pre-mortem': null } });
    const result = checks.checkNoPremortem(artifact, 'well-done');
    assert.strictEqual(result.passed, false);
    assert.strictEqual(result.severity, 'ERROR');
  });

  test('handles variant section names', () => {
    const artifact = mockArtifact({
      sections: { 'Pre-mortem': null, 'Pre-mortem (3 scenarios)': '1. A\n2. B\n3. C' }
    });
    const result = checks.checkNoPremortem(artifact, 'well-done');
    assert.strictEqual(result.passed, true);
  });
});

suite('checkThinPremortem', () => {
  test('passes with 3+ scenarios', () => {
    const artifact = mockArtifact();
    const result = checks.checkThinPremortem(artifact, 'well-done');
    assert.strictEqual(result.passed, true);
  });

  test('warns with < 3 scenarios', () => {
    const artifact = mockArtifact({
      sections: { 'Pre-mortem': '1. Only one scenario' }
    });
    const result = checks.checkThinPremortem(artifact, 'well-done');
    assert.strictEqual(result.passed, false);
    assert.strictEqual(result.severity, 'WARNING');
  });

  test('skipped for microwave mode', () => {
    const artifact = mockArtifact();
    const result = checks.checkThinPremortem(artifact, 'microwave');
    assert.strictEqual(result, null);
  });
});

suite('checkNoOwner', () => {
  test('passes when Decision Owner in header', () => {
    const artifact = mockArtifact();
    const result = checks.checkNoOwner(artifact, 'well-done');
    assert.strictEqual(result.passed, true);
  });

  test('fails when no owner', () => {
    const artifact = mockArtifact({
      header: { owner: null },
      sections: { 'Ownership': '- Reviewers: auto' }
    });
    const result = checks.checkNoOwner(artifact, 'well-done');
    assert.strictEqual(result.passed, false);
    assert.strictEqual(result.severity, 'ERROR');
  });

  test('skipped for microwave mode', () => {
    const artifact = mockArtifact({ header: { owner: null } });
    const result = checks.checkNoOwner(artifact, 'microwave');
    assert.strictEqual(result, null);
  });
});

suite('checkMissingTests', () => {
  test('passes with 3+ test cases for well-done', () => {
    const artifact = mockArtifact();
    const result = checks.checkMissingTests(artifact, 'well-done');
    assert.strictEqual(result.passed, true);
  });

  test('fails with < 3 test cases for well-done', () => {
    const artifact = mockArtifact({
      sections: { 'QA Plan': '### Test Cases\n1. Only one test' }
    });
    const result = checks.checkMissingTests(artifact, 'well-done');
    assert.strictEqual(result.passed, false);
    assert.strictEqual(result.severity, 'ERROR');
  });

  test('passes with 1+ test cases for microwave', () => {
    const artifact = mockArtifact({
      sections: { 'Tests': '- Test 1' }
    });
    const result = checks.checkMissingTests(artifact, 'microwave');
    assert.strictEqual(result.passed, true);
  });
});

suite('checkTbdSections', () => {
  test('passes with no TBD markers', () => {
    const artifact = mockArtifact();
    const result = checks.checkTbdSections(artifact, 'well-done');
    assert.strictEqual(result.passed, true);
  });

  test('fails when TBD found', () => {
    const artifact = mockArtifact({
      sections: { 'Scope': '### In Scope\n- TBD\n\n### Out of Scope\n- Item' }
    });
    const result = checks.checkTbdSections(artifact, 'well-done');
    assert.strictEqual(result.passed, false);
    assert.strictEqual(result.severity, 'ERROR');
  });

  test('fails when TODO found', () => {
    const artifact = mockArtifact({
      sections: { 'Implementation Plan': 'TODO: add details' }
    });
    const result = checks.checkTbdSections(artifact, 'well-done');
    assert.strictEqual(result.passed, false);
  });
});

suite('checkEmptySection', () => {
  test('passes when all required sections have content', () => {
    const artifact = mockArtifact();
    const result = checks.checkEmptySection(artifact, 'well-done');
    assert.strictEqual(result.passed, true);
  });

  test('fails when required section is empty', () => {
    const artifact = mockArtifact({
      sections: { 'QA Plan': '' }
    });
    const result = checks.checkEmptySection(artifact, 'well-done');
    assert.strictEqual(result.passed, false);
    assert.strictEqual(result.severity, 'ERROR');
  });
});

suite('checkNoRollback', () => {
  test('passes when rollback steps present', () => {
    const artifact = mockArtifact({
      sections: { 'Blast Radius & Rollout': '### Rollback Steps\n1. Revert' }
    });
    const result = checks.checkNoRollback(artifact, 'well-done');
    assert.strictEqual(result.passed, true);
  });

  test('warns when rollback missing', () => {
    const artifact = mockArtifact({
      sections: { 'Blast Radius & Rollout': '- Affected: All users' }
    });
    const result = checks.checkNoRollback(artifact, 'well-done');
    assert.strictEqual(result.passed, false);
    assert.strictEqual(result.severity, 'WARNING');
  });
});

suite('checkNoAlternatives', () => {
  test('passes when rejected alternatives present', () => {
    const artifact = mockArtifact();
    const result = checks.checkNoAlternatives(artifact, 'well-done');
    assert.strictEqual(result.passed, true);
  });

  test('warns when no alternatives documented', () => {
    const artifact = mockArtifact({
      sections: { 'Trade-offs': '- Sacrificing: Time' }
    });
    const result = checks.checkNoAlternatives(artifact, 'well-done');
    assert.strictEqual(result.passed, false);
    assert.strictEqual(result.severity, 'WARNING');
  });
});

suite('validateArtifact (integration)', () => {
  test('valid well-done artifact passes', () => {
    const artifact = parseArtifact(path.join(FIXTURES_DIR, 'valid-well-done.cook.md'));
    const result = validateArtifact(artifact);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.errorCount, 0);
  });

  test('valid microwave artifact passes', () => {
    const artifact = parseArtifact(path.join(FIXTURES_DIR, 'valid-microwave.cook.md'));
    const result = validateArtifact(artifact);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.mode, 'microwave');
  });

  test('invalid artifact (no owner) fails', () => {
    const artifact = parseArtifact(path.join(FIXTURES_DIR, 'invalid-no-owner.cook.md'));
    const result = validateArtifact(artifact);
    assert.strictEqual(result.valid, false);
    assert.ok(result.results.some(r => r.checkId === 'no-owner' && !r.passed));
  });

  test('invalid artifact (no scope) fails', () => {
    const artifact = parseArtifact(path.join(FIXTURES_DIR, 'invalid-no-scope.cook.md'));
    const result = validateArtifact(artifact);
    assert.strictEqual(result.valid, false);
    assert.ok(result.results.some(r => r.checkId === 'no-scope' && !r.passed));
  });

  test('invalid artifact (TBD) fails', () => {
    const artifact = parseArtifact(path.join(FIXTURES_DIR, 'invalid-tbd.cook.md'));
    const result = validateArtifact(artifact);
    assert.strictEqual(result.valid, false);
    assert.ok(result.results.some(r => r.checkId === 'tbd-sections' && !r.passed));
  });

  test('invalid artifact (thin premortem) has warning', () => {
    const artifact = parseArtifact(path.join(FIXTURES_DIR, 'invalid-thin-premortem.cook.md'));
    const result = validateArtifact(artifact);
    assert.ok(result.results.some(r => r.checkId === 'thin-premortem' && !r.passed));
    assert.ok(result.warningCount > 0);
  });

  test('invalid artifact (missing tests) fails', () => {
    const artifact = parseArtifact(path.join(FIXTURES_DIR, 'invalid-missing-tests.cook.md'));
    const result = validateArtifact(artifact);
    assert.strictEqual(result.valid, false);
    assert.ok(result.results.some(r => r.checkId === 'missing-tests' && !r.passed));
  });

  test('mode override works', () => {
    const artifact = parseArtifact(path.join(FIXTURES_DIR, 'valid-well-done.cook.md'));
    const result = validateArtifact(artifact, { mode: 'microwave' });
    assert.strictEqual(result.mode, 'microwave');
  });

  test('skipChecks works', () => {
    const artifact = parseArtifact(path.join(FIXTURES_DIR, 'invalid-no-owner.cook.md'));
    const result = validateArtifact(artifact, { skipChecks: ['no-owner'] });
    assert.ok(!result.results.some(r => r.checkId === 'no-owner'));
  });
});

suite('getSeverityCounts', () => {
  test('correctly counts errors and warnings', () => {
    const result = {
      results: [
        { passed: true, severity: 'ERROR' },
        { passed: false, severity: 'ERROR' },
        { passed: false, severity: 'WARNING' },
        { passed: true, severity: 'WARNING' }
      ]
    };
    const counts = getSeverityCounts(result);
    assert.strictEqual(counts.errors, 1);
    assert.strictEqual(counts.warnings, 1);
    assert.strictEqual(counts.passed, 2);
  });
});

// Summary
console.log('\n' + '='.repeat(40));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(40));

process.exit(failed > 0 ? 1 : 0);
