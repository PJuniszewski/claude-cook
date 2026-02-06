# Chef Responsibility Matrix

Quick reference for who does what in the `/cook` workflow.

## Chef Overview

| Chef | phase_affinity | Primary Responsibility |
|------|----------------|------------------------|
| Product Chef | scope | Scope approval, user value validation |
| UX Chef | ux | User flow, accessibility, experience |
| Architect Chef | plan | System design, alternatives, trade-offs |
| Engineer Chef | plan | Implementation plan, file changes |
| QA Chef | test | Test strategy, edge cases, acceptance criteria |
| Security Chef | security | Vulnerability audit, threat assessment |
| Docs Chef | docs | Documentation updates, usage examples |
| Release Chef | release | Versioning, changelog, release notes |
| Sanitation Inspector | inspect | Code hygiene, plan compliance, quality review |
| Restaurateur Chef | refine | Code refinement, optimization, naming, dead code, complexity |
| Sous Chef | monitor | Background monitoring, drift detection |

**All chefs output reviews in `review_v1` format.** See [REVIEW_CONTRACT.md](REVIEW_CONTRACT.md).

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

### Sanitation Inspector Chef

| Attribute | Value |
|-----------|-------|
| **Phase** | Post-cooking (after implementation) |
| **Mode** | On demand + automatic (surprise inspections) |
| **Inputs** | Cook artifact, implementation, git history |
| **Outputs** | Inspection report, violations list, hygiene score |
| **Stop conditions** | High severity violations block merge |
| **Pitfalls** | Over-inspecting trivial changes, false positives |

**Trigger Conditions:**
- On-demand via `/juni:inspect`
- Automatic on PR merge for: auth, schema, API, payment changes
- Large PRs (>300 lines)
- High-risk files flagged in pre-mortem

**Inspection Areas:**
- Hygiene (error handling, logging, tests)
- Recipe Compliance (plan vs implementation)
- Safety (input validation, auth checks)

---

### Restaurateur Chef

| Attribute | Value |
|-----------|-------|
| **Phase** | Post-cooking (after implementation, on-demand) |
| **Mode** | On demand |
| **Inputs** | Cook artifact, implementation, git diff, target files |
| **Outputs** | Refinement report, quality score, improvement suggestions |
| **Stop conditions** | Refinement suggests architectural change, naming needs project-wide decision |
| **Pitfalls** | Over-suggesting, flagging generated/vendored code, false positives on dynamic dispatch |

**Review Dimensions (8):**
- Optimization, Simplification, Boilerplate Reduction, Naming, Pattern Cleanliness
- Dead Code Detection, Complexity Scoring, Magic Value Detection

**Parallel Agents:**
- Code Structure Agent (dead code, complexity, simplification)
- Naming & Constants Agent (naming, magic values)
- Patterns & Optimization Agent (optimization, boilerplate, patterns)

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
| Sanitation Inspector | On demand + auto | On demand + auto |
| Restaurateur Chef | On demand | On demand |

---

## Chef Resolution Order

When multiple chef definitions exist:

1. **Project-specific** (`<project>/.claude/agents/<name>_chef.md`)
2. **System-wide** (`~/.claude/agents/<name>.md`)

Project-specific chefs override system-wide chefs for the same role.

---

## See Also

- [REVIEW_CONTRACT.md](REVIEW_CONTRACT.md) - Standard review output format
- [COOK_CONTRACT.md](COOK_CONTRACT.md) - What each chef must produce
- [ANTI_PATTERNS.md](ANTI_PATTERNS.md) - Common mistakes
- Individual chef files in `.claude/agents/`
