---
description: Feature development with guardrails. Plan → Review → Code → Ship.
argument-hint: <feature description> [--well-done | --microwave]
---

# /cook Command Specification

## Purpose
`/cook` runs the **cook** skill against a feature request.

It enforces a disciplined, multi-phase development process with proper review gates.
Think of it as preparing a dish: ingredients must be fresh, cooking must be thorough, and plating must be precise.

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
/cook <feature description> --implement
/cook <feature description> --create-pr
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

## Execution Mode (Code-Artifact Linking)

By default, `/cook` only creates a plan artifact without touching the repository. Use execution flags to opt-in to automatic implementation.

### --implement
Plan + start implementation. After planning:
- Creates branch `cook/<slug>` (or uses existing)
- Implements according to Patch Plan
- Tags all commits with `[cook:<cook_id>]`
- Updates artifact with Implementation Status
- Transitions status: `planned → implementing`

### --create-pr
Plan + implement + create PR. Does everything `--implement` does, plus:
- Pushes branch to remote
- Creates PR with artifact summary as description
- Links PR URL in artifact
- Transitions status: `implementing → pr-ready`

### Natural Language Triggers
Instead of flags, you can use natural language after planning:
- "implement it" / "start coding" → behaves like `--implement` (with checkpoint)
- "ship it" / "create PR" → behaves like `--create-pr` (with auto-verify)

**Important:** Natural language triggers require explicit confirmation before execution.

### State Tracking
Cook state is tracked in `.claude/cook-state.json`:
- Active cook (last `/cook` wins, explicit mention overrides)
- Branch assignment
- Commit history
- PR link
- Status transitions

This file is auto-managed - no manual editing required.

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
| `planned` | Artifact complete, awaiting implementation (with --implement/--create-pr) |
| `implementing` | Implementation in progress (branch created, coding active) |
| `pr-ready` | PR created and linked, awaiting review/merge |
| `ready-for-merge` | Post QA/Security, ready for merge |
| `plated` | Shipped to production (PR merged) |

**Note:** `killed` is not a separate status. Use `needs-more-cooking` with `reason: killed - <why>`.

These statuses appear in cooking results and decision artifacts.

---

## Execution Contract

When `/cook` is invoked, Claude Code MUST:

1. Refuse to jump straight into coding (no raw code)
2. Run cook skill
3. Clearly label each cooking phase
4. Produce final Cooking Result with status

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
