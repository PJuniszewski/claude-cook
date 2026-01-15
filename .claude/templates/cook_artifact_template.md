# Cooking Result

## Dish
<short description of the feature or fix>

## Status
<!-- One of: raw | cooking | blocked | needs-more-cooking | well-done | ready-for-merge | plated -->
<!-- If killed: needs-more-cooking + reason: killed - <why> -->

## Cooking Mode
<!-- well-done | microwave -->

## Current Phase
<!-- Step 0.0 - Artifact Created | Phase 0 - Complete | Step 1 - Complete | ... | Cooking Complete -->

## Ownership
- Decision Owner: <name/role>
- Reviewers: <list or "auto">
- Approved by: <name> on <date>

---

<!-- WELL-DONE MODE SECTIONS (remove if microwave) -->

# Phase 0 - Project Policy & Context

## Sources Scanned
| File | Status | Key Rules |
|------|--------|-----------|
| CLAUDE.md | _Pending_ | |
| README.md | _Pending_ | |
| .claude/agents/*.md | _Pending_ | |

## Hard Rules (must not be violated)
- _Pending..._

## Preferred Patterns
- _Pending..._

## Explicit Non-goals / Forbidden Approaches
- _Pending..._

## Assumptions (due to missing documentation)
- _Pending..._

## Detected Conflicts
- _None_ or <conflict description>

## Policy Alignment Risk
- _LOW | MEDIUM | HIGH_

---

# Step 1 - Read the Order

## Feature Summary
<restate feature in concrete terms>

## Affected Modules/Components
| Module | Impact | Risk Level |
|--------|--------|------------|
| | | |

## Dependencies
- _Pending..._

## Microwave Blocker Check
<!-- Check if feature touches: auth/permissions/crypto, schema/migrations/storage, public API, UI flows, payments -->
- **NOT BLOCKED** or **BLOCKED** - escalate to well-done

---

# Step 2 - Ingredient Approval (Product Review)

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

## User Value
1. <value proposition>

## Assumptions
- <assumption>

---

# Step 3 - Presentation Planning (UX Review)

## UX Decision
<!-- Required | Not Required -->

## User Flow
<description or "N/A - no UI changes">

## UI Components Affected
| Component | Change Type | Notes |
|-----------|-------------|-------|
| | | |

## Accessibility Considerations
- <consideration or "N/A">

---

# Step 4 - Implementation Plan

## Architecture Decision

### Selected Approach
<description>

### Alternatives Considered
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| Option A | | | Rejected: <reason> |
| Option B | | | **Selected**: <reason> |

### Trade-offs
- Sacrificing: <what we give up>
- Gaining: <what we get>
- Rejected alternatives:
  - <alternative 1> - rejected because <reason>

## Patch Plan

### Files to Modify
| File | Change | Risk |
|------|--------|------|
| | | |

### Commit Sequence
1. <commit message>

### High-risk Areas
- <area needing extra attention>

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
- <edge case>

### Acceptance Criteria
- [ ] Given <context>, when <action>, then <result>

### Regression Checks
- <existing feature to verify>

---

# Step 6 - Security Review

## Security Status
- Reviewed: yes/no
- Risk level: low/medium/high

## Security Checklist
| Check | Status | Notes |
|-------|--------|-------|
| Input validation | _Pending_ | |
| Auth/authz | _Pending_ | |
| Data exposure | _Pending_ | |
| Injection vectors | _Pending_ | |

## Issues Found
- _None_ or <issue list>

---

# Step 7 - Documentation

## Documentation Updates
| File | Change Needed |
|------|---------------|
| | |

## New Documentation Needed
- _None_ or <topic>

---

# Risk Management

## Pre-mortem (3 scenarios required)
| # | What Could Go Wrong | Likelihood | Impact | Mitigation |
|---|---------------------|------------|--------|------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

## Rollback Plan
1. <step>

## Blast Radius
- Affected users/modules: <list>
- Feature flag: yes/no (name: <flag_name>)
- Rollout strategy: immediate/gradual/canary

---

# Decision Log

| Date | Phase | Decision | Rationale |
|------|-------|----------|-----------|
| YYYY-MM-DD | Step 0.0 | Artifact created | Starting cook flow |

## Next Actions
- [ ] <action>

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

## Pre-mortem (1 scenario minimum)
1. <scenario> -> mitigation: <action>

## Tests
- <test 1: verifies the fix>
- <test 2: regression check> (optional)

## Security Status (only if touches auth/API)
- Reviewed: yes/no
- Issues found: <list or "none">

## Next Actions
- [ ] <action>
