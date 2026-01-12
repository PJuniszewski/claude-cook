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

## License

MIT License. See [LICENSE](LICENSE).
