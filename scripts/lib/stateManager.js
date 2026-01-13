/**
 * State Manager for cook-state.json
 *
 * Design Decision: State file is RUNTIME CACHE only
 * Source of Truth: Artifact (.cook.md) + Git (branches/commits)
 *
 * Hierarchy:
 * 1. Artifact - authoritative for intent, scope, decisions
 * 2. Git - evidence of what was done
 * 3. State - runtime cache, always reconstructible
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STATE_FILE = '.claude/cook-state.json';
const COOK_DIR = 'cook';

/**
 * Default empty state structure
 */
function getEmptyState() {
  return {
    version: '1.0',
    active: null,
    cooks: {},
    archived: {}
  };
}

/**
 * Load state from .claude/cook-state.json
 * Creates empty state if file doesn't exist
 *
 * @returns {Object} State object
 */
function loadState() {
  const statePath = path.resolve(STATE_FILE);

  if (!fs.existsSync(statePath)) {
    return getEmptyState();
  }

  try {
    const content = fs.readFileSync(statePath, 'utf-8');
    const state = JSON.parse(content);

    // Validate version
    if (!state.version) {
      state.version = '1.0';
    }

    // Ensure required fields exist
    if (!state.cooks) state.cooks = {};
    if (!state.archived) state.archived = {};

    return state;
  } catch (error) {
    console.error(`Warning: Could not parse state file: ${error.message}`);
    return getEmptyState();
  }
}

/**
 * Save state to .claude/cook-state.json
 *
 * @param {Object} state - State object to save
 */
function saveState(state) {
  const statePath = path.resolve(STATE_FILE);
  const stateDir = path.dirname(statePath);

  // Ensure .claude directory exists
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true });
  }

  // Update timestamp
  state.lastUpdated = new Date().toISOString();

  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n', 'utf-8');
}

/**
 * Get the currently active cook
 *
 * @returns {Object|null} Active cook data or null
 */
function getActiveCook() {
  const state = loadState();

  if (!state.active || !state.cooks[state.active]) {
    return null;
  }

  return {
    id: state.active,
    ...state.cooks[state.active]
  };
}

/**
 * Set the active cook
 *
 * @param {string} cookId - Cook ID to set as active
 * @returns {boolean} Success
 */
function setActiveCook(cookId) {
  const state = loadState();

  if (cookId && !state.cooks[cookId]) {
    console.error(`Cook not found: ${cookId}`);
    return false;
  }

  state.active = cookId;
  saveState(state);
  return true;
}

/**
 * Add a new cook to state
 *
 * @param {string} cookId - Unique cook ID (e.g., "user-auth.2026-01-12")
 * @param {Object} data - Cook data
 * @returns {Object} Created cook entry
 */
function addCook(cookId, data) {
  const state = loadState();

  const now = new Date().toISOString();

  state.cooks[cookId] = {
    id: cookId,
    artifact: data.artifact || `${COOK_DIR}/${cookId}.cook.md`,
    status: data.status || 'planned',
    branch: data.branch || null,
    commits: data.commits || [],
    pr: data.pr || null,
    untrackedChanges: data.untrackedChanges || [],
    created: data.created || now,
    updated: now
  };

  // Set as active if no active cook
  if (!state.active) {
    state.active = cookId;
  }

  saveState(state);
  return state.cooks[cookId];
}

/**
 * Update an existing cook
 *
 * @param {string} cookId - Cook ID to update
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated cook or null if not found
 */
function updateCook(cookId, updates) {
  const state = loadState();

  if (!state.cooks[cookId]) {
    console.error(`Cook not found: ${cookId}`);
    return null;
  }

  // Merge updates
  state.cooks[cookId] = {
    ...state.cooks[cookId],
    ...updates,
    updated: new Date().toISOString()
  };

  saveState(state);
  return state.cooks[cookId];
}

/**
 * Get cook by artifact path
 *
 * @param {string} artifactPath - Path to artifact file
 * @returns {Object|null} Cook data or null
 */
function getCookByArtifact(artifactPath) {
  const state = loadState();
  const normalizedPath = path.normalize(artifactPath);

  for (const [cookId, cook] of Object.entries(state.cooks)) {
    if (path.normalize(cook.artifact) === normalizedPath) {
      return { id: cookId, ...cook };
    }
  }

  return null;
}

/**
 * Get cook by branch name
 *
 * @param {string} branch - Branch name (e.g., "cook/user-auth")
 * @returns {Object|null} Cook data or null
 */
function getCookByBranch(branch) {
  const state = loadState();

  for (const [cookId, cook] of Object.entries(state.cooks)) {
    if (cook.branch === branch) {
      return { id: cookId, ...cook };
    }
  }

  return null;
}

/**
 * List all cooks (optionally filtered by status)
 *
 * @param {string} statusFilter - Optional status filter
 * @returns {Array} Array of cook objects
 */
function listCooks(statusFilter = null) {
  const state = loadState();

  let cooks = Object.entries(state.cooks).map(([id, cook]) => ({
    id,
    ...cook,
    isActive: id === state.active
  }));

  if (statusFilter) {
    cooks = cooks.filter(c => c.status === statusFilter);
  }

  // Sort by updated date, newest first
  cooks.sort((a, b) => new Date(b.updated) - new Date(a.updated));

  return cooks;
}

/**
 * Archive a completed cook
 *
 * @param {string} cookId - Cook ID to archive
 * @returns {boolean} Success
 */
function archiveCook(cookId) {
  const state = loadState();

  if (!state.cooks[cookId]) {
    console.error(`Cook not found: ${cookId}`);
    return false;
  }

  // Move to archived
  state.archived[cookId] = {
    ...state.cooks[cookId],
    archivedAt: new Date().toISOString()
  };

  delete state.cooks[cookId];

  // Clear active if this was it
  if (state.active === cookId) {
    state.active = null;
  }

  saveState(state);
  return true;
}

/**
 * Remove a cook from state (not archive, just delete)
 *
 * @param {string} cookId - Cook ID to remove
 * @returns {boolean} Success
 */
function removeCook(cookId) {
  const state = loadState();

  if (!state.cooks[cookId]) {
    return false;
  }

  delete state.cooks[cookId];

  if (state.active === cookId) {
    state.active = null;
  }

  saveState(state);
  return true;
}

/**
 * Add commit to cook's commit list
 *
 * @param {string} cookId - Cook ID
 * @param {string} commitHash - Commit hash to add
 * @returns {boolean} Success
 */
function addCommit(cookId, commitHash) {
  const state = loadState();

  if (!state.cooks[cookId]) {
    return false;
  }

  if (!state.cooks[cookId].commits.includes(commitHash)) {
    state.cooks[cookId].commits.push(commitHash);
    state.cooks[cookId].updated = new Date().toISOString();
    saveState(state);
  }

  return true;
}

/**
 * Add untracked change to cook
 *
 * @param {string} cookId - Cook ID
 * @param {Object} change - Change object { file, description, forced }
 * @returns {boolean} Success
 */
function addUntrackedChange(cookId, change) {
  const state = loadState();

  if (!state.cooks[cookId]) {
    return false;
  }

  state.cooks[cookId].untrackedChanges.push({
    ...change,
    timestamp: new Date().toISOString()
  });
  state.cooks[cookId].updated = new Date().toISOString();

  saveState(state);
  return true;
}

/**
 * Helper: Run shell command and return output
 */
function run(cmd, options = {}) {
  try {
    return execSync(cmd, { encoding: 'utf-8', ...options }).trim();
  } catch (error) {
    if (options.ignoreError) {
      return '';
    }
    throw error;
  }
}

/**
 * Helper: Check if git branch exists
 */
function gitBranchExists(branch) {
  try {
    run(`git rev-parse --verify ${branch}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Helper: Get commits with cook tag from branch
 */
function getCommitsWithTag(branch, cookId) {
  try {
    const output = run(`git log ${branch} --oneline --grep="\\[cook:${cookId}\\]"`, { ignoreError: true });
    if (!output) return [];

    return output.split('\n').filter(Boolean).map(line => {
      const [hash] = line.split(' ');
      return hash;
    });
  } catch {
    return [];
  }
}

/**
 * Helper: Find PR for branch using gh CLI
 */
function findPRForBranch(branch) {
  try {
    const output = run(`gh pr list --head ${branch} --json number,url --limit 1`, { ignoreError: true });
    if (!output) return null;

    const prs = JSON.parse(output);
    return prs[0] || null;
  } catch {
    return null;
  }
}

/**
 * Helper: Extract cook ID from artifact filename
 * Format: <slug>.<YYYY-MM-DD>.cook.md
 */
function extractCookIdFromFilename(filename) {
  const basename = path.basename(filename, '.cook.md');
  // basename is now "slug.YYYY-MM-DD"
  return basename;
}

/**
 * Helper: Extract slug from cook ID
 * "user-auth.2026-01-12" -> "user-auth"
 */
function extractSlugFromCookId(cookId) {
  const parts = cookId.split('.');
  // Remove the date part (last part that matches YYYY-MM-DD)
  const dateIndex = parts.findIndex(p => /^\d{4}-\d{2}-\d{2}$/.test(p));
  if (dateIndex > 0) {
    return parts.slice(0, dateIndex).join('.');
  }
  return parts[0];
}

/**
 * Reconstruct state from artifacts and git
 * Use when state file is corrupted or missing
 *
 * @returns {Object} Reconstructed state
 */
function reconstructState() {
  const state = getEmptyState();

  // 1. Scan cook/*.cook.md for artifacts
  const cookDir = path.resolve(COOK_DIR);
  if (!fs.existsSync(cookDir)) {
    return state;
  }

  const artifactFiles = fs.readdirSync(cookDir)
    .filter(f => f.endsWith('.cook.md'))
    .map(f => path.join(cookDir, f));

  for (const artifactPath of artifactFiles) {
    try {
      const content = fs.readFileSync(artifactPath, 'utf-8');
      const cookId = extractCookIdFromFilename(artifactPath);
      const slug = extractSlugFromCookId(cookId);

      // 2. Parse Implementation Status if exists
      const implStatusMatch = content.match(/^## Implementation Status\s*\n([\s\S]*?)(?=\n## |$)/m);
      let status = 'planned';
      let branch = null;
      let prNumber = null;
      let prUrl = null;

      if (implStatusMatch) {
        const implContent = implStatusMatch[1];

        // Parse status
        const statusMatch = implContent.match(/Status:\s*(\w+)/i);
        if (statusMatch) {
          status = statusMatch[1].toLowerCase();
        }

        // Parse branch
        const branchMatch = implContent.match(/Branch:\s*(\S+)/i);
        if (branchMatch) {
          branch = branchMatch[1];
        }

        // Parse PR
        const prMatch = implContent.match(/PR:\s*#?(\d+)/i);
        if (prMatch) {
          prNumber = parseInt(prMatch[1], 10);
        }
        const prUrlMatch = implContent.match(/PR:.*?(https:\/\/github\.com\/[^\s)]+)/i);
        if (prUrlMatch) {
          prUrl = prUrlMatch[1];
        }
      }

      // 3. Match branches via cook/<slug> pattern
      const expectedBranch = `cook/${slug}`;
      const branchExists = gitBranchExists(expectedBranch);

      if (branchExists && !branch) {
        branch = expectedBranch;
      }

      // 4. Scan commits for [cook:id] tags
      const commits = branch ? getCommitsWithTag(branch, cookId) : [];

      // 5. Query PRs via gh if not in artifact
      let pr = null;
      if (prNumber || prUrl) {
        pr = { number: prNumber, url: prUrl };
      } else if (branch) {
        pr = findPRForBranch(branch);
      }

      // Get artifact date from filename
      const dateMatch = path.basename(artifactPath).match(/\.(\d{4}-\d{2}-\d{2})\.cook\.md$/);
      const artifactDate = dateMatch ? dateMatch[1] : null;

      state.cooks[cookId] = {
        id: cookId,
        artifact: artifactPath,
        status: status,
        branch: branchExists ? branch : null,
        commits: commits,
        pr: pr,
        untrackedChanges: [],
        created: artifactDate ? `${artifactDate}T00:00:00Z` : new Date().toISOString(),
        updated: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Warning: Could not process artifact ${artifactPath}: ${error.message}`);
    }
  }

  // 6. Set active to most recently updated non-plated cook
  const activeCooks = Object.values(state.cooks)
    .filter(c => c.status !== 'plated')
    .sort((a, b) => new Date(b.updated) - new Date(a.updated));

  state.active = activeCooks[0]?.id || null;

  return state;
}

/**
 * Rebuild and save state from artifacts + git
 * Useful for recovery or sync
 *
 * @returns {Object} New state
 */
function rebuildState() {
  const state = reconstructState();
  saveState(state);
  return state;
}

/**
 * Auto-cleanup: Archive plated cooks older than N days
 *
 * @param {number} days - Days threshold (default 30)
 * @returns {Array} Archived cook IDs
 */
function autoCleanup(days = 30) {
  const state = loadState();
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);

  const archived = [];

  for (const [cookId, cook] of Object.entries(state.cooks)) {
    if (cook.status === 'plated') {
      const updatedDate = new Date(cook.updated);
      if (updatedDate < threshold) {
        archiveCook(cookId);
        archived.push(cookId);
      }
    }
  }

  return archived;
}

module.exports = {
  // Core CRUD
  loadState,
  saveState,
  getActiveCook,
  setActiveCook,
  addCook,
  updateCook,
  removeCook,
  archiveCook,

  // Lookups
  getCookByArtifact,
  getCookByBranch,
  listCooks,

  // Helpers
  addCommit,
  addUntrackedChange,

  // Recovery
  reconstructState,
  rebuildState,
  autoCleanup,

  // Utils
  extractCookIdFromFilename,
  extractSlugFromCookId,

  // Constants
  STATE_FILE,
  COOK_DIR
};
