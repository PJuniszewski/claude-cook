#!/usr/bin/env python3
"""
Context Guard Hook for Claude Code.

This is a fast, lightweight safety net that:
- Detects large payloads and warns the user
- Detects forensic patterns and suggests /guard
- Blocks context flooding attacks (massive payloads)
- Blocks large inline data for /guard command (suggests file instead)
- Has NO API calls, NO heavy computation

For full analysis and trimming, use the /guard command.

Environment Variables:
- TOKEN_GUARD_MIN_CHARS: Below this, always allow (default: 6000)
- TOKEN_GUARD_WARN_CHARS: Above this, warn (default: 15000)
- TOKEN_GUARD_HARD_LIMIT_CHARS: Above this, block (default: 100000)
- TOKEN_GUARD_FAIL_CLOSED: Block on forensic+large (default: false)
- TOKEN_GUARD_MODE: off or warn (default: warn)
"""
from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime
from typing import Any

# Configuration defaults
DEFAULT_MIN_CHARS = 6000
DEFAULT_WARN_CHARS = 15000
DEFAULT_HARD_LIMIT_CHARS = 100000
DEFAULT_MODE = "warn"  # off or warn
DEFAULT_FAIL_CLOSED = False

# Inline data limits for /guard command
GUARD_INLINE_WARN_CHARS = 20000  # Warn above 20KB inline data
GUARD_INLINE_BLOCK_CHARS = 50000  # Block above 50KB inline data

# Escape hatch markers
MARKER_OFF = "#guard:off"
MARKER_FORCE = "#guard:force"

# Semantic mode markers
MARKER_MODE_ANALYSIS = "#guard:mode=analysis"
MARKER_MODE_SUMMARY = "#guard:mode=summary"
MARKER_MODE_FORENSICS = "#guard:mode=forensics"

# Forensic tripwire patterns (same as full version for consistency)
FORENSIC_PATTERNS = [
    r"request\s+id[=:]\s*\S+",
    r"user\s+id[=:]\s*\S+",
    r"order\s+id[=:]\s*\S+",
    r"transaction\s+id[=:]\s*\S+",
    r"\b(id|request_id|user_id|order_id)\b\s*[=:]\s*['\"]?\w{6,}['\"]?",
    r"\b(order|transaction|request)\s+[\w-]{4,}",
    r"why\s+did\s+.+\s+fail",
    r"\b(what|why)\s+(went\s+wrong|failed|broke)\b",
    r"what\s+happened\s+to\s+\S+",
    r"\b(this|that)\s+(request|order|transaction|record)\b",
    r"find\s+.+\s+with\s+id",
    r"show\s+me\s+.+\s+for\s+id",
    r"specific\s+\w+\s+id",
    r"\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b",
]

# JSON markers for quick detection
JSON_MARKERS = ["{", "[", "```json", "### PAYLOAD"]


def debug_log(msg: str) -> None:
    """Write debug message to file for diagnostics."""
    try:
        with open("/tmp/trimmer_debug.log", "a") as f:
            f.write(f"{datetime.now().isoformat()} - {msg}\n")
    except Exception:
        pass


def get_config() -> dict[str, Any]:
    """Load configuration from environment variables."""
    fail_closed = os.environ.get("TOKEN_GUARD_FAIL_CLOSED", str(DEFAULT_FAIL_CLOSED))
    return {
        "min_chars": int(os.environ.get("TOKEN_GUARD_MIN_CHARS", DEFAULT_MIN_CHARS)),
        "warn_chars": int(os.environ.get("TOKEN_GUARD_WARN_CHARS", DEFAULT_WARN_CHARS)),
        "hard_limit_chars": int(os.environ.get("TOKEN_GUARD_HARD_LIMIT_CHARS", DEFAULT_HARD_LIMIT_CHARS)),
        "mode": os.environ.get("TOKEN_GUARD_MODE", DEFAULT_MODE).lower(),
        "fail_closed": fail_closed.lower() in ("true", "1", "yes"),
    }


def has_json_markers(text: str) -> bool:
    """Quick check if text likely contains JSON."""
    return any(marker in text for marker in JSON_MARKERS)


def estimate_tokens(chars: int) -> int:
    """Estimate tokens from character count (chars/4)."""
    return chars // 4


def detect_forensic_tripwire(prompt: str) -> tuple[bool, list[str]]:
    """Detect forensic-style queries in prompt."""
    hits = []
    for pattern in FORENSIC_PATTERNS:
        match = re.search(pattern, prompt, re.IGNORECASE)
        if match:
            hits.append(match.group(0))
    return bool(hits), hits


def detect_guard_inline_data(prompt: str) -> tuple[bool, int]:
    """
    Detect if prompt is /guard command with large inline JSON data.

    Returns (is_guard_inline, inline_data_size).
    """
    # Check for /guard command pattern
    guard_patterns = [
        r"^/guard\s+",
        r"^/context-guard:guard\s+",
        r"/guard\s+\[",
        r"/guard\s+\{",
    ]

    is_guard = any(re.search(p, prompt, re.IGNORECASE | re.MULTILINE) for p in guard_patterns)
    if not is_guard:
        return False, 0

    # Check if input looks like inline data (not a file path)
    # Find first [ or { after /guard
    match = re.search(r"/(?:context-guard:)?guard\s+(.+)", prompt, re.DOTALL | re.IGNORECASE)
    if not match:
        return False, 0

    args = match.group(1).strip()

    # If args start with [ or { it's inline data
    if args.startswith("[") or args.startswith("{"):
        return True, len(args)

    # If args look like a file path, it's not inline
    if re.match(r"^[/~.]?\w", args) and not args.startswith("{") and not args.startswith("["):
        # Likely a file path like "data.json" or "/path/to/file"
        if len(args) < 500:  # File paths are short
            return False, 0

    return False, 0


def out(obj: dict, exit_code: int = 0) -> None:
    """Write JSON response to stdout and exit."""
    sys.stdout.write(json.dumps(obj, separators=(",", ":")))
    sys.stdout.flush()
    sys.exit(exit_code)


def allow() -> None:
    """Return allow decision."""
    out({
        "hookSpecificOutput": {"hookEventName": "UserPromptSubmit"},
        "suppressOutput": True,
    })


def block(reason: str) -> None:
    """Block the prompt with exit code 2."""
    debug_log(f"Blocking: {reason[:100]}")
    print(reason, file=sys.stderr)
    sys.exit(2)


def warn(reason: str) -> None:
    """Warn but allow the prompt."""
    print(f"[context-guard] WARNING: {reason}", file=sys.stderr)
    out({
        "hookSpecificOutput": {"hookEventName": "UserPromptSubmit"},
        "suppressOutput": True,
    })


def warn_with_hint(msg: str, hint: str = "Use /guard for full analysis") -> None:
    """Warn with a hint to use /guard."""
    print(f"[context-guard] WARNING: {msg}", file=sys.stderr)
    print(f"[context-guard] HINT: {hint}", file=sys.stderr)
    out({
        "hookSpecificOutput": {"hookEventName": "UserPromptSubmit"},
        "suppressOutput": True,
    })


def run_hook(hook_input: dict[str, Any]) -> None:
    """
    Lightweight hook logic.

    Decision flow:
    1. #guard:off or #guard:force? -> ALLOW
    2. chars < MIN_CHARS? -> ALLOW
    3. chars > HARD_LIMIT? -> BLOCK (context flooding)
    4. No JSON markers? -> ALLOW
    5. Forensic + large + fail_closed? -> BLOCK
    6. Forensic + large? -> WARN + strong hint
    7. Large only? -> WARN + hint
    8. ALLOW
    """
    config = get_config()
    debug_log(f"Hook started, mode={config['mode']}")

    # Mode check
    if config["mode"] == "off":
        allow()

    # Extract prompt from Claude Code's format
    prompts = hook_input.get("prompts", [])
    if prompts:
        prompt = "\n".join(p.get("content", "") for p in prompts if p.get("content"))
    else:
        prompt = hook_input.get("prompt", "")

    if not prompt:
        allow()

    # Escape hatches
    if MARKER_OFF in prompt:
        debug_log("Marker off found")
        allow()

    force_mode = MARKER_FORCE in prompt
    if force_mode:
        debug_log("Force mode")
        allow()

    # Explicit mode markers unlock
    has_explicit_mode = (
        MARKER_MODE_ANALYSIS in prompt or
        MARKER_MODE_SUMMARY in prompt or
        MARKER_MODE_FORENSICS in prompt
    )

    # Check for /guard with large inline data
    is_guard_inline, inline_size = detect_guard_inline_data(prompt)
    if is_guard_inline:
        if inline_size > GUARD_INLINE_BLOCK_CHARS:
            block(
                f"LARGE INLINE DATA FOR /guard\n"
                f"Size: ~{inline_size:,} chars (~{estimate_tokens(inline_size):,} tokens)\n"
                f"Limit: {GUARD_INLINE_BLOCK_CHARS:,} chars for inline data\n\n"
                f"Passing large data inline causes performance issues.\n\n"
                f"Use a file instead:\n"
                f"  1. Save JSON to file: data.json\n"
                f"  2. Run: /guard data.json\n\n"
                f"Or add #guard:force to bypass (not recommended)"
            )
        elif inline_size > GUARD_INLINE_WARN_CHARS:
            warn_with_hint(
                f"Large inline data for /guard (~{inline_size:,} chars)",
                "Consider saving to file and running: /guard data.json"
            )

    # Character-based checks (fast, no API)
    prompt_chars = len(prompt)

    # Hard limit check - context flooding protection
    if prompt_chars > config["hard_limit_chars"]:
        estimated_tokens = estimate_tokens(prompt_chars)
        block(
            f"HARD BLOCK (context flooding)\n"
            f"Reason: payload exceeds hard character limit\n"
            f"Size: ~{prompt_chars:,} chars (~{estimated_tokens:,} tokens)\n"
            f"Limit: {config['hard_limit_chars']:,} chars\n\n"
            f"Action:\n"
            f"  - Use /guard to analyze and trim the payload\n"
            f"  - Or reduce payload size manually\n"
            f"  - Or add #guard:force to bypass"
        )

    # Small prompts pass through
    if prompt_chars < config["min_chars"]:
        debug_log(f"Small prompt ({prompt_chars} chars), allowing")
        allow()

    # No JSON markers = probably not a data prompt
    if not has_json_markers(prompt):
        debug_log("No JSON markers, allowing")
        allow()

    # Check for forensic patterns
    is_forensic, forensic_hits = detect_forensic_tripwire(prompt)
    is_large = prompt_chars > config["warn_chars"]

    # Decision based on forensic + size
    if is_forensic and is_large:
        hits_display = ", ".join(f'"{h}"' for h in forensic_hits[:3])
        estimated_tokens = estimate_tokens(prompt_chars)

        if config["fail_closed"] and not has_explicit_mode:
            # Fail closed mode: block forensic + large
            block(
                f"FORENSIC QUERY + LARGE PAYLOAD\n"
                f"Detected patterns: {hits_display}\n"
                f"Payload size: ~{prompt_chars:,} chars (~{estimated_tokens:,} tokens)\n\n"
                f"Sampling this data could hide the answer you're looking for.\n\n"
                f"Options:\n"
                f"  - Use /guard to analyze and prepare the payload\n"
                f"  - Add #guard:mode=analysis to allow sampling\n"
                f"  - Add #guard:force to bypass\n"
                f"  - Set TOKEN_GUARD_FAIL_CLOSED=false to warn instead"
            )

        # Warn mode: warn with strong hint
        warn_with_hint(
            f"Forensic query detected ({hits_display}) with large payload (~{estimated_tokens:,} tokens)",
            "Use /guard to analyze, or add #guard:mode=analysis to allow sampling"
        )

    elif is_large:
        # Large but not forensic: just warn
        estimated_tokens = estimate_tokens(prompt_chars)
        warn_with_hint(
            f"Large payload detected (~{prompt_chars:,} chars, ~{estimated_tokens:,} tokens)",
            "Use /guard for lossless reduction and intelligent trimming"
        )

    # Default: allow
    allow()


def main() -> None:
    """Entry point for hook."""
    debug_log("Hook started")

    try:
        raw = sys.stdin.read()
        if not raw.strip():
            allow()

        hook_input = json.loads(raw)
        run_hook(hook_input)
    except Exception as e:
        debug_log(f"Exception: {e}")
        print(f"[context-guard] Error: {e}", file=sys.stderr)
        allow()  # Fail open


if __name__ == "__main__":
    main()
