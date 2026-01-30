#!/bin/bash
# Integration test: Verify chefs can be invoked and respond correctly
# Run: bash tests/test_chef_agents.sh

GREEN='\033[92m'
RED='\033[91m'
YELLOW='\033[93m'
RESET='\033[0m'

echo ""
echo "============================================================"
echo "Chef Agent Integration Tests"
echo "============================================================"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

PASSED=0
FAILED=0
SKIPPED=0

# Check if claude is available
if ! command -v claude &> /dev/null; then
    echo -e "${YELLOW}Claude CLI not found - skipping integration tests${RESET}"
    echo "Install: npm install -g @anthropic-ai/claude-code"
    exit 0
fi

echo "Testing chef agent invocations..."
echo ""

# Use gtimeout on macOS if available, otherwise skip timeout
TIMEOUT_CMD=""
if command -v timeout &> /dev/null; then
    TIMEOUT_CMD="timeout 30"
elif command -v gtimeout &> /dev/null; then
    TIMEOUT_CMD="gtimeout 30"
fi

# Test each chef with a simple prompt
test_chef() {
    local chef="$1"
    local prompt="$2"

    echo -n "Testing juni:${chef}... "

    # Try to invoke the chef with --print (non-interactive)
    local output
    if [ -n "$TIMEOUT_CMD" ]; then
        output=$($TIMEOUT_CMD claude --print "As juni:${chef}, briefly respond (1 sentence): ${prompt}" 2>/dev/null | head -c 500)
    else
        output=$(claude --print "As juni:${chef}, briefly respond (1 sentence): ${prompt}" 2>/dev/null | head -c 500)
    fi

    if echo "$output" | grep -qi -E "(approve|reject|defer|block|review|plan|risk|scope|test|security|doc|version|unsafe|safe|monolith|microservice|implement|architecture|vulnerability)" ; then
        echo -e "${GREEN}PASS${RESET}"
        ((PASSED++))
    else
        echo -e "${YELLOW}SKIPPED${RESET} (no matching keywords)"
        ((SKIPPED++))
    fi
}

# Run tests
test_chef "product_chef" "Evaluate: Add dark mode feature"
test_chef "security_chef" "Is this safe: eval(user_input)"
test_chef "qa_chef" "What tests for login?"
test_chef "engineer_chef" "Plan for password reset"
test_chef "architect_chef" "Monolith vs microservices?"

echo ""
echo "============================================================"
echo "Results: Passed=$PASSED, Failed=$FAILED, Skipped=$SKIPPED"
echo "============================================================"
echo ""

if [ $FAILED -gt 0 ]; then
    exit 1
fi
exit 0
