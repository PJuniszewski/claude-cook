---
name: feature-development
description: Run a full, policy-compliant feature development flow with structured review phases
---

# feature-development skill

## Purpose
Cook features through a structured, multi-phase development flow.

The goal is not speed, but correctness, safety, and product discipline.
Every dish must be properly prepared before serving.

---

## Inputs

- **feature_description** (string, required)
  Plain-language description of the feature or change (the order).

- **instruction_file** (string, optional)
  Related specification or requirements file (the recipe).

- **mode** (enum: well-done | microwave, default: well-done)
  Determines cooking thoroughness and review phases.

---

## Cooking Modes

### well-done (default)
Full governance cooking. No shortcuts, no raw ingredients.

Cooking phases:
- Product scope check (ingredient approval)
- UX/Design review (presentation planning)
- Implementation (cooking)
- QA review (taste testing)
- Security review (safety inspection)
- Documentation (recipe notes)

Blocking allowed: YES

---

### microwave
Speed-optimized cooking for low-risk changes.

Cooking phases:
- Implementation (quick heat)
- QA review (light taste test)
- Security review (only if API/auth touched)

Blocking allowed: YES (security only)

Rules:
- No scope expansion (no adding ingredients)
- No architecture changes (no changing the recipe)
- Should be followed by well-done cooking for verification

---

## Cooking Statuses

Every feature progresses through these stages:

| Status | Meaning |
|--------|---------|
| `raw` | Feature requested, not yet evaluated |
| `cooking` | /cook in progress, review phases running |
| `blocked` | Specific blocker identified (requires owner + next step) |
| `needs-more-cooking` | Rejected, incomplete, or killed (+ reason field) |
| `well-done` | Approved and ready to implement |
| `ready-for-merge` | Post QA/Security, ready for merge |
| `plated` | Shipped to production |

**Note:** `killed` is NOT a separate status. Use `needs-more-cooking` with `reason: killed - <why>`

---

## Microwave Blockers

Microwave mode is **BLOCKED** for these topics. Use `--well-done` instead:

- **auth / permissions / crypto / network security** - any authentication, authorization, encryption, or security-related changes
- **schema / migrations / storage** - database schema changes, migrations, storage layer modifications
- **public API contracts** - any changes to public-facing API signatures or behavior
- **UI flow changes** - even small changes to user flows or navigation
- **payments / purchase / paywall** - anything touching billing, payments, or monetization

If microwave mode is requested for a blocked topic, automatically escalate to well-done.

---

## Definition of Done

### Well-Done Mode Requirements
Reference: `~/.claude/templates/well-done-checklist.md`

**MUST include:**
- Scope definition (in/out)
- Risks + mitigations (min 3)
- Test plan (min 3 test cases)
- Security checklist (all items addressed)
- Rollout/rollback plan
- Pre-mortem (3 failure scenarios)
- Trade-offs documented
- Ownership assigned

### Microwave Mode Requirements
Reference: `~/.claude/templates/microwave-checklist.md`

**MUST include:**
- Problem statement + reproduction steps
- Minimal fix plan
- Tests (1-2)
- "Why safe" (1 sentence)
- Pre-mortem (1 failure scenario)

---

## Stop Rules (Kill Switch)

In Step 2 (Ingredient Approval), automatically set status to `needs-more-cooking` with `reason: killed` if:

1. **No measurable effect** - feature has no clear, testable outcome
2. **Risk > value** - implementation risk outweighs user benefit
3. **No owner** (well-done mode) - no one assigned as Decision Owner
4. **No testable AC** - acceptance criteria cannot be verified

When killed, document the specific reason and stop processing.

---

## Cooking Steps

### Phase 0 - Project Policy & Context (REQUIRED)

This phase runs BEFORE scope, UX, or implementation planning. No code, no design, no solutions are allowed in this phase. Project rules override user intent.

#### Step 0.1 - Discover Project Context Files

Search for and read the following files (do not fail if missing):

**Priority order:**
1. `CLAUDE.md` - project rules and constraints
2. `POLICY.md` - explicit policies
3. `ENGINEERING.md` - engineering standards
4. `README.md` - project overview
5. `docs/**/*.md` - architecture, ADRs, decisions
6. `.claude/agents/*.md` - project-specific chefs

**Chef Resolution Order:**
1. Project-specific chefs in `<project>/.claude/agents/`
2. System-wide chefs in `~/.claude/agents/`

**System-Wide Chefs Available:**
- `engineer.md` - Head chef (implementation)
- `product.md` - Menu curator (scope decisions)
- `designer.md` - Presentation specialist (UX/flow)
- `security.md` - Health inspector (security audit)
- `qa.md` - Taste tester (quality assurance)
- `architect.md` - Kitchen designer (architecture)
- `docs.md` - Recipe writer (documentation)

#### Step 0.2 - Extract and Normalize Rules

From discovered files, extract and classify rules into:

**A) Hard rules (MUST / MUST NOT)**
- Non-negotiable constraints
- Security, architecture, legal, platform limitations
- Explicit "do not" statements

**B) Preferred patterns**
- Recommended libraries, architectures, conventions
- Style or process preferences
- Defaults the project expects

**C) Explicit non-goals / forbidden approaches**
- Deprecated patterns
- Known bad ideas
- Things intentionally avoided

**D) Implicit assumptions (derived)**
- Assumptions inferred due to missing or unclear documentation
- MUST be clearly marked as assumptions

#### Step 0.3 - Detect Conflicts

If user request conflicts with extracted rules:
- Do NOT resolve it yet
- Do NOT propose alternatives
- Record the conflict clearly

#### Step 0.4 - Risk Classification

Based on documentation completeness, classify alignment risk:
- **LOW** - clear policies found
- **MEDIUM** - partial policies
- **HIGH** - no meaningful policies found

#### Step 0.5 - Output Format (MANDATORY)

Produce this section in the cook artifact:

```markdown
## Phase 0 - Project Policy & Context

### Sources scanned
- <file or "not found">

### Hard rules (must not be violated)
- <rule>

### Preferred patterns
- <pattern>

### Explicit non-goals / forbidden approaches
- <non-goal>

### Assumptions due to missing documentation
- <assumption>

### Detected conflicts with request
- None OR <conflict description>

### Policy alignment risk
- LOW | MEDIUM | HIGH
```

#### Step 0.6 - Blocking Rule

If ANY of these conditions are true:
- A hard rule directly blocks the requested feature
- Alignment risk is HIGH

Then:
1. Set status: `needs-more-cooking`
2. Document the blocking reason
3. STOP - do not proceed to Step 1

The issue must be acknowledged before continuing.

This Phase 0 output informs ALL subsequent cooking steps.

---

### Step 1 - Read the Order
- Restate feature in concrete terms (what dish are we making?)
- Identify affected modules/components (which stations are involved?)
- Identify risks and dependencies (allergens, timing)
- Note any project-specific constraints from Step 0
- **Check Microwave Blockers**: If microwave mode requested but touches blocked topics -> escalate to well-done

Status: `raw` -> `cooking`

---

### Step 2 - Ingredient Approval (well-done only)
- Is this in scope for the project? (Is it on our menu?)
- Does it add user value? (Will customers order it?)
- Decision: Approve / Reject / Defer

If rejected -> Status: `needs-more-cooking`. STOP.

---

### Step 3 - Presentation Planning (conditional)
Triggered if:
- New UI components (new plating style)
- Changed user flow (changed service sequence)
- Risk of user confusion (unfamiliar dish)

Output:
- Flow description
- UX considerations

---

### Step 4 - Cooking
- Implement only approved scope (follow the recipe)
- Respect existing patterns and architecture (house style)
- Follow project tech stack and conventions (use the right tools)
- Reference all changed files (ingredient list)

---

### Step 5 - Taste Testing (QA)
- Validate acceptance criteria (does it taste right?)
- Identify edge cases (unusual orders)
- Flag potential regressions (did we break another dish?)
- Verify tests exist or are added (documented tasting notes)

Blockers must be resolved before proceeding.
If blocked -> Status: `needs-more-cooking`

---

### Step 6 - Safety Inspection (Security)
- Input validation (ingredient safety)
- Authentication/authorization (who can order this?)
- Data exposure risks (customer privacy)
- Injection vulnerabilities (contamination)

Security blockers override everything.
If blocked -> Status: `needs-more-cooking`

---

### Step 7 - Recipe Notes (conditional)
Triggered if:
- Assumptions were made
- Behavior changed
- New concepts introduced

---

## Phase Rollback Rules

Cooking is NOT strictly linear. These rollback rules apply:

```
+--------------------------------------------------------------+
|                        ROLLBACK FLOW                          |
+--------------------------------------------------------------+
|                                                               |
|  Step 2 (Scope) <-------------------------------------+      |
|       |                                               |      |
|       v                                               |      |
|  Step 3 (UX) <------------------------------------+   |      |
|       |                                           |   |      |
|       v                                           |   |      |
|  Step 4 (Implementation) <--------------------+   |   |      |
|       |                                       |   |   |      |
|       v                                       |   |   |      |
|  Step 5 (QA) --------- blocker ------------->|   |   |      |
|       |                                           |   |      |
|       v                                           |   |      |
|  Step 6 (Security) -- blocker ------------------>|   |      |
|       |                     |                         |      |
|       |                     +-- scope change -------->+      |
|       v                                                      |
|  Step 7 (Docs)                                               |
|                                                              |
+--------------------------------------------------------------+
```

### Rollback Triggers:

| From | To | Trigger |
|------|----|---------|
| Step 5 (QA) | Step 4 (Implementation) | Test failure, missing edge case |
| Step 5 (QA) | Step 2 (Scope) | Scope creep discovered |
| Step 6 (Security) | Step 4 (Implementation) | Security vulnerability found |
| Step 6 (Security) | Step 2 (Scope) | Fundamental design flaw |
| Step 3 (UX) | Step 2 (Scope) | UX requirements change scope |

When rollback occurs:
1. Document the reason in Decision Log
2. Update status to `blocked` with owner and next step
3. Re-execute from the rollback target step

---

## Output Format (MANDATORY)

Two formats exist based on cooking mode. Use the appropriate one.

### WELL-DONE MODE OUTPUT

```markdown
# Cooking Result

## Dish
<short description>

## Status
raw | cooking | blocked | needs-more-cooking | well-done | ready-for-merge | plated
(if killed: needs-more-cooking + reason: killed - <why>)

## Cooking Mode
well-done

## Ownership (REQUIRED)
- Decision Owner: <name/role>
- Reviewers: <list or "auto">
- Approved by: <name> on <date>

## Product Decision
Approved / Rejected / Deferred
- Reason: <why>

## Pre-mortem (REQUIRED - 3 scenarios)
1. <scenario> -> mitigation: <action>
2. <scenario> -> mitigation: <action>
3. <scenario> -> mitigation: <action>

## Trade-offs
- Sacrificing: <perf/UX/maintainability/time>
- Reason: <why>
- Rejected alternatives:
  - <alternative 1> - rejected because <reason>
  - <alternative 2> - rejected because <reason>

## Patch Plan
- Files to modify:
  1. <file> - <what changes>
  2. <file> - <what changes>
- Commit sequence:
  1. <commit message>
  2. <commit message>
- High-risk areas: <list>
- Tests to run: <list>

## QA Status
- Tests: <coverage>
- Edge cases considered: <list>
- Regressions checked: <list>

## Security Status
- Reviewed: yes/no
- Issues found: <list or "none">
- Risk level: low/medium/high

## Blast Radius & Rollout
- Affected users/modules: <list>
- Feature flag: yes/no (name: <flag_name>)
- Rollout strategy: immediate/gradual/canary
- Rollback steps:
  1. <step>
  2. <step>

## Assumptions & Notes
<list>

## Next Actions
<list>

## Decision Log
| Date | Decision | Rationale |
|------|----------|-----------|
```

### MICROWAVE MODE OUTPUT

```markdown
# Cooking Result

## Dish
<short description>

## Status
raw | cooking | blocked | needs-more-cooking | well-done | ready-for-merge | plated

## Cooking Mode
microwave

## Problem Statement
<what's broken + how to reproduce>

## Fix Plan
<minimal fix description>

## Why Safe
<1 sentence explaining why this is low risk>

## Pre-mortem (REQUIRED - 1 scenario)
1. <scenario> -> mitigation: <action>

## Tests
- <test 1: verifies the fix>
- <test 2: regression check> (optional)

## Security Status (only if touches auth/API)
- Reviewed: yes/no
- Issues found: <list or "none">

## Next Actions
<list>
```

---

## Constraints

- This skill orchestrates reasoning and decision-making
- Each cooking phase must complete before the next begins
- **Step 0 (Mise en Place) is MANDATORY** - cannot cook without prep
- Project-specific rules from CLAUDE.md override generic behavior
- Chef resolution: project-specific chefs take precedence over system-wide chefs
- Security and QA standards from project policies take precedence

## Chef Assignments

**For each cooking phase, use chefs in this priority:**

1. **Project-specific chef** (if exists): `<project>/.claude/agents/<project>-<role>.md`
2. **System-wide chef** (fallback): `~/.claude/agents/<role>.md`

| Phase | Project Chef | System Chef |
|-------|-------------|-------------|
| Cooking | `*-engineer.md` | `engineer.md` |
| Menu Approval | `*-product.md` | `product.md` |
| Presentation | `*-designer.md` | `designer.md` |
| Safety | `*-security.md` | `security.md` |
| Tasting | `*-qa.md` | `qa.md` |
| Kitchen Design | `*-architect.md` | `architect.md` |
| Recipe Notes | `*-docs.md` | `docs.md` |

## Why Project Configuration Is Recommended

While system-wide chefs provide generic best practices, project-specific configuration enables:
- Enforcing **your** kitchen's standards and techniques
- Validating against your house recipes
- Using project-specific safety requirements
- Context-aware reviews tailored to your cuisine

**Recommendation:** Set up `CLAUDE.md` and project-specific chefs for production cooking.

---

## Artifact Storage

Cooking results are stored as decision records:
- Location: `cook/*.cook.md`
- Contains: scope decisions, review outcomes, final status
