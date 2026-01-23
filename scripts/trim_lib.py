#!/usr/bin/env python3
"""
Trimming library for JSON payloads.

This module provides intelligent, token-aware JSON trimming with:
- Dynamic token budget calculation
- Intelligent sampling (first + last + evenly spaced middle)
- Minification pipeline
- Transparent trim reporting for Claude
"""
from __future__ import annotations

import copy
import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional

# Default configuration
DEFAULT_MAX_ITEMS = 5
DEFAULT_MAX_STRLEN = 300
DEFAULT_LIST_KEYS = "root,products,users,items,results,rows,records,data,entries"
DEFAULT_CHARS_PER_TOKEN = 3.5  # Heuristic for JSON token estimation


# =============================================================================
# NEW: Intelligent Trimming Components
# =============================================================================

class SamplingStrategy(Enum):
    """Strategy for sampling arrays when trimming."""
    FIRST_N = "first_n"              # Legacy: take first N items
    FIRST_LAST_EVEN = "first_last_even"  # Keep first, last, evenly spaced middle


class TrimMode(Enum):
    """
    Semantic mode for trimming behavior.

    Controls whether sampling is allowed based on question type:
    - ANALYSIS: Sampling OK (default) - for global/structural questions
    - SUMMARY: Aggressive trimming OK - for overview/description questions
    - FORENSICS: NO sampling - block if over limit (for single-record questions)
    """
    ANALYSIS = "analysis"      # Sampling OK (default)
    SUMMARY = "summary"        # Aggressive trimming OK
    FORENSICS = "forensics"    # NO sampling - block if over limit


@dataclass
class TokenBudget:
    """Token budget configuration for intelligent trimming."""
    total_budget: int = 3500          # Maximum tokens for output
    overhead_tokens: int = 50         # Reserved for structure (brackets, etc.)
    min_records: int = 2              # Minimum records to keep (first + last)

    @property
    def available_for_records(self) -> int:
        """Tokens available for actual record content."""
        return max(0, self.total_budget - self.overhead_tokens)


@dataclass
class MinificationConfig:
    """Configuration for minification pipeline."""
    remove_null_fields: bool = True
    remove_empty_strings: bool = True
    remove_empty_arrays: bool = True
    alias_keys: bool = False
    key_alias_map: dict[str, str] = field(default_factory=dict)


@dataclass
class ArrayTrimSummary:
    """Summary of trimming applied to a single array."""
    key_path: str
    original_count: int
    kept_count: int
    kept_indices: list[int]
    sampling_strategy: str
    sample_description: str


@dataclass
class IntelligentTrimReport:
    """
    Comprehensive trim report for Claude to understand what was modified.

    This report is included in additionalContext so Claude knows:
    - How much was trimmed
    - Which indices were kept (for array distribution)
    - What strategy was used
    """
    timestamp: datetime
    original_tokens: int
    trimmed_tokens: int
    token_budget: int
    within_budget: bool
    arrays_trimmed: list[ArrayTrimSummary]
    fields_removed_count: int
    strings_truncated_count: int
    counters: dict[str, int]

    @property
    def token_reduction(self) -> int:
        return self.original_tokens - self.trimmed_tokens

    @property
    def token_reduction_percent(self) -> float:
        if self.original_tokens == 0:
            return 0.0
        return (self.token_reduction / self.original_tokens) * 100

    def to_claude_context(self) -> str:
        """
        Generate human-readable summary for Claude's context.

        This is the key output - Claude sees exactly what was trimmed
        and can reason about the data distribution.
        """
        lines = [
            "[DATA TRIMMING SUMMARY]",
            f"Original: {self.original_tokens} tokens | Trimmed: {self.trimmed_tokens} tokens ({self.token_reduction_percent:.1f}% reduction)",
            f"Budget: {self.token_budget} tokens | Status: {'Within budget' if self.within_budget else 'OVER BUDGET'}",
            "",
        ]

        if self.arrays_trimmed:
            lines.append("ARRAYS TRIMMED:")
            for arr in self.arrays_trimmed:
                lines.append(f"  - {arr.key_path}: {arr.original_count} -> {arr.kept_count} records")
                lines.append(f"    Strategy: {arr.sample_description}")
                # Show kept indices (truncate if too many)
                indices_str = str(arr.kept_indices[:15])
                if len(arr.kept_indices) > 15:
                    indices_str = indices_str[:-1] + ", ...]"
                lines.append(f"    Kept indices: {indices_str}")
            lines.append("")

        if self.fields_removed_count > 0:
            lines.append(f"FIELDS REMOVED: {self.fields_removed_count} null/empty fields")

        if self.strings_truncated_count > 0:
            lines.append(f"STRINGS TRUNCATED: {self.strings_truncated_count} fields")

        # Add explicit warning about sampling limitations
        if self.arrays_trimmed:
            lines.append("")
            lines.append("WARNING: This is a SAMPLED subset of the original data.")
            lines.append("- Single-record anomalies may be missing from the sample")
            lines.append("- Trends that appear late in the data may be underrepresented")
            lines.append("- For forensic analysis requiring ALL records, request full data")

        lines.append("[END TRIMMING SUMMARY]")
        return "\n".join(lines)

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "timestamp": self.timestamp.isoformat(),
            "tokens": {
                "original": self.original_tokens,
                "trimmed": self.trimmed_tokens,
                "reduction": self.token_reduction,
                "reduction_percent": round(self.token_reduction_percent, 2),
                "budget": self.token_budget,
                "within_budget": self.within_budget,
            },
            "arrays_trimmed": [
                {
                    "path": arr.key_path,
                    "original": arr.original_count,
                    "kept": arr.kept_count,
                    "kept_indices": arr.kept_indices,
                    "strategy": arr.sampling_strategy,
                    "description": arr.sample_description,
                }
                for arr in self.arrays_trimmed
            ],
            "fields_removed_count": self.fields_removed_count,
            "strings_truncated_count": self.strings_truncated_count,
            "counters": self.counters,
        }


# =============================================================================
# Token Estimation Functions
# =============================================================================

def estimate_tokens_heuristic(text: str, chars_per_token: float = DEFAULT_CHARS_PER_TOKEN) -> int:
    """
    Estimate token count using character count heuristic.

    JSON typically averages ~3.5 chars per token due to structure characters,
    short keys, and numeric values.
    """
    if not text:
        return 0
    return max(1, int(len(text) / chars_per_token))


def estimate_tokens_per_record(records: list[Any], sample_size: int = 10) -> float:
    """
    Estimate average tokens per record by sampling.

    Args:
        records: List of records to estimate
        sample_size: Number of records to sample for estimation

    Returns:
        Average tokens per record (float for precision)
    """
    if not records:
        return 0.0

    # Sample records evenly distributed
    n = len(records)
    if n <= sample_size:
        sample = records
    else:
        indices = [int(i * n / sample_size) for i in range(sample_size)]
        sample = [records[i] for i in indices]

    # Calculate tokens for sample
    total_tokens = 0
    for record in sample:
        record_json = json.dumps(record, separators=(",", ":"), ensure_ascii=False)
        total_tokens += estimate_tokens_heuristic(record_json)

    return total_tokens / len(sample)


def calculate_records_to_keep(
    records: list[Any],
    token_budget: TokenBudget,
) -> int:
    """
    Calculate how many records can fit within token budget.

    This is the key function for token-aware trimming - it determines
    how many records to keep based on actual token estimates.
    """
    if not records:
        return 0

    tokens_per_record = estimate_tokens_per_record(records)
    if tokens_per_record <= 0:
        return len(records)

    available = token_budget.available_for_records
    max_records = int(available / tokens_per_record)

    # Ensure at least min_records (first + last)
    return max(token_budget.min_records, min(max_records, len(records)))


# =============================================================================
# Intelligent Sampling Functions
# =============================================================================

def sample_first_last_even(
    records: list[Any],
    target_count: int,
) -> tuple[list[Any], list[int], str]:
    """
    Sample records keeping first, last, and evenly-spaced middle.

    This approach preserves data distribution better than simple [:N] slicing:
    - First record: often contains headers or initial state
    - Last record: often contains final state or most recent data
    - Middle records: evenly spaced to represent full distribution

    Example: 100 records, target 10
    - Keep index 0 (first)
    - Keep index 99 (last)
    - 8 middle slots: indices 11, 22, 33, 44, 55, 66, 77, 88
    - Result: [0, 11, 22, 33, 44, 55, 66, 77, 88, 99]

    Args:
        records: Full list of records
        target_count: How many records to keep

    Returns:
        Tuple of (sampled_records, kept_indices, description)
    """
    n = len(records)

    # Edge case: keep all
    if n <= target_count:
        return records.copy(), list(range(n)), "All records kept (under limit)"

    # Edge case: minimum records
    if target_count < 2:
        return [records[0]], [0], "Only first record kept (minimum)"

    # Build index list
    kept_indices = []

    # Always keep first
    kept_indices.append(0)

    # Always keep last
    kept_indices.append(n - 1)

    # Fill middle slots evenly
    middle_slots = target_count - 2
    if middle_slots > 0 and n > 2:
        # Distribute middle_slots indices across range [1, n-2]
        middle_range = n - 2  # indices 1 to n-2
        interval = middle_range / (middle_slots + 1)

        for slot in range(1, middle_slots + 1):
            idx = int(round(slot * interval))
            # Clamp to valid range and avoid duplicates
            idx = max(1, min(idx, n - 2))
            if idx not in kept_indices:
                kept_indices.append(idx)

    # Sort indices for consistent output order
    kept_indices.sort()

    # Extract records
    sampled = [records[i] for i in kept_indices]

    # Generate description
    if len(kept_indices) == 2:
        desc = "first and last records"
    else:
        avg_interval = (n - 1) / (len(kept_indices) - 1) if len(kept_indices) > 1 else 0
        desc = f"first + last + every ~{avg_interval:.0f}th from middle"

    return sampled, kept_indices, desc


# =============================================================================
# Minification Functions
# =============================================================================

def minify_value(value: Any, config: MinificationConfig) -> tuple[Any, bool]:
    """
    Apply minification to a single value.

    Returns:
        Tuple of (minified_value, should_remove)
    """
    if value is None and config.remove_null_fields:
        return None, True
    if value == "" and config.remove_empty_strings:
        return None, True
    if isinstance(value, list) and len(value) == 0 and config.remove_empty_arrays:
        return None, True
    return value, False


def minify_record(record: Any, config: MinificationConfig) -> Any:
    """
    Apply minification to a record (removes null/empty, applies key aliases).
    """
    if isinstance(record, dict):
        result = {}
        for key, value in record.items():
            minified_val, should_remove = minify_value(value, config)
            if should_remove:
                continue

            # Recursively minify nested structures
            if isinstance(minified_val, (dict, list)):
                minified_val = minify_record(minified_val, config)

            # Apply key alias
            output_key = config.key_alias_map.get(key, key) if config.alias_keys else key
            result[output_key] = minified_val

        return result

    elif isinstance(record, list):
        result = []
        for item in record:
            minified_item, should_remove = minify_value(item, config)
            if should_remove:
                continue
            if isinstance(minified_item, (dict, list)):
                minified_item = minify_record(minified_item, config)
            result.append(minified_item)
        return result

    return record


# =============================================================================
# Main Intelligent Trim Function
# =============================================================================

def intelligent_trim(
    data: Any,
    token_budget: Optional[TokenBudget] = None,
    sampling_strategy: SamplingStrategy = SamplingStrategy.FIRST_LAST_EVEN,
    minification: Optional[MinificationConfig] = None,
    list_keys: Optional[set[str]] = None,
    max_strlen: int = DEFAULT_MAX_STRLEN,
    truncate_strings: bool = True,
) -> tuple[Any, IntelligentTrimReport]:
    """
    Intelligent, token-aware JSON trimming.

    This function replaces the naive [:N] slicing with:
    1. Token budget calculation to determine how many records fit
    2. Intelligent sampling to preserve data distribution
    3. Minification to reduce token usage
    4. Transparent reporting so Claude understands the transformation

    Args:
        data: JSON data to trim (dict, list, or primitive)
        token_budget: Token budget configuration (uses defaults if None)
        sampling_strategy: How to sample arrays (FIRST_LAST_EVEN recommended)
        minification: Minification config (uses defaults if None)
        list_keys: Set of keys identifying arrays to trim
        max_strlen: Maximum string length before truncation
        truncate_strings: Whether to truncate long strings

    Returns:
        Tuple of (trimmed_data, IntelligentTrimReport)
    """
    start_time = datetime.now()

    # Apply defaults
    if token_budget is None:
        token_budget = TokenBudget()
    if minification is None:
        minification = MinificationConfig()
    if list_keys is None:
        list_keys = {s.strip() for s in DEFAULT_LIST_KEYS.split(",")}

    # Tracking
    arrays_trimmed: list[ArrayTrimSummary] = []
    counters = {
        "lists_limited": 0,
        "fields_dropped": 0,
        "strings_truncated": 0,
        "items_removed": 0,
    }

    def truncate_string(s: str) -> str:
        if len(s) <= max_strlen:
            return s
        counters["strings_truncated"] += 1
        return s[:max_strlen] + "..."

    def process_array(arr: list, key_path: str) -> list:
        """Process an array with intelligent sampling."""
        original_count = len(arr)

        # Calculate how many records fit in budget
        target_count = calculate_records_to_keep(arr, token_budget)

        # Sample if necessary
        if original_count > target_count:
            if sampling_strategy == SamplingStrategy.FIRST_LAST_EVEN:
                sampled, kept_indices, desc = sample_first_last_even(arr, target_count)
            else:
                # Legacy FIRST_N behavior
                sampled = arr[:target_count]
                kept_indices = list(range(target_count))
                desc = f"first {target_count} records"

            counters["lists_limited"] += 1
            counters["items_removed"] += original_count - len(sampled)

            arrays_trimmed.append(ArrayTrimSummary(
                key_path=key_path,
                original_count=original_count,
                kept_count=len(sampled),
                kept_indices=kept_indices,
                sampling_strategy=sampling_strategy.value,
                sample_description=desc,
            ))
        else:
            sampled = arr
            kept_indices = list(range(len(arr)))

        # Process each record (minify, truncate strings)
        result = []
        for record in sampled:
            processed = process_value(record, key_path)
            result.append(processed)

        return result

    def process_value(val: Any, parent_path: str = "") -> Any:
        """Recursively process a value."""
        if isinstance(val, dict):
            return process_dict(val, parent_path)
        elif isinstance(val, list):
            key_name = parent_path.split(".")[-1] if parent_path else "root"
            if key_name.lower() in list_keys:
                return process_array(val, parent_path or "root")
            else:
                return [process_value(item, parent_path) for item in val]
        elif isinstance(val, str) and truncate_strings:
            return truncate_string(val)
        return val

    def process_dict(d: dict, parent_path: str = "") -> dict:
        """Process a dictionary with minification."""
        result = {}
        for key, value in d.items():
            new_path = f"{parent_path}.{key}" if parent_path else key

            # Apply minification
            minified_val, should_remove = minify_value(value, minification)
            if should_remove:
                counters["fields_dropped"] += 1
                continue

            # Process recursively
            processed = process_value(minified_val, new_path)

            # Apply key alias
            output_key = minification.key_alias_map.get(key, key) if minification.alias_keys else key
            result[output_key] = processed

        return result

    # Deep copy and process
    result = copy.deepcopy(data)

    if isinstance(result, dict):
        result = process_dict(result)
    elif isinstance(result, list):
        result = process_array(result, "root")
    elif isinstance(result, str) and truncate_strings:
        result = truncate_string(result)

    # Calculate token counts
    original_json = json.dumps(data, separators=(",", ":"), ensure_ascii=False)
    trimmed_json = json.dumps(result, separators=(",", ":"), ensure_ascii=False)

    original_tokens = estimate_tokens_heuristic(original_json)
    trimmed_tokens = estimate_tokens_heuristic(trimmed_json)

    # Build report
    report = IntelligentTrimReport(
        timestamp=start_time,
        original_tokens=original_tokens,
        trimmed_tokens=trimmed_tokens,
        token_budget=token_budget.total_budget,
        within_budget=trimmed_tokens <= token_budget.total_budget,
        arrays_trimmed=arrays_trimmed,
        fields_removed_count=counters["fields_dropped"],
        strings_truncated_count=counters["strings_truncated"],
        counters=counters,
    )

    return result, report


# =============================================================================
# Legacy TrimPolicy and trim_payload (kept for backward compatibility)
# =============================================================================

DEFAULT_PRODUCT_WHITELIST = (
    "id,title,name,price,brand,category,rating,stock,availabilityStatus,"
    "description,sku,thumbnail"
)
DEFAULT_USER_WHITELIST = (
    "id,firstName,lastName,age,gender,email,phone,username,address,company,"
    "name,role"
)


@dataclass
class TrimPolicy:
    """Configuration for trimming behavior."""

    max_items: int = DEFAULT_MAX_ITEMS
    max_strlen: int = DEFAULT_MAX_STRLEN
    list_keys: set[str] = field(default_factory=set)
    product_whitelist: set[str] = field(default_factory=set)
    user_whitelist: set[str] = field(default_factory=set)
    truncate_strings: bool = True

    @classmethod
    def from_env(cls, env: Optional[dict[str, str]] = None) -> "TrimPolicy":
        """Create policy from environment variables."""
        import os

        env = env or os.environ

        def parse_set(key: str, default: str) -> set[str]:
            val = env.get(key, default)
            return {s.strip() for s in val.split(",") if s.strip()}

        return cls(
            max_items=int(env.get("TOKEN_GUARD_TRIM_MAX_ITEMS", DEFAULT_MAX_ITEMS)),
            max_strlen=int(env.get("TOKEN_GUARD_TRIM_MAX_STRLEN", DEFAULT_MAX_STRLEN)),
            list_keys=parse_set("TOKEN_GUARD_TRIM_LIST_KEYS", DEFAULT_LIST_KEYS),
            product_whitelist=parse_set(
                "TOKEN_GUARD_TRIM_PRODUCT_WHITELIST", DEFAULT_PRODUCT_WHITELIST
            ),
            user_whitelist=parse_set(
                "TOKEN_GUARD_TRIM_USER_WHITELIST", DEFAULT_USER_WHITELIST
            ),
            truncate_strings=env.get("TOKEN_GUARD_TRIM_STRINGS", "1") == "1",
        )


@dataclass
class TrimResult:
    """Result of trimming operation."""

    trimmed: Any
    notes: list[str]
    counters: dict[str, int]

    def to_dict(self) -> dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            "notes": self.notes,
            "counters": self.counters,
        }


def trim_payload(obj: Any, policy: Optional[TrimPolicy] = None) -> TrimResult:
    """
    Trim a JSON payload according to policy.

    Args:
        obj: The object to trim (dict, list, or primitive).
        policy: Trimming policy. Uses defaults if not provided.

    Returns:
        TrimResult with trimmed object, notes, and counters.
    """
    if policy is None:
        policy = TrimPolicy.from_env()

    notes: list[str] = []
    counters: dict[str, int] = {
        "lists_limited": 0,
        "fields_dropped": 0,
        "strings_truncated": 0,
        "items_removed": 0,
    }

    def truncate_string(s: str, max_len: int) -> str:
        if len(s) <= max_len:
            return s
        counters["strings_truncated"] += 1
        return s[:max_len] + "..."

    def whitelist_dict(d: dict, whitelist: set[str], key_name: str) -> dict:
        if not whitelist:
            return d
        original_keys = set(d.keys())
        filtered = {k: v for k, v in d.items() if k in whitelist}
        dropped = original_keys - set(filtered.keys())
        if dropped:
            counters["fields_dropped"] += len(dropped)
        return filtered

    def process_value(val: Any, parent_key: str = "") -> Any:
        if isinstance(val, dict):
            return process_dict(val, parent_key)
        elif isinstance(val, list):
            return process_list(val, parent_key)
        elif isinstance(val, str) and policy.truncate_strings:
            return truncate_string(val, policy.max_strlen)
        return val

    def process_list(lst: list, key: str) -> list:
        original_len = len(lst)

        # Check if this is a list we should limit
        should_limit = key.lower() in policy.list_keys

        if should_limit and original_len > policy.max_items:
            counters["lists_limited"] += 1
            counters["items_removed"] += original_len - policy.max_items
            notes.append(f"{key}: {original_len} -> {policy.max_items}")
            lst = lst[: policy.max_items]

        # Determine whitelist based on key
        whitelist: set[str] = set()
        if key.lower() in ("products", "product"):
            whitelist = policy.product_whitelist
        elif key.lower() in ("users", "user"):
            whitelist = policy.user_whitelist

        result = []
        for item in lst:
            if isinstance(item, dict) and whitelist:
                item = whitelist_dict(item, whitelist, key)
                if whitelist == policy.product_whitelist and not any(
                    n.startswith(f"{key} fields") for n in notes
                ):
                    notes.append(f"{key} fields whitelisted")
                elif whitelist == policy.user_whitelist and not any(
                    n.startswith(f"{key} fields") for n in notes
                ):
                    notes.append(f"{key} fields whitelisted")
            result.append(process_value(item, key))

        return result

    def process_dict(d: dict, parent_key: str = "") -> dict:
        result = {}
        for k, v in d.items():
            result[k] = process_value(v, k)
        return result

    # Deep copy to avoid modifying original
    trimmed = copy.deepcopy(obj)

    # Process the object
    if isinstance(trimmed, dict):
        trimmed = process_dict(trimmed)
    elif isinstance(trimmed, list):
        trimmed = process_list(trimmed, "root")
    elif isinstance(trimmed, str) and policy.truncate_strings:
        trimmed = truncate_string(trimmed, policy.max_strlen)

    # Add metadata
    if isinstance(trimmed, dict):
        trimmed["__trimmed"] = True
        trimmed["__trim_policy"] = {
            "max_items": policy.max_items,
            "max_strlen": policy.max_strlen if policy.truncate_strings else None,
        }

    return TrimResult(trimmed=trimmed, notes=notes, counters=counters)


def extract_json_from_prompt(prompt: str) -> tuple[Optional[Any], str]:
    """
    Extract JSON payload from a prompt.

    Tries these methods in order:
    1. Wrapper markers: ### PAYLOAD START ... ### PAYLOAD END
    2. Fenced JSON: ```json ... ``` or ``` ... ```
    3. Raw JSON: entire prompt is valid JSON (starts with { or [)
    4. Repaired: use json_repair to extract/fix JSON from text

    Args:
        prompt: The prompt text to extract from.

    Returns:
        Tuple of (extracted_object, method_name).
        method_name is one of: "wrapper", "fenced", "raw", "repaired", "none"
        Returns (None, "none") if extraction fails.
    """
    import json

    from json_repair import repair_json

    # Method 1: Wrapper markers
    wrapper_pattern = r"###\s*PAYLOAD\s*START\s*\n(.*?)\n###\s*PAYLOAD\s*END"
    match = re.search(wrapper_pattern, prompt, re.DOTALL | re.IGNORECASE)
    if match:
        try:
            return json.loads(match.group(1).strip()), "wrapper"
        except json.JSONDecodeError:
            # Try to repair it
            try:
                return repair_json(match.group(1).strip(), return_objects=True), "wrapper"
            except Exception:
                pass

    # Method 2: Fenced JSON block (with or without 'json' label)
    fence_pattern = r"```(?:json)?\s*\n(.*?)\n```"
    match = re.search(fence_pattern, prompt, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(1).strip()), "fenced"
        except json.JSONDecodeError:
            # Try to repair it
            try:
                return repair_json(match.group(1).strip(), return_objects=True), "fenced"
            except Exception:
                pass

    # Method 3: Raw JSON - try parsing the entire prompt as valid JSON
    stripped = prompt.strip()
    if stripped.startswith(("{", "[")):
        try:
            return json.loads(stripped), "raw"
        except json.JSONDecodeError:
            pass

    # Method 3.5: Fast extraction - find JSON in text without json_repair
    # This handles common cases like "find X with id 123 [{...}]" efficiently
    # by finding the first [ or { and trying to parse from there
    bracket_pos = -1
    brace_pos = -1
    if "[" in stripped:
        bracket_pos = stripped.find("[")
    if "{" in stripped:
        brace_pos = stripped.find("{")

    # Determine which comes first (if any)
    if bracket_pos >= 0 or brace_pos >= 0:
        if bracket_pos >= 0 and brace_pos >= 0:
            json_start = min(bracket_pos, brace_pos)
        elif bracket_pos >= 0:
            json_start = bracket_pos
        else:
            json_start = brace_pos

        # Try to parse from the JSON start position
        json_candidate = stripped[json_start:]
        try:
            result = json.loads(json_candidate)
            if result and (isinstance(result, dict) or isinstance(result, list)):
                return result, "extracted"
        except json.JSONDecodeError:
            # JSON might be truncated or have text after it
            # Try to find matching brackets using a simple counter
            opening_char = stripped[json_start]
            closing_char = "]" if opening_char == "[" else "}"
            depth = 0
            in_string = False
            escape_next = False

            for i, char in enumerate(json_candidate):
                if escape_next:
                    escape_next = False
                    continue
                if char == "\\":
                    escape_next = True
                    continue
                if char == '"' and not escape_next:
                    in_string = not in_string
                    continue
                if in_string:
                    continue
                if char == opening_char:
                    depth += 1
                elif char == closing_char:
                    depth -= 1
                    if depth == 0:
                        # Found the end of JSON
                        json_substring = json_candidate[:i + 1]
                        try:
                            result = json.loads(json_substring)
                            if result and (isinstance(result, dict) or isinstance(result, list)):
                                return result, "extracted"
                        except json.JSONDecodeError:
                            break
                        break

    # Method 4: Use json_repair to extract JSON from mixed text (SLOW - last resort)
    # It handles: text before/after JSON, broken JSON, missing quotes, etc.
    # WARNING: json_repair can be O(n^2) or worse on large inputs
    # Only use for small inputs or when other methods fail
    if len(prompt) > 50000:  # Skip json_repair for very large inputs
        return None, "none"

    try:
        result = repair_json(prompt, return_objects=True)
        # Check if we got something meaningful (not empty string/dict/list from garbage)
        if result and (isinstance(result, dict) or isinstance(result, list)):
            # Verify it's not just an empty result from non-JSON text
            if isinstance(result, dict) and len(result) > 0:
                return result, "repaired"
            elif isinstance(result, list) and len(result) > 0:
                return result, "repaired"
    except Exception:
        pass

    return None, "none"


if __name__ == "__main__":
    # Simple CLI for testing
    import argparse
    import json
    import sys

    parser = argparse.ArgumentParser(description="Trim JSON payload")
    parser.add_argument("--file", help="JSON file to trim (or use stdin)")
    parser.add_argument("--max-items", type=int, default=DEFAULT_MAX_ITEMS)
    parser.add_argument("--max-strlen", type=int, default=DEFAULT_MAX_STRLEN)
    parser.add_argument("--minify", action="store_true", help="Output minified JSON")
    args = parser.parse_args()

    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = json.load(sys.stdin)

    policy = TrimPolicy(
        max_items=args.max_items,
        max_strlen=args.max_strlen,
    )
    policy.list_keys = {s.strip() for s in DEFAULT_LIST_KEYS.split(",")}
    policy.product_whitelist = {s.strip() for s in DEFAULT_PRODUCT_WHITELIST.split(",")}
    policy.user_whitelist = {s.strip() for s in DEFAULT_USER_WHITELIST.split(",")}

    result = trim_payload(data, policy)

    indent = None if args.minify else 2
    print(json.dumps(result.trimmed, indent=indent, ensure_ascii=False))

    print(f"\nNotes: {result.notes}", file=sys.stderr)
    print(f"Counters: {result.counters}", file=sys.stderr)
