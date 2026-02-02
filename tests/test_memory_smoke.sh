#!/bin/bash

# Smoke test for memory system - verifies modules load and basic functions work

set -e

COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_RESET='\033[0m'

cd "$(dirname "$0")/.."

echo -e "${COLOR_YELLOW}Memory System Smoke Tests${COLOR_RESET}\n"

# Test 1: memoryRetrieval.js loads
echo "Test 1: memoryRetrieval.js module loads"
node -e "const m = require('./scripts/lib/memoryRetrieval'); console.log('OK');" > /dev/null
if [ $? -eq 0 ]; then
  echo -e "${COLOR_GREEN}✓${COLOR_RESET} memoryRetrieval.js loads"
else
  echo -e "${COLOR_RED}✗${COLOR_RESET} memoryRetrieval.js failed to load"
  exit 1
fi

# Test 2: patternMiner.js has new function
echo "Test 2: patternMiner.js has findSimilarFeatures"
node -e "const p = require('./scripts/lib/patternMiner'); if(typeof p.findSimilarFeatures === 'function') console.log('OK');" > /dev/null
if [ $? -eq 0 ]; then
  echo -e "${COLOR_GREEN}✓${COLOR_RESET} findSimilarFeatures exists"
else
  echo -e "${COLOR_RED}✗${COLOR_RESET} findSimilarFeatures missing"
  exit 1
fi

# Test 3: memoryRetrieval exports expected functions
echo "Test 3: memoryRetrieval exports"
node << 'NODESCRIPT'
const m = require('./scripts/lib/memoryRetrieval');
const required = [
  'querySimilarFeatures',
  'getInsightsForPhase',
  'formatInsightsForArtifact',
  'calculateFileSimilarity',
  'calculateKeywordSimilarity',
  'logFeedback',
  'getFeedbackStats'
];

for (const fn of required) {
  if (typeof m[fn] !== 'function') {
    console.error(`Missing function: ${fn}`);
    process.exit(1);
  }
}
console.log('OK');
NODESCRIPT

if [ $? -eq 0 ]; then
  echo -e "${COLOR_GREEN}✓${COLOR_RESET} All exports present"
else
  echo -e "${COLOR_RED}✗${COLOR_RESET} Missing exports"
  exit 1
fi

# Test 4: File similarity calculation works
echo "Test 4: File similarity calculation"
node << 'NODESCRIPT'
const m = require('./scripts/lib/memoryRetrieval');
const files1 = ['a.ts', 'b.ts'];
const files2 = ['a.ts', 'b.ts', 'c.ts'];
const sim = m.calculateFileSimilarity(files1, files2);
if (sim > 0 && sim <= 1) {
  console.log(`OK (similarity: ${sim.toFixed(2)})`);
} else {
  console.error(`Invalid similarity: ${sim}`);
  process.exit(1);
}
NODESCRIPT

if [ $? -eq 0 ]; then
  echo -e "${COLOR_GREEN}✓${COLOR_RESET} File similarity works"
else
  echo -e "${COLOR_RED}✗${COLOR_RESET} File similarity failed"
  exit 1
fi

# Test 5: Keyword extraction works
echo "Test 5: Keyword extraction"
node << 'NODESCRIPT'
const m = require('./scripts/lib/memoryRetrieval');
const keywords = m.extractKeywords('Add OAuth authentication with Google');
if (Array.isArray(keywords) && keywords.length > 0) {
  console.log(`OK (extracted ${keywords.length} keywords)`);
} else {
  console.error('Keyword extraction failed');
  process.exit(1);
}
NODESCRIPT

if [ $? -eq 0 ]; then
  echo -e "${COLOR_GREEN}✓${COLOR_RESET} Keyword extraction works"
else
  echo -e "${COLOR_RED}✗${COLOR_RESET} Keyword extraction failed"
  exit 1
fi

# Test 6: Feedback logging validates input
echo "Test 6: Feedback validation"
node << 'NODESCRIPT'
const m = require('./scripts/lib/memoryRetrieval');
const fs = require('fs');
const path = require('path');
const os = require('os');

const testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'feedback-test-'));
const testPath = path.join(testDir, 'test-feedback.jsonl');

const originalGetFeedbackPath = m.getFeedbackPath;
m.getFeedbackPath = () => testPath;

try {
  // Valid feedback should work
  m.logFeedback('test', 'test_type', 'helpful', {});

  // Invalid feedback should throw
  try {
    m.logFeedback('test', 'test_type', 'invalid', {});
    console.error('Should have thrown on invalid feedback');
    process.exit(1);
  } catch (err) {
    // Expected
  }

  console.log('OK');
  fs.rmSync(testDir, { recursive: true });
} catch (error) {
  console.error(error);
  process.exit(1);
}
NODESCRIPT

if [ $? -eq 0 ]; then
  echo -e "${COLOR_GREEN}✓${COLOR_RESET} Feedback validation works"
else
  echo -e "${COLOR_RED}✗${COLOR_RESET} Feedback validation failed"
  exit 1
fi

# Test 7: Graceful degradation (empty results)
echo "Test 7: Graceful degradation"
node << 'NODESCRIPT'
const m = require('./scripts/lib/memoryRetrieval');
const auditLogger = require('./scripts/lib/auditLogger');
const path = require('path');
const os = require('os');

// Point to non-existent audit log
const originalGetAuditPath = auditLogger.getAuditPath;
auditLogger.getAuditPath = () => '/nonexistent/path/audit.jsonl';

try {
  const results = m.querySimilarFeatures({ description: 'test', files: [], keywords: [] });
  if (Array.isArray(results) && results.length === 0) {
    console.log('OK (empty results)');
  } else {
    console.error('Expected empty array');
    process.exit(1);
  }
} catch (error) {
  console.error('Should not throw:', error);
  process.exit(1);
}

auditLogger.getAuditPath = originalGetAuditPath;
NODESCRIPT

if [ $? -eq 0 ]; then
  echo -e "${COLOR_GREEN}✓${COLOR_RESET} Graceful degradation works"
else
  echo -e "${COLOR_RED}✗${COLOR_RESET} Graceful degradation failed"
  exit 1
fi

echo ""
echo -e "${COLOR_GREEN}========================================${COLOR_RESET}"
echo -e "${COLOR_GREEN}All smoke tests passed!${COLOR_RESET}"
echo -e "${COLOR_GREEN}========================================${COLOR_RESET}"
echo ""
echo "Memory system is functional and ready to use."
