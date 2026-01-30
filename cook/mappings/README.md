# Chef Mapping & Orchestration

This directory contains the Chef-to-phase mapping configuration for `/juni:cook`.

## Files

| File | Purpose |
|------|---------|
| `chef-mapping.yaml` | Phase→Chef mapping, rules, ordering |

---

## Orchestration Algorithm

When `/juni:cook` executes a phase, it follows this algorithm:

```
For each phase:
  1. Load cook/mappings/chef-mapping.yaml
  2. Load the active Order frontmatter
  3. Determine base required Chefs for the phase (from phases.<name>.required)
  4. Evaluate rules in order:
     - If a rule's `when` condition matches:
       - Add chefs from `add_required_chefs`
       - Apply any `set` values (e.g., workflow_mode)
  5. Deduplicate Chefs (a Chef appears only once)
  6. Sort Chefs according to `ordering` list
  7. Invoke each Chef as a Claude Code sub-agent
  8. Capture output (must conform to review_v1 schema)
  9. Append Chef output to Order under ## Reviews
  10. Process verdict:
      - verdict: block    → stop immediately, set order status = blocked
      - verdict: request-changes → phase must be re-run after fixes
      - verdict: clarify  → pause, require human input
      - verdict: approve  → continue to next Chef
```

---

## Rule Conditions

### Condition Types

| Type | Matches When |
|------|--------------|
| `order_flags_any` | Order.flags contains ANY listed value |
| `tracker_labels_any` | tracker.snapshot.labels contains ANY listed value |
| `tracker_components_any` | tracker.snapshot.components contains ANY listed value |
| `tracker_issue_type_in` | tracker.snapshot.issue_type equals ANY listed value |

### Logical Operators

- `any`: At least one condition must match (OR)
- `all`: All conditions must match (AND) - *not yet implemented*

---

## Gating Rules

Chef verdicts control workflow progression:

| Verdict | Effect |
|---------|--------|
| `approve` | Continue to next Chef/phase |
| `block` | Stop immediately, order status = blocked |
| `request-changes` | Phase must be re-run after fixes |
| `clarify` | Pause workflow, require human input |

---

## Workflow Modes

| Mode | Behavior |
|------|----------|
| `microwave` | Minimal enforcement, fewer Chefs |
| `well-done` | Strict enforcement, all non_negotiables enforced |

Rules can override mode via `set.workflow_mode`.

---

## Chef Output Schema (review_v1)

Every Chef must return output conforming to:

```yaml
verdict: approve | block | request-changes | clarify
must_fix:
  - "Issue that must be fixed"
risks:
  - "Identified risk"
next_step: "Recommended next action"
```

---

## Validation

The following must be validated (in CI):

### Order Validation
- `order_id` - required
- `status` - required, one of: raw, cooking, blocked, ready-for-merge, plated
- `flags` - required (may be empty array)

### Chef Output Validation
- `verdict` - required
- `must_fix` - required (may be empty array)
- `risks` - required (may be empty array)
- `next_step` - required

### Mapping Validation
- `chef-mapping.yaml` must be valid YAML
- All referenced chefs must exist in `.claude/agents/`
- Phases must have at least one required chef

---

## Examples

### Adding security_chef for auth changes

```yaml
# In Order frontmatter:
flags: ["auth"]

# Rule matches:
- when:
    any:
      - order_flags_any: ["auth", "payments", "pii", "crypto"]
  then:
    add_required_chefs:
      - security_chef
    set:
      workflow_mode: "well-done"

# Result: security_chef added, mode = well-done
```

### Bug fix from Jira

```yaml
# In Order frontmatter:
tracker:
  snapshot:
    issue_type: "Bug"

# Rule matches:
- when:
    any:
      - tracker_issue_type_in: ["Bug", "Incident"]
  then:
    add_required_chefs:
      - qa_chef
      - release_chef
    set:
      workflow_mode: "well-done"

# Result: qa_chef + release_chef added, mode = well-done
```
