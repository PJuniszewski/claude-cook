---
description: Analyze and prepare prompts with JSON for safe context submission
arguments:
  - name: input
    description: File path, "-" for stdin, or inline JSON data
    required: true
  - name: --mode
    description: "analysis|summary|forensics (default: auto-detect)"
    required: false
  - name: --force
    description: Bypass blocks, emit warnings only
    required: false
  - name: --allow-sampling
    description: Permit sampling for forensic queries
    required: false
  - name: --no-reduce
    description: Skip lossless reduction phase
    required: false
  - name: --budget-tokens
    description: Token budget (default from env or 3500)
    required: false
  - name: --print-only
    description: Output report only, never auto-send
    required: false
  - name: --json
    description: Output result as JSON instead of report
    required: false
---

# Context Guard Command

You are executing the `/guard` command for epistemic safety analysis.

## CRITICAL: Always Execute the Script

**NEVER analyze or respond to the input data directly.** You MUST run the guard script via Bash tool to get proper token analysis, lossless reduction, and trimming decisions.

Even if the input looks like JSON data you could process manually - DO NOT. The script provides:
- Accurate token counting
- Lossless reduction (columnar, minify, dedup)
- Decision engine (ALLOW/SAMPLE/BLOCK)
- Intelligent sampling with context preservation
- Prompt injection pattern detection

## Instructions

1. **Determine input type:**
   - If input is a file path (e.g., `data.json`, `/path/to/file.json`) -> pass directly
   - If input is inline data (starts with `[` or `{`, or contains JSON) -> use heredoc to pass via stdin

2. **Build and execute the command:**

   **For file paths:**
   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/scripts/guard_cmd.py" "data.json" [options]
   ```

   **For inline data (MUST use heredoc):**
   ```bash
   python3 "${CLAUDE_PLUGIN_ROOT}/scripts/guard_cmd.py" - [options] <<'GUARD_INPUT'
   ${ARGUMENTS.input}
   GUARD_INPUT
   ```

3. **Add optional flags:**
   - `--mode ${ARGUMENTS.--mode}` if mode was specified
   - `--force` if force flag was specified
   - `--allow-sampling` if allow-sampling flag was specified
   - `--no-reduce` if no-reduce flag was specified
   - `--budget-tokens ${ARGUMENTS.--budget-tokens}` if budget was specified
   - `--print-only` if print-only flag was specified
   - `--json` if json flag was specified

4. **Run using Bash tool** with description: "Context Guard"

5. **Display the script output** to the user (the analysis report).

## Detecting Inline Data

Input is inline data if ANY of these are true:
- Starts with `[` or `{`
- Contains both `[` and `]` or both `{` and `}`
- Length > 255 characters
- Does not look like a file path (no `.json`, `.csv`, etc. extension for short inputs)

## Examples

```bash
# File path - pass directly
/guard data.json
/guard /path/to/logs.json --mode forensics

# Inline JSON - use stdin with heredoc
/guard '[{"id": 1}, {"id": 2}]'
/guard '{"users": [{"name": "Alice"}]}'
```
