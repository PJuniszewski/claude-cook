/**
 * Git Operations for cook execution mode
 *
 * Handles:
 * - Branch creation/switching (cook/<slug>)
 * - Commit tagging ([cook:<id>])
 * - Foreign commit detection
 * - Push and PR creation via gh
 */

const { execSync } = require('child_process');
const path = require('path');

/**
 * Run shell command and return output
 *
 * @param {string} cmd - Command to run
 * @param {Object} options - Options (ignoreError, cwd)
 * @returns {string} Command output
 */
function run(cmd, options = {}) {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      cwd: options.cwd || process.cwd(),
      stdio: options.silent ? 'pipe' : undefined
    }).trim();
  } catch (error) {
    if (options.ignoreError) {
      return '';
    }
    throw error;
  }
}

/**
 * Check if we're in a git repository
 *
 * @returns {boolean}
 */
function isGitRepo() {
  try {
    run('git rev-parse --git-dir', { ignoreError: false, silent: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get current branch name
 *
 * @returns {string} Current branch name
 */
function getCurrentBranch() {
  return run('git rev-parse --abbrev-ref HEAD');
}

/**
 * Check if a branch exists
 *
 * @param {string} branch - Branch name
 * @returns {boolean}
 */
function branchExists(branch) {
  try {
    run(`git rev-parse --verify ${branch}`, { ignoreError: false, silent: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if current branch is a cook branch
 *
 * @param {string} branch - Branch name (optional, defaults to current)
 * @returns {boolean}
 */
function isCookBranch(branch = null) {
  const branchName = branch || getCurrentBranch();
  return branchName.startsWith('cook/');
}

/**
 * Extract slug from branch name
 * "cook/user-auth" -> "user-auth"
 *
 * @param {string} branch - Branch name
 * @returns {string|null} Slug or null if not a cook branch
 */
function extractSlugFromBranch(branch) {
  if (!branch.startsWith('cook/')) {
    return null;
  }
  return branch.substring(5); // Remove "cook/" prefix
}

/**
 * Create a cook branch or switch to existing one
 *
 * @param {string} slug - Feature slug (without "cook/" prefix)
 * @returns {Object} { branch, created, switched }
 */
function createCookBranch(slug) {
  const branchName = `cook/${slug}`;
  const currentBranch = getCurrentBranch();

  // Already on this branch
  if (currentBranch === branchName) {
    return { branch: branchName, created: false, switched: false };
  }

  // Check if branch exists
  if (branchExists(branchName)) {
    // Switch to existing branch
    run(`git checkout ${branchName}`);
    return { branch: branchName, created: false, switched: true };
  }

  // Create new branch
  run(`git checkout -b ${branchName}`);
  return { branch: branchName, created: true, switched: true };
}

/**
 * Switch to a branch
 *
 * @param {string} branch - Branch name
 * @returns {boolean} Success
 */
function checkoutBranch(branch) {
  try {
    run(`git checkout ${branch}`);
    return true;
  } catch (error) {
    console.error(`Failed to checkout branch ${branch}: ${error.message}`);
    return false;
  }
}

/**
 * Get main/master branch name
 *
 * @returns {string} "main" or "master"
 */
function getMainBranch() {
  // Check for main first
  if (branchExists('main')) {
    return 'main';
  }
  if (branchExists('master')) {
    return 'master';
  }
  // Try to get from remote
  try {
    const remote = run('git remote show origin', { ignoreError: true, silent: true });
    const match = remote.match(/HEAD branch:\s*(\S+)/);
    if (match) {
      return match[1];
    }
  } catch {
    // Ignore
  }
  return 'main'; // Default
}

/**
 * Create a commit with cook tag
 *
 * @param {string} message - Commit message (without tag)
 * @param {string} cookId - Cook ID for tag
 * @param {Object} options - { files, all, amend }
 * @returns {Object} { hash, message }
 */
function commitWithCookTag(message, cookId, options = {}) {
  // Add cook tag if not already present
  const taggedMessage = message.includes(`[cook:${cookId}]`)
    ? message
    : `${message} [cook:${cookId}]`;

  // Add Co-Authored-By
  const fullMessage = `${taggedMessage}\n\nCo-Authored-By: Claude <noreply@anthropic.com>`;

  // Build git commit command
  let cmd = 'git commit';

  if (options.all) {
    cmd += ' -a';
  }

  if (options.amend) {
    cmd += ' --amend';
  }

  // Use heredoc for message to handle special characters
  cmd += ` -m "${fullMessage.replace(/"/g, '\\"')}"`;

  try {
    run(cmd);

    // Get the commit hash
    const hash = run('git rev-parse HEAD').substring(0, 7);
    return { hash, message: taggedMessage };
  } catch (error) {
    throw new Error(`Commit failed: ${error.message}`);
  }
}

/**
 * Stage files for commit
 *
 * @param {Array<string>} files - Files to stage (or ['.'] for all)
 */
function stageFiles(files) {
  for (const file of files) {
    run(`git add "${file}"`);
  }
}

/**
 * Get list of commits with cook tag on a branch
 *
 * @param {string} cookId - Cook ID to search for
 * @param {string} branch - Branch name (optional, defaults to current)
 * @returns {Array<{hash: string, message: string, author: string, date: string}>}
 */
function getCommitsForCook(cookId, branch = null) {
  const branchArg = branch || getCurrentBranch();

  try {
    const output = run(
      `git log ${branchArg} --oneline --grep="\\[cook:${cookId}\\]" --format="%h|%s|%an|%ai"`,
      { ignoreError: true }
    );

    if (!output) return [];

    return output.split('\n').filter(Boolean).map(line => {
      const [hash, message, author, date] = line.split('|');
      return { hash, message, author, date };
    });
  } catch {
    return [];
  }
}

/**
 * Get all commits on branch (for foreign commit detection)
 *
 * @param {string} branch - Branch name
 * @param {string} baseBranch - Base branch to compare (optional)
 * @returns {Array<{hash: string, message: string, author: string}>}
 */
function getAllCommitsOnBranch(branch, baseBranch = null) {
  const base = baseBranch || getMainBranch();

  try {
    // Get commits that are on branch but not on base
    const output = run(
      `git log ${base}..${branch} --oneline --format="%h|%s|%an"`,
      { ignoreError: true }
    );

    if (!output) return [];

    return output.split('\n').filter(Boolean).map(line => {
      const [hash, message, author] = line.split('|');
      return { hash, message, author };
    });
  } catch {
    return [];
  }
}

/**
 * Get foreign commits (commits without cook tag) on a cook branch
 *
 * @param {string} branch - Cook branch name
 * @param {string} cookId - Cook ID to check tags against
 * @returns {Array<{hash: string, message: string, author: string, isForeign: boolean}>}
 */
function getForeignCommits(branch, cookId) {
  const allCommits = getAllCommitsOnBranch(branch);
  const cookCommits = getCommitsForCook(cookId, branch);
  const cookHashes = new Set(cookCommits.map(c => c.hash));

  return allCommits
    .filter(c => !cookHashes.has(c.hash))
    .map(c => ({ ...c, isForeign: true }));
}

/**
 * Get changed files compared to base branch
 *
 * @param {string} branch - Branch to check (optional, defaults to current)
 * @param {string} baseBranch - Base branch (optional, defaults to main)
 * @returns {Array<{file: string, status: string}>}
 */
function getChangedFiles(branch = null, baseBranch = null) {
  const target = branch || getCurrentBranch();
  const base = baseBranch || getMainBranch();

  try {
    const output = run(`git diff --name-status ${base}...${target}`, { ignoreError: true });

    if (!output) return [];

    return output.split('\n').filter(Boolean).map(line => {
      const [status, ...fileParts] = line.split('\t');
      const file = fileParts.join('\t'); // Handle files with tabs in name
      return {
        file,
        status: parseGitStatus(status)
      };
    });
  } catch {
    return [];
  }
}

/**
 * Parse git status letter to human-readable status
 */
function parseGitStatus(status) {
  const map = {
    'A': 'added',
    'M': 'modified',
    'D': 'deleted',
    'R': 'renamed',
    'C': 'copied',
    'U': 'unmerged'
  };
  return map[status.charAt(0)] || 'modified';
}

/**
 * Get uncommitted changes (staged and unstaged)
 *
 * @returns {Object} { staged: Array, unstaged: Array, untracked: Array }
 */
function getUncommittedChanges() {
  const staged = [];
  const unstaged = [];
  const untracked = [];

  try {
    const output = run('git status --porcelain', { ignoreError: true });

    if (!output) {
      return { staged, unstaged, untracked };
    }

    for (const line of output.split('\n').filter(Boolean)) {
      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const file = line.substring(3);

      if (indexStatus === '?') {
        untracked.push(file);
      } else if (indexStatus !== ' ') {
        staged.push({ file, status: parseGitStatus(indexStatus) });
      }

      if (workTreeStatus !== ' ' && workTreeStatus !== '?') {
        unstaged.push({ file, status: parseGitStatus(workTreeStatus) });
      }
    }
  } catch {
    // Ignore
  }

  return { staged, unstaged, untracked };
}

/**
 * Check if branch has been pushed to remote
 *
 * @param {string} branch - Branch name
 * @returns {boolean}
 */
function branchExistsOnRemote(branch) {
  try {
    run(`git ls-remote --heads origin ${branch}`, { ignoreError: false, silent: true });
    const output = run(`git ls-remote --heads origin ${branch}`, { ignoreError: true });
    return output.includes(branch);
  } catch {
    return false;
  }
}

/**
 * Push branch to remote with upstream tracking
 *
 * @param {string} branch - Branch name (optional, defaults to current)
 * @returns {boolean} Success
 */
function pushBranch(branch = null) {
  const branchName = branch || getCurrentBranch();

  try {
    run(`git push -u origin ${branchName}`);
    return true;
  } catch (error) {
    console.error(`Push failed: ${error.message}`);
    return false;
  }
}

/**
 * Check if gh CLI is available
 *
 * @returns {boolean}
 */
function isGhAvailable() {
  try {
    run('gh --version', { ignoreError: false, silent: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a pull request using gh CLI
 *
 * @param {Object} options - { title, body, branch, base, draft }
 * @returns {Object|null} { number, url } or null on failure
 */
function createPR(options) {
  if (!isGhAvailable()) {
    throw new Error('GitHub CLI (gh) is not available. Install it to create PRs.');
  }

  const { title, body, branch, base, draft } = options;
  const branchArg = branch || getCurrentBranch();
  const baseArg = base || getMainBranch();

  // Build command
  let cmd = 'gh pr create';
  cmd += ` --title "${title.replace(/"/g, '\\"')}"`;
  cmd += ` --head ${branchArg}`;
  cmd += ` --base ${baseArg}`;

  if (draft) {
    cmd += ' --draft';
  }

  // Use heredoc for body to handle multiline
  const bodyEscaped = body.replace(/'/g, "'\\''");
  cmd += ` --body $'${bodyEscaped}'`;

  try {
    const output = run(cmd);

    // Parse PR URL from output
    const urlMatch = output.match(/https:\/\/github\.com\/[^\s]+\/pull\/(\d+)/);
    if (urlMatch) {
      return {
        url: urlMatch[0],
        number: parseInt(urlMatch[1], 10)
      };
    }

    // Try to extract just the number
    const numberMatch = output.match(/pull\/(\d+)/);
    if (numberMatch) {
      return {
        url: output.trim(),
        number: parseInt(numberMatch[1], 10)
      };
    }

    return { url: output.trim(), number: null };
  } catch (error) {
    throw new Error(`Failed to create PR: ${error.message}`);
  }
}

/**
 * Find existing PR for a branch
 *
 * @param {string} branch - Branch name
 * @returns {Object|null} { number, url, state } or null
 */
function findPRForBranch(branch) {
  if (!isGhAvailable()) {
    return null;
  }

  try {
    const output = run(
      `gh pr list --head ${branch} --json number,url,state --limit 1`,
      { ignoreError: true }
    );

    if (!output) return null;

    const prs = JSON.parse(output);
    return prs[0] || null;
  } catch {
    return null;
  }
}

/**
 * Get PR status (checks, reviews, etc.)
 *
 * @param {number} prNumber - PR number
 * @returns {Object|null} PR status or null
 */
function getPRStatus(prNumber) {
  if (!isGhAvailable()) {
    return null;
  }

  try {
    const output = run(
      `gh pr view ${prNumber} --json number,state,mergeable,reviewDecision,statusCheckRollup`,
      { ignoreError: true }
    );

    if (!output) return null;
    return JSON.parse(output);
  } catch {
    return null;
  }
}

/**
 * Check if PR has been merged
 *
 * @param {number} prNumber - PR number
 * @returns {boolean}
 */
function isPRMerged(prNumber) {
  const status = getPRStatus(prNumber);
  return status?.state === 'MERGED';
}

module.exports = {
  // Core
  run,
  isGitRepo,

  // Branch operations
  getCurrentBranch,
  branchExists,
  isCookBranch,
  extractSlugFromBranch,
  createCookBranch,
  checkoutBranch,
  getMainBranch,

  // Commit operations
  commitWithCookTag,
  stageFiles,
  getCommitsForCook,
  getAllCommitsOnBranch,
  getForeignCommits,

  // File tracking
  getChangedFiles,
  getUncommittedChanges,

  // Remote operations
  branchExistsOnRemote,
  pushBranch,

  // PR operations
  isGhAvailable,
  createPR,
  findPRForBranch,
  getPRStatus,
  isPRMerged
};
