---
name: sous-chef
description: Background monitoring for cook artifacts - detects uncooked changes, drift, and analyzes post-mortems
user-invocable: false
---

# Sous Chef Skill

## Purpose

Sous Chef provides background monitoring capabilities to ensure cooking discipline is maintained:

- **Change Monitor**: Detect commits without cook artifacts
- **Drift Detection**: Compare plans against implementation
- **Post-Mortem**: Analyze prediction accuracy
- **Suggestions**: Surface patterns needing governance

## CLI Usage

```bash
# Monitor recent commits for uncooked sensitive changes
./scripts/sous-chef monitor

# Check specific commit range
./scripts/sous-chef monitor --since HEAD~20

# Detect drift between artifact and implementation
./scripts/sous-chef drift cook/feature.2026-01-20.cook.md

# Check drift against specific git range
./scripts/sous-chef drift cook/feature.cook.md --range main..feature-branch

# Analyze post-mortem for an artifact
./scripts/sous-chef postmortem cook/feature.cook.md

# Analyze with known incidents
./scripts/sous-chef postmortem cook/feature.cook.md --incidents "timeout,memory leak"

# Generate post-mortem template
./scripts/sous-chef postmortem cook/feature.cook.md --template

# Get suggestions for frequently-changed files
./scripts/sous-chef suggest
```

## Commands

### monitor

Scans recent commits for changes to sensitive files (auth, security, payments, migrations) that don't have associated cook artifacts.

**Options:**
- `--since <ref>`: Start commit or date (default: HEAD~10)
- `--until <ref>`: End commit (default: HEAD)

**Output:**
```
======================================
  SOUS CHEF - Change Monitor Report
======================================

Found 2 commit(s) with uncooked sensitive changes:

  abc1234 - Add login endpoint
    Date: 2026-01-20 10:30:00
    Sensitive files:
      - src/auth/login.ts
      - api/auth/routes.ts

--------------------------------------
Recommendation: Run /cook for these changes
```

### drift

Compares an artifact's planned files against actual implementation. Detects scope creep (unplanned changes) and missing implementations.

**Arguments:**
- `<artifact>`: Path to cook artifact

**Options:**
- `--range <range>`: Git commit range to compare
- `--since <date>`: Compare changes since date

**Output:**
```
======================================
  SOUS CHEF - Drift Detection Report
======================================

Artifact: feature-auth
Status:   well-done
Date:     2026-01-20

DRIFT DETECTED

Unplanned changes (scope creep): 2
  + src/utils/helper.ts
  + tests/extra.test.ts

Missing from implementation: 1
  - src/auth/oauth.ts

--------------------------------------
Recommendation: Review unplanned changes
```

### postmortem

Analyzes pre-mortem predictions from an artifact against actual outcomes. Helps improve future risk assessments.

**Arguments:**
- `<artifact>`: Path to cook artifact

**Options:**
- `--incidents <list>`: Comma-separated list of incidents that occurred
- `--template`: Generate outcome template for manual input

**Output:**
```
======================================
  SOUS CHEF - Post-Mortem Analysis
======================================

Artifact: feature-auth
Pre-mortem predictions: 3

1. Connection timeout during OAuth
   Mitigation: Add retry logic

2. Token refresh race condition
   Mitigation: Use mutex lock

3. Memory leak from unclosed streams
   Mitigation: Cleanup on unmount

--------------------------------------
ANALYSIS RESULTS

Predictions accuracy: 67%

Risks that materialized: 1
  [!] Connection timeout during OAuth

Risks avoided: 2
  [+] Token refresh race condition
  [+] Memory leak from unclosed streams
```

### suggest

Analyzes the codebase to find frequently-changed files that don't have associated cook artifacts.

**Options:**
- `--since <date>`: Analyze changes since date

**Output:**
```
======================================
  SOUS CHEF - Suggestions
======================================

Found 3 frequently-changed files without cook artifacts:

  [5x] src/api/endpoints.ts
  [4x] lib/utils/format.ts
  [3x] src/components/Form.tsx

--------------------------------------
Recommendation: Consider running /cook for these areas
```

## Sensitive File Patterns

By default, these patterns are considered sensitive:

- `src/auth`, `lib/auth`, `api/auth`, `middleware/auth`
- `src/security`, `config/security`
- `lib/crypto`, `credentials`, `secrets`
- `.env`
- `migrations/`, `schema`, `database`
- `payment`, `billing`, `subscription`

## Module API

### changeMonitor.js

```javascript
const { analyzeCommits, formatChangeReport } = require('./lib/changeMonitor');

const results = analyzeCommits({
  since: 'HEAD~10',
  until: 'HEAD'
});

console.log(formatChangeReport(results));
```

### driftDetector.js

```javascript
const { analyzeDrift, formatDriftReport } = require('./lib/driftDetector');

const analysis = analyzeDrift('cook/feature.cook.md', {
  range: 'main..feature-branch'
});

console.log(formatDriftReport(analysis));
```

### postMortem.js

```javascript
const { generatePostMortem, formatPostMortemReport } = require('./lib/postMortem');

const report = generatePostMortem('cook/feature.cook.md', {
  incidents: ['timeout error', 'memory leak']
});

console.log(formatPostMortemReport(report));
```

## Integration with /cook

Sous Chef complements the /cook workflow:

1. **Before cooking**: Run `suggest` to identify areas needing artifacts
2. **After implementation**: Run `drift` to verify plan was followed
3. **After deployment**: Run `postmortem` to analyze predictions
4. **Periodically**: Run `monitor` to catch uncooked changes

## Dependencies

- `scripts/lib/indexer.js` - Artifact indexing
- `scripts/lib/artifactParser.js` - Artifact parsing
- Git CLI - Commit analysis

## Performance

- Change monitor: O(commits × files)
- Drift detection: O(planned × implemented)
- Post-mortem: O(scenarios × incidents)

All operations are local and do not require network access.
