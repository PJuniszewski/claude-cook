---
description: Kitchen assistant. Monitor uncooked changes → Detect drift → Post-mortem analysis.
argument-hint: [monitor | drift <artifact> | postmortem <artifact> | suggest]
allowed-tools: Bash, Read, Glob
---

# /sous-chef Command

Kitchen assistant that monitors cooking discipline and detects issues.

## Syntax

```
/sous-chef                    Run change monitor (default)
/sous-chef monitor            Detect uncooked sensitive changes
/sous-chef drift <artifact>   Compare plan vs implementation
/sous-chef postmortem <artifact>   Analyze pre-mortem accuracy
/sous-chef suggest            Suggest files needing governance
```

## Options

| Option | Description |
|--------|-------------|
| `--since <ref>` | Git ref to start from (default: HEAD~10) |
| `--range <range>` | Git range for drift detection |
| `--incidents <list>` | Known incidents for postmortem |

## Execution

### Monitor (default)

Run change monitor to find uncooked sensitive changes:

```bash
./scripts/sous-chef monitor
```

**After running**, analyze the output:
- If uncooked changes found, ask user: "Found X commits with uncooked changes. Want me to `/cook` them?"
- If clean, report: "Kitchen is clean - no uncooked sensitive changes."

### Drift Detection

When user specifies an artifact:

```bash
./scripts/sous-chef drift "cook/<artifact>.cook.md"
```

**After running**, analyze:
- If drift detected, list scope creep and missing files
- Offer: "Want me to update the artifact with actual changes?"

### Postmortem

Analyze pre-mortem predictions:

```bash
./scripts/sous-chef postmortem "cook/<artifact>.cook.md"
```

**After running**, summarize:
- Which predictions came true
- Which were false positives
- Suggestions for future risk assessment

### Suggest

Find files that need more governance:

```bash
./scripts/sous-chef suggest
```

**After running**, offer to create cook artifacts for suggested files.

## Interactive Flow

After each command, offer relevant follow-up actions:

**Monitor found issues:**
```
Found 2 commits with uncooked sensitive changes:
  - abc1234: src/auth/login.ts
  - def5678: api/payments.ts

Options:
1. /cook the auth changes
2. /cook the payment changes
3. Ignore (add to exceptions)
```

**Drift detected:**
```
Artifact: feature-auth
Drift: 2 unplanned files, 1 missing

Options:
1. Update artifact with actual scope
2. Revert unplanned changes
3. Create new artifact for scope creep
```

## Examples

```
/sous-chef
> Scanning last 10 commits for uncooked changes...
> Kitchen is clean!

/sous-chef drift sous-chef
> Comparing sous-chef.2026-01-20.cook.md with implementation...
> No drift detected - implementation matches plan.

/sous-chef postmortem recipe-library
> Analyzing pre-mortem predictions for recipe-library...
> 2/3 predicted risks were addressed, 1 was false positive.
```
