# Artifact Skeleton Template

Use this template to create the initial artifact file at the START of cooking.

## Template

```markdown
# Cooking Result

## Dish
{{FEATURE_DESCRIPTION}}

## Status
raw

## Cooking Mode
{{MODE}}

## Current Phase
Step 0.0 - Artifact Created

---

## Phase 0 - Project Policy & Context
_Pending..._

## Step 1 - Read the Order
_Pending..._

## Step 2 - Ingredient Approval
_Pending..._

## Step 3 - Presentation Planning
_Pending..._

## Step 4 - Implementation Plan
_Pending..._

## Step 5 - QA Review
_Pending..._

## Step 6 - Security Review
_Pending..._

## Step 7 - Documentation
_Pending..._

---

## Decision Log
| Date | Phase | Decision | Rationale |
|------|-------|----------|-----------|
| {{TODAY}} | Step 0.0 | Artifact created | Starting cook flow |
```

## Usage

1. Replace `{{FEATURE_DESCRIPTION}}` with the feature being cooked
2. Replace `{{MODE}}` with `well-done` or `microwave`
3. Replace `{{TODAY}}` with current date (YYYY-MM-DD format)
4. Save as `cook/<slug>.<YYYY-MM-DD>.cook.md`

## Filename Convention

- `<slug>` = kebab-case of feature (max 40 chars)
- Examples:
  - `cook/add-user-authentication.2026-01-14.cook.md`
  - `cook/fix-null-pointer-payment.2026-01-14.cook.md`
  - `cook/refactor-api-endpoints.2026-01-14.cook.md`

## Phase Updates

As each phase completes, replace `_Pending..._` with actual content:

```markdown
## Phase 0 - Project Policy & Context

### Sources scanned
- CLAUDE.md - found
- POLICY.md - not found
...

### Hard rules (must not be violated)
- No direct database access from controllers
...
```

## Status Progression

Update `## Current Phase` and `## Status` as cooking progresses:

| After Phase | Current Phase Value | Status Value |
|-------------|---------------------|--------------|
| Step 0.0 | Artifact Created | raw |
| Phase 0 | Phase 0 - Complete | cooking |
| Step 1 | Step 1 - Complete | cooking |
| Step 2 | Step 2 - Complete | cooking |
| Step 3 | Step 3 - Complete | cooking |
| Step 4 | Step 4 - Complete | cooking |
| Step 5 | Step 5 - Complete | cooking |
| Step 6 | Step 6 - Complete | cooking |
| Step 7 | Cooking Complete | well-done |
