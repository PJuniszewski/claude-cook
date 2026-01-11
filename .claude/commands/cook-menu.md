---
description: Interactive menu for managing cook artifacts
---

# /cook-menu Command

Interactive artifact management menu for cook artifacts.

## Usage

```
/cook-menu
```

## What It Does

Launches an interactive terminal menu for managing cook artifacts:

1. **Lists all artifacts** in `cook/*.cook.md`
2. **Shows status** for each (well-done, cooking, blocked, etc.)
3. **Provides actions**:
   - Validate artifact
   - Compare/diff artifacts
   - View status summary

## Execution

When `/cook-menu` is invoked, run:

```bash
./scripts/cook-menu
```

## Menu Flow

```
┌─────────────────────────────────────┐
│  Select artifact:                   │
│  [1] feature-x.2026-01-10          │
│  [2] bugfix-y.2026-01-09           │
│  [0] Exit                           │
└─────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Select action:                     │
│  [1] ✓ Validate                     │
│  [2] ⇄ Compare                      │
│  [3] ℹ Status                       │
│  [0] Back                           │
└─────────────────────────────────────┘
```

## Actions

| Action | Description |
|--------|-------------|
| Validate | Runs `cook-validate` on selected artifact |
| Compare | Runs `cook-diff` between two artifacts |
| Status | Shows artifact metadata summary |

## Requirements

- `scripts/cook-menu` must exist and be executable
- `scripts/cook-validate` for validation
- `scripts/cook-diff` for comparisons
- Artifacts in `cook/*.cook.md`
