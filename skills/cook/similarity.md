---
name: similarity
description: Finds similar past artifacts to enable pattern reuse and decision recall
user-invocable: false
---

# Similarity Skill (Recipe Library)

## Purpose

The similarity skill finds similar past cook artifacts during `/cook` to enable:
- **Pattern reuse**: Don't reinvent the wheel for similar features
- **Decision recall**: Remember why past choices were made
- **Consistency**: Align with similar past features

## When Active

This skill runs automatically during Step 1.5 of `/cook` (after "Read the Order").

## Similarity Calculation

Similarity is calculated using weighted signals:

| Signal | Weight | Description |
|--------|--------|-------------|
| Files touched | 50% | Jaccard similarity on file paths |
| Title keywords | 30% | Common significant words in titles |
| Feature keywords | 20% | Keywords from feature description |

### Jaccard Similarity

```
similarity = |intersection| / |union|
```

For file-based matching:
- `src/auth.ts` and `src/auth/login.ts` are considered related
- Paths are normalized to lowercase for comparison

### Keyword Extraction

Keywords are extracted by:
1. Split on word boundaries
2. Filter words >= 4 characters
3. Remove common words (with, from, that, this, have, been, will, should, could, would)

## Output Format

When similar artifacts are found (>20% similarity):

```
🔍 Similar dishes found in your kitchen:
┌──────────────────────────────────────────────────────────────┐
│ 1. user-auth.2026-01-05.cook.md (78% similar)                │
│    "Add user authentication with OAuth"                       │
│    Files: src/auth/*, src/session.ts                          │
│    Key decision: Used JWT with 1h expiry                      │
└──────────────────────────────────────────────────────────────┘
💡 Consider reusing patterns from these artifacts.
```

## Key Decision Extraction

The "Key decision" shown is extracted from the artifact's Decision Log:
1. Prefer decisions containing: "selected", "chose", "use", "decided", "approved"
2. Skip trivial entries like "Artifact created" or "complete"
3. Truncate to 60 characters

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `limit` | 3 | Maximum similar artifacts to show |
| `minSimilarity` | 20 | Minimum similarity % to include |

## API Usage

```javascript
const { findSimilarArtifacts, formatSimilarArtifacts } = require('./lib/similarity');

// Find similar artifacts
const results = findSimilarArtifacts({
  description: 'Add user session timeout',
  files: ['src/session.ts', 'src/auth.ts'],
  exclude: 'current-artifact-slug',
  limit: 3,
  minSimilarity: 20
});

// Format for display
const output = formatSimilarArtifacts(results);
console.log(output);
```

## Shortcut Function

```javascript
const { getSimilarDishesDisplay } = require('./lib/similarity');

// One-liner for SKILL.md integration
const display = getSimilarDishesDisplay(
  'Add user session timeout',  // feature description
  ['src/session.ts'],           // files to touch (optional)
  'session-timeout'             // current slug to exclude
);

if (display) {
  console.log(display);
}
```

## Dependencies

- `scripts/lib/indexer.js` - Artifact indexing
- `.claude/data/cook-index.json` - Cached index

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Empty cook/ directory | Skip silently, no output |
| No matches >20% | Skip silently, no output |
| Index missing | Auto-rebuild from cook/*.cook.md |
| Index stale | Auto-rebuild if any artifact newer than index |
| Single artifact exists | Show if similarity >20%, otherwise skip |

## Performance

- Index is cached at `.claude/data/cook-index.json`
- Auto-rebuilds only when stale (artifact files newer than index)
- Typical execution: <100ms for small repos

## Integration with /cook

The similarity check is integrated into SKILL.md as "Step 1.5":

```
Step 0    → Create artifact
Phase 0   → Policy scan
Step 1    → Read the Order
Step 1.5  → Recipe Library (Similar Dishes) ← HERE
Step 2    → Product Review
...
```

This step is:
- **Informational only** - does not write to artifact
- **Non-blocking** - proceeds even if no matches
- **Automatic** - runs without user action
