# Chef Responsibility Matrix

Quick reference for who does what in the `/cook` workflow.

## Chef Overview

| Chef | Phase | Primary Responsibility |
|------|-------|------------------------|
| Product Chef | Step 2 | Scope approval, user value validation |
| UX Chef | Step 3 | User flow, accessibility, experience |
| Architect Chef | Step 4 | System design, alternatives, trade-offs |
| Engineer Chef | Step 4 | Implementation plan, file changes |
| QA Chef | Step 5 | Test strategy, edge cases, acceptance criteria |
| Security Chef | Step 6 | Vulnerability audit, threat assessment |
| Docs Chef | Step 7 | Documentation updates, usage examples |
| Release Chef | Post-cook | Versioning, changelog, release notes |

---

## Detailed Matrix

### Product Chef

| Attribute | Value |
|-----------|-------|
| **Phase** | Step 2 - Ingredient Approval |
| **Mode** | well-done only |
| **Inputs** | Feature request, project scope, roadmap |
| **Outputs** | Approve/Reject/Defer decision, scope definition, non-goals |
| **Stop conditions** | No user value, out of scope, dependencies unmet |
| **Pitfalls** | Scope creep, approving "nice to have" as "must have" |

---

### UX Chef

| Attribute | Value |
|-----------|-------|
| **Phase** | Step 3 - Presentation Planning |
| **Mode** | well-done (conditional in microwave) |
| **Inputs** | Approved scope, existing UI patterns |
| **Outputs** | User flow, accessibility requirements, UX concerns |
| **Stop conditions** | User confusion risk, accessibility violations |
| **Pitfalls** | Over-designing simple features, ignoring existing patterns |

---

### Architect Chef

| Attribute | Value |
|-----------|-------|
| **Phase** | Step 4 - Cooking |
| **Mode** | well-done, microwave (major changes only) |
| **Inputs** | Approved scope, existing architecture, tech constraints |
| **Outputs** | Architecture decision, alternatives considered, trade-offs |
| **Stop conditions** | Fundamental design flaw, system-wide breaking change |
| **Pitfalls** | Over-engineering, ignoring existing patterns, premature optimization |

---

### Engineer Chef

| Attribute | Value |
|-----------|-------|
| **Phase** | Step 4 - Cooking |
| **Mode** | well-done, microwave |
| **Inputs** | Architecture decision, approved scope, project conventions |
| **Outputs** | Implementation plan, file list, commit sequence |
| **Stop conditions** | Technical impossibility, missing dependencies |
| **Pitfalls** | Scope creep during implementation, skipping tests |

---

### QA Chef

| Attribute | Value |
|-----------|-------|
| **Phase** | Step 5 - Taste Testing |
| **Mode** | well-done (3+ tests), microwave (1-2 tests) |
| **Inputs** | Implementation plan, acceptance criteria |
| **Outputs** | Test plan, edge cases, regression checklist |
| **Stop conditions** | No test coverage, failing tests, unhandled edge cases |
| **Pitfalls** | Only testing happy path, ignoring integration points |

---

### Security Chef

| Attribute | Value |
|-----------|-------|
| **Phase** | Step 6 - Safety Inspection |
| **Mode** | well-done (always), microwave (if auth/API touched) |
| **Inputs** | Implementation, data flow, API changes |
| **Outputs** | Security checklist, risk level, threat assessment |
| **Stop conditions** | Any vulnerability found, secrets exposed, auth bypass |
| **Pitfalls** | Missing injection vectors, trusting user input |

---

### Docs Chef

| Attribute | Value |
|-----------|-------|
| **Phase** | Step 7 - Recipe Notes |
| **Mode** | well-done (conditional), microwave (skip unless behavior change) |
| **Inputs** | Implementation, API changes, behavior changes |
| **Outputs** | Documentation plan, usage examples, pitfalls |
| **Stop conditions** | Breaking change without migration guide |
| **Pitfalls** | Over-documenting internals, missing user-facing changes |

---

### Release Chef

| Attribute | Value |
|-----------|-------|
| **Phase** | Post-cooking (when releasing) |
| **Mode** | On demand |
| **Inputs** | Completed implementation, changelog, previous version |
| **Outputs** | Version bump, changelog entry, release checklist |
| **Stop conditions** | Breaking change not approved, failing tests |
| **Pitfalls** | Wrong semver, unclear changelog entries |

---

## Mode Participation

| Chef | well-done | microwave |
|------|-----------|-----------|
| Product Chef | Required | Skip |
| UX Chef | Conditional | Skip (unless UI change) |
| Architect Chef | Required | Skip (unless major change) |
| Engineer Chef | Required | Required |
| QA Chef | Required (3+) | Required (1-2) |
| Security Chef | Required | Conditional (auth/API only) |
| Docs Chef | Conditional | Skip (unless behavior change) |
| Release Chef | On demand | On demand |

---

## Chef Resolution Order

When multiple chef definitions exist:

1. **Project-specific** (`<project>/.claude/agents/<name>_chef.md`)
2. **System-wide** (`~/.claude/agents/<name>.md`)

Project-specific chefs override system-wide chefs for the same role.

---

## See Also

- [COOK_CONTRACT.md](COOK_CONTRACT.md) - What each chef must produce
- [ANTI_PATTERNS.md](ANTI_PATTERNS.md) - Common mistakes
- Individual chef files in `.claude/agents/`
