---
description: Sanitation inspection for cook artifacts. Post-implementation code review.
argument-hint: [<artifact> | --surprise]
allowed-tools: Bash, Read, Glob, Grep, Task, AskUserQuestion
---

# /inspect Command

Sanitation Inspector - post-implementation code review that verifies **actual code changes** match the cook artifact plan.

**Agent assumptions (applies to all agents and subagents):**
- All tools are functional. Do not test tools or make exploratory calls.
- Only call a tool if required to complete the task.
- This is a CODE REVIEW - you must examine actual git diffs, not just documentation.

## Syntax

```
/juni:inspect                           Inspect most recent well-done artifact
/juni:inspect <artifact>                Inspect specific artifact
/juni:inspect <artifact> --commit <sha> Inspect specific commit against artifact
/juni:inspect --commit <sha>            Pure code review (no artifact, just diff review)
/juni:inspect --surprise                Force surprise inspection mode (dramatic entrance)
```

## Options

| Option | Description |
|--------|-------------|
| `<artifact>` | Path to cook artifact (e.g., `cook/add-auth.2026-01-29.cook.md`) |
| `--commit <sha>` | Specify commit SHA to inspect (with or without artifact) |
| `--surprise` | Trigger surprise inspection announcement |

## Modes

| Mode | Description |
|------|-------------|
| **Artifact + Auto-detect** | Find artifact, find related commits, compare plan vs actual |
| **Artifact + Manual commit** | Use specified artifact and commit, compare plan vs actual |
| **Commit only** | Pure code review without artifact context (hygiene + safety only, no recipe compliance) |

## Execution

### Step 1: Locate Artifact

**If `--commit` specified without artifact:** Skip to Step 4 (pure code review mode).

**If artifact path specified:** Validate it exists and has correct status.

**If no artifact specified:** Find well-done artifacts:

```bash
# Find all well-done or ready-for-merge artifacts
for f in $(ls -t cook/*.cook.md 2>/dev/null); do
  status=$(grep -A1 "^## Status" "$f" | tail -1)
  if [[ "$status" =~ (well-done|ready-for-merge) ]]; then
    echo "$f"
  fi
done
```

#### Handling Artifact Edge Cases

**Case A: No artifacts found**
```
⚠️ No cook artifacts found in cook/ directory.

Options:
1. Run /juni:cook first to create an artifact
2. Use --commit <sha> for pure code review (no artifact comparison)
```

Use AskUserQuestion:
- "Let me specify a commit for pure code review"
- "Abort"

**Case B: Multiple well-done artifacts found**
```
Found multiple well-done artifacts:

1. cook/add-auth.2026-01-29.cook.md (most recent)
2. cook/payment-flow.2026-01-28.cook.md
3. cook/user-profile.2026-01-27.cook.md

Which artifact should be inspected?
```

Use AskUserQuestion with artifact options + "Let me specify path manually"

**Case C: Artifact found but status is not well-done**
```
⚠️ Artifact found but status is "<status>", not "well-done" or "ready-for-merge".

Artifact: cook/feature.2026-01-29.cook.md
Status: cooking

This artifact may not be ready for inspection yet.
```

Use AskUserQuestion:
- "Inspect anyway (implementation may be incomplete)"
- "Let me choose a different artifact"
- "Abort"

### Step 2: Announce Inspection

**On-demand mode:**
```
🧹 Sanitation inspection requested. Putting on the white gloves...

Inspecting: cook/<artifact>.cook.md
```

**Surprise mode (--surprise flag):**
```
🧹 SANITATION INSPECTION! The inspector has arrived for a surprise visit...

*adjusts clipboard*
*puts on rubber gloves*

Kitchen being inspected: cook/<artifact>.cook.md
```

### Step 3: Extract Plan from Artifact

Read the artifact and extract:
1. **Planned files** from "Patch Plan" or "Files to Modify" section
2. **Planned commit sequence** from "Commit Sequence" section
3. **Implementation decisions** from "Selected Approach" or "Architecture Decision" section
4. **Non-goals** from "Non-goals" section
5. **Pre-mortem risks** from "Pre-mortem" section
6. **Artifact date** from filename (e.g., `2026-01-25` from `feature.2026-01-25.cook.md`)

### Step 4: Find Related Commits and Get Actual Diff

**CRITICAL: This step gets the ACTUAL CODE CHANGES to review.**

**If pure code review mode (--commit without artifact):** Skip to "Get the full diff" section below.

#### How Matching Works

Matching artifact to commits is **heuristic-based** (not guaranteed). We use multiple signals:

| Signal | How it works | Confidence |
|--------|--------------|------------|
| **Date proximity** | Artifact date (from filename) ± 2 days | Medium |
| **File overlap** | Planned files in artifact vs files touched in commit | High |
| **Feature name** | Artifact slug in commit message (e.g., "add-auth" in "feat: Add auth") | Medium |
| **Commit message keywords** | Words from artifact "Dish" section in commit message | Low |

**Important:** These heuristics can fail when:
- Someone implemented without using /cook (no artifact exists)
- Implementation happened much later than artifact creation
- Commit messages don't match artifact naming
- Multiple features were committed together

When confidence is low, always ask user for confirmation.

#### Finding Commits

Find commits related to this artifact using multiple strategies:

```bash
# Strategy 1: Find commits by date (artifact date + 1-2 days)
git log --oneline --since="<artifact-date>" --until="<artifact-date + 2 days>" -- <planned-files>

# Strategy 2: Find commits by feature name/slug in message
git log --oneline --all --grep="<feature-slug>"

# Strategy 3: Find commits touching planned files around artifact date
git log --oneline -10 -- <planned-files>
```

#### Handling Ambiguous or Missing Commits

**Case A: No commits found**
```
⚠️ No commits found for artifact: <artifact-name>

Searched for:
- Commits touching: <planned-files>
- Commits matching: "<feature-slug>"
- Date range: <artifact-date> to <artifact-date + 2 days>

Options:
1. Implementation may not be complete yet
2. Commits may be on a different branch
3. Files were modified but not committed

Would you like to:
- Specify a commit SHA manually
- Specify a branch to search
- Abort inspection
```

Use AskUserQuestion to let user choose or provide commit SHA.

**Case B: Multiple possible commits found**
```
Found multiple commits that may relate to this artifact:

1. abc1234 feat: Add user authentication (2026-01-25)
2. def5678 fix: Auth token validation (2026-01-26)
3. ghi9012 refactor: Auth middleware (2026-01-26)

Which commit(s) should be inspected?
```

Use AskUserQuestion with options:
- "All of them (abc1234..ghi9012)"
- "Only the first: abc1234"
- "Only the last: ghi9012"
- "Let me specify manually"

**Case C: Commits found but files don't match plan**
```
⚠️ Commit files don't fully match artifact plan.

Artifact planned: src/auth.ts, src/middleware.ts, tests/auth.test.ts
Commit touched:   src/auth.ts, src/utils.ts

Missing from commit: src/middleware.ts, tests/auth.test.ts
Extra in commit:     src/utils.ts

Proceed with inspection anyway? (will flag as compliance issues)
```

Use AskUserQuestion: "Yes, proceed" / "No, abort" / "Let me specify different commit"

---

Once commits are confirmed, get the full diff:

```bash
# For single commit
git show <commit-sha> -p

# For multiple commits
git diff <first-commit>^..<last-commit>

# Show files changed
git show <commit-sha> --stat
```

**Store this diff - it is the primary input for all inspection agents.**

### Step 5: Launch Parallel Inspection Agents

**If pure code review mode (no artifact):**
- Skip Recipe Compliance Agent (no plan to compare against)
- Run only Hygiene Agent + Safety Agent
- Report format changes to "Pure Code Review" (no recipe compliance section)

**If artifact mode:**
Spawn three Task agents in parallel (using Sonnet model). Each agent receives:
- The artifact content (plan)
- The actual git diff (implementation)
- List of planned files

**CRITICAL: We only want HIGH SIGNAL issues.** Flag issues where:
- Code will fail to compile or parse (syntax errors, missing imports)
- Code will definitely produce wrong results (clear logic errors)
- Clear deviation from artifact plan (scope creep, missing planned changes)
- Obvious security vulnerabilities (injection, auth bypass)

Do NOT flag:
- Code style or quality concerns (unless explicitly in plan)
- Potential issues that depend on specific inputs or state
- Subjective suggestions or improvements
- Pre-existing issues not introduced by this change

---

**1. Recipe Compliance Agent**
```
You are reviewing ACTUAL CODE CHANGES against the planned implementation.

ARTIFACT PLAN:
- Planned files: [list from artifact]
- Planned commit sequence: [from artifact]
- Implementation decisions: [from artifact]
- Non-goals: [from artifact]

ACTUAL GIT DIFF:
[paste full git diff here]

ACTUAL COMMITS:
[paste git log output here]

Your job: Compare PLANNED vs ACTUAL implementation.

Check:
1. Were ALL planned files modified? List any missing.
2. Were any UNPLANNED files modified? (scope creep)
3. Does the implementation match stated decisions?
4. Was the commit sequence followed?
5. Were non-goals respected? (things that should NOT be in diff)

Score each finding 0-100 confidence. Only report findings >= 75.
Output format: JSON array of {type: "missing"|"extra"|"drift"|"compliant", file: "path", details: "description", confidence: N}
```

---

**2. Hygiene Agent**
```
You are reviewing ACTUAL CODE CHANGES for code hygiene issues.

ACTUAL GIT DIFF:
[paste full git diff here]

FILES CHANGED:
[list of files from git show --stat]

Check the DIFF for:
1. Error handling - are new code paths handling errors properly?
2. Edge cases - are boundary conditions handled?
3. Consistency - does new code follow patterns in surrounding code?
4. Incomplete changes - are there TODOs, FIXMEs, or placeholder code?

Only flag issues VISIBLE IN THE DIFF. Do not speculate about code outside the diff.

Score each finding 0-100 confidence. Only report findings >= 75.
Output format: JSON array of {issue: "description", file: "path", line: N, severity: "high"|"medium"|"low", confidence: N}
```

---

**3. Safety Agent**
```
You are reviewing ACTUAL CODE CHANGES for security issues.

ACTUAL GIT DIFF:
[paste full git diff here]

Check the DIFF for:
1. Input validation - is user input validated before use?
2. Injection vectors - SQL, command, template injection in new code?
3. Auth/authz - are permission checks present where needed?
4. Data exposure - does error handling leak sensitive info?
5. Secrets - are there hardcoded credentials, API keys, tokens?

Only flag issues VISIBLE IN THE DIFF with HIGH CONFIDENCE.

Score each finding 0-100 confidence. Only report findings >= 75.
Output format: JSON array of {issue: "description", file: "path", line: N, severity: "high"|"medium"|"low", confidence: N}
```

### Step 6: Validate Flagged Issues

For each high/medium severity issue found in Step 5, launch a validation subagent:

```
ISSUE TO VALIDATE:
[issue description]

CONTEXT:
[relevant portion of diff]

Is this issue real? Check:
- Is the code actually doing what the issue claims?
- Could this be a false positive?
- Is there surrounding context that makes this okay?

Return: { valid: true|false, reason: "explanation" }
```

Filter out any issues that fail validation.

### Step 7: Compile Report

Aggregate validated results and generate inspection report.

**Determine result:**
- `PASSED` - No high severity issues, <3 medium issues
- `VIOLATIONS FOUND` - Any high severity or 3+ medium issues

**Generate report format:**

```markdown
---

# 🧹 Sanitation Inspection Report

## Kitchen: <artifact-name>
## Inspector: sanitation_inspector_chef
## Date: <today>
## Commit(s) Reviewed: <commit-sha(s)>

## Inspection Result: PASSED / VIOLATIONS FOUND

### Recipe Compliance (Plan vs Actual)
| Planned | Actual | Status |
|---------|--------|--------|
| [file from plan] | [modified/missing/extra] | ✅/❌ |

### Hygiene Check
| Area | Status | Notes |
|------|--------|-------|
| Error handling | ✅/⚠️/❌ | [findings from diff] |
| Edge cases | ✅/⚠️/❌ | [findings from diff] |
| Code consistency | ✅/⚠️/❌ | [findings from diff] |

### Safety Inspection
| Check | Status | Citation |
|-------|--------|----------|
| Input validation | ✅/⚠️/❌ | [file:line] |
| Injection vectors | ✅/⚠️/❌ | [file:line] |
| Auth checks | ✅/⚠️/❌ | [file:line] |

### Violations (if any)
| # | Severity | Issue | File:Line | Confidence |
|---|----------|-------|-----------|------------|
| 1 | high/medium/low | [description] | [path:line] | [N]% |

## Inspector Notes
> [Humorous summary using kitchen metaphors]
```

### Step 8: Append to Artifact

Append the inspection report to the cook artifact:

```bash
echo "" >> cook/<artifact>.cook.md
# Append report content
```

### Step 9: Final Announcement

**If PASSED:**
```
✅ Kitchen passed inspection. Certificate of cleanliness issued.

Reviewed commit(s): <sha(s)>
No critical violations found. The kitchen may continue service.
```

**If VIOLATIONS FOUND:**
```
⚠️ Violations found! Kitchen must address issues before next service.

Reviewed commit(s): <sha(s)>
Found:
- X high severity issues (must fix)
- Y medium severity issues (should fix)
- Z low severity issues (nice to fix)

Run `/juni:inspect` again after fixes to re-inspect.
```

## False Positives to Avoid

Do NOT flag these (they are false positives):
- Pre-existing issues not introduced by this change
- Code style preferences not mandated by the project
- Potential issues that require specific runtime conditions
- Issues a linter would catch (assume linter runs separately)
- General code quality concerns not in the artifact plan
- Changes documented as intentional in artifact decisions

## Examples

```
/juni:inspect
> 🧹 Sanitation inspection requested. Putting on the white gloves...
> Inspecting: cook/add-user-auth.2026-01-29.cook.md
> Finding related commits...
> Found: abc1234 feat: Add user authentication
> Reviewing diff (+245 -12 in 3 files)...
> ✅ Kitchen passed inspection. Certificate of cleanliness issued.

/juni:inspect cook/payment-flow.2026-01-28.cook.md --surprise
> 🧹 SANITATION INSPECTION! The inspector has arrived for a surprise visit...
> *adjusts clipboard*
> *puts on rubber gloves*
> Found: def5678, ghi9012 (2 commits)
> Reviewing diff (+89 -23 in 5 files)...
> ⚠️ Violations found! 1 high, 2 medium severity issues.
```

## Related

- `/juni:cook` - Creates artifacts that get inspected
- `/juni:sous-chef drift` - Similar drift detection
- `sanitation_inspector_chef` agent - Full agent definition
