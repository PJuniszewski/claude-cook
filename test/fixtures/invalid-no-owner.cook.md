# Cooking Result

## Dish
Feature without owner assigned

## Status
cooking

## Cooking Mode
well-done

---

## Ownership
- Reviewers: auto
- Approved by: Pending

## Scope

### In Scope
- Feature implementation

### Out of Scope
- Nothing

## Pre-mortem (3 scenarios)
1. **Fails in production** -> mitigation: Test thoroughly
2. **Performance issues** -> mitigation: Monitor metrics
3. **User complaints** -> mitigation: Quick rollback

## Trade-offs
- Sacrificing: Time
- Reason: Need to ship fast
- Rejected alternatives:
  - Do nothing - rejected because users need this

## Implementation Plan

### Files to Modify
1. `src/feature.js` - Add feature

### Commit Sequence
1. feat: add feature

## QA Plan

### Test Cases
1. Feature works
2. No regressions
3. Performance acceptable

## Security Review
- Reviewed: yes
- Issues found: none
- Risk level: low

## Blast Radius & Rollout
- Affected users/modules: All
- Feature flag: no
- Rollout strategy: immediate

### Rollback Steps
1. Revert commit

## Changelog
2026-01-10: Created
