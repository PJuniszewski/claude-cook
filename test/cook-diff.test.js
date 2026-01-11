#!/usr/bin/env node

/**
 * Tests for cook-diff and artifactParser
 *
 * Run with: node test/cook-diff.test.js
 */

const assert = require('assert');
const path = require('path');
const {
  parseHeader,
  parseSections,
  parseChangelog,
  extractDateFromFilename,
  diffSections,
  filterChangelogByDate,
  parseArtifact
} = require('../scripts/lib/artifactParser');

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

// Tests

suite('parseHeader', () => {
  const content = `# Cooking Result

## Dish
My Test Feature

## Status
well-done

## Cooking Mode
well-done

## Ownership
- Decision Owner: @developer
- Reviewers: auto
`;

  test('extracts title from Dish section', () => {
    const header = parseHeader(content);
    assert.strictEqual(header.title, 'My Test Feature');
  });

  test('extracts status', () => {
    const header = parseHeader(content);
    assert.strictEqual(header.status, 'well-done');
  });

  test('extracts cooking mode', () => {
    const header = parseHeader(content);
    assert.strictEqual(header.mode, 'well-done');
  });

  test('extracts decision owner', () => {
    const header = parseHeader(content);
    assert.strictEqual(header.owner, '@developer');
  });
});

suite('parseSections', () => {
  const content = `# Cooking Result

## Dish
Test

## Status
cooking

## Scope

### In Scope
- Item one

## QA Plan

### Test Cases
1. Test one
`;

  test('extracts all sections', () => {
    const sections = parseSections(content);
    assert.ok(sections.has('Dish'));
    assert.ok(sections.has('Status'));
    assert.ok(sections.has('Scope'));
    assert.ok(sections.has('QA Plan'));
  });

  test('preserves section content', () => {
    const sections = parseSections(content);
    assert.ok(sections.get('Scope').includes('In Scope'));
  });
});

suite('parseChangelog', () => {
  // Content needs to have proper section ending (next section or end of file)
  const content = `## Other Section
Some content

## Changelog
2026-01-07: Initial version
2026-01-08: Added feature X
2026-01-10: Fixed bug Y

## Next Section
`;

  test('extracts all changelog entries', () => {
    const entries = parseChangelog(content);
    assert.strictEqual(entries.length, 3);
  });

  test('parses dates correctly', () => {
    const entries = parseChangelog(content);
    assert.strictEqual(entries[0].date, '2026-01-07');
    assert.strictEqual(entries[1].date, '2026-01-08');
  });

  test('parses summaries correctly', () => {
    const entries = parseChangelog(content);
    assert.strictEqual(entries[0].summary, 'Initial version');
    assert.strictEqual(entries[2].summary, 'Fixed bug Y');
  });

  test('handles empty changelog', () => {
    const content2 = `## Changelog
<!-- no entries -->

## Other`;
    const entries = parseChangelog(content2);
    assert.strictEqual(entries.length, 0);
  });
});

suite('extractDateFromFilename', () => {
  test('extracts date from valid filename', () => {
    const date = extractDateFromFilename('feature.2026-01-07.cook.md');
    assert.strictEqual(date, '2026-01-07');
  });

  test('extracts date from path with filename', () => {
    const date = extractDateFromFilename('/path/to/auth.2026-01-10.cook.md');
    assert.strictEqual(date, '2026-01-10');
  });

  test('returns null for invalid filename', () => {
    const date = extractDateFromFilename('feature.cook.md');
    assert.strictEqual(date, null);
  });
});

suite('diffSections', () => {
  test('detects added sections', () => {
    const sectionsA = new Map([['Dish', 'Test']]);
    const sectionsB = new Map([['Dish', 'Test'], ['Security', 'New content']]);
    const diff = diffSections(sectionsA, sectionsB);
    assert.strictEqual(diff.added.length, 1);
    assert.strictEqual(diff.added[0].name, 'Security');
  });

  test('detects removed sections', () => {
    const sectionsA = new Map([['Dish', 'Test'], ['Open Questions', 'Q1']]);
    const sectionsB = new Map([['Dish', 'Test']]);
    const diff = diffSections(sectionsA, sectionsB);
    assert.strictEqual(diff.removed.length, 1);
    assert.strictEqual(diff.removed[0].name, 'Open Questions');
  });

  test('detects modified sections', () => {
    const sectionsA = new Map([['Scope', 'Item 1']]);
    const sectionsB = new Map([['Scope', 'Item 1\nItem 2']]);
    const diff = diffSections(sectionsA, sectionsB);
    assert.strictEqual(diff.modified.length, 1);
    assert.strictEqual(diff.modified[0].name, 'Scope');
  });

  test('detects no changes for identical sections', () => {
    const sections = new Map([['Dish', 'Test'], ['Scope', 'Items']]);
    const diff = diffSections(sections, sections);
    assert.strictEqual(diff.added.length, 0);
    assert.strictEqual(diff.removed.length, 0);
    assert.strictEqual(diff.modified.length, 0);
    assert.strictEqual(diff.unchanged.length, 2);
  });
});

suite('filterChangelogByDate', () => {
  const entries = [
    { date: '2026-01-05', summary: 'Old entry' },
    { date: '2026-01-07', summary: 'Initial' },
    { date: '2026-01-10', summary: 'Update' }
  ];

  test('filters entries since date (inclusive)', () => {
    const filtered = filterChangelogByDate(entries, '2026-01-07');
    assert.strictEqual(filtered.length, 2);
  });

  test('returns empty for future date', () => {
    const filtered = filterChangelogByDate(entries, '2026-12-01');
    assert.strictEqual(filtered.length, 0);
  });

  test('returns all for old date', () => {
    const filtered = filterChangelogByDate(entries, '2026-01-01');
    assert.strictEqual(filtered.length, 3);
  });
});

suite('parseArtifact (integration)', () => {
  test('parses fixture artifact-a correctly', () => {
    const artifact = parseArtifact(path.join(FIXTURES_DIR, 'artifact-a.cook.md'));
    assert.strictEqual(artifact.header.title, 'Test feature for diffing');
    assert.strictEqual(artifact.header.status, 'cooking');
    assert.ok(artifact.sections.has('Scope'));
    assert.ok(artifact.sections.has('QA Plan'));
  });

  test('parses fixture artifact-b correctly', () => {
    const artifact = parseArtifact(path.join(FIXTURES_DIR, 'artifact-b.cook.md'));
    assert.strictEqual(artifact.header.status, 'well-done');
    assert.ok(artifact.sections.has('Security Review'));
  });

  test('throws for non-existent file', () => {
    assert.throws(() => {
      parseArtifact('/nonexistent/file.cook.md');
    }, /File not found/);
  });
});

suite('Full diff (integration)', () => {
  test('diff between artifact-a and artifact-b shows changes', () => {
    const artifactA = parseArtifact(path.join(FIXTURES_DIR, 'artifact-a.cook.md'));
    const artifactB = parseArtifact(path.join(FIXTURES_DIR, 'artifact-b.cook.md'));
    const diff = diffSections(artifactA.sections, artifactB.sections);

    // Security Review is added in B
    assert.ok(diff.added.some(s => s.name === 'Security Review'), 'Security Review should be added');

    // Open Questions is removed in B
    assert.ok(diff.removed.some(s => s.name === 'Open Questions'), 'Open Questions should be removed');

    // Should have some modifications (Status, Scope, etc.)
    assert.ok(diff.modified.length > 0, 'Should have modified sections');
  });

  test('diff between identical artifacts shows no changes', () => {
    const artifactA = parseArtifact(path.join(FIXTURES_DIR, 'artifact-a.cook.md'));
    const artifactIdentical = parseArtifact(path.join(FIXTURES_DIR, 'artifact-identical.cook.md'));
    const diff = diffSections(artifactA.sections, artifactIdentical.sections);

    assert.strictEqual(diff.added.length, 0);
    assert.strictEqual(diff.removed.length, 0);
    assert.strictEqual(diff.modified.length, 0);
  });
});

// Summary
console.log('\n' + '='.repeat(40));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(40));

process.exit(failed > 0 ? 1 : 0);
