# claude-cook

A Claude Code custom command that enforces a disciplined, multi-phase development workflow. Think of it as preparing a dish: ingredients must be fresh, cooking must be thorough, and plating must be precise.

`/cook` prevents shipping raw code by requiring structured planning, review phases, and documented decisions before implementation begins.

## Installation

### Via Juni-Tools Marketplace

```bash
# Add the marketplace (run /plugin, select "Add Marketplace", enter: PJuniszewski/juni-tools-marketplace)

# Install and enable
claude /plugin install juni-tools:cook
claude /plugin enable cook
```

### Verify Installation

```bash
# Check available commands
/help

# Test the command
/cook Add a simple feature --dry-run
```

## Usage

### Well-Done Mode (default)

Full governance cooking with all review phases:

```
/cook Add SSE streaming blocks --well-done
/cook Add user authentication with OAuth
/cook Implement real-time notifications
```

### Microwave Mode

Speed-optimized for low-risk changes:

```
/cook Fix crash in SettingsActivity --microwave
/cook Fix null pointer in payment handler --microwave
/cook Update error message text --microwave
```

## What It Generates

Each `/cook` run produces an artifact in `cook/<slug>.<date>.cook.md`:

```markdown
# Cooking Result

## Dish
Add SSE streaming for real-time updates

## Status
well-done

## Cooking Mode
well-done

## Ownership
- Decision Owner: @engineer
- Reviewers: auto
- Approved by: Product on 2026-01-07

## Product Decision
Approved
- Reason: Aligns with Q1 real-time features roadmap

## Pre-mortem
1. Connection drops silently → mitigation: heartbeat + reconnect logic
2. Memory leak from unclosed streams → mitigation: cleanup on unmount
3. Server overload from many connections → mitigation: connection pooling

## Patch Plan
- Files to modify:
  1. src/api/streaming.ts - new SSE client
  2. src/hooks/useStream.ts - React hook wrapper
- Tests to run: streaming.test.ts, integration/sse.test.ts
```

## Microwave Blockers

These topics **automatically escalate** to `--well-done`:

| Topic | Reason |
|-------|--------|
| auth / permissions / crypto | Security-critical |
| schema / migrations / storage | Data integrity risk |
| public API contracts | Breaking change risk |
| UI flow changes | UX impact |
| payments / purchase / paywall | Financial/compliance risk |

## Cooking Statuses

| Status | Meaning |
|--------|---------|
| `raw` | Requested, not evaluated |
| `cooking` | In progress |
| `blocked` | Blocker identified |
| `needs-more-cooking` | Rejected or incomplete |
| `well-done` | Approved, ready to implement |
| `ready-for-merge` | Post QA/Security |
| `plated` | Shipped |

## Customizing Agents (Chefs)

Create project-specific chefs in `.claude/agents/`:

```
.claude/agents/
  product_chef.md    # Scope decisions
  ux_chef.md         # UX review
  qa_chef.md         # Test planning
  security_chef.md   # Security audit
```

Project chefs override system-wide defaults. See `.claude/agents/README.md` for details.

## Tips for Best Results

`/cook` extracts project context during Phase 0. The more context available, the better the output.

**Recommended project setup:**

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project rules, constraints, conventions |
| `README.md` | Project overview, architecture summary |
| `docs/` | Architecture decisions, API specs, ADRs |
| `.claude/agents/` | Project-specific review chefs |

**In your `CLAUDE.md`, consider documenting:**

- Tech stack and versions
- Coding conventions and style
- Security requirements
- Testing expectations
- Forbidden patterns or deprecated approaches
- Team-specific workflows

**Example `CLAUDE.md`:**

```markdown
# Project Rules

## Stack
- TypeScript 5.x, React 18, Node 20
- PostgreSQL with Prisma ORM

## Conventions
- Functional components only
- No default exports
- All API routes require authentication

## Security
- No secrets in code
- All user input must be validated with zod

## Testing
- Unit tests required for business logic
- E2E tests for critical user flows
```

The more explicit your project documentation, the more accurate `/cook` will be at detecting conflicts, assessing risk, and generating relevant review checklists.

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](CLAUDE.md) | Project rules for this repository (dogfooding example) |
| [CHEF_MATRIX.md](CHEF_MATRIX.md) | Who does what - chef responsibilities and phases |
| [COOK_CONTRACT.md](COOK_CONTRACT.md) | Required sections for valid cook artifacts |
| [ANTI_PATTERNS.md](ANTI_PATTERNS.md) | What `/cook` is NOT - common misuses |
| [COMPARISON.md](COMPARISON.md) | `/cook` vs prompt spaghetti - when to use what |
| [examples/quickstart/](examples/quickstart/) | Full walkthrough from request to artifact |

## Diff & Versioning

Compare two cook artifacts to see what changed:

```bash
# Compare two artifacts
./scripts/cook-diff cook/feature-a.cook.md cook/feature-b.cook.md

# Show changelog entries since a date
./scripts/cook-diff cook/feature.cook.md --since 2026-01-01
```

Output shows:
- Added sections (new in second file)
- Removed sections (missing in second file)
- Modified sections (content changed)
- Summary of total changes

Each artifact includes a `## Changelog` section for tracking version history within the file.

## Preview Mode

Use `--dry-run` to see what `/cook` will do without executing:

```
/cook Add feature X --dry-run
```

Shows:
- Which chefs will be consulted
- Which phases will run
- Whether prerequisites are met
- Potential blockers

## Validation

Validate cook artifacts against mode-specific requirements:

```bash
# Validate an artifact
./scripts/cook-validate cook/feature.cook.md

# Verbose output (show all checks)
./scripts/cook-validate cook/feature.cook.md --verbose

# JSON output (for CI)
./scripts/cook-validate cook/feature.cook.md --json
```

Checks include:
- Required sections present (scope, pre-mortem, tests, etc.)
- No TBD/TODO placeholders
- Ownership assigned
- Minimum test cases defined
- Rollback plan documented

Use `/cook-menu` for interactive artifact management (validate, compare, view status).

## Recipe Library (Similar Dishes)

When you run `/cook`, similar past artifacts are automatically surfaced:

```
/cook Add session timeout

🔍 Similar dishes found in your kitchen:
┌──────────────────────────────────────────────────────────────┐
│ 1. user-auth.2026-01-05.cook.md (78% similar)                │
│    "Add user authentication with OAuth"                       │
│    Files: src/auth/*, src/session.ts                          │
│    Key decision: Used JWT with 1h expiry                      │
├──────────────────────────────────────────────────────────────┤
│ 2. session-refresh.2026-01-12.cook.md (65% similar)          │
│    "Implement token refresh flow"                             │
│    Files: src/session.ts, lib/token.ts                        │
│    Key decision: Refresh 5min before expiry                   │
└──────────────────────────────────────────────────────────────┘
💡 Consider reusing patterns from these artifacts.
```

This helps you:
- **Reuse patterns** from similar past features
- **Recall decisions** and why they were made
- **Stay consistent** with related work

Similarity is calculated from files touched (50%), title keywords (30%), and feature keywords (20%).

## Analytics

Track cooking metrics with `/cook-stats`:

```bash
# Show overall statistics
./scripts/cook-stats

# Filter by date
./scripts/cook-stats --since 2026-01-01

# Search artifacts
./scripts/cook-stats search "authentication"

# Find similar by files
./scripts/cook-stats similar src/auth.ts

# Show timeline
./scripts/cook-stats timeline
```

Output:
```
📊 Cook Analytics (all time)
────────────────────────────────────────
Total cooks: 12
  • 8 well-done, 4 microwave

Status breakdown:
  ✅ well-done: 6
  🚀 ready-for-merge: 2
  🔥 cooking: 1

Completion rate: 67%

Hot files:
  • src/auth/* (5 cooks)
  • api/routes.ts (4 cooks)
```

## Sous Chef (Background Monitoring)

Sous Chef watches over your kitchen to ensure cooking discipline is maintained:

```bash
# Detect commits with uncooked sensitive changes
./scripts/sous-chef monitor

# Check specific commit range
./scripts/sous-chef monitor --since HEAD~20

# Compare implementation against artifact plan
./scripts/sous-chef drift cook/feature.cook.md

# Check drift against specific git range
./scripts/sous-chef drift cook/feature.cook.md --range main..feature-branch

# Analyze pre-mortem predictions vs outcomes
./scripts/sous-chef postmortem cook/feature.cook.md

# Analyze with known incidents
./scripts/sous-chef postmortem cook/feature.cook.md --incidents "timeout,memory leak"

# Get suggestions for frequently-changed files
./scripts/sous-chef suggest
```

### Change Monitor Output
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

### Drift Detection Output
```
======================================
  SOUS CHEF - Drift Detection Report
======================================

Artifact: feature-auth
Status:   well-done

DRIFT DETECTED

Unplanned changes (scope creep): 2
  + src/utils/helper.ts
  + tests/extra.test.ts

Missing from implementation: 1
  - src/auth/oauth.ts
```

Sous Chef helps you:
- **Catch uncooked changes** before they cause problems
- **Detect scope creep** in implementations
- **Learn from past predictions** to improve future risk assessments
- **Identify hot files** that need more governance

## Implementation Bridge

Connect planning to execution with prep, pr, and link commands:

```bash
# Generate file stubs from artifact plan
./scripts/cook-prep cook/feature.cook.md
./scripts/cook-prep feature --dry-run  # Preview only
./scripts/cook-prep feature --list     # List files

# Generate PR description from artifact
./scripts/cook-pr cook/feature.cook.md
./scripts/cook-pr feature --body-only  # Just the body (for gh pr create)
./scripts/cook-pr feature --json       # JSON output

# Link artifact to merged PR
./scripts/cook-link cook/feature.cook.md 123
./scripts/cook-link feature #456
```

### PR Generation Output
```
======================================
  COOK-PR - PR Description Generator
======================================

Title:
  Add user authentication with OAuth

Body:
----------------------------------------
## Summary
- Add OAuth login flow
- Implement session management
- Add logout endpoint

## Test plan
- [ ] OAuth flow works end-to-end
- [ ] Session persists across page loads
- [ ] Logout clears session

## Risk
- Risk level: **medium**
- Security reviewed: Yes

---
Cook artifact: `user-auth.2026-01-20`
```

## MCP Dashboard

The cook plugin includes an MCP server for Claude integration:

```json
// .mcp.json (auto-configured)
{
  "mcpServers": {
    "cook-dashboard": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/scripts/mcp-server.js"]
    }
  }
}
```

### Available Tools

| Tool | Description |
|------|-------------|
| `cook_list` | List all artifacts with optional status filter |
| `cook_status` | Get detailed status of specific artifact |
| `cook_blockers` | List blocked artifacts with reasons |
| `cook_search` | Search artifacts by keyword |

### Example Usage in Claude

```
"What features are currently cooking?"
-> Claude uses cook_list tool

"Show me blocked artifacts"
-> Claude uses cook_blockers tool

"Find artifacts related to authentication"
-> Claude uses cook_search with query "authentication"
```

## License

MIT License. See [LICENSE](LICENSE).
