/**
 * PR Generator for Implementation Bridge
 *
 * Generates GitHub PR descriptions from cook artifacts.
 */

const fs = require('fs');
const path = require('path');
const { parseArtifact } = require('./artifactParser');

/**
 * Generate PR title from artifact
 *
 * @param {Object} artifact - Parsed artifact
 * @returns {string} PR title
 */
function generatePRTitle(artifact) {
  const title = artifact.header ? artifact.header.title : null;

  if (!title) {
    return 'Feature implementation';
  }

  // Clean up title - remove "Feature:" prefix if present
  let cleanTitle = title.replace(/^(feat|feature|fix|bug|chore):\s*/i, '');

  // Truncate if too long
  if (cleanTitle.length > 72) {
    cleanTitle = cleanTitle.substring(0, 69) + '...';
  }

  return cleanTitle;
}

/**
 * Extract summary from artifact
 *
 * @param {Object} artifact - Parsed artifact
 * @returns {string[]} Summary bullet points
 */
function extractSummary(artifact) {
  const summary = [];

  // Try to get from Scope > In Scope section
  const scope = artifact.sections.get('Scope') || '';
  const inScopeMatch = scope.match(/### In Scope\s*\n([\s\S]*?)(?=###|$)/i);

  if (inScopeMatch) {
    const items = inScopeMatch[1].match(/^[-*]\s+(.+)$/gm) || [];
    for (const item of items.slice(0, 5)) {
      summary.push(item.replace(/^[-*]\s+/, '').trim());
    }
  }

  // Fallback to Feature Summary
  if (summary.length === 0) {
    const step1 = artifact.sections.get('Step 1 - Read the Order') || '';
    const featureMatch = step1.match(/## Feature Summary\s*\n([\s\S]*?)(?=##|$)/i);

    if (featureMatch) {
      const lines = featureMatch[1].split('\n').filter(l => l.trim());
      for (const line of lines.slice(0, 5)) {
        if (line.match(/^\d+\.\s+\*\*/)) {
          // Numbered bold items
          const text = line.replace(/^\d+\.\s+\*\*([^*]+)\*\*.*/, '$1').trim();
          summary.push(text);
        }
      }
    }
  }

  return summary.length > 0 ? summary : ['Implementation of planned feature'];
}

/**
 * Extract test plan from artifact
 *
 * @param {Object} artifact - Parsed artifact
 * @returns {string[]} Test plan items
 */
function extractTestPlan(artifact) {
  const tests = [];

  // Try QA Plan section
  const qaPlan = artifact.sections.get('QA Plan') || '';
  const testCasesMatch = qaPlan.match(/### Test Cases\s*\n([\s\S]*?)(?=###|$)/i);

  if (testCasesMatch) {
    const items = testCasesMatch[1].match(/^\d+\.\s+(.+)$/gm) || [];
    for (const item of items.slice(0, 5)) {
      tests.push(item.replace(/^\d+\.\s+/, '').trim());
    }
  }

  // Try Acceptance Criteria
  if (tests.length === 0) {
    const acMatch = qaPlan.match(/### Acceptance Criteria\s*\n([\s\S]*?)(?=###|$)/i);
    if (acMatch) {
      const items = acMatch[1].match(/^[-*]\s+(.+)$/gm) || [];
      for (const item of items.slice(0, 5)) {
        tests.push(item.replace(/^[-*]\s+/, '').trim());
      }
    }
  }

  return tests.length > 0 ? tests : ['Verify implementation matches spec'];
}

/**
 * Extract risk info from artifact
 *
 * @param {Object} artifact - Parsed artifact
 * @returns {Object} Risk info
 */
function extractRiskInfo(artifact) {
  const security = artifact.sections.get('Security Review') || '';
  const riskMatch = security.match(/Risk level:\s*\*?\*?(\w+)\*?\*?/i);

  return {
    level: riskMatch ? riskMatch[1].toLowerCase() : 'unknown',
    reviewed: /Reviewed:\s*yes/i.test(security)
  };
}

/**
 * Extract rollback steps from artifact
 *
 * @param {Object} artifact - Parsed artifact
 * @returns {string[]} Rollback steps
 */
function extractRollbackSteps(artifact) {
  const steps = [];

  // Try Blast Radius section
  const blastRadius = artifact.sections.get('Blast Radius & Rollout') || '';
  const rollbackMatch = blastRadius.match(/### Rollback Steps\s*\n([\s\S]*?)(?=###|$)/i);

  if (rollbackMatch) {
    const items = rollbackMatch[1].match(/^\d+\.\s+(.+)$/gm) || [];
    for (const item of items) {
      steps.push(item.replace(/^\d+\.\s+/, '').trim());
    }
  }

  // Also check Risk Management > Rollback Plan
  const riskMgmt = artifact.sections.get('Rollback Plan') || '';
  if (steps.length === 0 && riskMgmt) {
    const items = riskMgmt.match(/^\d+\.\s+(.+)$/gm) || [];
    for (const item of items) {
      steps.push(item.replace(/^\d+\.\s+/, '').trim());
    }
  }

  return steps;
}

/**
 * Generate full PR description from artifact
 *
 * @param {string} artifactPath - Path to artifact
 * @returns {Object} PR data with title and body
 */
function generatePRDescription(artifactPath) {
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}`);
  }

  const artifact = parseArtifact(artifactPath);
  const title = generatePRTitle(artifact);
  const summary = extractSummary(artifact);
  const testPlan = extractTestPlan(artifact);
  const risk = extractRiskInfo(artifact);
  const rollback = extractRollbackSteps(artifact);

  // Get artifact slug for reference
  const slug = artifact.filename ? artifact.filename.replace('.cook.md', '') : path.basename(artifactPath, '.cook.md');

  // Build body
  const lines = [];

  lines.push('## Summary');
  for (const item of summary) {
    lines.push(`- ${item}`);
  }
  lines.push('');

  lines.push('## Test plan');
  for (const item of testPlan) {
    lines.push(`- [ ] ${item}`);
  }
  lines.push('');

  if (risk.level !== 'unknown') {
    lines.push('## Risk');
    lines.push(`- Risk level: **${risk.level}**`);
    lines.push(`- Security reviewed: ${risk.reviewed ? 'Yes' : 'No'}`);
    lines.push('');
  }

  if (rollback.length > 0) {
    lines.push('<details>');
    lines.push('<summary>Rollback steps</summary>');
    lines.push('');
    for (let i = 0; i < rollback.length; i++) {
      lines.push(`${i + 1}. ${rollback[i]}`);
    }
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  lines.push('---');
  lines.push(`Cook artifact: \`${slug}\``);
  lines.push('');
  lines.push('Generated with [Claude Code](https://claude.ai/code)');

  return {
    title,
    body: lines.join('\n'),
    slug,
    artifact: artifactPath
  };
}

/**
 * Format PR for console/clipboard
 *
 * @param {Object} pr - PR data from generatePRDescription
 * @returns {string} Formatted output
 */
function formatPROutput(pr) {
  const lines = [];

  lines.push('');
  lines.push('======================================');
  lines.push('  COOK-PR - PR Description Generator');
  lines.push('======================================');
  lines.push('');
  lines.push('Title:');
  lines.push(`  ${pr.title}`);
  lines.push('');
  lines.push('Body:');
  lines.push('----------------------------------------');
  lines.push(pr.body);
  lines.push('----------------------------------------');
  lines.push('');
  lines.push('Copy the above or use:');
  lines.push(`  gh pr create --title "${pr.title}" --body-file <(cook-pr ${pr.slug} --body-only)`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Update artifact with PR link
 *
 * @param {string} artifactPath - Path to artifact
 * @param {string} prRef - PR reference (number or URL)
 * @returns {boolean} Success
 */
function linkArtifactToPR(artifactPath, prRef) {
  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found: ${artifactPath}`);
  }

  let content = fs.readFileSync(artifactPath, 'utf8');

  // Add to Decision Log
  const today = new Date().toISOString().split('T')[0];
  const logEntry = `| ${today} | Link | PR linked: ${prRef} | Implementation complete |`;

  // Find Decision Log table and add entry
  const logPattern = /(\| Date \| Phase \| Decision \| Rationale \|\n\|[-|]+\|)/;
  if (logPattern.test(content)) {
    content = content.replace(logPattern, `$1\n${logEntry}`);
  }

  // Add PR reference to header if not present
  if (!content.includes('## PR Reference')) {
    const ownershipMatch = content.match(/(## Ownership[\s\S]*?)(\n---|\n##)/);
    if (ownershipMatch) {
      content = content.replace(
        ownershipMatch[0],
        `${ownershipMatch[1]}\n\n## PR Reference\n- ${prRef}\n${ownershipMatch[2]}`
      );
    }
  }

  // Update status to ready-for-merge if well-done
  content = content.replace(/## Status\nwell-done/, '## Status\nready-for-merge');

  // Add changelog entry
  const changelogEntry = `- ${today}: Linked to PR ${prRef}`;
  if (content.includes('## Changelog')) {
    content = content.replace(/(## Changelog\n)/, `$1${changelogEntry}\n`);
  }

  fs.writeFileSync(artifactPath, content, 'utf8');

  return true;
}

module.exports = {
  generatePRTitle,
  generatePRDescription,
  formatPROutput,
  linkArtifactToPR,
  extractSummary,
  extractTestPlan,
  extractRiskInfo,
  extractRollbackSteps
};
