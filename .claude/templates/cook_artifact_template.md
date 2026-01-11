# Cooking Result

## Dish
<short description of the feature or fix>

## Status
<!-- One of: raw | cooking | blocked | needs-more-cooking | well-done | ready-for-merge | plated -->
<!-- If killed: needs-more-cooking + reason: killed - <why> -->

## Cooking Mode
<!-- well-done | microwave -->

---

<!-- WELL-DONE MODE SECTIONS (remove if microwave) -->

## Ownership
- Decision Owner: <name/role>
- Reviewers: <list or "auto">
- Approved by: <name> on <date>

## Product Decision
<!-- Approved | Rejected | Deferred -->
- Reason: <why>

## Scope
### In Scope
- <item>

### Out of Scope
- <item>

### Non-goals
- <item>

## Assumptions
- <assumption>

### Validation Plan
- <how to validate assumption>

## UX Notes (if applicable)
- Flow: <description>
- Considerations: <list>

## Pre-mortem (REQUIRED - 3 scenarios for well-done, 1 for microwave)
1. <scenario> -> mitigation: <action>
2. <scenario> -> mitigation: <action>
3. <scenario> -> mitigation: <action>

## Trade-offs
- Sacrificing: <perf/UX/maintainability/time>
- Reason: <why>
- Rejected alternatives:
  - <alternative 1> - rejected because <reason>

## Implementation Plan
### Files to Modify
1. `<file>` - <what changes>

### Commit Sequence
1. <commit message>

### High-risk Areas
- <area>

## QA Plan
### Test Cases
1. <test case>
2. <test case>
3. <test case>

### Edge Cases
- <edge case>

### Regression Checks
- <regression>

## Security Review
- Reviewed: yes/no
- Issues found: <list or "none">
- Risk level: low/medium/high

### Checklist
- [ ] Input validation
- [ ] Auth/authz verified
- [ ] No data exposure
- [ ] No injection vectors

## Blast Radius & Rollout
- Affected users/modules: <list>
- Feature flag: yes/no (name: <flag_name>)
- Rollout strategy: immediate/gradual/canary

### Rollback Steps
1. <step>

## Open Questions
- <question>

## Next Actions
- [ ] <action>

## Decision Log
| Date | Decision | Rationale |
|------|----------|-----------|
| YYYY-MM-DD | <decision> | <why> |

## Changelog
<!-- Version history for this artifact. Append entries on significant updates. -->
<!-- Format: YYYY-MM-DD: <summary of changes> -->

---

<!-- MICROWAVE MODE SECTIONS (remove above if microwave) -->

## Problem Statement
<what's broken + how to reproduce>

## Fix Plan
<minimal fix description>

## Why Safe
<1 sentence explaining why this is low risk>

## Tests
- <test 1: verifies the fix>
- <test 2: regression check> (optional)

## Security Status (only if touches auth/API)
- Reviewed: yes/no
- Issues found: <list or "none">

## Next Actions
- [ ] <action>
