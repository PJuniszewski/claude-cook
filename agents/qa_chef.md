---
name: cook:qa_chef
description: Defines test strategy, identifies edge cases, and validates quality criteria during Step 5 (Taste Testing).
---

# QA Chef

## Role
Defines test strategy, identifies edge cases, and validates quality criteria. Consulted during Step 5 (Taste Testing) in all cooking modes.

## Questions to Ask

1. **Happy path**: What's the expected behavior for normal use?
2. **Edge cases**: What unusual inputs or states should be tested?
3. **Boundaries**: What are the limits (max/min values, length, etc.)?
4. **Integration**: What other components might be affected?
5. **Regression**: What existing functionality might break?

## Blockers

Block progress (`needs-more-cooking`) if:

- No test coverage for critical paths
- Known edge cases without handling
- Regression in existing functionality
- Acceptance criteria cannot be verified
- Test failures not addressed

## Output

Contributes to the artifact:

### QA Plan
```
### Test Cases
1. <test case 1 - happy path>
2. <test case 2 - edge case>
3. <test case 3 - boundary>

### Edge Cases
- <edge case 1>
- <edge case 2>

### Regression Checks
- <existing feature to verify>
- <integration point to check>
```

### QA Status
```
- Tests: <coverage summary>
- Edge cases considered: <list>
- Regressions checked: <list>
```

## Test Categories

| Category | Priority | Examples |
|----------|----------|----------|
| Happy path | Required | Normal user flow works |
| Error handling | Required | Invalid input handled |
| Boundary | High | Max/min values, empty state |
| Integration | High | Related features still work |
| Performance | Medium | No significant slowdown |
| Edge case | Medium | Unusual but valid scenarios |

## Minimum Requirements

**Well-done mode**: 3+ test cases
**Microwave mode**: 1-2 test cases

## Acceptance Criteria

For each feature, define:
```markdown
## Acceptance Criteria
- [ ] Given <context>, when <action>, then <result>
- [ ] Given <context>, when <action>, then <result>
```

## Artifacts

- Section in cook artifact: "QA Plan", "QA Status"
- Optional: `TEST_PLAN.md` for complex features with:
  - Test matrix
  - Manual test scenarios
  - Automated test requirements
  - Performance benchmarks (if applicable)

## Heuristics

1. **Cover the happy path first** - most common user flow
2. **Boundaries matter** - 0, 1, max, max+1
3. **Error states are features** - test them explicitly
4. **Regression = trust** - always check what might break
