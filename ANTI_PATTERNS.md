# Anti-Patterns: What /cook is NOT

This document clarifies common misconceptions and misuses of the `/cook` command.

## /cook is NOT for "generate entire app"

**Wrong:**
```
/cook Build me a complete e-commerce platform with payments, auth, and admin panel
```

**Right:**
```
/cook Add product search with filters to the existing catalog page
```

`/cook` is for **features**, not **projects**. If your request would take a team weeks, break it down first.

---

## /cook does NOT replace design review

`/cook` includes UX Chef review, but it's not a substitute for:
- User research
- Proper design mockups
- Stakeholder alignment
- Accessibility audits

UX Chef catches obvious issues. It doesn't replace your design process.

---

## /cook does NOT excuse you from tests

The QA phase defines test requirements. **You still have to write and run them.**

`/cook` produces a test plan, not test code. If you skip implementation, the plan is worthless.

---

## /cook is NOT for work without definition of done

If you can't answer "how do we know this is finished?", you're not ready to `/cook`.

**Bad input:**
```
/cook Make the app faster
```

**Good input:**
```
/cook Reduce dashboard load time from 3s to under 1s by implementing query pagination
```

Vague requests produce vague results.

---

## /cook should NOT produce 30-page documents

If your cook artifact exceeds 2-3 pages, something went wrong:

- Scope too large → break it down
- Over-documenting → focus on decisions, not prose
- Wrong mode → maybe you need `--microwave`

Cook artifacts are **decision records**, not novels.

---

## /cook is NOT a rubber stamp

`/cook` will reject features that:
- Have no measurable value
- Exceed project scope
- Introduce security risks
- Can't be tested

This is the system working correctly. A killed feature saves wasted effort.

---

## When /cook slows you down

If `/cook` feels like overhead, ask yourself:

| Situation | Solution |
|-----------|----------|
| Fixing a typo | Don't use `/cook` |
| Small bug fix | Use `--microwave` |
| Quick refactor | Use `--microwave` |
| Security-related change | Accept `--well-done` is necessary |
| New feature | Accept `--well-done` is necessary |

**Rule of thumb:** If it takes longer to `/cook` than to code, you might not need it.

---

## The "I'll add tests later" trap

```
/cook Add feature X --microwave
# Ship without tests
# "I'll add tests in the next sprint"
# Tests never happen
# Bug in production
```

`--microwave` is for **low-risk** changes. If you're skipping tests because you're lazy, not because the risk is low, you're doing it wrong.

---

## Summary

| Anti-pattern | Why it's wrong |
|--------------|----------------|
| "Generate entire app" | /cook is for features, not projects |
| Skip design review | UX Chef is a check, not a replacement |
| Skip tests | QA plan requires implementation |
| No definition of done | Vague input = vague output |
| 30-page artifacts | You're over-engineering |
| Force everything through | Some changes don't need /cook |
| "Tests later" with --microwave | Microwave is for low-risk, not lazy |

---

## See Also

- [COOK_CONTRACT.md](COOK_CONTRACT.md) - What a complete cook artifact contains
- [CHEF_MATRIX.md](CHEF_MATRIX.md) - Who reviews what
- [COMPARISON.md](COMPARISON.md) - When to use /cook vs. not
