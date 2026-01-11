# Cook Artifact Validation Checklist

Reference for the 10 validation checks performed by `cook-validate`.

## Error Checks (Block Completion)

| Check ID | Description | Applies To | How to Fix |
|----------|-------------|------------|------------|
| `no-scope` | Missing In/Out scope | well-done | Add `### In Scope` and `### Out of Scope` under `## Scope` |
| `no-premortem` | Missing pre-mortem | both | Add `## Pre-mortem` section with failure scenarios |
| `missing-tests` | Insufficient test cases | both | Add numbered test cases (3+ for well-done, 1+ for microwave) |
| `no-owner` | No Decision Owner | well-done | Add `- Decision Owner: @name` in Ownership section |
| `tbd-sections` | Contains TBD/TODO/FIXME | both | Replace placeholders with actual content |
| `empty-section` | Required section is empty | both | Fill in all required sections |

## Warning Checks (Non-blocking)

| Check ID | Description | Applies To | How to Fix |
|----------|-------------|------------|------------|
| `thin-premortem` | < 3 failure scenarios | well-done | Add more pre-mortem scenarios with mitigations |
| `no-alternatives` | No rejected alternatives | well-done | Document at least one alternative in Trade-offs |
| `no-rollback` | Missing rollback plan | well-done | Add `### Rollback Steps` with numbered steps |
| `scope-creep` | Out-of-scope in implementation | both | Review implementation plan for scope alignment |

## Required Sections by Mode

### Well-Done Mode
- Dish
- Status
- Cooking Mode
- Ownership (with Decision Owner)
- Scope (with In/Out of Scope)
- Pre-mortem (3+ scenarios)
- Trade-offs (with rejected alternatives)
- Implementation Plan
- QA Plan (3+ test cases)
- Security Review

### Microwave Mode
- Dish
- Status
- Cooking Mode
- Problem Statement
- Fix Plan
- Why Safe
- Tests (1+)

## CLI Usage Examples

```bash
# Basic validation (auto-detect mode)
./scripts/cook-validate cook/feature.2026-01-10.cook.md

# Force microwave mode
./scripts/cook-validate cook/fix.cook.md --mode microwave

# Show all checks including passed
./scripts/cook-validate cook/feature.cook.md --verbose

# JSON output for CI integration
./scripts/cook-validate cook/feature.cook.md --json

# Skip specific checks
./scripts/cook-validate cook/feature.cook.md --skip no-alternatives --skip scope-creep
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Valid (no errors, may have warnings) |
| 1 | Invalid (has errors) |
| 2 | File not found or parse error |

## Integration with CI

```yaml
# Example GitHub Actions step
- name: Validate cook artifacts
  run: |
    for f in cook/*.cook.md; do
      ./scripts/cook-validate "$f" --json || exit 1
    done
```
