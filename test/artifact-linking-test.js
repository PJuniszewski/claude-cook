#!/usr/bin/env node

/**
 * Artifact Linking Test
 *
 * Verifies that the code-artifact-linking feature works correctly.
 * Tests state management, artifact parsing, and git operations.
 */

const path = require('path');
const { test, suite, assert, assertEqual } = require('../scripts/lib/testUtils');

// Import modules to test
const stateManager = require('../scripts/lib/stateManager');
const artifactParser = require('../scripts/lib/artifactParser');
const gitOps = require('../scripts/lib/gitOperations');

suite('State Manager', () => {
  test('loadState returns object', () => {
    const state = stateManager.loadState();
    assert(typeof state === 'object', 'state should be object');
  });

  test('state has required fields', () => {
    const state = stateManager.loadState();
    assert('cooks' in state, 'state should have cooks');
    assert('version' in state, 'state should have version');
  });

  test('extractSlugFromCookId works', () => {
    const slug = stateManager.extractSlugFromCookId('user-auth.2026-01-12');
    assertEqual(slug, 'user-auth', 'slug extraction');
  });
});

suite('Artifact Parser', () => {
  test('parseImplementationStatus exists', () => {
    assert(typeof artifactParser.parseImplementationStatus === 'function',
      'parseImplementationStatus should be a function');
  });

  test('extractPatchPlan exists', () => {
    assert(typeof artifactParser.extractPatchPlan === 'function',
      'extractPatchPlan should be a function');
  });

  test('extractCookId works', () => {
    const id = artifactParser.extractCookId('feature.2026-01-13.cook.md');
    assertEqual(id, 'feature.2026-01-13', 'cook ID extraction');
  });
});

suite('Git Operations', () => {
  test('getCurrentBranch returns string', () => {
    const branch = gitOps.getCurrentBranch();
    assert(typeof branch === 'string', 'branch should be string');
    assert(branch.length > 0, 'branch should not be empty');
  });

  test('isCookBranch detects cook branches', () => {
    assert(gitOps.isCookBranch('cook/test') === true, 'cook/test is cook branch');
    assert(gitOps.isCookBranch('main') === false, 'main is not cook branch');
  });
});

console.log('\n✓ All artifact linking tests passed!\n');
