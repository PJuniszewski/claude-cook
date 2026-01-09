# Comparison: /cook vs Prompt Spaghetti

## The Same Feature, Two Ways

### Feature: "Add user authentication with OAuth"

---

### Prompt Spaghetti Approach

```
User: Add OAuth login to my app

Claude: Sure! I'll add OAuth. Here's the code...
[writes auth.js, login.tsx, callback handler]

User: Wait, I wanted Google OAuth not GitHub

Claude: Oh, let me change that...
[rewrites everything]

User: Now the session isn't persisting

Claude: Let me add session storage...
[patches more code]

User: Actually we need to check if email is verified

Claude: Adding email verification...
[more patches]

User: This broke the existing login

Claude: Let me fix that...
[debugging session begins]

30 minutes later: partially working auth with
unknown edge cases and no tests
```

**Result:** Working-ish code, unclear scope, no documentation, unknown security status.

---

### /cook Approach

```
User: /cook Add user authentication with OAuth

Claude: Starting well-done cook...

[Phase 0] Scanning project policies...
- Found: CLAUDE.md requires JWT tokens
- Found: Must use existing user table

[Step 2] Product scope...
- In scope: Google OAuth, session management
- Out of scope: Social login (Facebook, Twitter)
- Non-goal: Replace existing password auth

[Step 3] UX flow...
- Login page → Google redirect → callback → dashboard
- Error states: denied permission, email mismatch

[Step 4] Architecture...
- Option A: NextAuth.js (selected - matches stack)
- Option B: Custom OAuth (rejected - reinventing wheel)
- Trade-off: vendor lock-in vs. development speed

[Step 5] Test plan...
- Happy path: successful login
- Edge case: user denies permission
- Edge case: email not verified
- Regression: existing password login still works

[Step 6] Security review...
- CSRF protection: required
- Token storage: httpOnly cookies
- Rate limiting: yes

Status: well-done - Ready for implementation
```

**Result:** Clear scope, documented decisions, test plan, security reviewed, ready to implement correctly the first time.

---

## Comparison Table

| Aspect | Prompt Spaghetti | /cook |
|--------|-----------------|-------|
| Time to first code | Immediate | After planning |
| Time to working feature | Variable (lots of iteration) | Predictable |
| Scope clarity | Unclear, evolves | Defined upfront |
| Alternatives considered | No | Yes, documented |
| Test coverage | Afterthought | Planned |
| Security review | Hope-based | Systematic |
| Documentation | Missing | Planned |
| Rework needed | High | Low |
| Knowledge captured | In chat history | In artifact |

---

## When Spaghetti is OK

Prompt spaghetti works fine for:

| Scenario | Why OK |
|----------|--------|
| **Spike/prototype** | Throwaway code, exploring feasibility |
| **Learning** | Understanding a concept, not shipping |
| **Tiny fix** | Single line change, obvious solution |
| **Script/automation** | Personal tooling, low stakes |
| **Proof of concept** | Demonstrating possibility, not production |

**Key question:** Will anyone besides you use this code?
- No → spaghetti might be fine
- Yes → consider `/cook`

---

## When /cook Wins

Use `/cook` for:

| Scenario | Why /cook |
|----------|-----------|
| **Production features** | Real users, real consequences |
| **Refactoring** | Changes with blast radius |
| **Security-sensitive** | Auth, payments, PII |
| **Team handoff** | Others need to understand decisions |
| **Complex logic** | Edge cases matter |
| **Public APIs** | Breaking changes affect consumers |

**Key question:** Will you regret not planning this?
- Probably → use `/cook`
- Definitely not → maybe skip it

---

## The Hidden Costs of Spaghetti

What prompt spaghetti actually costs:

```
Iteration 1: "Add the feature"           10 min
Iteration 2: "Wait, I meant..."          15 min
Iteration 3: "Now this broke"            20 min
Iteration 4: "Add tests"                 15 min
Iteration 5: "Security fix"              10 min
Iteration 6: "Document this"             10 min
                                         ------
Total:                                   80 min

/cook approach:
Planning:                                15 min
Implementation (correct first time):     25 min
                                         ------
Total:                                   40 min
```

The "fast" approach is often slower.

---

## Hybrid Approach

You can mix approaches:

1. **Spike with spaghetti** - explore the problem space
2. **Learn what you didn't know** - discover edge cases
3. **/cook the real implementation** - with knowledge from spike
4. **Delete the spike** - don't ship exploration code

This gives you:
- Fast exploration
- Proper implementation
- Documented decisions

---

## Decision Flowchart

```
Is this production code?
├── No → Spaghetti is fine
└── Yes →
    Will it touch auth/payments/PII?
    ├── Yes → Must use /cook --well-done
    └── No →
        Is it a bug fix or tiny change?
        ├── Yes → /cook --microwave
        └── No → /cook --well-done
```

---

## See Also

- [ANTI_PATTERNS.md](ANTI_PATTERNS.md) - What NOT to do with /cook
- [COOK_CONTRACT.md](COOK_CONTRACT.md) - What /cook produces
- [examples/quickstart/](examples/quickstart/) - Full /cook example
