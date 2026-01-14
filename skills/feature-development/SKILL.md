---
name: feature-development
description: Run a full, policy-compliant feature development flow with structured review phases
user-invocable: true
---

# feature-development skill

## ⛔ CRITICAL: PLANNING ONLY - NO CODE

**`/cook` produces ONLY an artifact file. Do NOT implement any code.**

- ❌ NO adding/modifying source files
- ❌ NO creating classes, functions, or components
- ❌ NO running implementation tests
- ❌ NO writing actual code beyond file path references
- ✅ ONLY produce the artifact file (`cook/*.cook.md`)

After cooking is complete, user will **separately** request implementation.

---

## ⚠️ CRITICAL: FIRST ACTION REQUIRED

**STOP. Before doing ANYTHING else, you MUST create the artifact file.**

Your VERY FIRST action after receiving a /cook command must be:

1. **Generate filename:** `cook/<slug>.<YYYY-MM-DD>.cook.md`
2. **Write skeleton artifact** using Write tool
3. **Confirm file exists** before any exploration or analysis

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

## Sources Scanned
| File | Status | Key Rules |
|------|--------|-----------|
| CLAUDE.md | _Pending_ | |
| README.md | _Pending_ | |
| .claude/agents/*.md | _Pending_ | |

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

**DO NOT:**
- Read CLAUDE.md first
- Explore codebase first
- Run any searches first
- Use Task/Explore agents first

**FIRST action = Create artifact file. No exceptions.**

---

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

- **dry-run** (boolean, default: false)
  Preview mode - shows what would happen without executing.

- **validate** (string, optional)
  Path to existing artifact to validate without re-cooking.
  Example: `/cook --validate cook/feature.cook.md`

- **no-validate** (boolean, default: false)
  Skip auto-validation after artifact generation.

- **interactive** (boolean, default: false)
  Launch interactive menu for artifact management.
  Example: `/cook --interactive`

---

## Interactive Mode

Use `--interactive` to launch the artifact management menu:

```
/cook --interactive
```

### What Interactive Mode Does

1. **Scans for artifacts** in `cook/*.cook.md`
2. **Presents a picker** with available artifacts
3. **Shows action menu**:
   - Validate artifact
   - Compare artifacts (diff)
   - View status summary
4. **Executes selected action**

### Interactive Flow

```
/cook --interactive
   |
   v
┌─────────────────────────────────────┐
│  Select artifact:                   │
│  > dry-run-validation.2026-01-10    │
│    user-auth.2026-01-09             │
│    payment-flow.2026-01-08          │
└─────────────────────────────────────┘
   |
   v
┌─────────────────────────────────────┐
│  Select action:                     │
│  > Validate                         │
│    Compare with another artifact    │
│    View status summary              │
└─────────────────────────────────────┘
   |
   v
[Executes selected action]
```

### Actions Available

| Action | Description | Command Equivalent |
|--------|-------------|-------------------|
| Validate | Run validation checks | `cook-validate <file>` |
| Compare | Diff two artifacts | `cook-diff <a> <b>` |
| Status | Show artifact summary | Quick view of status, mode, owner |

---

## Dry-Run Mode

Use `--dry-run` to preview the cooking process without producing artifacts.

```
/cook <feature> --dry-run
```

### What dry-run does

1. **Checks prerequisites**
   - Is CLAUDE.md present?
   - Are project-specific chefs configured?
   - Which system chefs will be used as fallback?

2. **Shows cooking plan**
   - Lists all phases that would execute
   - Shows which chefs will be consulted
   - Identifies microwave blockers (if applicable)

3. **Validates inputs**
   - Parses feature description
   - Checks for instruction file (if specified)
   - Identifies potential issues early

### Dry-run output

```markdown
# Dry-Run: /cook preview

## Feature
<parsed feature description>

## Mode
well-done | microwave

## Prerequisites Check
- CLAUDE.md: found | NOT FOUND (will use defaults)
- Project chefs: <list> | none (will use system chefs)
- System chefs available: <list>

## Cooking Plan
1. Phase 0 - Project Policy & Context
   - Chef: <project or system>
2. Step 1 - Read the Order
3. Step 2 - Ingredient Approval (well-done only)
   - Chef: product_chef
4. Step 3 - Presentation Planning (if UI changes)
   - Chef: ux_chef
5. Step 4 - Cooking
   - Chef: engineer_chef, architect_chef
6. Step 5 - Taste Testing
   - Chef: qa_chef
7. Step 6 - Safety Inspection
   - Chef: security_chef
8. Step 7 - Recipe Notes (if needed)
   - Chef: docs_chef

## Microwave Blockers (if --microwave)
- <blocker topics detected> | none

## Potential Issues
- <early warnings> | none detected

## Ready to Cook
yes | no (reason: <why>)
```

### When to use dry-run

- First time using `/cook` on a project
- Verifying chef configuration
- Checking if microwave mode is allowed
- Understanding what phases will run

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

## MANDATORY FIRST STEP: Create Artifact File

**BEFORE ANY OTHER ACTION**, you MUST create the artifact file with skeleton structure.

### Why Artifact-First?

1. **Progress visibility** - User can see cooking progress in real-time
2. **Interrupt safety** - Partial results are preserved if execution stops
3. **Phase enforcement** - Each phase MUST write to artifact before proceeding
4. **State machine** - Artifact tracks which phases are complete

### Step 0.0 - Create Artifact Skeleton (REQUIRED)

**DO THIS IMMEDIATELY UPON /cook INVOCATION:**

1. Generate artifact filename: `cook/<slug>.<YYYY-MM-DD>.cook.md`
   - `<slug>` = kebab-case of feature description (max 40 chars)
   - `<YYYY-MM-DD>` = today's date

2. Create file with this skeleton:

```markdown
# Cooking Result

## Dish
<feature description>

## Status
raw

## Cooking Mode
<well-done | microwave>

## Current Phase
Phase 0 - Starting...

---

## Phase 0 - Project Policy & Context
_Pending..._

## Step 1 - Read the Order
_Pending..._

## Step 2 - Ingredient Approval
_Pending..._

## Step 3 - Presentation Planning
_Pending..._

## Step 4 - Cooking
_Pending..._

## Step 5 - Taste Testing (QA)
_Pending..._

## Step 6 - Safety Inspection (Security)
_Pending..._

## Step 7 - Recipe Notes
_Pending..._

---

## Decision Log
| Date | Phase | Decision | Rationale |
|------|-------|----------|-----------|
```

3. **CONFIRM** artifact file exists before proceeding

**CRITICAL:** Do NOT proceed to Phase 0 until artifact file is created and confirmed.

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

#### GATE: Write Phase 0 to Artifact

**STOP. Before proceeding to Step 1, you MUST:**

1. Update artifact file - replace `_Pending..._` under `## Phase 0` with actual output
2. Update `## Current Phase` to `Phase 0 - Complete`
3. Update `## Status` to `cooking`
4. Add entry to Decision Log

**DO NOT proceed until artifact is updated.**

---

### Step 1 - Read the Order
- Restate feature in concrete terms (what dish are we making?)
- Identify affected modules/components (which stations are involved?)
- Identify risks and dependencies (allergens, timing)
- Note any project-specific constraints from Step 0
- **Check Microwave Blockers**: If microwave mode requested but touches blocked topics -> escalate to well-done

Status: `raw` -> `cooking`

#### GATE: Write Step 1 to Artifact

**STOP. Before proceeding to Step 2, you MUST:**

1. Update artifact file - replace `_Pending..._` under `## Step 1` with actual output
2. Update `## Current Phase` to `Step 1 - Complete`
3. Add entry to Decision Log

**DO NOT proceed until artifact is updated.**

---

### Step 2 - Ingredient Approval (well-done only)
- Is this in scope for the project? (Is it on our menu?)
- Does it add user value? (Will customers order it?)
- Decision: Approve / Reject / Defer

If rejected -> Status: `needs-more-cooking`. STOP.

#### GATE: Write Step 2 to Artifact

**STOP. Before proceeding to Step 3, you MUST:**

1. Update artifact file - replace `_Pending..._` under `## Step 2` with actual output (or `_Skipped (microwave mode)_`)
2. Update `## Current Phase` to `Step 2 - Complete`
3. Add Product Decision to artifact header section
4. Add entry to Decision Log

**DO NOT proceed until artifact is updated.**

---

### Step 3 - Presentation Planning (conditional)
Triggered if:
- New UI components (new plating style)
- Changed user flow (changed service sequence)
- Risk of user confusion (unfamiliar dish)

Output:
- Flow description
- UX considerations

#### GATE: Write Step 3 to Artifact

**STOP. Before proceeding to Step 4, you MUST:**

1. Update artifact file - replace `_Pending..._` under `## Step 3` with actual output (or `_Skipped (no UI changes)_`)
2. Update `## Current Phase` to `Step 3 - Complete`
3. Add entry to Decision Log

**DO NOT proceed until artifact is updated.**

---

### Step 4 - Implementation Plan (NO CODE YET)
- Implement only approved scope (follow the recipe)
- Respect existing patterns and architecture (house style)
- Follow project tech stack and conventions (use the right tools)
- Reference all changed files (ingredient list)

#### GATE: Write Step 4 to Artifact

**STOP. Before proceeding to Step 5, you MUST:**

1. Update artifact file - replace `_Pending..._` under `## Step 4` with Patch Plan
2. Update `## Current Phase` to `Step 4 - Complete`
3. Add Trade-offs section to artifact
4. Add entry to Decision Log

**DO NOT proceed until artifact is updated.**

---

### Step 5 - Taste Testing (QA)
- Validate acceptance criteria (does it taste right?)
- Identify edge cases (unusual orders)
- Flag potential regressions (did we break another dish?)
- Verify tests exist or are added (documented tasting notes)

Blockers must be resolved before proceeding.
If blocked -> Status: `needs-more-cooking`

#### GATE: Write Step 5 to Artifact

**STOP. Before proceeding to Step 6, you MUST:**

1. Update artifact file - replace `_Pending..._` under `## Step 5` with QA Status
2. Update `## Current Phase` to `Step 5 - Complete`
3. Add Pre-mortem section to artifact (min 3 scenarios for well-done, 1 for microwave)
4. Add entry to Decision Log

**DO NOT proceed until artifact is updated.**

---

### Step 6 - Safety Inspection (Security)
- Input validation (ingredient safety)
- Authentication/authorization (who can order this?)
- Data exposure risks (customer privacy)
- Injection vulnerabilities (contamination)

Security blockers override everything.
If blocked -> Status: `needs-more-cooking`

#### GATE: Write Step 6 to Artifact

**STOP. Before proceeding to Step 7, you MUST:**

1. Update artifact file - replace `_Pending..._` under `## Step 6` with Security Status
2. Update `## Current Phase` to `Step 6 - Complete`
3. Add Blast Radius & Rollout section to artifact
4. Add entry to Decision Log

**DO NOT proceed until artifact is updated.**

---

### Step 7 - Recipe Notes (conditional)
Triggered if:
- Assumptions were made
- Behavior changed
- New concepts introduced

#### GATE: Write Step 7 to Artifact (FINAL)

**STOP. Before marking cooking complete, you MUST:**

1. Update artifact file - replace `_Pending..._` under `## Step 7` with docs updates (or `_Skipped (no docs needed)_`)
2. Update `## Current Phase` to `Cooking Complete`
3. Update `## Status` to `well-done` or `ready-for-merge`
4. Add Ownership section to artifact header
5. Add Assumptions & Notes section
6. Add Next Actions section
7. Add final entry to Decision Log

**Artifact is now complete. Proceed to validation.**

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

---

## Auto-Validation (Final Step)

After generating the artifact, **automatically run validation**:

```bash
./scripts/cook-validate cook/<artifact>.cook.md
```

### Validation Behavior

1. **If VALID** - Report success and proceed
2. **If INVALID (errors)** - Show issues and offer to fix them
3. **If WARNINGS only** - Report warnings but consider artifact ready

### Example Output

```
[cook-validate] Validating artifact...

Validating: user-auth.2026-01-10.cook.md
Mode: well-done

[PASS] Scope sections present
[PASS] Pre-mortem (3 scenarios)
[PASS] Test cases (5 defined)
[PASS] Ownership assigned

Result: VALID

✓ Artifact ready for implementation
```

### Skip Validation

Use `--no-validate` to skip auto-validation:

```
/cook Add feature X --no-validate
```

### Validation-Only Mode

To validate an existing artifact without re-cooking:

```
/cook --validate cook/existing-artifact.cook.md
```
