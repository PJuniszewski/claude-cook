# juni

**Juni Skills Suite** - A unified Claude Code plugin combining feature development workflows (`/juni:cook`) and context safety tools (`/juni:guard`).

## What's Included

| Command | Description |
|---------|-------------|
| `/juni:cook` | Structured feature development with planning phases |
| `/juni:cook-menu` | Interactive artifact management |
| `/juni:cook-stats` | Analytics and insights for cook artifacts |
| `/juni:sous-chef` | Background monitoring for cooking discipline |
| `/juni:inspect` | Post-implementation sanitation inspection |
| `/juni:guard` | Epistemic safety for JSON data in prompts |

## Installation

### Via Juni-Skills Marketplace

```bash
# Add the marketplace (run /plugin, select "Add Marketplace", enter: PJuniszewski/juni-skills-marketplace)

# Install and enable
claude /plugin install juni-skills:juni
claude /plugin enable juni
```

### Via skills.sh

```bash
npx skills add PJuniszewski/claude-cook
```

### Verify Installation

```bash
# Check available commands
/help

# Test cook
/juni:cook Add a simple feature --dry-run

# Test guard
/juni:guard '[{"test": 1}]'
```

---

## /juni:cook - Feature Development

`/juni:cook` prevents shipping raw code by requiring structured planning, review phases, and documented decisions before implementation begins.

### Well-Done Mode (default)

Full governance cooking with all review phases:

```
/juni:cook Add SSE streaming blocks --well-done
/juni:cook Add user authentication with OAuth
/juni:cook Implement real-time notifications
```

### Microwave Mode

Speed-optimized for low-risk changes:

```
/juni:cook Fix crash in SettingsActivity --microwave
/juni:cook Fix null pointer in payment handler --microwave
/juni:cook Update error message text --microwave
```

### What It Generates

Each `/juni:cook` run produces an artifact in `cook/<slug>.<date>.cook.md`:

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
1. Connection drops silently -> mitigation: heartbeat + reconnect logic
2. Memory leak from unclosed streams -> mitigation: cleanup on unmount
3. Server overload from many connections -> mitigation: connection pooling

## Patch Plan
- Files to modify:
  1. src/api/streaming.ts - new SSE client
  2. src/hooks/useStream.ts - React hook wrapper
- Tests to run: streaming.test.ts, integration/sse.test.ts
```

### Microwave Blockers

These topics **automatically escalate** to `--well-done`:

| Topic | Reason |
|-------|--------|
| auth / permissions / crypto | Security-critical |
| schema / migrations / storage | Data integrity risk |
| public API contracts | Breaking change risk |
| UI flow changes | UX impact |
| payments / purchase / paywall | Financial/compliance risk |

### Cooking Statuses

| Status | Meaning |
|--------|---------|
| `raw` | Requested, not evaluated |
| `cooking` | In progress |
| `blocked` | Blocker identified |
| `needs-more-cooking` | Rejected or incomplete |
| `well-done` | Approved, ready to implement |
| `ready-for-merge` | Post QA/Security |
| `plated` | Shipped |

---

## /juni:guard - Context Safety

`/juni:guard` prevents LLMs from reasoning with unjustified certainty when input data is incomplete.

### Features

- **Lossless reduction** - Minify, columnar transform, remove nulls
- **Token counting** - API or heuristic fallback
- **Decision engine** - ALLOW / SAMPLE / BLOCK
- **Intelligent trimming** - First + last + evenly-spaced sampling
- **Forensic detection** - Warns when specific record queries detected

### Usage

```bash
# Analyze a file
/juni:guard my_data.json

# Analyze inline JSON data
/juni:guard '[{"id": 1}, {"id": 2}]'

# Force through despite warnings
/juni:guard my_data.json --force

# Check if forensic query is safe
/juni:guard logs.json --mode forensics

# Use larger token budget
/juni:guard data.json --budget-tokens 5000
```

### Semantic Modes

| Mode | Sampling | Use Case |
|------|----------|----------|
| `analysis` | Allowed | "What categories exist?", "Price range?" |
| `summary` | Aggressive | "Describe the data structure" |
| `forensics` | **BLOCKED** | "Why did request id=X fail?" |

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `TOKEN_GUARD_MIN_CHARS` | `6000` | Below = always allow |
| `TOKEN_GUARD_WARN_CHARS` | `15000` | Above = warn |
| `TOKEN_GUARD_HARD_LIMIT_CHARS` | `100000` | Above = hard block |
| `TOKEN_GUARD_MODEL` | `claude-sonnet-4-20250514` | Model for token counting |
| `TOKEN_GUARD_PROMPT_LIMIT` | `3500` | Default token budget |

---

## Additional Tools

### /juni:cook-menu

Interactive artifact management:
- Compare artifacts
- Validate against requirements
- View status dashboard

### /juni:cook-stats

```
/juni:cook-stats                           # Show overall statistics
/juni:cook-stats --since 2026-01-01        # Filter by date
/juni:cook-stats search "authentication"   # Search artifacts
/juni:cook-stats similar src/auth.ts       # Find similar by files
```

### /juni:sous-chef

Background monitoring:
```
/juni:sous-chef monitor                    # Detect uncooked sensitive changes
/juni:sous-chef drift cook/feature.cook.md # Compare plan vs implementation
/juni:sous-chef postmortem cook/feature.cook.md  # Analyze predictions
/juni:sous-chef suggest                    # Get governance suggestions
```

### /juni:inspect

Post-implementation sanitation inspection - code review that verifies **actual git diffs** match the cook artifact plan:

```
/juni:inspect                              # Inspect most recent well-done artifact
/juni:inspect cook/feature.cook.md         # Inspect specific artifact
/juni:inspect artifact --commit abc123     # Inspect specific commit against artifact
/juni:inspect --commit abc123              # Pure code review (no artifact)
/juni:inspect --surprise                   # Force surprise inspection mode
```

**Three Modes:**
| Mode | Description |
|------|-------------|
| Artifact + Auto-detect | Find artifact, find related commits, compare plan vs actual |
| Artifact + Manual commit | Use specified artifact and commit |
| Commit only | Pure code review (hygiene + safety, no recipe compliance) |

**What it checks:**
- **Recipe Compliance** - Plan vs actual implementation (planned files, decisions, non-goals)
- **Hygiene** - Error handling, edge cases, code consistency in the diff
- **Safety** - Input validation, injection vectors, auth checks in the diff

**High Signal Only:**
Inspired by [Anthropic's code-review](https://github.com/anthropics/claude-code/tree/main/plugins/code-review), inspect only flags issues with high confidence:
- Syntax errors, missing imports
- Clear logic errors
- Deviation from artifact plan
- Obvious security vulnerabilities

**Surprise Mode (`--surprise`):**
Stricter inspections for high-risk situations:
| Aspect | Regular | Surprise |
|--------|---------|----------|
| Confidence threshold | >= 75% | >= 60% |
| Agent model | Sonnet | Opus |
| Additional checks | 3 agents | + CLAUDE.md compliance |

Use for: auth changes, payments, schema migrations, large diffs, pre-release audits.

**Edge Case Handling:**
- Multiple artifacts? Interactive selection
- No commits found? Option for manual SHA or pure code review
- Files don't match plan? Confirmation before proceeding

The inspection report is appended to the cook artifact with violations and recommendations.

---

## Customizing Agents (Chefs)

Create project-specific chefs in `.claude/agents/`:

```
.claude/agents/
  product_chef.md    # Scope decisions
  ux_chef.md         # UX review
  qa_chef.md         # Test planning
  security_chef.md   # Security audit
```

Project chefs override system-wide defaults.

---

## Tips for Best Results

`/juni:cook` extracts project context during Phase 0. The more context available, the better the output.

**Recommended project setup:**

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Project rules, constraints, conventions |
| `README.md` | Project overview, architecture summary |
| `docs/` | Architecture decisions, API specs, ADRs |
| `.claude/agents/` | Project-specific review chefs |

---

## Documentation

| Document | Description |
|----------|-------------|
| [CLAUDE.md](CLAUDE.md) | Project rules for this repository |
| [CHEF_MATRIX.md](CHEF_MATRIX.md) | Who does what - chef responsibilities |
| [COOK_CONTRACT.md](COOK_CONTRACT.md) | Required sections for valid artifacts |
| [ANTI_PATTERNS.md](ANTI_PATTERNS.md) | What `/juni:cook` is NOT |
| [COMPARISON.md](COMPARISON.md) | When to use what |

---

## Migration from cook/context-guard

If you had the old plugins installed:

```bash
# Remove old plugins
claude /plugin uninstall juni-skills:cook
claude /plugin uninstall juni-skills:context-guard

# Install unified plugin
claude /plugin install juni-skills:juni
claude /plugin enable juni
```

**Command changes:**
| Old | New |
|-----|-----|
| `/cook` | `/juni:cook` |
| `/cook-menu` | `/juni:cook-menu` |
| `/cook-stats` | `/juni:cook-stats` |
| `/sous-chef` | `/juni:sous-chef` |
| `/guard` | `/juni:guard` |

---

## License

MIT License. See [LICENSE](LICENSE).
