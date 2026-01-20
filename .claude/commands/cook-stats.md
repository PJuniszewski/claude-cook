---
description: Analytics and insights for cook artifacts. View stats, search, find similar.
argument-hint: [search <query> | similar <files> | timeline] [--since DATE] [--json]
allowed-tools: Bash, Read, Glob
---

# /cook-stats Command Specification

## Purpose

`/cook-stats` provides analytics and insights about your cook artifacts.

It helps you:
- Track cooking velocity and completion rates
- Identify frequently touched files (hot spots)
- Find similar past artifacts for pattern reuse
- Understand blocker patterns

## Syntax

```
/cook-stats                           Show overall statistics
/cook-stats --since 2026-01-01        Filter by date range
/cook-stats search <query>            Search artifacts by keyword
/cook-stats similar <file1> <file2>   Find artifacts touching similar files
/cook-stats timeline                  Show recent activity
```

## Options

| Option | Description |
|--------|-------------|
| `--since DATE` | Only include artifacts from this date (YYYY-MM-DD) |
| `--until DATE` | Only include artifacts until this date |
| `--json` | Output as JSON format |
| `--rebuild` | Force rebuild the index |
| `--verbose` | Show detailed output |
| `--limit N` | Limit results (default: 10) |

## Commands

### stats (default)

Show overall statistics for all cook artifacts.

```
/cook-stats
/cook-stats --since 2026-01-01
```

**Output includes:**
- Total cooks (well-done vs microwave breakdown)
- Status breakdown (well-done, cooking, blocked, etc.)
- Completion rate and block rate
- Most common blockers by chef
- Hot files (most frequently touched)
- Pre-mortem statistics

### search

Search artifacts by keyword.

```
/cook-stats search "authentication"
/cook-stats search "api" --limit 5
```

Searches:
- Artifact titles
- Slugs
- Files touched
- Decisions made

### similar

Find artifacts that touched similar files.

```
/cook-stats similar src/auth.ts src/login.ts
```

Use this to:
- Find related past work
- Reuse patterns from similar features
- Recall decisions made for related changes

### timeline

Show recent activity across all artifacts.

```
/cook-stats timeline
/cook-stats timeline --limit 30
```

Shows:
- Artifact creation dates
- Key decisions made

## Example Output

```
/cook-stats

📊 Cook Analytics (all time)
────────────────────────────────────────
Total cooks: 12
  • 8 well-done, 4 microwave

Status breakdown:
  ✅ well-done: 6
  🚀 ready-for-merge: 2
  🔥 cooking: 1
  🚫 blocked: 2
  ⏪ needs-more-cooking: 1

Completion rate: 67%
Block rate: 25%

Most common blockers:
  • security_chef: 3
  • qa_chef: 2

Hot files:
  • src/auth/* (5 cooks)
  • api/routes.ts (4 cooks)
  • lib/utils.ts (3 cooks)

Pre-mortem scenarios: 28 total (avg 2.3/artifact)
```

## Integration with /cook

When starting a new cook, the similar dish detection uses this index:

```
/cook Add user session timeout

🔍 Similar artifacts found:
  • user-auth.2026-01-05.cook.md (78% similar)
    Touched: src/auth/*, src/session.ts
    Decision: Used JWT with 1-hour expiry

  • session-refresh.2026-01-12.cook.md (65% similar)
    Touched: src/session.ts, lib/token.ts
```

## Data Storage

- **Index location**: `.claude/data/cook-index.json`
- **Artifact source**: `cook/*.cook.md`

The index is automatically rebuilt when:
- Any artifact file is newer than the index
- `--rebuild` flag is used
- Index file is missing

## Execution

When `/cook-stats` is invoked:

1. Load or rebuild the artifact index
2. Apply any date filters
3. Calculate statistics
4. Format and display output

For programmatic use, add `--json` for machine-readable output.
