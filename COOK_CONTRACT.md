# Cook Artifact Contract

This document defines the minimum required sections for a valid cooked artifact.

## Well-Done Mode (7 Required Sections)

A well-done artifact MUST contain all of these sections:

### 1. Problem Statement + Scope

```markdown
## Dish
<1-2 sentence description of what we're building>

## Scope

### In Scope
- <what's included>

### Out of Scope
- <what's explicitly excluded>

### Non-goals
- <what we're intentionally not solving>
```

**Why required:** Without clear scope, implementation will drift.

---

### 2. Assumptions + Non-goals

```markdown
## Assumptions
- <assumption 1>
- <assumption 2>

## Non-goals
- <what this feature will NOT do>
```

**Why required:** Unstated assumptions cause bugs. Non-goals prevent scope creep.

---

### 3. Options + Decision

```markdown
## Architecture Decision

### Approach
<selected approach>

### Alternatives Considered
1. **<Option A>**
   - Pros: <list>
   - Cons: <list>
   - Decision: Rejected because <reason>

2. **<Option B>** (selected)
   - Pros: <list>
   - Cons: <list>
   - Decision: Accepted because <reason>

### Trade-offs
- Sacrificing: <what we give up>
- Gaining: <what we get>
```

**Why required:** Decisions without alternatives are not decisions.

---

### 4. Implementation Plan

```markdown
## Patch Plan

### Files to Modify
1. `path/to/file.ts` - <what changes>
2. `path/to/another.ts` - <what changes>

### Commit Sequence
1. <first commit message>
2. <second commit message>

### High-risk Areas
- <area that needs extra attention>

### Dependencies
- <external dependency or prerequisite>
```

**Why required:** Implementation without a plan is improvisation.

---

### 5. Test Plan

```markdown
## QA Plan

### Test Cases
1. <happy path test>
2. <edge case test>
3. <boundary test>

### Edge Cases
- <edge case 1>
- <edge case 2>

### Acceptance Criteria
- [ ] Given <context>, when <action>, then <result>
- [ ] Given <context>, when <action>, then <result>

### Regression Checks
- <existing feature to verify>
```

**Why required:** Untested code is broken code.

---

### 6. Docs Updates List

```markdown
## Documentation Updates

### Files to Update
- `README.md` - <what to add/change>
- `docs/api.md` - <what to add/change>

### New Documentation Needed
- <topic>: <brief description>

### Migration Guide (if breaking change)
- <step 1>
- <step 2>
```

**Why required:** Undocumented features don't exist to users.

---

### 7. Risk List + Mitigations

```markdown
## Pre-mortem (REQUIRED - 3 scenarios)
1. <what could go wrong> -> mitigation: <how we prevent/detect>
2. <what could go wrong> -> mitigation: <how we prevent/detect>
3. <what could go wrong> -> mitigation: <how we prevent/detect>

## Security Review
- Reviewed: yes
- Issues found: <list or "none">
- Risk level: low/medium/high

## Rollback Plan
1. <rollback step 1>
2. <rollback step 2>
```

**Why required:** Optimism is not a risk management strategy.

---

## Microwave Mode (4 Required Sections)

A microwave artifact MUST contain:

### 1. Problem Statement
```markdown
## Problem Statement
<what's broken + how to reproduce>
```

### 2. Fix Plan
```markdown
## Fix Plan
<minimal fix description>
```

### 3. Why Safe
```markdown
## Why Safe
<1 sentence explaining why this is low risk>
```

### 4. Tests
```markdown
## Tests
- <test 1: verifies the fix>
```

---

## Validation Checklist

### Well-Done Mode
- [ ] Problem statement is specific and measurable
- [ ] Scope has explicit "out of scope" items
- [ ] At least 2 alternatives were considered
- [ ] Implementation plan lists actual file paths
- [ ] At least 3 test cases defined
- [ ] At least 3 pre-mortem scenarios
- [ ] Rollback plan exists

### Microwave Mode
- [ ] Problem is reproducible
- [ ] Fix is minimal (not a rewrite)
- [ ] "Why safe" is convincing
- [ ] At least 1 test verifies the fix

---

## Invalid Artifacts

An artifact is INVALID if:

| Issue | Why invalid |
|-------|-------------|
| Missing scope | Can't verify completion |
| No alternatives | Not a decision, just a guess |
| No tests | Can't verify correctness |
| No risks | Ignoring reality |
| Scope too large | Should be multiple cooks |
| "TBD" in required fields | Incomplete thinking |

---

## See Also

- [CHEF_MATRIX.md](CHEF_MATRIX.md) - Who produces what
- [ANTI_PATTERNS.md](ANTI_PATTERNS.md) - What NOT to do
- `.claude/templates/` - Artifact templates
