---
name: cook
description: Feature development with guardrails. Plan → Review → Code → Ship.
user-invocable: true
---

# cook skill

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

- **implement** (boolean, default: false)
  After planning, automatically start implementation (create branch, code, commit).
  Example: `/cook Add feature --implement`

- **create-pr** (boolean, default: false)
  After planning and implementation, create PR automatically.
  Example: `/cook Add feature --create-pr`

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
| `planned` | Artifact complete, awaiting implementation (with --implement/--create-pr) |
| `implementing` | Implementation in progress (branch created, coding active) |
| `pr-ready` | PR created and linked, awaiting review/merge |
| `ready-for-merge` | Post QA/Security, ready for merge |
| `plated` | Shipped to production (PR merged) |

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

---

## Execution Mode (Code-Artifact Linking)

By default, `/cook` only creates a plan artifact without touching the repository.
Use execution flags to opt-in to automatic implementation.

### Safe by Default

```
/cook Add feature        # Plan only (default) - no repo changes
/cook Add feature --implement   # Plan + implement
/cook Add feature --create-pr   # Plan + implement + PR
```

**Important:** Without `--implement` or `--create-pr`, cook never:
- Creates branches
- Writes code
- Makes commits
- Pushes to remote
- Creates PRs

### --implement Flag

After planning completes successfully:

1. **Create branch**: `cook/<slug>` (or detect existing)
2. **Implement**: Follow Patch Plan from artifact
3. **Commit**: Tag all commits with `[cook:<cook_id>]`
4. **Update artifact**: Add Implementation Status section
5. **Transition status**: `planned → implementing`

### --create-pr Flag

Does everything `--implement` does, plus:

1. **Push branch** to remote
2. **Create PR** using artifact summary as description
3. **Link PR** in artifact Implementation Status
4. **Auto-verify** before PR (see below)
5. **Transition status**: `implementing → pr-ready`

### Natural Language Triggers

After planning (without flags), users can trigger execution via natural language:

| Phrase | Action | Checkpoint |
|--------|--------|------------|
| "implement it" / "start coding" | `--implement` | Yes (confirmation required) |
| "ship it" / "create PR" / "push" | `--create-pr` | Yes (auto-verify first) |

**Why This Is Dangerous:**

Natural language triggers mean:
- LLM interprets intent → real repo mutations
- One Slack message could create a PR
- Ambiguous phrases may trigger unintended actions

**Mandatory Checkpoint Protocol:**

Every natural language trigger MUST:

1. **Echo the full plan** (not just summary)
2. **Show exact mutations** (files, branch, commits)
3. **Require explicit Y/n** (no default, no timeout)
4. **Log the trigger** (for audit trail)

**Checkpoint Confirmation Example (Full):**

```
User: "implement it"

Claude: ⚠️ EXECUTION CHECKPOINT

You're about to trigger implementation for: user-auth.2026-01-12

📋 PLAN SUMMARY:
   Artifact: cook/user-auth.2026-01-12.cook.md
   Goal: Add user authentication with JWT tokens

🔀 REPO MUTATIONS:
   Branch: cook/user-auth (will be created)
   Files to modify:
     • src/auth/login.ts (new file)
     • src/auth/logout.ts (new file)
     • src/auth/middleware.ts (modify)
     • src/routes/index.ts (modify)
     • tests/auth.test.ts (new file)

📝 COMMITS:
   All commits will be tagged: [cook:user-auth.2026-01-12]

⚠️ This will modify your repository. This action is logged.

Proceed? [Y/n] (no default - you must type Y or n)
```

**Rejected Triggers:**

Some phrases are too ambiguous and will be rejected:

```
User: "do it"

Claude: ⚠️ Ambiguous trigger. Please be specific:
- "implement it" - create branch and write code
- "ship it" - implement + create PR
- "review it" - just verify the plan

What would you like to do?
```

**Audit Log Entry:**

Every trigger is logged in artifact:

```markdown
## Changelog
- 2026-01-12 14:30: Execution triggered via natural language
  - Trigger: "implement it"
  - Confirmed: Y
  - User: (session context)
```

### Auto-Verify Before PR

Before creating a PR, automatically verify implementation matches plan:

```
Verifying implementation against Patch Plan...

Coverage:
✓ src/auth/login.ts (planned → changed)
✓ src/auth/logout.ts (planned → changed)
✗ src/auth/session.ts (planned → NOT changed)
⚠ src/utils/crypto.ts (NOT planned → changed)

TODO scan:
⚠ 2 TODOs found in changed files

Verdict: PARTIAL MATCH (4/5 files, 1 unplanned change)

Options:
1. Create PR anyway (with warnings noted)
2. Fix missing implementation first
3. Abort
```

### State Tracking

Cook state is tracked in `.claude/cook-state.json`:

```json
{
  "active": "user-auth.2026-01-12",
  "cooks": {
    "user-auth.2026-01-12": {
      "artifact": "cook/user-auth.2026-01-12.cook.md",
      "status": "implementing",
      "branch": "cook/user-auth",
      "commits": ["abc123", "def456"],
      "pr": null,
      "created": "2026-01-12T10:00:00Z",
      "updated": "2026-01-12T14:30:00Z"
    }
  }
}
```

**State Rules:**
- **Active cook**: Last `/cook` wins; explicit mention overrides
- **Auto-cleanup**: Completed cooks (plated) archived after 30 days
- **Manual override**: User can switch active cook by mentioning artifact name

### Cook Status Command

Optional escape hatch to see all active cooks:

```
/cook status
```

Output:
```
Active Cooks:
┌─────────────────────────┬─────────────┬────────────────┬────────┐
│ Artifact                │ Status      │ Branch         │ PR     │
├─────────────────────────┼─────────────┼────────────────┼────────┤
│ user-auth.2026-01-12    │ implementing│ cook/user-auth │ -      │
│ dark-mode.2026-01-11    │ pr-ready    │ cook/dark-mode │ #42    │
│ api-refactor.2026-01-10 │ plated      │ (merged)       │ #38 ✓  │
└─────────────────────────┴─────────────┴────────────────┴────────┘

Active: user-auth.2026-01-12
```

### Implementation Status Section

Added to artifact automatically when using execution flags:

```markdown
## Implementation Status
- Status: planned | implementing | pr-ready | plated
- Branch: cook/user-auth (auto-created)
- PR: #42 (https://github.com/...)
- Commits: 5 [cook:user-auth.2026-01-12]
- Coverage: 5/5 planned files ✓
- Unplanned changes: none
- Last activity: 2026-01-12 14:30
```

### Commit Message Format

All commits created by cook include the cook ID:

```
feat: add login form [cook:user-auth.2026-01-12]

Implements login form component per Patch Plan.

Co-Authored-By: Claude <noreply@anthropic.com>
```

### Scope Creep Detection

If user requests changes outside the active cook's scope:

```
User: "also add password reset"

Claude: ⚠️ Password reset is not in the current cook plan (user-auth).

Options:
1. Re-cook: Update user-auth scope to include password reset (Recommended)
2. New cook: Create separate cook for password-reset

Which approach? [1/2]
```

**Important:** "Untracked" option is NOT offered by default.

**Why No Untracked Option?**

If given the choice, users will choose the fastest path:
- Untracked = one word
- Re-cook = wait for artifact update
- New cook = new planning phase

Result: Scope creep tracking becomes useless.

**Forcing Untracked (Escape Hatch)**

Users who really need untracked changes must be explicit:

```
User: "add password reset --force-untracked"

Claude: ⚠️ UNTRACKED CHANGE WARNING

This change will NOT be linked to any cook artifact.
- No audit trail
- No verification against plan
- May cause scope confusion

Proceeding with untracked change...
```

**Untracked Warning in Artifact:**

If `--force-untracked` used, add visible warning:

```markdown
## Implementation Status
- Status: implementing
- Branch: cook/user-auth
- ⚠️ UNTRACKED CHANGES DETECTED:
  - password-reset functionality (forced via --force-untracked)
  - Not part of original scope
  - Recommend: create separate cook or re-cook
```

If user chooses (1) Re-cook:
- Update artifact with new scope
- Regenerate Patch Plan
- Continue implementation

If user chooses (2) New cook:
- Create new artifact for new feature
- Can work in parallel on different branch
- Or queue for after current cook completes

### Status Transitions

```
┌──────────┐     ┌─────────────┐     ┌──────────┐     ┌────────┐
│ planned  │────>│implementing │────>│ pr-ready │────>│ plated │
└──────────┘     └─────────────┘     └──────────┘     └────────┘
     │                  │                  │
     │                  │                  │
     v                  v                  v
┌─────────────────────────────────────────────────────────────┐
│                    needs-more-cooking                        │
│              (blocked, killed, or failed)                    │
└─────────────────────────────────────────────────────────────┘
```

**Transition Rules:**
- `planned → implementing`: When `--implement` starts or user confirms "implement it"
- `implementing → pr-ready`: When PR created successfully
- `pr-ready → plated`: When PR merged (detected via `gh pr status` or manual update)
- Any → `needs-more-cooking`: When blocked, killed, or verification fails

### Source of Truth Hierarchy

When artifact, state, and git diverge — who wins?

```
┌─────────────────────────────────────────────────────────────┐
│  1. ARTIFACT (.cook.md)    ← Single Source of Truth         │
│     - Intent, scope, decisions, plan                        │
│     - Human-readable, version-controlled                    │
│     - Always authoritative for "what should be done"        │
├─────────────────────────────────────────────────────────────┤
│  2. GIT (branch/commits)   ← Evidence                       │
│     - What WAS actually done                                │
│     - Immutable history                                     │
│     - Used for verification, not decision-making            │
├─────────────────────────────────────────────────────────────┤
│  3. STATE (.cook-state.json) ← Runtime Cache                │
│     - Ephemeral, reconstructible                            │
│     - Can be deleted and rebuilt from artifact + git        │
│     - Never authoritative                                   │
└─────────────────────────────────────────────────────────────┘
```

**Conflict Resolution Rules:**

| Scenario | Resolution |
|----------|------------|
| Artifact says "planned", state says "implementing" | Trust artifact, rebuild state from git evidence |
| Git has commits not in state | Scan commits for `[cook:id]` tag, rebuild state |
| State references deleted artifact | Remove from state, warn user |
| PR merged but artifact says "pr-ready" | Update artifact to "plated" (git wins for completion) |

**State Reconstruction:**

If `.cook-state.json` is corrupted or missing:

```bash
# Cook can rebuild state from:
1. Scan cook/*.cook.md for artifacts
2. Parse Implementation Status section
3. Match branches via cook/<slug> pattern
4. Scan commits for [cook:id] tags
5. Query PRs via `gh pr list`
```

**Why This Matters:**

Without clear hierarchy:
- Debugging becomes nightmare ("which one is right?")
- Merge conflicts in state file cause data loss
- Recovery from errors is unclear

### Semantic Verification (LLM-Judge)

**Problem:** File coverage ≠ correct implementation

```
Coverage: 5/5 planned files ✓
```

This only proves files were touched, not that:
- Logic is correct
- Edge cases handled
- Feature actually works

**Solution:** Two-layer verification before PR

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Structural Verification (existing)                │
│  ✓ File coverage (planned vs changed)                       │
│  ✓ TODO scan                                                │
│  ✓ Unplanned changes detection                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Semantic Verification (LLM-Judge)                 │
│  For each Patch Plan item, verify:                          │
│  • Does implementation match stated intent?                 │
│  • Are acceptance criteria satisfiable?                     │
│  • Any obvious logic errors?                                │
└─────────────────────────────────────────────────────────────┘
```

**Semantic Verification Output:**

```
Semantic Verification (LLM-Judge):

1. "Add login form with email/password fields"
   ✓ PASS - LoginForm component has email and password inputs

2. "Validate email format before submit"
   ✓ PASS - validateEmail() called in handleSubmit

3. "Show error message on invalid credentials"
   ⚠ PARTIAL - Error shown, but generic message only
     Suggestion: Use specific error from API response

4. "Redirect to dashboard after success"
   ✗ FAIL - No redirect logic found in handleSubmit
     Expected: router.push('/dashboard') or similar

Semantic Score: 2/4 PASS, 1 PARTIAL, 1 FAIL
Verdict: NEEDS WORK - address FAIL items before PR
```

**Verdict Levels:**

| Verdict | Criteria | Action |
|---------|----------|--------|
| `READY` | All items PASS | Proceed to PR |
| `NEEDS REVIEW` | All PASS but has PARTIAL | PR with warnings |
| `NEEDS WORK` | Any FAIL | Block PR, fix first |

**Why Not Just Coverage?**

| Scenario | Coverage Says | Reality |
|----------|--------------|---------|
| Empty function added | ✓ file changed | ✗ nothing implemented |
| Wrong logic | ✓ file changed | ✗ bug introduced |
| Missing error handling | ✓ file changed | ✗ crashes on edge case |
| Copy-paste wrong code | ✓ file changed | ✗ doesn't match intent |

**Performance Note:**

Semantic verification adds ~10-30 seconds per PR check. Worth it for:
- Catching obvious mistakes before human review
- Reducing reviewer cognitive load
- Building trust in automated implementation

### Team Collaboration (Foreign Commits)

**Problem:** Cook is designed for solo dev flow, but teams will use it.

What happens when:
- Teammate commits to cook branch?
- Reviewer adds fixup commit?
- CI bot modifies files?

**Solution:** Foreign Commit Detection

Commits without `[cook:<id>]` tag on a cook branch are marked as **foreign**:

```
Scanning cook/user-auth branch...

Cook commits (tracked):
  ✓ abc123 feat: add login form [cook:user-auth.2026-01-12]
  ✓ def456 feat: add logout [cook:user-auth.2026-01-12]

Foreign commits (untracked):
  ⚠ ghi789 fix: typo in login (by @teammate)
  ⚠ jkl012 ci: format files (by github-actions)

Foreign commits: 2 (not part of cook tracking)
```

**Implementation Status with Foreign Commits:**

```markdown
## Implementation Status
- Status: implementing
- Branch: cook/user-auth
- Commits: 5 [cook:user-auth.2026-01-12]
- ⚠️ Foreign commits: 2
  - ghi789: "fix: typo in login" (@teammate)
  - jkl012: "ci: format files" (github-actions)
- Coverage: 5/5 planned files ✓
```

**Rules for Foreign Commits:**

| Rule | Behavior |
|------|----------|
| Detection | Scan for commits without `[cook:id]` tag |
| Visibility | Show in Implementation Status, don't hide |
| Blocking | Never block - just warn |
| Attribution | Show author for context |
| Verification | Include foreign changes in semantic verification |

**Why Not Block Foreign Commits?**

Blocking would:
- Break normal team workflows
- Force everyone to use cook
- Make cook a bottleneck

Instead:
- Track them transparently
- Include in verification
- Let humans decide if they matter

**PR Description with Foreign Commits:**

When creating PR, disclose foreign commits:

```markdown
## Summary
[cook-generated summary]

## Implementation Notes
- 5 commits tracked via cook
- 2 foreign commits detected:
  - @teammate: typo fix
  - CI: auto-formatting

---
Generated from cook/user-auth.2026-01-12.cook.md
```

**Future Enhancement (not MVP):**

For teams with heavy cook usage:
- Optional: require team members to use `[cook:id]` tag
- Optional: hook to warn on untagged commits to cook branches
- Optional: aggregate foreign commits into cook tracking
