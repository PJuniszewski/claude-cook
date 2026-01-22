---
name: cook-menu
description: "Interactive menu for managing cook artifacts"
user-invocable: true
---

# cook-menu Skill

Interactive menu for managing cook artifacts using native Claude Code UI.

## Execution Flow

When `/cook-menu` is invoked, follow this flow:

### Step 1: Scan Artifacts

Run this command to get artifact list with metadata:

```bash
for f in cook/*.cook.md; do
  if [ -f "$f" ]; then
    name=$(basename "$f" .cook.md)
    status=$(grep -m1 "^## Status" -A1 "$f" | tail -1 | tr -d '[:space:]')
    mode=$(grep -m1 "^## Cooking Mode" -A1 "$f" | tail -1 | tr -d '[:space:]')
    echo "$name|$status|$mode"
  fi
done
```

### Step 2: Select Artifact

Use `AskUserQuestion` tool to present artifacts:

```
Question: "Which artifact do you want to manage?"
Header: "Artifact"
Options: [list of artifacts with status as description]
```

If user selects "Exit" or cancels, end the skill.

### Step 3: Select Action

Use `AskUserQuestion` tool to present actions:

```
Question: "What do you want to do with <artifact-name>?"
Header: "Action"
Options:
  - "Validate" - "Run validation checks on this artifact"
  - "Compare" - "Diff with another artifact"
  - "Status" - "View artifact metadata summary"
  - "Back" - "Return to artifact selection"
```

### Step 4: Execute Action

Based on selection:

**Validate:**
```bash
./scripts/cook-validate "cook/<artifact>.cook.md" --verbose
```

**Compare:**
1. Use AskUserQuestion to select second artifact
2. Run: `./scripts/cook-diff "cook/<artifact1>.cook.md" "cook/<artifact2>.cook.md"`

**Status:**
```bash
./scripts/cook-validate "cook/<artifact>.cook.md" --quiet
```
Then display: filename, status, mode, owner, date, section count.

**Back:**
Return to Step 2.

### Step 5: Loop

After action completes, return to Step 3 (action selection) for same artifact.
User can select "Back" to return to artifact selection.

## Example Flow

```
/cook-menu
  │
  ▼
[AskUserQuestion: Select artifact]
  - dry-run-validation.2026-01-10 (well-done)
  - artifact-versioning.2026-01-10 (ready-for-merge)
  │
  ▼ user selects "dry-run-validation"
  │
[AskUserQuestion: Select action]
  - Validate
  - Compare
  - Status
  - Back
  │
  ▼ user selects "Validate"
  │
[Runs cook-validate, shows results]
  │
  ▼
[AskUserQuestion: Select action] (loop)
```

## Requirements

- Artifacts in `cook/*.cook.md`
- `scripts/cook-validate` for validation
- `scripts/cook-diff` for comparisons
