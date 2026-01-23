#!/usr/bin/env python3
"""
/guard command entry point for Context Guard.

This module provides the full analysis pipeline for preparing prompts:
1. Read input (stdin or file)
2. Extract JSON via trim_lib.extract_json_from_prompt()
3. Count original tokens (API or heuristic fallback)
4. Apply lossless reductions (reduce_lib) unless --no-reduce
5. Re-count tokens after reduction
6. Make decision via decision.make_decision()
7. If SAMPLE: apply trim_lib.intelligent_trim()
8. Output structured report + "READY TO SEND PROMPT" block

Usage:
    /guard <input> [options]

    input:          File path or "-" for stdin

    --mode          analysis|summary|forensics (default: auto-detect)
    --allow-sampling  Explicitly permit sampling for forensic queries
    --force         Bypass all blocks (emit warnings only)
    --no-reduce     Skip lossless reduction phase
    --budget-tokens Token budget (default: $TOKEN_GUARD_PROMPT_LIMIT or 3500)
    --print-only    Never auto-send, just output report
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

# Add scripts to path
scripts_dir = Path(__file__).parent
sys.path.insert(0, str(scripts_dir))

from reduce_lib import reduce_payload, ReductionReport, estimate_tokens
from decision import make_decision, Decision, DecisionResult
from trim_lib import (
    TrimMode,
    extract_json_from_prompt,
    intelligent_trim,
    TokenBudget,
    SamplingStrategy,
    MinificationConfig,
    IntelligentTrimReport,
)

# Try to import token counting API
try:
    from token_count import count_tokens_safe
    HAS_TOKEN_API = True
except ImportError:
    HAS_TOKEN_API = False

# Default configuration
DEFAULT_BUDGET = int(os.environ.get("TOKEN_GUARD_PROMPT_LIMIT", "3500"))
DEFAULT_MODEL = os.environ.get("TOKEN_GUARD_MODEL", "claude-sonnet-4-20250514")

# Forensic patterns (copied from trimmer_hook for consistency)
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

# Semantic mode markers
MARKER_MODE_ANALYSIS = "#trimmer:mode=analysis"
MARKER_MODE_SUMMARY = "#trimmer:mode=summary"
MARKER_MODE_FORENSICS = "#trimmer:mode=forensics"


@dataclass
class GuardResult:
    """Result of the guard analysis."""
    decision: DecisionResult
    original_tokens: int
    reduced_tokens: int
    trimmed_tokens: Optional[int]
    reduction_report: Optional[ReductionReport]
    trim_report: Optional[IntelligentTrimReport]
    forensic_patterns: list[str]
    output_json: Optional[str]
    context_block: Optional[str]


def detect_forensic_patterns(text: str) -> tuple[bool, list[str]]:
    """Detect forensic patterns in text."""
    hits = []
    for pattern in FORENSIC_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            hits.append(match.group(0))
    return bool(hits), hits


def detect_semantic_mode(prompt: str) -> TrimMode:
    """Detect semantic mode from prompt markers."""
    if MARKER_MODE_FORENSICS in prompt:
        return TrimMode.FORENSICS
    if MARKER_MODE_SUMMARY in prompt:
        return TrimMode.SUMMARY
    if MARKER_MODE_ANALYSIS in prompt:
        return TrimMode.ANALYSIS
    return TrimMode.ANALYSIS  # Default


def count_tokens(text: str, model: str = DEFAULT_MODEL) -> int:
    """Count tokens using API or fallback to heuristic."""
    if HAS_TOKEN_API:
        result = count_tokens_safe(text, model, default=-1)
        if result > 0:
            return result
    # Fallback to heuristic
    return estimate_tokens(text)


def run_guard(
    input_text: str,
    mode: Optional[TrimMode] = None,
    allow_sampling: bool = False,
    force: bool = False,
    no_reduce: bool = False,
    budget_tokens: int = DEFAULT_BUDGET,
) -> GuardResult:
    """
    Run the full guard analysis pipeline.

    Args:
        input_text: The input text (may be JSON or text with embedded JSON)
        mode: Semantic mode (auto-detect if None)
        allow_sampling: Explicitly permit sampling
        force: Bypass all blocks
        no_reduce: Skip lossless reduction
        budget_tokens: Token budget

    Returns:
        GuardResult with all analysis details
    """
    # Step 1: Detect mode if not specified
    if mode is None:
        mode = detect_semantic_mode(input_text)

    # Step 2: Detect forensic patterns
    is_forensic, forensic_hits = detect_forensic_patterns(input_text)

    # Step 3: Extract JSON from input
    json_data, extraction_method = extract_json_from_prompt(input_text)

    if json_data is None:
        # No JSON found - treat entire input as text
        original_tokens = count_tokens(input_text)
        decision_result = make_decision(
            tokens=original_tokens,
            budget=budget_tokens,
            mode=mode,
            is_forensic=is_forensic,
            forensic_patterns=forensic_hits,
            allow_sampling=allow_sampling,
            force=force,
        )
        return GuardResult(
            decision=decision_result,
            original_tokens=original_tokens,
            reduced_tokens=original_tokens,
            trimmed_tokens=None,
            reduction_report=None,
            trim_report=None,
            forensic_patterns=forensic_hits,
            output_json=None,
            context_block=None,
        )

    # Step 4: Count original tokens
    original_json = json.dumps(json_data, separators=(",", ":"), ensure_ascii=False)
    original_tokens = count_tokens(original_json)

    # Step 5: Apply lossless reductions (unless disabled)
    reduction_report = None
    reduced_json = original_json
    reduced_tokens = original_tokens

    if not no_reduce:
        reduced_json, reduction_report = reduce_payload(
            json_data,
            minify=True,
            columnar=True,
            dedup=False,
        )
        reduced_tokens = count_tokens(reduced_json)

    # Step 6: Make decision
    decision_result = make_decision(
        tokens=reduced_tokens,
        budget=budget_tokens,
        mode=mode,
        is_forensic=is_forensic,
        forensic_patterns=forensic_hits,
        allow_sampling=allow_sampling,
        force=force,
    )

    # Step 7: If SAMPLE, apply intelligent trimming
    trim_report = None
    trimmed_tokens = None
    output_json = reduced_json
    context_block = None

    if decision_result.decision == Decision.SAMPLE:
        # Parse the reduced JSON (might have columnar format)
        reduced_data = json.loads(reduced_json)

        # Apply intelligent trimming
        token_budget = TokenBudget(
            total_budget=budget_tokens,
            overhead_tokens=50,
            min_records=2,
        )
        trimmed_data, trim_report = intelligent_trim(
            data=reduced_data,
            token_budget=token_budget,
            sampling_strategy=SamplingStrategy.FIRST_LAST_EVEN,
        )

        output_json = json.dumps(trimmed_data, separators=(",", ":"), ensure_ascii=False)
        trimmed_tokens = count_tokens(output_json)

        # Generate context block
        context_block = trim_report.to_claude_context()

    elif decision_result.decision == Decision.ALLOW:
        # Just use reduced JSON as output
        output_json = reduced_json
        trimmed_tokens = reduced_tokens

    return GuardResult(
        decision=decision_result,
        original_tokens=original_tokens,
        reduced_tokens=reduced_tokens,
        trimmed_tokens=trimmed_tokens,
        reduction_report=reduction_report,
        trim_report=trim_report,
        forensic_patterns=forensic_hits,
        output_json=output_json,
        context_block=context_block,
    )


def format_report(result: GuardResult) -> str:
    """Format the guard result as a human-readable report."""
    lines = [
        "=" * 60,
        "CONTEXT GUARD ANALYSIS",
        "=" * 60,
        "",
    ]

    # Decision
    decision_icon = {
        Decision.ALLOW: "[OK]",
        Decision.SAMPLE: "[~]",
        Decision.BLOCK: "[X]",
    }
    icon = decision_icon.get(result.decision.decision, "[?]")
    lines.append(f"Decision: {icon} {result.decision.decision.value.upper()}")
    lines.append(f"Mode: {result.decision.mode.value}")
    lines.append(f"Reason: {result.decision.reason}")
    lines.append("")

    # Forensic warning when sampling is applied despite forensic patterns
    if result.decision.decision == Decision.SAMPLE and result.forensic_patterns:
        patterns_display = result.forensic_patterns[0] if result.forensic_patterns else ""
        lines.append("WARNING: FORENSIC PATTERN DETECTED")
        lines.append(f'  Pattern "{patterns_display}" detected.')
        lines.append("  Data was sampled. For queries requiring ALL records,")
        lines.append("  use --mode forensics or reduce data size first.")
        lines.append("")

    # Token analysis - table format
    lines.append("TOKEN ANALYSIS:")
    lines.append("  +-------------------+----------+----------+")
    lines.append("  | Stage             |   Tokens |   Change |")
    lines.append("  +-------------------+----------+----------+")
    lines.append(f"  | Original          | {result.original_tokens:>8,} |      --- |")

    if result.reduced_tokens != result.original_tokens:
        diff = result.original_tokens - result.reduced_tokens
        pct = (diff / result.original_tokens) * 100 if result.original_tokens > 0 else 0
        lines.append(f"  | After reduction   | {result.reduced_tokens:>8,} |   -{pct:>4.1f}% |")

    if result.trimmed_tokens is not None and result.trimmed_tokens != result.reduced_tokens:
        total_diff = result.original_tokens - result.trimmed_tokens
        total_pct = (total_diff / result.original_tokens) * 100 if result.original_tokens > 0 else 0
        lines.append(f"  | After sampling    | {result.trimmed_tokens:>8,} |   -{total_pct:>4.1f}% |")

    lines.append("  +-------------------+----------+----------+")
    lines.append(f"  | Budget            | {result.decision.budget:>8,} |          |")
    lines.append("  +-------------------+----------+----------+")

    # Summary line
    final_tokens = result.trimmed_tokens if result.trimmed_tokens is not None else result.reduced_tokens
    if final_tokens <= result.decision.budget:
        status = "WITHIN BUDGET"
    else:
        status = "OVER BUDGET"
    lines.append(f"  Status: {status}")
    lines.append("")

    # Forensic patterns
    if result.forensic_patterns:
        lines.append("FORENSIC PATTERNS DETECTED:")
        for pattern in result.forensic_patterns[:5]:
            lines.append(f'  - "{pattern}"')
        lines.append("")

    # Lossless reductions
    if result.reduction_report:
        has_reductions = False
        reduction_lines = []
        if result.reduction_report.minify:
            m = result.reduction_report.minify
            total_removed = m.null_fields_removed + m.empty_strings_removed + m.empty_arrays_removed
            if total_removed > 0:
                has_reductions = True
                reduction_lines.append(f"  - Removed {total_removed} null/empty fields")
        if result.reduction_report.columnar and result.reduction_report.columnar.transforms:
            c = result.reduction_report.columnar
            has_reductions = True
            reduction_lines.append(f"  - Columnar view applied to {c.arrays_transformed} arrays (reversible)")
        if has_reductions:
            lines.append("LOSSLESS REDUCTIONS (NO DATA LOSS):")
            lines.extend(reduction_lines)
            lines.append("")

    # Lossy operations (sampling)
    if result.trim_report and result.trim_report.arrays_trimmed:
        lines.append("LOSSY OPERATIONS (DATA REDUCED):")
        for arr in result.trim_report.arrays_trimmed:
            lines.append(f"  - Sampling: {arr.key_path} {arr.original_count} -> {arr.kept_count}")
        lines.append("")

    # Ready to send block
    if result.decision.decision != Decision.BLOCK and result.output_json:
        lines.append("=" * 60)
        lines.append("READY TO SEND PROMPT")
        lines.append("=" * 60)
        lines.append("")
        if result.context_block:
            lines.append("[TRIMMING CONTEXT]")
            lines.append(result.context_block)
            lines.append("")
        lines.append("TRIMMED JSON DATA:")
        # Pretty print if small enough, otherwise show truncated
        if len(result.output_json) < 2000:
            try:
                parsed = json.loads(result.output_json)
                lines.append(json.dumps(parsed, indent=2, ensure_ascii=False))
            except json.JSONDecodeError:
                lines.append(result.output_json)
        else:
            lines.append(result.output_json[:1000] + "\n... [truncated] ...")
            lines.append(f"\nFull output: {len(result.output_json)} characters")

    return "\n".join(lines)


def main():
    """CLI entry point."""
    parser = argparse.ArgumentParser(
        description="Context Guard - Analyze and prepare prompts with JSON for safe context submission",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python guard_cmd.py data.json
  cat data.json | python guard_cmd.py -
  python guard_cmd.py data.json --mode forensics --force
  python guard_cmd.py data.json --budget-tokens 5000 --no-reduce
        """,
    )
    parser.add_argument("input", help="Path to file OR '-' for stdin")
    parser.add_argument(
        "--mode",
        choices=["analysis", "summary", "forensics"],
        help="Semantic mode (default: auto-detect from markers)",
    )
    parser.add_argument(
        "--allow-sampling",
        action="store_true",
        help="Permit sampling for forensic queries",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Bypass blocks, emit warnings only",
    )
    parser.add_argument(
        "--no-reduce",
        action="store_true",
        help="Skip lossless reduction phase",
    )
    parser.add_argument(
        "--budget-tokens",
        type=int,
        default=DEFAULT_BUDGET,
        help=f"Token budget (default: {DEFAULT_BUDGET})",
    )
    parser.add_argument(
        "--print-only",
        action="store_true",
        help="Just output report, never auto-send",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output result as JSON instead of report",
    )

    args = parser.parse_args()

    # Read input
    if args.input == "-":
        input_text = sys.stdin.read()
    else:
        # Check if input looks like JSON data or is a file path
        stripped_input = args.input.strip()

        # Heuristics to detect inline data vs file path:
        # 1. Starts with [ or { -> JSON data
        # 2. Contains [ or { -> mixed text with JSON (e.g., "question? [data]")
        # 3. Very long (>255 chars) -> probably data, not a file path
        # 4. Otherwise -> try as file path

        is_inline_data = (
            stripped_input.startswith(("[", "{")) or
            len(stripped_input) > 255 or
            ("[" in stripped_input and "]" in stripped_input) or
            ("{" in stripped_input and "}" in stripped_input)
        )

        if is_inline_data:
            # Treat as inline data (JSON or mixed text with JSON)
            input_text = args.input
        else:
            # Treat as file path
            input_path = Path(args.input)
            if not input_path.exists():
                print(f"Error: File not found: {args.input}", file=sys.stderr)
                sys.exit(1)
            input_text = input_path.read_text(encoding="utf-8")

    # Parse mode
    mode = None
    if args.mode:
        mode_map = {
            "analysis": TrimMode.ANALYSIS,
            "summary": TrimMode.SUMMARY,
            "forensics": TrimMode.FORENSICS,
        }
        mode = mode_map[args.mode]

    # Run guard
    result = run_guard(
        input_text=input_text,
        mode=mode,
        allow_sampling=args.allow_sampling,
        force=args.force,
        no_reduce=args.no_reduce,
        budget_tokens=args.budget_tokens,
    )

    # Output
    if args.json:
        output = {
            "decision": result.decision.decision.value,
            "reason": result.decision.reason,
            "tokens": {
                "original": result.original_tokens,
                "reduced": result.reduced_tokens,
                "trimmed": result.trimmed_tokens,
                "budget": result.decision.budget,
            },
            "mode": result.decision.mode.value,
            "forensic_patterns": result.forensic_patterns,
            "output_json": result.output_json,
        }
        print(json.dumps(output, indent=2))
    else:
        print(format_report(result))

    # Exit code
    if result.decision.decision == Decision.BLOCK and not args.force:
        sys.exit(2)


if __name__ == "__main__":
    main()
