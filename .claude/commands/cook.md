---
description: Feature development with guardrails. Plan → Review → Code → Ship.
argument-hint: <feature description> [--well-done | --microwave]
allowed-tools: Write, Read, Glob, Grep, Edit, Task, Bash, TaskCreate, TaskUpdate, TaskList
---

# /cook Command Specification

## ⚡ IMMEDIATE FIRST ACTION

**Your VERY FIRST tool call MUST be Write to create the artifact file.**

Do this NOW, before reading this document further:

```
Write tool → cook/<feature-slug>.<YYYY-MM-DD>.cook.md
```

Example: If user says "/cook Add file opening", your first action is:
```
Write(file_path="cook/add-file-opening.2026-01-14.cook.md", content="<skeleton>")
```

**DO NOT:**
- Read CLAUDE.md first
- Explore codebase first
- Run Grep/Glob first
- Use Task agent first

**FIRST TOOL = Write artifact. Then continue reading.**

---

## Purpose
`/cook` runs the **cook** skill against a feature request.

It enforces a disciplined, multi-phase development process with proper review gates.
Think of it as preparing a dish: ingredients must be fresh, cooking must be thorough, and plating must be precise.

## ⛔ CRITICAL: NO CODE IMPLEMENTATION

**`/cook` is PLANNING ONLY. Do NOT write any implementation code.**

- NO adding files
- NO modifying source code
- NO creating new classes/functions
- NO running tests on new code

The ONLY output of `/cook` is the **artifact file** (`cook/*.cook.md`).

After artifact is complete with status `well-done`, the user will **separately** request implementation.

If you find yourself writing actual code (not just file paths in the plan), STOP immediately.

---

## Syntax

```
/cook <feature description>
```

Optional flags:
```
/cook <feature description> --well-done
/cook <feature description> --microwave
/cook <feature description> --instruction=<file.md>
```

---

## Cooking Modes

### --well-done (default)
Full governance cooking. No shortcuts, no raw ingredients.

- Product, UX, QA, Security all enforced
- Every review phase completed
- Used for:
  - New features
  - Architectural changes
  - Core behavior changes

This is the standard. Features cooked well-done are safe to serve.

---

### --microwave
Speed-optimized cooking for low-risk changes.

- Reduced review process
- No product or UX exploration
- Used for:
  - Bug fixes
  - Small refactors
  - Non-critical UI changes

Rules:
- Cannot introduce new features
- Cannot change architecture
- Should be followed by a `--well-done` run for major changes

Microwave cooking is fast but not thorough. Use it when you need a quick bite, not a full meal.

---

## Microwave Blockers

Microwave mode is **BLOCKED** for these topics. Automatically escalates to `--well-done`:

| Topic | Why blocked |
|-------|-------------|
| **auth / permissions / crypto** | Security-critical, needs full review |
| **schema / migrations / storage** | Data integrity at risk |
| **public API contracts** | Breaking changes affect consumers |
| **UI flow changes** | User experience impact needs UX review |
| **payments / purchase / paywall** | Financial risk, compliance requirements |

If you request `--microwave` for a blocked topic, the system will automatically upgrade to `--well-done`.

---

## Cooking Statuses

Every feature goes through these stages:

| Status | Meaning |
|--------|---------|
| `raw` | Feature requested, not yet evaluated |
| `cooking` | /cook in progress, review phases running |
| `blocked` | Specific blocker identified (owner + next step required) |
| `needs-more-cooking` | Rejected, incomplete, or killed (see reason field) |
| `well-done` | Approved and ready to implement |
| `ready-for-merge` | Post QA/Security, ready for merge |
| `plated` | Shipped to production |

**Note:** `killed` is not a separate status. Use `needs-more-cooking` with `reason: killed - <why>`.

These statuses appear in cooking results and decision artifacts.

---

## Execution Contract

When `/cook` is invoked, Claude Code MUST follow this EXACT sequence:

### Step 1: CREATE ARTIFACT FILE (MANDATORY FIRST ACTION)

**Before ANY exploration, reading, or analysis**, create the artifact file:

```bash
# Filename format: cook/<slug>.<YYYY-MM-DD>.cook.md
# Example: cook/open-files-chat-history.2026-01-14.cook.md
```

Use the Write tool to create this FULL skeleton:

```markdown
# Cooking Result

## Dish
<1-2 sentence description of what we're building>

## Status
raw

## Cooking Mode
well-done

## Current Phase
Step 0.0 - Artifact Created

## Ownership
- Decision Owner: _TBD_
- Reviewers: _TBD_
- Approved by: _TBD_

---

# Phase 0 - Project Policy & Context

**This phase loads the NARRATIVE LAYER - global project context.**

Load narrative context in this order (first found wins):
1. `CLAUDE.md` - Claude Code native format
2. `AGENTS.md` - Vercel/industry convention
3. `README.md` - fallback if neither exists

This tells you:
- What the project does
- How the team works
- What patterns to follow
- What to avoid

## Sources Scanned
| File | Purpose | Status | Key Rules |
|------|---------|--------|-----------|
| CLAUDE.md | **Narrative context** (primary) | _Pending_ | |
| AGENTS.md | **Narrative context** (alternative) | _Pending_ | |
| README.md | Public documentation (fallback) | _Pending_ | |
| .claude/agents/*.md | Chef contracts (loaded per-phase, not here) | _Noted_ | |

## Hard Rules (must not be violated)
_Pending..._

## Preferred Patterns
_Pending..._

## Detected Conflicts
_Pending..._

## Policy Alignment Risk
_Pending..._

---

# Step 1 - Read the Order

## Feature Summary
_Pending..._

## Affected Modules/Components
| Module | Impact | Risk Level |
|--------|--------|------------|
| | | |

## Dependencies
_Pending..._

## Microwave Blocker Check
_Pending..._

---

# Step 2 - Ingredient Approval (Product Review)

## Product Decision
_Pending: Approved / Rejected / Deferred_

## Scope

### In Scope
- _Pending..._

### Out of Scope
- _Pending..._

### Non-goals
- _Pending..._

## User Value
_Pending..._

## Assumptions
- _Pending..._

---

# Step 3 - Presentation Planning (UX Review)

## UX Decision
_Pending: Required / Not Required_

## User Flow
_Pending..._

## UI Components Affected
| Component | Change Type | Notes |
|-----------|-------------|-------|
| | | |

## Accessibility Considerations
_Pending..._

---

# Step 4 - Implementation Plan

## Architecture Decision

### Selected Approach
_Pending..._

### Alternatives Considered
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Option A | | | Rejected: _reason_ |
| Option B | | | **Selected**: _reason_ |

### Trade-offs
- Sacrificing: _what we give up_
- Gaining: _what we get_

## Patch Plan

### Files to Modify
| File | Change | Risk |
|------|--------|------|
| | | |

### Commit Sequence
1. _commit message_
2. _commit message_

### High-risk Areas
- _area needing extra attention_

---

# Step 5 - QA Review

## Test Plan

### Test Cases
| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| 1 | Happy path | | | |
| 2 | Edge case | | | |
| 3 | Error case | | | |

### Edge Cases
- _edge case 1_
- _edge case 2_

### Acceptance Criteria
- [ ] Given _context_, when _action_, then _result_
- [ ] Given _context_, when _action_, then _result_

### Regression Checks
- _existing feature to verify_

---

# Step 6 - Security Review

## Security Status
- Reviewed: _yes/no_
- Risk level: _low/medium/high_

## Security Checklist
| Check | Status | Notes |
|-------|--------|-------|
| Input validation | _Pending_ | |
| Auth/authz | _Pending_ | |
| Data exposure | _Pending_ | |
| Injection vectors | _Pending_ | |

## Issues Found
_Pending..._

---

# Step 7 - Documentation

## Documentation Updates
| File | Change Needed |
|------|---------------|
| | |

## New Documentation Needed
_Pending..._

---

# Risk Management

## Pre-mortem (3 scenarios required)
| # | What Could Go Wrong | Likelihood | Impact | Mitigation |
|---|---------------------|------------|--------|------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

## Rollback Plan
1. _step 1_
2. _step 2_

## Blast Radius
- Affected users/modules: _list_
- Feature flag: _yes/no (name)_
- Rollout strategy: _immediate/gradual/canary_

---

# Decision Log

| Date | Phase | Decision | Rationale |
|------|-------|----------|-----------|
| <today> | Step 0.0 | Artifact created | Starting cook flow |
```

**CRITICAL:** Do NOT proceed to Step 2 until artifact file exists.

### Step 2: Execute cooking phases

Only AFTER artifact exists:
1. Run each cooking phase
2. **CRITICAL: Read the chef file BEFORE each phase** (see Chef Loading below)
3. Update artifact after EACH phase
4. Clearly label each cooking phase in output

#### Chef Loading (MANDATORY) - Operational Layer

**Phase 0 loaded the narrative (CLAUDE.md). Now load operational contracts (chefs).**

Before executing each step, **load the corresponding chef** following resolution order:

| Step | Chef Role | Resolution Order |
|------|-----------|------------------|
| Step 2 (Product) | product_chef | 1. `.claude/agents/product_chef.md` 2. `~/.claude/agents/product_chef.md` |
| Step 3 (UX) | ux_chef | 1. `.claude/agents/ux_chef.md` 2. `~/.claude/agents/ux_chef.md` |
| Step 4 (Plan) | architect_chef, engineer_chef | Load both in order |
| Step 5 (QA) | qa_chef | 1. `.claude/agents/qa_chef.md` 2. `~/.claude/agents/qa_chef.md` |
| Step 6 (Security) | security_chef | 1. `.claude/agents/security_chef.md` 2. `~/.claude/agents/security_chef.md` |
| Step 7 (Docs) | docs_chef | 1. `.claude/agents/docs_chef.md` 2. `~/.claude/agents/docs_chef.md` |

**Resolution algorithm:**
```
1. Try: Glob(".claude/agents/<role>_chef.md")
2. If not found, try: Glob("~/.claude/agents/<role>_chef.md")
3. If not found, try: Glob(".claude/agents/*<role>*.md") # custom naming
4. If still not found: proceed without chef (warn in artifact)
```

**Why this matters:** Chef files contain `non_negotiables`, `rubric`, and `output_contract` that MUST be applied. Without reading them, you're cooking blind.

After reading, apply:
- `non_negotiables` - rules that cannot be violated
- `rubric.ready_for_merge` - checklist that must pass
- `output_contract` - review format (review_v1)

### Step 3: Finalize

1. Update artifact status to final state
2. Produce final Cooking Result summary

---

## Tasks Integration (Claude Code v2.1.16+)

Cook uses the Tasks API to track phase progress, providing visibility via `/tasks` command.

### Task Creation (after artifact)

Immediately after creating the artifact file, create tasks for all phases:

```
TaskCreate({
  subject: "[cook] Phase 0: Scan project context",
  description: "Scan CLAUDE.md, agents, templates for project rules",
  activeForm: "Scanning project context..."
})
→ Returns task_id_0

TaskCreate({
  subject: "[cook] Step 1: Analyze feature request",
  description: "Parse feature, identify modules, check microwave blockers",
  activeForm: "Analyzing feature..."
})
→ Returns task_id_1

TaskUpdate({ taskId: task_id_1, addBlockedBy: [task_id_0] })

... (repeat for Steps 2-7 with proper blockedBy chain)
```

### Phase Mapping

| Cook Phase | Task Subject | blockedBy |
|------------|--------------|-----------|
| Phase 0 | `[cook] Phase 0: Scan project context` | (none) |
| Step 1 | `[cook] Step 1: Analyze feature request` | Phase 0 |
| Step 2 | `[cook] Step 2: Product review` | Step 1 |
| Step 3 | `[cook] Step 3: UX review` | Step 2 |
| Step 4 | `[cook] Step 4: Implementation plan` | Step 3 |
| Step 5 | `[cook] Step 5: QA review` | Step 4 |
| Step 6 | `[cook] Step 6: Security review` | Step 5 |
| Step 7 | `[cook] Step 7: Documentation` | Step 6 |

### Task Updates

As each phase completes:
1. `TaskUpdate({ taskId: <phase_id>, status: "completed" })`
2. Next phase automatically unblocked
3. Update artifact with phase results

### Microwave Mode Tasks

For `--microwave`, create only:
- Step 1: Analyze feature
- Step 4: Implementation plan
- Step 5: QA review (1-2 tests)

### Graceful Degradation

If Tasks API is unavailable (older Claude Code or `CLAUDE_CODE_ENABLE_TASKS=false`):
- Cook proceeds normally without task tracking
- Artifact remains the source of truth
- No errors or warnings needed

---

## Example

```
/cook Add user authentication with OAuth
```
-> Runs full `--well-done` cooking with all review phases

```
/cook Fix null pointer in payment handler --microwave
```
-> Runs quick `--microwave` cooking for a bug fix

---

## Failure Modes

Claude Code MUST STOP cooking if:
- Product scope is rejected (well-done mode) -> status: `needs-more-cooking`
- Security finds a blocker -> status: `needs-more-cooking`
- Scope exceeds defined project boundaries -> status: `needs-more-cooking`

---

## Stop Rules (Kill Switch)

Cooking is automatically killed (`needs-more-cooking` + `reason: killed`) if:

1. **No measurable effect** - feature has no clear, testable outcome
2. **Risk > value** - implementation risk outweighs user benefit
3. **No owner** (well-done mode) - no Decision Owner assigned
4. **No testable AC** - acceptance criteria cannot be verified

When a feature is killed, the specific reason is documented and processing stops.

This is NOT failure - it's the system working correctly to prevent wasted effort.

---

## Prerequisites

This command uses a layered agent system:

**Required for best results (mise en place):**
- `CLAUDE.md` in project root - defines project rules and constraints
- `<project>/.claude/agents/` - project-specific review agents

**System-wide fallbacks (always available):**
- `~/.claude/agents/engineer.md` - generic engineering agent
- `~/.claude/agents/product.md` - product scope review
- `~/.claude/agents/designer.md` - UX/flow review
- `~/.claude/agents/security.md` - security audit
- `~/.claude/agents/qa.md` - QA review
- `~/.claude/agents/architect.md` - architecture review
- `~/.claude/agents/docs.md` - documentation

**Resolution order:** Project-specific agents override system-wide agents.

---

## Artifacts

Cooking artifacts are stored as decision records:
- Location: `cook/*.cook.md`
- Contains: scope decisions, review outcomes, status

---

## Philosophy

`/cook` exists to:
- Prevent serving raw code to users
- Enforce development discipline through structured preparation
- Ensure proper review before implementation
- Catch issues early, before they reach the plate

---

## Alias

`/dogfood` is an alias for `/cook` (backward compatibility).
