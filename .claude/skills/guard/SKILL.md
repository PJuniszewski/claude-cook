---
name: guard
description: "Analyze and prepare prompts with JSON for safe context submission"
user-invocable: true
---

# Context Guard Skill

Epistemic safety analysis for JSON data in prompts. Prevents LLMs from reasoning with unjustified certainty when input data is incomplete.

## Features

- **Lossless reduction** - Minify, columnar transform, remove nulls
- **Token counting** - API or heuristic fallback
- **Decision engine** - ALLOW / SAMPLE / BLOCK
- **Intelligent trimming** - First + last + evenly-spaced sampling
- **Forensic detection** - Warns when specific record queries detected

## Usage

When `/guard` is invoked, execute the guard script:

### For file paths:
```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/guard_cmd.py" "<file_path>" [options]
```

### For inline JSON data:
```bash
python3 "${CLAUDE_PLUGIN_ROOT}/scripts/guard_cmd.py" - [options] <<'GUARD_INPUT'
<json_data>
GUARD_INPUT
```

## Options

| Option | Description |
|--------|-------------|
| `--mode` | analysis\|summary\|forensics (default: auto-detect) |
| `--force` | Bypass blocks, emit warnings only |
| `--allow-sampling` | Permit sampling for forensic queries |
| `--no-reduce` | Skip lossless reduction phase |
| `--budget-tokens N` | Token budget (default: 3500) |
| `--print-only` | Output report only, never auto-send |
| `--json` | Output result as JSON |

## Semantic Modes

| Mode | Sampling | Use Case |
|------|----------|----------|
| `analysis` | Allowed | "What categories exist?", "Price range?" |
| `summary` | Aggressive | "Describe the data structure" |
| `forensics` | **BLOCKED** | "Why did request id=X fail?" |

## Output

```
============================================================
CONTEXT GUARD ANALYSIS
============================================================

Decision: [OK] ALLOW | [~] SAMPLE | [X] BLOCK
Mode: analysis | summary | forensics

TOKEN ANALYSIS:
  Original:     5,234 tokens
  After reduce: 4,891 tokens (-343)
  Budget:       3,500 tokens
============================================================
```

## Requirements

- Python 3.8+
- `ANTHROPIC_API_KEY` environment variable (for token counting)
