# Well-Done Checklist

Use this checklist to verify a feature is ready to be marked `well-done`.

## Required Sections

- [ ] **Dish** - Clear, concise description
- [ ] **Status** - Set to appropriate value
- [ ] **Ownership** - Decision Owner assigned
- [ ] **Product Decision** - Approved/Rejected/Deferred with reason

## Scope Definition

- [ ] In Scope items listed
- [ ] Out of Scope items listed
- [ ] Non-goals documented

## Risk Management

- [ ] Pre-mortem completed (minimum 3 scenarios)
- [ ] Each scenario has a mitigation
- [ ] Trade-offs documented
- [ ] Rejected alternatives listed with reasons

## Implementation Plan

- [ ] Files to modify listed
- [ ] Commit sequence defined
- [ ] High-risk areas identified

## Quality Assurance

- [ ] Minimum 3 test cases defined
- [ ] Edge cases identified
- [ ] Regression checks listed

## Security Review

- [ ] Security review completed (yes/no)
- [ ] Risk level assigned (low/medium/high)
- [ ] Checklist items addressed:
  - [ ] Input validation
  - [ ] Auth/authz verified
  - [ ] No data exposure
  - [ ] No injection vectors

## Rollout Planning

- [ ] Affected users/modules identified
- [ ] Feature flag decision made
- [ ] Rollout strategy selected
- [ ] Rollback steps documented

## Final Checks

- [ ] All open questions resolved or documented
- [ ] Next actions listed
- [ ] Decision log updated

---

## Failure Conditions

The feature is NOT well-done if:

1. No measurable effect defined
2. Risk exceeds value
3. No Decision Owner assigned
4. Acceptance criteria cannot be tested
5. Security checklist incomplete for security-sensitive changes
