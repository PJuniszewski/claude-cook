#!/usr/bin/env python3
"""
Decision engine for Context Guard.

This module provides the core decision logic for determining whether to:
- ALLOW: Prompt passes through unchanged
- SAMPLE: Prompt is too large but sampling is permitted
- BLOCK: Prompt is too large and sampling is not safe

The decision matrix considers:
- Token count vs budget
- Semantic mode (analysis/summary/forensics)
- Forensic pattern detection
- Explicit user overrides (force, allow_sampling)
"""
from __future__ import annotations

from enum import Enum
from dataclasses import dataclass
from typing import Optional

# Import TrimMode from trim_lib for consistency
import sys
from pathlib import Path

# Add scripts to path for imports
scripts_dir = Path(__file__).parent
sys.path.insert(0, str(scripts_dir))

try:
    from trim_lib import TrimMode
except ImportError:
    # Fallback if trim_lib not available
    class TrimMode(Enum):
        ANALYSIS = "analysis"
        SUMMARY = "summary"
        FORENSICS = "forensics"


class Decision(Enum):
    """
    Decision outcome from the decision engine.

    ALLOW: Prompt passes through unchanged - either under budget or force override
    SAMPLE: Prompt exceeds budget but sampling is permitted
    BLOCK: Prompt exceeds budget and sampling would compromise integrity
    """
    ALLOW = "allow"
    SAMPLE = "sample"
    BLOCK = "block"


@dataclass
class DecisionResult:
    """
    Result of the decision engine including reasoning.
    """
    decision: Decision
    reason: str
    tokens: int
    budget: int
    mode: TrimMode
    is_forensic: bool = False
    forensic_patterns: list[str] = None

    def __post_init__(self):
        if self.forensic_patterns is None:
            self.forensic_patterns = []

    @property
    def over_budget(self) -> bool:
        return self.tokens > self.budget

    @property
    def over_budget_by(self) -> int:
        return max(0, self.tokens - self.budget)


def make_decision(
    tokens: int,
    budget: int,
    mode: TrimMode = TrimMode.ANALYSIS,
    is_forensic: bool = False,
    forensic_patterns: Optional[list[str]] = None,
    allow_sampling: bool = False,
    force: bool = False,
) -> DecisionResult:
    """
    Make a decision about how to handle a prompt.

    Decision Matrix:
    ================

    | Condition                           | Mode      | Force | Decision |
    |-------------------------------------|-----------|-------|----------|
    | tokens <= budget                    | any       | any   | ALLOW    |
    | tokens > budget                     | any       | True  | ALLOW    |
    | tokens > budget                     | summary   | False | SAMPLE   |
    | tokens > budget + allow_sampling    | any       | False | SAMPLE   |
    | tokens > budget + no forensic       | analysis  | False | SAMPLE   |
    | tokens > budget + forensic          | analysis  | False | BLOCK    |
    | tokens > budget                     | forensics | False | BLOCK    |

    Args:
        tokens: Number of tokens in the prompt
        budget: Maximum allowed tokens
        mode: Semantic mode (analysis/summary/forensics)
        is_forensic: Whether forensic patterns were detected
        forensic_patterns: List of detected forensic pattern strings
        allow_sampling: Explicit permission to sample (overrides forensic block)
        force: Bypass all checks

    Returns:
        DecisionResult with decision and reasoning
    """
    if forensic_patterns is None:
        forensic_patterns = []

    # Case 1: Under budget - always ALLOW
    if tokens <= budget:
        return DecisionResult(
            decision=Decision.ALLOW,
            reason="Prompt is within token budget",
            tokens=tokens,
            budget=budget,
            mode=mode,
            is_forensic=is_forensic,
            forensic_patterns=forensic_patterns,
        )

    # Case 2: Force mode - ALLOW regardless of size
    if force:
        return DecisionResult(
            decision=Decision.ALLOW,
            reason="Force mode enabled - bypassing all checks",
            tokens=tokens,
            budget=budget,
            mode=mode,
            is_forensic=is_forensic,
            forensic_patterns=forensic_patterns,
        )

    # Case 3: Summary mode - always allow sampling
    if mode == TrimMode.SUMMARY:
        return DecisionResult(
            decision=Decision.SAMPLE,
            reason="Summary mode allows aggressive trimming",
            tokens=tokens,
            budget=budget,
            mode=mode,
            is_forensic=is_forensic,
            forensic_patterns=forensic_patterns,
        )

    # Case 4: Explicit allow_sampling - SAMPLE even for forensic queries
    if allow_sampling:
        return DecisionResult(
            decision=Decision.SAMPLE,
            reason="Explicit sampling permission granted",
            tokens=tokens,
            budget=budget,
            mode=mode,
            is_forensic=is_forensic,
            forensic_patterns=forensic_patterns,
        )

    # Case 5: Forensics mode - BLOCK (no sampling allowed)
    if mode == TrimMode.FORENSICS:
        return DecisionResult(
            decision=Decision.BLOCK,
            reason="Forensics mode requires all records - sampling not allowed",
            tokens=tokens,
            budget=budget,
            mode=mode,
            is_forensic=is_forensic,
            forensic_patterns=forensic_patterns,
        )

    # Case 6: Analysis mode with forensic pattern detected - SAMPLE with warning
    if mode == TrimMode.ANALYSIS and is_forensic:
        patterns_str = ", ".join(f'"{p}"' for p in forensic_patterns[:3])
        return DecisionResult(
            decision=Decision.SAMPLE,
            reason=f"Forensic patterns detected ({patterns_str}) - sampling applied with warning",
            tokens=tokens,
            budget=budget,
            mode=mode,
            is_forensic=is_forensic,
            forensic_patterns=forensic_patterns,
        )

    # Case 7: Analysis mode without forensic - SAMPLE
    return DecisionResult(
        decision=Decision.SAMPLE,
        reason="Analysis mode allows sampling for over-budget prompts",
        tokens=tokens,
        budget=budget,
        mode=mode,
        is_forensic=is_forensic,
        forensic_patterns=forensic_patterns,
    )


# =============================================================================
# CLI for testing
# =============================================================================

if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Test decision engine")
    parser.add_argument("--tokens", type=int, required=True, help="Token count")
    parser.add_argument("--budget", type=int, default=3500, help="Token budget")
    parser.add_argument("--mode", choices=["analysis", "summary", "forensics"], default="analysis")
    parser.add_argument("--forensic", action="store_true", help="Forensic pattern detected")
    parser.add_argument("--allow-sampling", action="store_true", help="Allow sampling")
    parser.add_argument("--force", action="store_true", help="Force mode")
    args = parser.parse_args()

    mode_map = {
        "analysis": TrimMode.ANALYSIS,
        "summary": TrimMode.SUMMARY,
        "forensics": TrimMode.FORENSICS,
    }

    result = make_decision(
        tokens=args.tokens,
        budget=args.budget,
        mode=mode_map[args.mode],
        is_forensic=args.forensic,
        allow_sampling=args.allow_sampling,
        force=args.force,
    )

    print(f"Decision: {result.decision.value.upper()}")
    print(f"Reason: {result.reason}")
    print(f"Tokens: {result.tokens} / {result.budget}")
    print(f"Over budget by: {result.over_budget_by}")
