# Review Contract

This document defines the standard output format (`review_v1`) for all chef reviews.

## Why Standardization Matters

Without a unified format:
- Each chef produces different output structures
- Orchestration tools can't reliably parse reviews
- Order files accumulate inconsistent review sections
- Automation becomes impossible

## review_v1 Format

All chefs MUST output reviews in this exact structure:

```yaml
output_contract:
  format: review_v1
  required_sections:
    - verdict
    - must_fix
    - should_fix
    - questions
    - risks
    - next_step
```

### Section Definitions

| Section | Type | Description |
|---------|------|-------------|
| `verdict` | enum | `approve` \| `block` \| `request-changes` \| `needs-clarification` |
| `must_fix` | list | Blockers that MUST be resolved before merge |
| `should_fix` | list | Recommended improvements (non-blocking) |
| `questions` | list | Unresolved questions requiring human input |
| `risks` | list | Identified risks with severity (LOW/MEDIUM/HIGH) |
| `next_step` | string | Explicit next action (e.g., "proceed to qa_chef", "escalate to human") |

### Verdict Definitions

| Verdict | Meaning | Effect |
|---------|---------|--------|
| `approve` | Ready to proceed | Unblocks next phase |
| `block` | Critical issues found | Stops workflow until resolved |
| `request-changes` | Issues found, fixable | Returns to previous phase for fixes |
| `needs-clarification` | Missing information | Escalates to human for clarification |

---

## Markdown Output Format

When writing to order files, use this exact format:

```markdown
### <chef_id> (<ISO-date>)

**verdict:** approve | block | request-changes | needs-clarification

**must_fix:**
- <item 1>
- <item 2>

**should_fix:**
- <item 1>

**questions:**
- <question requiring human input>

**risks:**
- [HIGH] <risk description>
- [MEDIUM] <risk description>
- [LOW] <risk description>

**next_step:** <explicit next action>
```

---

## Chef-Specific Addenda

Chefs MAY include additional sections AFTER the required `review_v1` sections.
These are chef-specific and NOT required for orchestration.

| Chef | Optional Addenda |
|------|------------------|
| architect_chef | `alternatives_considered`, `trade_offs` |
| engineer_chef | `implementation_notes`, `diagram` |
| qa_chef | `test_cases`, `edge_cases` |
| security_chef | `threat_assessment`, `owasp_checklist` |
| product_chef | `scope_definition`, `user_value` |
| docs_chef | `files_to_update`, `migration_guide` |

Addenda MUST be clearly separated:

```markdown
### architect_chef (2026-01-31)

**verdict:** approve
**must_fix:** (none)
**should_fix:**
- Consider caching for performance
**questions:** (none)
**risks:**
- [LOW] Minor latency increase under load
**next_step:** proceed to qa_chef

---
#### Addenda: Trade-offs

- Sacrificing: Immediate consistency
- Gaining: Better scalability
- Acceptable because: Use case tolerates eventual consistency
```

---

## Parsing Rules

For tooling and automation:

1. **verdict** is always on first content line after header
2. **Sections** use bold markers (`**section:**`)
3. **Empty sections** use `(none)` not empty string
4. **Risks** have severity prefix in brackets
5. **Addenda** start after horizontal rule (`---`)

---

## Migration from Legacy Formats

### Old architect_chef format → review_v1

```markdown
# OLD (do not use)
## System Impact
- Modules affected: ...

## Alternatives Considered
...

## Decision
...

# NEW (review_v1)
### architect_chef (2026-01-31)
**verdict:** approve
**must_fix:** (none)
**should_fix:** (none)
**questions:** (none)
**risks:**
- [LOW] Performance impact under high load
**next_step:** proceed to engineer_chef

---
#### Addenda: Alternatives Considered
1. **Option A**: ...
2. **Option B** (selected): ...

#### Addenda: Trade-offs
- Sacrificing: ...
- Gaining: ...
```

### Old qa_chef format → review_v1

```markdown
# OLD (do not use)
### Test Cases
1. Happy path test
2. Edge case test

# NEW (review_v1)
### qa_chef (2026-01-31)
**verdict:** approve
**must_fix:** (none)
**should_fix:**
- Add boundary test for max value
**questions:** (none)
**risks:**
- [MEDIUM] Integration with legacy API untested
**next_step:** proceed to security_chef

---
#### Addenda: Test Cases
1. Happy path: User creates order successfully
2. Edge case: Empty cart submission
3. Boundary: Max 100 items in cart
```

---

## See Also

- [COOK_CONTRACT.md](COOK_CONTRACT.md) - Artifact structure
- [CHEF_MATRIX.md](CHEF_MATRIX.md) - Phase assignments
- `.claude/agents/` - Individual chef definitions
