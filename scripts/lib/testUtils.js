/**
 * Test Utilities
 *
 * Simple helper functions for testing cook artifact linking.
 * Created as part of test-artifact-linking cook.
 */

/**
 * Assert that a condition is true
 *
 * @param {boolean} condition - Condition to check
 * @param {string} message - Error message if assertion fails
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Assert that two values are equal
 *
 * @param {*} actual - Actual value
 * @param {*} expected - Expected value
 * @param {string} message - Error message
 */
function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, got ${actual}`);
  }
}

/**
 * Run a test and report result
 *
 * @param {string} name - Test name
 * @param {Function} fn - Test function
 */
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (error) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${error.message}`);
    return false;
  }
}

/**
 * Run a test suite
 *
 * @param {string} suiteName - Suite name
 * @param {Function} fn - Suite function
 */
function suite(suiteName, fn) {
  console.log(`\n${suiteName}`);
  console.log('='.repeat(suiteName.length));
  fn();
}

module.exports = {
  assert,
  assertEqual,
  test,
  suite
};
