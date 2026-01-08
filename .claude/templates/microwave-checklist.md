# Microwave Checklist

Use this checklist to verify a quick fix is ready to proceed.

## Required Sections

- [ ] **Dish** - Clear description of the fix
- [ ] **Status** - Set to appropriate value
- [ ] **Problem Statement** - What's broken + reproduction steps
- [ ] **Fix Plan** - Minimal fix description

## Safety Verification

- [ ] **Why Safe** - One sentence explaining low risk
- [ ] Not touching blocked topics:
  - [ ] No auth/permissions/crypto changes
  - [ ] No schema/migrations/storage changes
  - [ ] No public API contract changes
  - [ ] No UI flow changes
  - [ ] No payments/purchase/paywall changes

## Quality

- [ ] At least 1 test verifying the fix
- [ ] Regression check (optional but recommended)

## Pre-mortem

- [ ] At least 1 failure scenario with mitigation

## Security (if applicable)

- [ ] Security review if touching auth/API
- [ ] Issues documented

## Final Checks

- [ ] Next actions listed
- [ ] Fix is minimal (no scope creep)

---

## Auto-Escalation Triggers

If ANY of these are true, escalate to `--well-done`:

1. Changes touch auth, permissions, or crypto
2. Changes touch database schema or migrations
3. Changes affect public API contracts
4. Changes modify user flows
5. Changes involve payments or billing
6. Fix requires architectural changes
7. Fix scope expanded beyond original issue

---

## Microwave Limits

Microwave mode is for:
- Bug fixes with clear reproduction
- Small refactors with no behavior change
- Non-critical UI tweaks
- Documentation fixes

Microwave mode is NOT for:
- New features
- Architecture changes
- Security-sensitive changes
- Breaking changes
