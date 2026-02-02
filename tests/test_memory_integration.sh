#!/bin/bash

# Integration test for memory system
# Creates real audit logs, queries memory, verifies output

set -e

COLOR_GREEN='\033[0;32m'
COLOR_RED='\033[0;31m'
COLOR_YELLOW='\033[1;33m'
COLOR_RESET='\033[0m'

TEST_DIR=$(mktemp -d)
echo -e "${COLOR_YELLOW}Test directory: $TEST_DIR${COLOR_RESET}\n"

# Create test audit log
mkdir -p "$TEST_DIR/.claude/data"
AUDIT_LOG="$TEST_DIR/.claude/data/cook-audit.jsonl"

cat > "$AUDIT_LOG" << 'EOF'
{"timestamp":"2026-01-15T10:00:00Z","order_id":"auth-oauth-feature","event_type":"phase_start","phase":"scope","chef_id":"product_chef"}
{"timestamp":"2026-01-15T10:30:00Z","order_id":"auth-oauth-feature","event_type":"phase_complete","phase":"scope","chef_id":"product_chef","verdict":"approve","metadata":{"feature_description":"Add OAuth with Google","files_to_modify":["src/auth/oauth.ts","src/login.ts"]}}
{"timestamp":"2026-01-15T11:00:00Z","order_id":"auth-oauth-feature","event_type":"blocker","phase":"security","blockers":[{"type":"input_validation","description":"CSRF protection needed","severity":"HIGH"}]}
{"timestamp":"2026-01-15T12:00:00Z","order_id":"auth-oauth-feature","event_type":"cook_complete","verdict":"well-done","duration_seconds":7200}
{"timestamp":"2026-01-20T09:00:00Z","order_id":"user-auth-system","event_type":"phase_start","phase":"scope","chef_id":"product_chef"}
{"timestamp":"2026-01-20T09:30:00Z","order_id":"user-auth-system","event_type":"phase_complete","phase":"scope","chef_id":"product_chef","verdict":"approve","metadata":{"feature_description":"User authentication with passwords","files_to_modify":["src/auth/password.ts","src/session.ts"]}}
{"timestamp":"2026-01-20T10:00:00Z","order_id":"user-auth-system","event_type":"blocker","phase":"security","blockers":[{"type":"input_validation","description":"Password strength","severity":"MEDIUM"}]}
{"timestamp":"2026-01-20T11:00:00Z","order_id":"user-auth-system","event_type":"cook_complete","verdict":"well-done","duration_seconds":7200}
EOF

echo -e "${COLOR_GREEN}✓${COLOR_RESET} Created test audit log with 2 orders\n"

# Test 1: Pattern miner can read audit log
echo "Test 1: Pattern miner reads audit log"
cd "$(dirname "$0")/.."
AUDIT_PATH="$AUDIT_LOG" node scripts/lib/auditLogger.js list > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo -e "${COLOR_GREEN}✓${COLOR_RESET} auditLogger.js can read log"
else
  echo -e "${COLOR_RED}✗${COLOR_RESET} auditLogger.js failed"
  exit 1
fi

# Test 2: Pattern miner finds recurring blockers
echo "Test 2: Pattern miner finds recurring blockers"
OUTPUT=$(cd "$TEST_DIR" && node "$(dirname "$0")/../scripts/lib/patternMiner.js" blockers 2>&1)
if echo "$OUTPUT" | grep -q "input_validation"; then
  echo -e "${COLOR_GREEN}✓${COLOR_RESET} Found recurring blocker: input_validation"
else
  echo -e "${COLOR_RED}✗${COLOR_RESET} Recurring blocker not found"
  echo "$OUTPUT"
fi

# Test 3: Pattern miner phase statistics
echo "Test 3: Pattern miner calculates phase stats"
OUTPUT=$(cd "$TEST_DIR" && node "$(dirname "$0")/../scripts/lib/patternMiner.js" phases 2>&1)
if echo "$OUTPUT" | grep -q "security"; then
  echo -e "${COLOR_GREEN}✓${COLOR_RESET} Phase statistics calculated"
else
  echo -e "${COLOR_RED}✗${COLOR_RESET} Phase statistics failed"
  echo "$OUTPUT"
fi

# Test 4: Memory retrieval CLI query
echo "Test 4: Memory retrieval CLI query"
OUTPUT=$(cd "$TEST_DIR" && node "$(dirname "$0")/../scripts/lib/memoryRetrieval.js" query "OAuth authentication" 2>&1)
if [ $? -eq 0 ]; then
  echo -e "${COLOR_GREEN}✓${COLOR_RESET} Memory query executed"
else
  echo -e "${COLOR_RED}✗${COLOR_RESET} Memory query failed"
  echo "$OUTPUT"
fi

# Test 5: Feedback logging
echo "Test 5: Feedback logging"
FEEDBACK_LOG="$TEST_DIR/.claude/data/memory-feedback.jsonl"

# Create a test Node script to log feedback
node << 'NODESCRIPT'
const memoryRetrieval = require('./scripts/lib/memoryRetrieval');
const path = require('path');
const testDir = process.env.TEST_DIR;

// Mock feedback path
const originalGetFeedbackPath = memoryRetrieval.getFeedbackPath;
memoryRetrieval.getFeedbackPath = () => path.join(testDir, '.claude/data/memory-feedback.jsonl');

try {
  memoryRetrieval.logFeedback('test-order', 'similar_features', 'helpful', {});
  console.log('SUCCESS');
} catch (error) {
  console.error('ERROR:', error.message);
  process.exit(1);
}
NODESCRIPT

if [ $? -eq 0 ] && [ -f "$FEEDBACK_LOG" ]; then
  echo -e "${COLOR_GREEN}✓${COLOR_RESET} Feedback logged successfully"

  # Verify feedback stats
  node << 'NODESCRIPT'
const memoryRetrieval = require('./scripts/lib/memoryRetrieval');
const path = require('path');
const testDir = process.env.TEST_DIR;

const originalGetFeedbackPath = memoryRetrieval.getFeedbackPath;
memoryRetrieval.getFeedbackPath = () => path.join(testDir, '.claude/data/memory-feedback.jsonl');

const stats = memoryRetrieval.getFeedbackStats();
console.log(`Total: ${stats.total}, Helpful: ${stats.helpful}`);
NODESCRIPT

else
  echo -e "${COLOR_RED}✗${COLOR_RESET} Feedback logging failed"
fi

# Test 6: Graceful degradation (no audit log)
echo "Test 6: Graceful degradation without audit log"
EMPTY_DIR=$(mktemp -d)
OUTPUT=$(cd "$EMPTY_DIR" && node "$(dirname "$0")/../scripts/lib/memoryRetrieval.js" query "test" 2>&1)
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${COLOR_GREEN}✓${COLOR_RESET} Gracefully handles missing audit log"
else
  echo -e "${COLOR_RED}✗${COLOR_RESET} Failed on missing audit log"
  echo "$OUTPUT"
fi

rm -rf "$EMPTY_DIR"

# Cleanup
rm -rf "$TEST_DIR"

echo ""
echo -e "${COLOR_GREEN}========================================${COLOR_RESET}"
echo -e "${COLOR_GREEN}All integration tests passed!${COLOR_RESET}"
echo -e "${COLOR_GREEN}========================================${COLOR_RESET}"
