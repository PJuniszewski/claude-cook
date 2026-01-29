---
description: Sanitation inspection for cook artifacts. Post-implementation code review.
argument-hint: [<artifact> | --surprise]
allowed-tools: Bash, Read, Glob, Grep, Task
---

# /inspect Command

Sanitation Inspector - post-implementation code review that verifies implementation matches the cook artifact plan.

## Syntax

```
/juni:inspect                           Inspect most recent well-done artifact
/juni:inspect <artifact>                Inspect specific artifact
/juni:inspect --surprise                Force surprise inspection mode (dramatic entrance)
```

## Options

| Option | Description |
|--------|-------------|
| `<artifact>` | Path to cook artifact (e.g., `cook/add-auth.2026-01-29.cook.md`) |
| `--surprise` | Trigger surprise inspection announcement |

## Execution

### Step 1: Locate Artifact

If no artifact specified, find the most recent well-done artifact:

```bash
ls -t cook/*.cook.md 2>/dev/null | head -1
```

If artifact specified, validate it exists:
- Check file exists
- Verify it has `## Status` section with `well-done` or `ready-for-merge`

### Step 2: Announce Inspection

**On-demand mode:**
```
🧹 Sanitation inspection requested. Putting on the white gloves...

Inspecting: cook/<artifact>.cook.md
```

**Surprise mode (--surprise flag or automatic trigger):**
```
🧹 SANITATION INSPECTION! The inspector has arrived for a surprise visit...

*adjusts clipboard*
*puts on rubber gloves*

Kitchen being inspected: cook/<artifact>.cook.md
```

### Step 3: Gather Context

Read the artifact and extract:
1. **Planned files** from "Patch Plan" or "Files to Modify" section
2. **Pre-mortem risks** from "Pre-mortem" section
3. **Non-goals** from "Non-goals" section
4. **Implementation decisions** from "Decisions" section

### Step 4: Launch Parallel Inspection Agents

Spawn three Task agents in parallel (using Sonnet model):

**1. Hygiene Agent**
```
Inspect code hygiene for the following files: [list from artifact]

Check:
- Error handling (try/catch, error propagation)
- Logging (audit trails, debug info)
- Test coverage for changed code
- Code smells (duplication, complexity)

Score each finding 0-100 confidence. Only report findings >= 75.
Output format: JSON array of {issue, file, line, severity, confidence}
```

**2. Recipe Compliance Agent**
```
Compare planned implementation vs actual for artifact: [artifact path]

Planned files: [list]
Check:
- All planned files exist and were modified
- No unplanned files in scope (scope creep)
- Implementation matches stated decisions

Score each finding 0-100 confidence. Only report findings >= 75.
Output format: JSON array of {type: "missing"|"extra"|"drift", file, details, confidence}
```

**3. Safety Agent**
```
Security inspection for files: [list from artifact]

Check:
- Input validation present
- Auth checks enforced where needed
- Data sanitization
- Error states don't leak info

Score each finding 0-100 confidence. Only report findings >= 75.
Output format: JSON array of {issue, file, line, severity, confidence}
```

### Step 5: Compile Report

Aggregate results from all agents and generate inspection report.

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

## Inspection Result: PASSED / VIOLATIONS FOUND

### Hygiene Check
| Area | Status | Notes |
|------|--------|-------|
| Error handling | ✅/⚠️/❌ | [findings] |
| Logging | ✅/⚠️/❌ | [findings] |
| Test coverage | ✅/⚠️/❌ | [findings] |

### Recipe Compliance
| Planned | Implemented | Status |
|---------|-------------|--------|
| [file] | [status] | ✅/❌ |

### Safety Inspection
| Check | Status | Citation |
|-------|--------|----------|
| [check] | ✅/⚠️/❌ | [details] |

### Violations
[numbered list of issues with severity and file references]

## Inspector Notes
> [Humorous summary using kitchen metaphors]
```

### Step 6: Append to Artifact

Append the inspection report to the cook artifact:

```bash
# Append separator and report to artifact
echo "" >> cook/<artifact>.cook.md
cat inspection_report.md >> cook/<artifact>.cook.md
```

### Step 7: Final Announcement

**If PASSED:**
```
✅ Kitchen passed inspection. Certificate of cleanliness issued.

No critical violations found. The kitchen may continue service.
```

**If VIOLATIONS FOUND:**
```
⚠️ Violations found! Kitchen must address issues before next service.

Found:
- X high severity issues (must fix)
- Y medium severity issues (should fix)
- Z low severity issues (nice to fix)

Run `/juni:inspect` again after fixes to re-inspect.
```

## Examples

```
/juni:inspect
> 🧹 Sanitation inspection requested. Putting on the white gloves...
> Inspecting: cook/add-user-auth.2026-01-29.cook.md
> ...
> ✅ Kitchen passed inspection. Certificate of cleanliness issued.

/juni:inspect cook/payment-flow.2026-01-28.cook.md
> 🧹 Sanitation inspection requested. Putting on the white gloves...
> Inspecting: cook/payment-flow.2026-01-28.cook.md
> ...
> ⚠️ Violations found! Kitchen must address issues before next service.
> Found: 1 high, 2 medium severity issues.

/juni:inspect --surprise
> 🧹 SANITATION INSPECTION! The inspector has arrived for a surprise visit...
> *adjusts clipboard*
> *puts on rubber gloves*
> ...
```

## Related

- `/juni:cook` - Creates artifacts that get inspected
- `/juni:sous-chef drift` - Similar drift detection
- `sanitation_inspector_chef` agent - Full agent definition
