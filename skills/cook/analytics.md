---
name: analytics
description: Calculates statistics and insights from indexed cook artifacts
user-invocable: false
---

# Analytics Skill

## Purpose

The analytics skill calculates statistics and generates insights from the artifact index. It powers the `/cook-stats` command.

## Statistics Calculated

### Basic Counts

| Metric | Description |
|--------|-------------|
| Total cooks | Number of artifacts in the index |
| By status | Breakdown by status (well-done, cooking, blocked, etc.) |
| By mode | Breakdown by cooking mode (well-done vs microwave) |
| By risk | Breakdown by risk level (low, medium, high) |

### Derived Metrics

| Metric | Formula |
|--------|---------|
| Completion rate | (well-done + ready-for-merge + plated) / total |
| Block rate | (blocked + needs-more-cooking) / total |
| Avg pre-mortems | Total pre-mortem scenarios / total artifacts |
| Avg decisions | Total decisions / total artifacts |

### Aggregations

| Aggregation | Description |
|-------------|-------------|
| Hot files | Files most frequently touched across artifacts |
| Chef blockers | Count of blocks by each chef type |
| Recent blockers | Most recent 5 blocker reasons |

## Date Filtering

All calculations support date filtering:

```javascript
calculateStats(index, {
  since: '2026-01-01',  // Include from this date
  until: '2026-01-31'   // Include until this date
});
```

## Similarity Matching

Find artifacts that touched similar files using Jaccard similarity:

```javascript
findSimilarByFiles(index, ['src/auth.ts', 'src/login.ts'], {
  limit: 5,
  exclude: ['current-artifact']
});
```

Returns:
```javascript
[
  {
    artifact: { ... },
    similarity: 78,  // percentage
    matchingFiles: ['src/auth.ts']
  }
]
```

## Search

Keyword search across artifact metadata:

```javascript
searchArtifacts(index, 'authentication', { limit: 10 });
```

Search fields and weights:
- Title: 10 points
- Slug: 5 points
- Decisions: 3 points
- Files touched: 2 points

## Timeline

Chronological view of artifact activity:

```javascript
getTimeline(index, { limit: 20 });
```

Returns events for:
- Artifact creation
- Key decisions made

## Console Formatting

The analytics module includes formatting for console output:

```javascript
const stats = calculateStats(index);
console.log(formatStatsConsole(stats));
```

Output:
```
📊 Cook Analytics (last 30 days)
────────────────────────────────────────
Total cooks: 12
  • 8 well-done, 4 microwave

Status breakdown:
  ✅ well-done: 6
  🚀 ready-for-merge: 2
  🔥 cooking: 1
...
```

## Status Icons

| Status | Icon |
|--------|------|
| well-done | ✅ |
| ready-for-merge | 🚀 |
| plated | 🍽️ |
| cooking | 🔥 |
| raw | 🥩 |
| blocked | 🚫 |
| needs-more-cooking | ⏪ |
| unknown | ❓ |

## Usage in Other Skills

The analytics module can be used by other skills:

```javascript
const { calculateStats, findSimilarByFiles } = require('./lib/analytics');
const { buildIndex } = require('./lib/indexer');

// During /cook, find similar artifacts
const index = buildIndex('./cook');
const similar = findSimilarByFiles(index, filesTouched);

if (similar.length > 0) {
  console.log('Similar artifacts found:');
  for (const match of similar) {
    console.log(`  - ${match.artifact.slug} (${match.similarity}% similar)`);
  }
}
```

## JSON Output

All functions return structured data suitable for JSON serialization:

```javascript
const stats = calculateStats(index);
console.log(JSON.stringify(stats, null, 2));
```

This enables integration with external tools and dashboards.
