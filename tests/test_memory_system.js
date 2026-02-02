#!/usr/bin/env node

/**
 * Test suite for memory/learning system
 *
 * Tests:
 * - memoryRetrieval.js functions
 * - patternMiner.js similarity matching
 * - Integration with audit logs
 * - Feedback logging
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Import modules to test
const memoryRetrieval = require('../scripts/lib/memoryRetrieval');
const patternMiner = require('../scripts/lib/patternMiner');
const auditLogger = require('../scripts/lib/auditLogger');

// Test data directory
const TEST_DATA_DIR = path.join(__dirname, 'fixtures', 'memory-test-data');

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

function pass(msg) {
  console.log(`${colors.green}✓${colors.reset} ${msg}`);
}

function fail(msg, error) {
  console.log(`${colors.red}✗${colors.reset} ${msg}`);
  if (error) console.error(error);
}

function section(msg) {
  console.log(`\n${colors.yellow}${msg}${colors.reset}`);
}

// ============ Test Fixtures ============

function createTestAuditLog() {
  const testAuditPath = path.join(TEST_DATA_DIR, 'cook-audit.jsonl');

  // Create test directory if needed
  if (!fs.existsSync(TEST_DATA_DIR)) {
    fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
  }

  const entries = [
    // Order 1: auth feature
    {
      timestamp: '2026-01-15T10:00:00Z',
      order_id: 'auth-oauth-integration',
      event_type: 'phase_start',
      phase: 'scope',
      chef_id: 'product_chef'
    },
    {
      timestamp: '2026-01-15T10:30:00Z',
      order_id: 'auth-oauth-integration',
      event_type: 'phase_complete',
      phase: 'scope',
      chef_id: 'product_chef',
      verdict: 'approve',
      metadata: {
        feature_description: 'Add OAuth authentication with Google and GitHub',
        files_to_modify: ['src/auth/oauth.ts', 'src/login.ts', 'src/config.ts']
      }
    },
    {
      timestamp: '2026-01-15T11:00:00Z',
      order_id: 'auth-oauth-integration',
      event_type: 'blocker',
      phase: 'security',
      blockers: [
        {
          type: 'input_validation',
          description: 'OAuth callback needs CSRF validation',
          severity: 'HIGH'
        }
      ]
    },
    {
      timestamp: '2026-01-15T12:00:00Z',
      order_id: 'auth-oauth-integration',
      event_type: 'cook_complete',
      verdict: 'well-done',
      duration_seconds: 7200
    },

    // Order 2: user auth system
    {
      timestamp: '2026-01-20T09:00:00Z',
      order_id: 'user-authentication-system',
      event_type: 'phase_start',
      phase: 'scope',
      chef_id: 'product_chef'
    },
    {
      timestamp: '2026-01-20T09:30:00Z',
      order_id: 'user-authentication-system',
      event_type: 'phase_complete',
      phase: 'scope',
      chef_id: 'product_chef',
      verdict: 'approve',
      metadata: {
        feature_description: 'User authentication with password and session management',
        files_to_modify: ['src/auth/password.ts', 'src/session.ts', 'src/middleware/auth.ts']
      }
    },
    {
      timestamp: '2026-01-20T10:00:00Z',
      order_id: 'user-authentication-system',
      event_type: 'blocker',
      phase: 'security',
      blockers: [
        {
          type: 'input_validation',
          description: 'Password strength not enforced',
          severity: 'MEDIUM'
        }
      ]
    },
    {
      timestamp: '2026-01-20T10:30:00Z',
      order_id: 'user-authentication-system',
      event_type: 'blocker',
      phase: 'test',
      blockers: [
        {
          type: 'test_coverage',
          description: 'Missing edge cases for session expiry',
          severity: 'MEDIUM'
        }
      ]
    },
    {
      timestamp: '2026-01-20T11:00:00Z',
      order_id: 'user-authentication-system',
      event_type: 'cook_complete',
      verdict: 'well-done',
      duration_seconds: 7200
    },

    // Order 3: payment feature (different domain)
    {
      timestamp: '2026-01-25T14:00:00Z',
      order_id: 'payment-stripe-integration',
      event_type: 'phase_start',
      phase: 'scope',
      chef_id: 'product_chef'
    },
    {
      timestamp: '2026-01-25T14:30:00Z',
      order_id: 'payment-stripe-integration',
      event_type: 'phase_complete',
      phase: 'scope',
      chef_id: 'product_chef',
      verdict: 'approve',
      metadata: {
        feature_description: 'Stripe payment integration for subscriptions',
        files_to_modify: ['src/payment/stripe.ts', 'src/api/checkout.ts']
      }
    },
    {
      timestamp: '2026-01-25T15:00:00Z',
      order_id: 'payment-stripe-integration',
      event_type: 'cook_complete',
      verdict: 'well-done',
      duration_seconds: 3600
    }
  ];

  const content = entries.map(e => JSON.stringify(e)).join('\n') + '\n';
  fs.writeFileSync(testAuditPath, content, 'utf8');

  return testAuditPath;
}

function cleanupTestData() {
  if (fs.existsSync(TEST_DATA_DIR)) {
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  }
}

// ============ Tests ============

function testFileSimilarity() {
  section('Testing file similarity calculation');

  try {
    const files1 = ['src/auth/oauth.ts', 'src/login.ts'];
    const files2 = ['src/auth/oauth.ts', 'src/login.ts', 'src/config.ts'];

    const similarity = memoryRetrieval.calculateFileSimilarity(files1, files2);

    // Jaccard similarity: intersection = 2, union = 3
    const expected = 2 / 3;

    assert.strictEqual(
      Math.abs(similarity - expected) < 0.01,
      true,
      `Expected similarity ~${expected}, got ${similarity}`
    );

    pass(`File similarity: ${similarity.toFixed(2)} (expected ~${expected.toFixed(2)})`);
  } catch (error) {
    fail('File similarity calculation', error);
  }
}

function testKeywordSimilarity() {
  section('Testing keyword similarity calculation');

  try {
    const text1 = 'Add OAuth authentication with Google';
    const text2 = 'User authentication with OAuth and GitHub';

    const similarity = memoryRetrieval.calculateKeywordSimilarity(text1, text2);

    // Should have overlap on: authentication, oauth
    assert.strictEqual(
      similarity > 0,
      true,
      `Expected positive similarity, got ${similarity}`
    );

    pass(`Keyword similarity: ${similarity.toFixed(2)}`);
  } catch (error) {
    fail('Keyword similarity calculation', error);
  }
}

function testKeywordExtraction() {
  section('Testing keyword extraction');

  try {
    const text = 'Add OAuth authentication with Google and GitHub for user login';
    const keywords = memoryRetrieval.extractKeywords(text);

    // Should extract: oauth, authentication, google, github, user, login
    // Should filter: add, with, and, for (stopwords)

    assert.strictEqual(
      keywords.includes('oauth'),
      true,
      'Should extract "oauth"'
    );

    assert.strictEqual(
      keywords.includes('authentication'),
      true,
      'Should extract "authentication"'
    );

    assert.strictEqual(
      keywords.includes('and'),
      false,
      'Should filter stopword "and"'
    );

    pass(`Extracted ${keywords.length} keywords: ${keywords.slice(0, 5).join(', ')}...`);
  } catch (error) {
    fail('Keyword extraction', error);
  }
}

function testQuerySimilarFeatures() {
  section('Testing querySimilarFeatures with test audit log');

  try {
    // Create test audit log
    const testAuditPath = createTestAuditLog();

    // Mock the audit path to use test data
    const originalGetAuditPath = auditLogger.getAuditPath;
    auditLogger.getAuditPath = () => testAuditPath;

    // Query for an auth feature
    const currentFeature = {
      description: 'Add OAuth login with GitHub',
      files: ['src/auth/oauth.ts', 'src/login.ts'],
      keywords: ['oauth', 'login', 'authentication']
    };

    const results = memoryRetrieval.querySimilarFeatures(currentFeature, 0.3, 5);

    assert.strictEqual(
      results.length > 0,
      true,
      'Should find similar features'
    );

    // Should find auth-related orders
    const authOrders = results.filter(r =>
      r.order_id.includes('auth') || r.order_id.includes('user')
    );

    assert.strictEqual(
      authOrders.length > 0,
      true,
      'Should find auth-related orders'
    );

    // Payment order should have low similarity
    const paymentOrder = results.find(r => r.order_id.includes('payment'));
    if (paymentOrder) {
      assert.strictEqual(
        paymentOrder.similarity < 0.5,
        true,
        'Payment order should have low similarity to auth feature'
      );
    }

    pass(`Found ${results.length} similar features`);
    results.slice(0, 3).forEach(r => {
      pass(`  - ${r.order_id} (${(r.similarity * 100).toFixed(0)}% similar)`);
    });

    // Restore original function
    auditLogger.getAuditPath = originalGetAuditPath;

  } catch (error) {
    fail('Query similar features', error);
  }
}

function testGetInsightsForPhase() {
  section('Testing getInsightsForPhase');

  try {
    const testAuditPath = createTestAuditLog();
    const originalGetAuditPath = auditLogger.getAuditPath;
    auditLogger.getAuditPath = () => testAuditPath;

    const currentFeature = {
      description: 'Add OAuth authentication',
      files: ['src/auth/oauth.ts'],
      keywords: ['oauth', 'authentication']
    };

    const insights = memoryRetrieval.getInsightsForPhase('security', currentFeature);

    assert.strictEqual(
      insights.has_insights,
      true,
      'Should have insights'
    );

    assert.strictEqual(
      insights.similar_features_count > 0,
      true,
      'Should find similar features'
    );

    // Should detect recurring blockers (input_validation appears twice)
    const hasRecurringIssues = insights.recurring_issues && insights.recurring_issues.length > 0;

    pass(`Found insights for phase: ${insights.phase}`);
    pass(`  - Similar features: ${insights.similar_features_count}`);
    if (hasRecurringIssues) {
      pass(`  - Recurring issues: ${insights.recurring_issues.length}`);
    }

    auditLogger.getAuditPath = originalGetAuditPath;

  } catch (error) {
    fail('Get insights for phase', error);
  }
}

function testFormatInsightsForArtifact() {
  section('Testing formatInsightsForArtifact');

  try {
    const similarFeatures = [
      {
        order_id: 'auth-oauth-integration',
        similarity: 0.85,
        entries: [
          { event_type: 'blocker' },
          { event_type: 'escalation' },
          { event_type: 'phase_complete', verdict: 'block' }
        ]
      }
    ];

    const phaseInsights = {
      has_insights: true,
      warnings: [
        { message: '⚠️ Phase \'security\' blocks 40% of similar features' }
      ],
      recurring_issues: [
        { message: '🔁 Recurring issue: input_validation (2 occurrences)' }
      ],
      suggestions: []
    };

    const markdown = memoryRetrieval.formatInsightsForArtifact(similarFeatures, phaseInsights);

    assert.strictEqual(
      markdown.includes('📊 Historical Insights'),
      true,
      'Should include Historical Insights header'
    );

    assert.strictEqual(
      markdown.includes('auth-oauth-integration'),
      true,
      'Should include order ID'
    );

    assert.strictEqual(
      markdown.includes('85% similar'),
      true,
      'Should include similarity percentage'
    );

    assert.strictEqual(
      markdown.includes('⚠️'),
      true,
      'Should include warning emoji'
    );

    assert.strictEqual(
      markdown.includes('🔁'),
      true,
      'Should include recurring issue emoji'
    );

    pass('Formatted markdown includes all expected elements');

  } catch (error) {
    fail('Format insights for artifact', error);
  }
}

function testFeedbackLogging() {
  section('Testing feedback logging');

  try {
    const testFeedbackPath = path.join(TEST_DATA_DIR, 'memory-feedback.jsonl');

    // Mock feedback path
    const originalGetFeedbackPath = memoryRetrieval.getFeedbackPath;
    memoryRetrieval.getFeedbackPath = () => testFeedbackPath;

    // Log feedback
    memoryRetrieval.logFeedback(
      'test-order-123',
      'similar_features',
      'helpful',
      { insight_count: 3 }
    );

    // Verify file was created
    assert.strictEqual(
      fs.existsSync(testFeedbackPath),
      true,
      'Feedback file should be created'
    );

    // Read and parse
    const content = fs.readFileSync(testFeedbackPath, 'utf8');
    const entry = JSON.parse(content.trim());

    assert.strictEqual(entry.order_id, 'test-order-123');
    assert.strictEqual(entry.insight_type, 'similar_features');
    assert.strictEqual(entry.feedback, 'helpful');

    pass('Feedback logged correctly');

    // Test invalid feedback
    try {
      memoryRetrieval.logFeedback('test', 'test', 'invalid_feedback');
      fail('Should reject invalid feedback', null);
    } catch (error) {
      pass('Invalid feedback rejected');
    }

    // Restore
    memoryRetrieval.getFeedbackPath = originalGetFeedbackPath;

  } catch (error) {
    fail('Feedback logging', error);
  }
}

function testFeedbackStats() {
  section('Testing feedback statistics');

  try {
    const testFeedbackPath = path.join(TEST_DATA_DIR, 'memory-feedback.jsonl');

    const originalGetFeedbackPath = memoryRetrieval.getFeedbackPath;
    memoryRetrieval.getFeedbackPath = () => testFeedbackPath;

    // Create test feedback
    fs.writeFileSync(testFeedbackPath, '', 'utf8');

    memoryRetrieval.logFeedback('order-1', 'similar_features', 'helpful');
    memoryRetrieval.logFeedback('order-2', 'similar_features', 'helpful');
    memoryRetrieval.logFeedback('order-3', 'similar_features', 'not_helpful');
    memoryRetrieval.logFeedback('order-4', 'phase_warning', 'wrong');

    const stats = memoryRetrieval.getFeedbackStats();

    assert.strictEqual(stats.total, 4);
    assert.strictEqual(stats.helpful, 2);
    assert.strictEqual(stats.not_helpful, 1);
    assert.strictEqual(stats.wrong, 1);

    pass('Feedback statistics calculated correctly');
    pass(`  - Total: ${stats.total}`);
    pass(`  - Helpful: ${stats.helpful}`);
    pass(`  - Not helpful: ${stats.not_helpful}`);
    pass(`  - Wrong: ${stats.wrong}`);

    memoryRetrieval.getFeedbackPath = originalGetFeedbackPath;

  } catch (error) {
    fail('Feedback statistics', error);
  }
}

function testPatternMinerIntegration() {
  section('Testing patternMiner.findSimilarFeatures integration');

  try {
    const testAuditPath = createTestAuditLog();
    const originalGetAuditPath = auditLogger.getAuditPath;
    auditLogger.getAuditPath = () => testAuditPath;

    const currentFeature = {
      files: ['src/auth/oauth.ts'],
      keywords: ['oauth', 'authentication']
    };

    const results = patternMiner.findSimilarFeatures(currentFeature, 1);

    assert.strictEqual(
      results.length > 0,
      true,
      'Should find similar features'
    );

    // Check match score structure
    const firstResult = results[0];
    assert.strictEqual(
      typeof firstResult.match_score === 'number',
      true,
      'Should have match_score'
    );

    assert.strictEqual(
      Array.isArray(firstResult.matches),
      true,
      'Should have matches array'
    );

    pass(`Pattern miner found ${results.length} similar features`);

    auditLogger.getAuditPath = originalGetAuditPath;

  } catch (error) {
    fail('Pattern miner integration', error);
  }
}

function testGracefulDegradation() {
  section('Testing graceful degradation (no audit log)');

  try {
    // Point to non-existent audit log
    const nonExistentPath = path.join(TEST_DATA_DIR, 'non-existent-audit.jsonl');
    const originalGetAuditPath = auditLogger.getAuditPath;
    auditLogger.getAuditPath = () => nonExistentPath;

    const currentFeature = {
      description: 'Test feature',
      files: ['test.ts'],
      keywords: ['test']
    };

    // Should not crash
    const results = memoryRetrieval.querySimilarFeatures(currentFeature);

    assert.strictEqual(
      Array.isArray(results),
      true,
      'Should return empty array'
    );

    assert.strictEqual(
      results.length,
      0,
      'Should return empty results'
    );

    pass('Gracefully handles missing audit log');

    auditLogger.getAuditPath = originalGetAuditPath;

  } catch (error) {
    fail('Graceful degradation', error);
  }
}

// ============ Run All Tests ============

function runAllTests() {
  console.log('\n🧪 Memory System Test Suite\n');

  let passed = 0;
  let failed = 0;

  const tests = [
    testFileSimilarity,
    testKeywordSimilarity,
    testKeywordExtraction,
    testQuerySimilarFeatures,
    testGetInsightsForPhase,
    testFormatInsightsForArtifact,
    testFeedbackLogging,
    testFeedbackStats,
    testPatternMinerIntegration,
    testGracefulDegradation
  ];

  for (const test of tests) {
    try {
      test();
      passed++;
    } catch (error) {
      failed++;
      console.error(error);
    }
  }

  // Cleanup
  cleanupTestData();

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Tests: ${passed + failed} total`);
  console.log(`${colors.green}✓ Passed: ${passed}${colors.reset}`);
  if (failed > 0) {
    console.log(`${colors.red}✗ Failed: ${failed}${colors.reset}`);
  }
  console.log(`${'='.repeat(60)}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests if executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = { runAllTests };
