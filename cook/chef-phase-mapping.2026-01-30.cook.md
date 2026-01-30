# Cooking Result

## Dish
Implement a deterministic Chef-to-phase mapping layer that defines which Chefs are invoked per /juni:cook phase, with conditional rules based on Order flags and tracker metadata.

## Status
well-done

## Cooking Mode
well-done

## Current Phase
Complete - Ready for Implementation

## Ownership
- Decision Owner: @developer
- Reviewers: product_chef, architect_chef, engineer_chef
- Approved by: _Pending_

---

# Phase 0 - Project Policy & Context

## Sources Scanned
| File | Status | Key Rules |
|------|--------|-----------|
| CLAUDE.md | ✅ Scanned | Chefs in `.claude/agents/`, artifacts in `cook/`, juni: prefix |
| CHEF_MATRIX.md | ✅ Scanned | Phase assignments, mode participation matrix |
| .claude/agents/*.md | ✅ Scanned | 11 chef definitions exist |

## Hard Rules (must not be violated)
1. No external services, databases, or background jobs
2. Filesystem + git are source of truth
3. Chef output must conform to `review_v1` schema
4. `verdict: block` stops workflow immediately
5. Artifacts use `<slug>.<date>.cook.md` naming

## Preferred Patterns
- YAML for configuration (chef-mapping.yaml)
- Markdown with YAML frontmatter for orders
- Deterministic invocation order
- Rules evaluated in sequence

## Detected Conflicts
- CLAUDE.md still references `.claude/agents/` but rename to `chefs/` is pending on another branch
- Current task should use `agents/` (main branch) but design for future `chefs/`

## Policy Alignment Risk
LOW - This feature adds structure without changing existing behavior

---

# Step 1 - Read the Order

## Feature Summary
Introduce a deterministic mapping layer that:
1. Maps `/juni:cook` phases → required Chefs
2. Conditionally adds Chefs based on Order flags or tracker metadata
3. Enables gating (block/request-changes/clarify/approve)
4. Remains lightweight, repo-native, and auditable (no external services)

## Affected Modules/Components
| Module | Impact | Risk Level |
|--------|--------|------------|
| `cook/mappings/` | New directory + chef-mapping.yaml | Low |
| `orders/_TEMPLATE.order.md` | Update frontmatter schema | Low |
| `/juni:cook` workflow | Must read mapping + evaluate rules | Medium |
| Chef agents | Must output review_v1 format | Low |

## Dependencies
- Existing chef definitions in `.claude/agents/`
- Existing `/juni:cook` skill
- Order system (orders/*.order.md) - on separate branch

## Microwave Blocker Check
**BLOCKED**: This affects core workflow architecture. Must use `--well-done`.

---

# Step 2 - Ingredient Approval (Product Review)

## Product Decision
**Approved**

## Scope

### In Scope
1. `cook/mappings/chef-mapping.yaml` - Phase-to-Chef mapping with rules
2. Updated `orders/_TEMPLATE.order.md` - flags, tracker snapshot schema
3. Orchestration algorithm documentation
4. Gating rules based on Chef verdict
5. Validation schema (definition only, not implementation)

### Out of Scope
- Implementation code for orchestration
- CI pipeline setup
- Chef agent modifications
- Tracker sync implementation (already on separate branch)

### Non-goals
- Dynamic chef discovery
- Plugin-based chef loading
- Remote/cloud execution
- Real-time collaboration

## User Value
- **Predictability**: Developers know exactly which Chefs review each phase
- **Safety**: Security-sensitive changes automatically get security_chef
- **Auditability**: Mapping file is version-controlled and reviewable
- **Flexibility**: Rules allow conditional Chef addition without hardcoding

## Assumptions
- Chef agents already exist and produce review_v1 output
- Order files follow the specified YAML frontmatter schema
- /juni:cook reads mapping file at execution time
- Git is the source of truth for all configuration

---

# Step 3 - Presentation Planning (UX Review)

## UX Decision
**Not Required** - This is backend/configuration-only. No UI components.

## User Flow
N/A - Configuration files, no user interaction beyond editing YAML/Markdown.

## UI Components Affected
| Component | Change Type | Notes |
|-----------|-------------|-------|
| None | N/A | Pure configuration |

## Accessibility Considerations
N/A

---

# Step 4 - Implementation Plan

## Architecture Decision

### Selected Approach
**Declarative YAML Configuration + Documentation**

Single YAML file defines:
- Phase → Chef mapping (static)
- Conditional rules (evaluated at runtime)
- Chef invocation order (deterministic)
- Default workflow mode

### Alternatives Considered
| Option | Pros | Cons | Decision |
|--------|------|------|----------|
| JSON config | Machine-readable, schema validation | Less readable, no comments | Rejected: YAML preferred for human editing |
| Hardcoded in skill | Fast, no parsing | Not auditable, hard to modify | Rejected: Configuration should be explicit |
| Database/external | Powerful queries | Violates "no external services" | Rejected: Constraint violation |
| **YAML + docs** | Readable, auditable, git-native | Requires parsing | **Selected** |

### Trade-offs
- Sacrificing: Runtime flexibility (must edit file to change)
- Gaining: Predictability, auditability, simplicity

## Patch Plan

### Files to Create/Modify
| File | Change | Risk |
|------|--------|------|
| `cook/mappings/chef-mapping.yaml` | Create new | Low |
| `orders/_TEMPLATE.order.md` | Update frontmatter | Low |
| `cook/mappings/README.md` | Documentation | Low |

### Commit Sequence
1. `feat(cook): Add chef-mapping.yaml with phase-to-chef mapping`
2. `feat(orders): Update order template with flags and tracker schema`
3. `docs(cook): Add orchestration algorithm documentation`

### High-risk Areas
- Rule evaluation logic must match documented algorithm exactly
- Order template changes must be backward-compatible

---

# Step 5 - QA Review

## Test Plan

### Test Cases
| # | Scenario | Given | When | Then |
|---|----------|-------|------|------|
| 1 | Basic phase mapping | Phase `scope` | Load mapping | `product_chef` required |
| 2 | Multiple chefs in phase | Phase `plan` | Load mapping | `engineer_chef` + `architect_chef` required |
| 3 | Rule adds chef | Order has `flags: ["auth"]` | Evaluate rules | `security_chef` added, mode = well-done |
| 4 | Rule via tracker | Tracker has `labels: ["security"]` | Evaluate rules | `security_chef` added |
| 5 | Chef ordering | Multiple chefs active | Sort by ordering | Deterministic order |
| 6 | Block verdict | Chef returns `verdict: block` | Process verdict | Workflow stops, status = blocked |
| 7 | Empty flags | Order has `flags: []` | Evaluate rules | No rules match, defaults apply |

### Edge Cases
- Order with no tracker section (tracker: null)
- Multiple rules matching same condition (all should apply)
- Chef already required by phase AND added by rule (deduplicate)
- Unknown chef in rule (should warn or error)

### Acceptance Criteria
- [ ] Given chef-mapping.yaml exists, when /juni:cook runs, then correct chefs are invoked per phase
- [ ] Given order with flags: ["auth"], when rules evaluated, then security_chef is added
- [ ] Given chef returns verdict: block, when processing, then workflow stops immediately
- [ ] Given multiple chefs, when invoked, then order matches `ordering` list

### Regression Checks
- Existing /juni:cook behavior unchanged when no mapping file exists (graceful fallback)
- Chef agents still produce valid review_v1 output

---

# Step 6 - Security Review

## Security Status
- Reviewed: yes
- Risk level: **low**

## Security Checklist
| Check | Status | Notes |
|-------|--------|-------|
| Input validation | ✅ Pass | YAML parsed by standard library |
| Auth/authz | N/A | No auth - local files only |
| Data exposure | ✅ Pass | No sensitive data in mapping |
| Injection vectors | ✅ Pass | No code execution from config |

## Issues Found
None. This is purely declarative configuration:
- No user input at runtime
- No network access
- No code execution
- Files are version-controlled and reviewed via git

---

# Step 7 - Documentation

## Documentation Updates
| File | Change Needed |
|------|---------------|
| CLAUDE.md | Add reference to `cook/mappings/` |
| CHEF_MATRIX.md | Link to chef-mapping.yaml |
| orders/README.md | Document new frontmatter fields |

## New Documentation Needed
- `cook/mappings/README.md` - Orchestration algorithm, rule syntax, examples

---

# Risk Management

## Pre-mortem (3 scenarios required)
| # | What Could Go Wrong | Likelihood | Impact | Mitigation |
|---|---------------------|------------|--------|------------|
| 1 | Mapping file syntax error breaks /juni:cook | Low | High | Validate YAML in CI, schema check |
| 2 | Rule conditions too complex, hard to debug | Medium | Medium | Keep rules simple, document examples |
| 3 | Chef ordering conflict with phase requirements | Low | Medium | Single source of truth (ordering list) |

## Rollback Plan
1. Delete `cook/mappings/chef-mapping.yaml`
2. /juni:cook falls back to existing behavior (hardcoded phases)

## Blast Radius
- Affected users/modules: All /juni:cook users
- Feature flag: No (configuration file presence is the flag)
- Rollout strategy: Immediate (configuration is opt-in by file existence)

---

# Decision Log

| Date | Phase | Decision | Rationale |
|------|-------|----------|-----------|
| 2026-01-30 | Step 0.0 | Artifact created | Starting cook flow |
| 2026-01-30 | Step 1 | Use well-done mode | Core workflow architecture change |
| 2026-01-30 | Step 2 | Approved | Clear value, defined scope |
| 2026-01-30 | Step 3 | UX not required | No UI components |
| 2026-01-30 | Step 4 | YAML config selected | Readable, auditable, git-native |
| 2026-01-30 | Step 5 | QA plan defined | 7 test cases, 4 edge cases |
| 2026-01-30 | Step 6 | Security: Low risk | Declarative config only |
| 2026-01-30 | Step 7 | Docs identified | README + updates to existing docs |
| 2026-01-30 | Final | Deliverables created | All files written |

---

# Deliverables

## Files Created

| File | Description |
|------|-------------|
| `cook/mappings/chef-mapping.yaml` | Phase→Chef mapping with rules |
| `cook/mappings/README.md` | Orchestration algorithm documentation |
| `orders/_TEMPLATE.order.md` | Updated order template with flags + tracker |

## Summary

This artifact defines a **deterministic Chef-to-phase mapping layer** for `/juni:cook`:

1. **Mapping File** (`chef-mapping.yaml`)
   - 9 phases, each with required Chefs
   - 3 conditional rules (security, UX, incidents)
   - Deterministic ordering for Chef invocation
   - Default workflow mode: microwave

2. **Order Template** (`_TEMPLATE.order.md`)
   - New fields: `chef_id`, `recipe_id`, `flags`
   - Tracker snapshot schema for Jira integration
   - Protected sections (Summary, Plan, Notes)
   - Reviews section for Chef output

3. **Orchestration Algorithm**
   - Documented in `cook/mappings/README.md`
   - 10-step process per phase
   - Gating: block/request-changes/clarify/approve
   - Workflow mode affects strictness

4. **Validation Rules** (defined, not implemented)
   - Order: order_id, status, flags required
   - Chef output: verdict, must_fix, risks, next_step required
   - Mapping: valid YAML, chefs must exist

## Next Steps

1. Review and merge this artifact
2. Implement orchestration logic in `/juni:cook` skill
3. Add CI validation for chef-mapping.yaml schema
4. Update existing orders to include `flags: []`
