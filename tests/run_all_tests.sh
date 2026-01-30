#!/bin/bash
# Run all chef tests
# Usage: bash tests/run_all_tests.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.."

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║           JUNI CHEF TEST SUITE                           ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

FAILED=0

# Test 1: YAML Contract Validation
echo "▶ Running: Chef Contract Validation"
echo "─────────────────────────────────────"
if python3 tests/test_chef_contracts.py; then
    echo ""
else
    FAILED=1
fi

# Test 2: Sync Check
echo "▶ Running: Chef Sync Check"
echo "─────────────────────────────────────"
if python3 tests/test_chef_sync.py; then
    echo ""
else
    FAILED=1
fi

# Test 3: Agent Integration (optional)
if command -v claude &> /dev/null; then
    echo "▶ Running: Agent Integration Tests"
    echo "─────────────────────────────────────"
    bash tests/test_chef_agents.sh || FAILED=1
else
    echo "▶ Skipping: Agent Integration Tests (claude CLI not found)"
    echo ""
fi

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
if [ $FAILED -eq 0 ]; then
    echo "║  ✅  ALL TESTS PASSED                                    ║"
else
    echo "║  ❌  SOME TESTS FAILED                                   ║"
fi
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

exit $FAILED
