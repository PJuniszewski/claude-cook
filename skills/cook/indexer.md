---
name: indexer
description: Scans and indexes cook artifacts for analytics and similarity matching
user-invocable: false
---

# Indexer Skill

## Purpose

The indexer skill scans `cook/*.cook.md` files and builds a searchable index with extracted metadata. This powers the analytics, search, and similarity features.

## Metadata Extracted

For each artifact, the indexer extracts:

| Field | Source | Description |
|-------|--------|-------------|
| `slug` | Filename | Feature identifier (e.g., `user-auth`) |
| `date` | Filename | Creation date (YYYY-MM-DD) |
| `status` | `## Status` | Current artifact status |
| `mode` | `## Cooking Mode` | well-done or microwave |
| `title` | `## Dish` | Feature description |
| `owner` | `Decision Owner:` | Assigned owner |
| `filesTouched` | Implementation Plan | Files referenced in the plan |
| `riskLevel` | Security Review | Extracted risk level |
| `blockers` | Status + Decision Log | Any blocking issues |
| `premortem` | Pre-mortem section | Risk scenarios and mitigations |
| `decisions` | Decision Log | Key decisions made |

## Index Structure

```json
{
  "version": "1.0.0",
  "generatedAt": "2026-01-20T10:00:00Z",
  "cookDir": "/path/to/cook",
  "artifacts": [
    {
      "path": "/path/to/cook/feature.2026-01-10.cook.md",
      "filename": "feature.2026-01-10.cook.md",
      "slug": "feature",
      "date": "2026-01-10",
      "status": "well-done",
      "mode": "well-done",
      "title": "Feature description",
      "owner": "@developer",
      "filesTouched": ["src/file.ts"],
      "riskLevel": "low",
      "blockers": [],
      "premortem": [...],
      "decisions": [...],
      "indexedAt": "2026-01-20T10:00:00Z"
    }
  ],
  "errors": [],
  "stats": {
    "total": 4,
    "byStatus": { "well-done": 3, "cooking": 1 },
    "byMode": { "well-done": 3, "microwave": 1 },
    "byRisk": { "low": 2, "medium": 2 }
  }
}
```

## Storage Location

- **Index file**: `.claude/data/cook-index.json`
- **Auto-rebuilt** when any artifact is newer than the index

## Usage

The indexer is used internally by:

- `/cook-stats` - For analytics calculations
- `/cook` (planned) - For similar dish detection during new cooks

### Programmatic Usage

```javascript
const { buildIndex, saveIndex, loadIndex } = require('./lib/indexer');

// Build fresh index
const index = buildIndex('./cook');
saveIndex(index, '.claude/data/cook-index.json');

// Load existing index
const existing = loadIndex('.claude/data/cook-index.json');
```

## File Detection Patterns

The indexer extracts file paths from these patterns in the Implementation Plan section:

- Backtick paths: `` `src/file.ts` ``
- Bullet list paths: `- src/file.ts`
- Table rows: `| src/file.ts |`

## Error Handling

- Invalid artifacts are skipped with errors recorded in `index.errors`
- Missing sections are handled gracefully (fields set to empty/unknown)
- Date parsing failures default to null

## Performance

- Index is cached and only rebuilt when stale
- Staleness check compares artifact file mtimes to index generation time
- Force rebuild available via `--rebuild` flag
