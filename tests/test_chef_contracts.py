#!/usr/bin/env python3
"""
Tests for Chef Class Contract format validation.
Validates that all chef files have correct YAML frontmatter structure.

Run: python tests/test_chef_contracts.py
"""

import os
import sys
import yaml
import re
from pathlib import Path
from typing import Dict, List, Any, Tuple

# Colors for output
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"

# =============================================================================
# SCHEMA DEFINITION
# =============================================================================

REQUIRED_FIELDS = [
    "chef_id",
    "version",
    "traits",
    "non_negotiables",
    "allowed_scope",
    "escalation",
    "rubric",
    "skill_loadout",
]

TRAIT_ENUMS = {
    "risk_posture": ["conservative", "balanced", "aggressive"],
    "quality_bar": ["minimum", "standard", "high"],
    "speed_vs_correctness": ["speed-first", "balanced", "correctness-first"],
    "verbosity": ["minimal", "concise", "explicit"],
}

REQUIRED_TRAIT_FIELDS = list(TRAIT_ENUMS.keys())

REQUIRED_ALLOWED_SCOPE_FIELDS = ["can", "cannot_without_human"]

REQUIRED_ESCALATION_FIELDS = ["to_strict_mode_when", "ask_for_human_when"]

REQUIRED_RUBRIC_FIELDS = ["ready_for_merge"]

REQUIRED_SKILL_LOADOUT_FIELDS = ["preload", "optional", "enable_optional_when"]


# =============================================================================
# YAML PARSING
# =============================================================================

def extract_frontmatter(content: str) -> Tuple[Dict[str, Any], str]:
    """Extract YAML frontmatter from markdown file."""
    if not content.startswith("---"):
        return None, content

    parts = content.split("---", 2)
    if len(parts) < 3:
        return None, content

    try:
        frontmatter = yaml.safe_load(parts[1])
        body = parts[2].strip()
        return frontmatter, body
    except yaml.YAMLError as e:
        raise ValueError(f"Invalid YAML: {e}")


# =============================================================================
# VALIDATORS
# =============================================================================

def validate_required_fields(data: Dict, chef_id: str) -> List[str]:
    """Check all required top-level fields exist."""
    errors = []
    for field in REQUIRED_FIELDS:
        if field not in data:
            errors.append(f"Missing required field: {field}")
    return errors


def validate_traits(data: Dict, chef_id: str) -> List[str]:
    """Validate traits section has correct structure and enum values."""
    errors = []
    traits = data.get("traits", {})

    if not isinstance(traits, dict):
        return [f"'traits' must be a dict, got {type(traits).__name__}"]

    # Check required trait fields
    for field in REQUIRED_TRAIT_FIELDS:
        if field not in traits:
            errors.append(f"Missing trait: {field}")
        else:
            value = traits[field]
            allowed = TRAIT_ENUMS[field]
            if value not in allowed:
                errors.append(f"Invalid {field}: '{value}'. Must be one of: {allowed}")

    return errors


def validate_non_negotiables(data: Dict, chef_id: str) -> List[str]:
    """Validate non_negotiables is a non-empty list."""
    errors = []
    nn = data.get("non_negotiables", [])

    if not isinstance(nn, list):
        errors.append(f"'non_negotiables' must be a list, got {type(nn).__name__}")
    elif len(nn) == 0:
        errors.append("'non_negotiables' must have at least 1 item")

    return errors


def validate_allowed_scope(data: Dict, chef_id: str) -> List[str]:
    """Validate allowed_scope has can and cannot_without_human."""
    errors = []
    scope = data.get("allowed_scope", {})

    if not isinstance(scope, dict):
        return [f"'allowed_scope' must be a dict, got {type(scope).__name__}"]

    for field in REQUIRED_ALLOWED_SCOPE_FIELDS:
        if field not in scope:
            errors.append(f"Missing allowed_scope.{field}")
        elif not isinstance(scope[field], list):
            errors.append(f"allowed_scope.{field} must be a list")
        elif len(scope[field]) == 0:
            errors.append(f"allowed_scope.{field} must have at least 1 item")

    return errors


def validate_escalation(data: Dict, chef_id: str) -> List[str]:
    """Validate escalation has required sub-fields."""
    errors = []
    esc = data.get("escalation", {})

    if not isinstance(esc, dict):
        return [f"'escalation' must be a dict, got {type(esc).__name__}"]

    for field in REQUIRED_ESCALATION_FIELDS:
        if field not in esc:
            errors.append(f"Missing escalation.{field}")
        elif not isinstance(esc[field], list):
            errors.append(f"escalation.{field} must be a list")
        elif len(esc[field]) == 0:
            errors.append(f"escalation.{field} must have at least 1 item")

    return errors


def validate_rubric(data: Dict, chef_id: str) -> List[str]:
    """Validate rubric has ready_for_merge."""
    errors = []
    rubric = data.get("rubric", {})

    if not isinstance(rubric, dict):
        return [f"'rubric' must be a dict, got {type(rubric).__name__}"]

    for field in REQUIRED_RUBRIC_FIELDS:
        if field not in rubric:
            errors.append(f"Missing rubric.{field}")
        elif not isinstance(rubric[field], list):
            errors.append(f"rubric.{field} must be a list")
        elif len(rubric[field]) == 0:
            errors.append(f"rubric.{field} must have at least 1 item")

    return errors


def validate_skill_loadout(data: Dict, chef_id: str) -> List[str]:
    """Validate skill_loadout structure."""
    errors = []
    loadout = data.get("skill_loadout", {})

    if not isinstance(loadout, dict):
        return [f"'skill_loadout' must be a dict, got {type(loadout).__name__}"]

    # preload can be empty list
    if "preload" not in loadout:
        errors.append("Missing skill_loadout.preload")
    elif not isinstance(loadout["preload"], list):
        errors.append("skill_loadout.preload must be a list")

    # optional should exist
    if "optional" not in loadout:
        errors.append("Missing skill_loadout.optional")
    elif not isinstance(loadout["optional"], list):
        errors.append("skill_loadout.optional must be a list")

    # enable_optional_when should exist if optional is non-empty
    if loadout.get("optional") and "enable_optional_when" not in loadout:
        errors.append("Missing skill_loadout.enable_optional_when (required when optional is non-empty)")

    return errors


def validate_tool_policy(data: Dict, chef_id: str) -> List[str]:
    """Validate tool_policy if present (optional field)."""
    errors = []
    policy = data.get("tool_policy")

    if policy is None:
        return []  # Optional field

    if not isinstance(policy, dict):
        return [f"'tool_policy' must be a dict, got {type(policy).__name__}"]

    # Should have forbidden and/or allowed
    if "forbidden" not in policy and "allowed" not in policy:
        errors.append("tool_policy should have 'forbidden' and/or 'allowed'")

    for field in ["forbidden", "allowed"]:
        if field in policy and not isinstance(policy[field], list):
            errors.append(f"tool_policy.{field} must be a list")

    return errors


def validate_markdown_body(body: str, chef_id: str) -> List[str]:
    """Validate markdown body is reasonably sized."""
    errors = []

    # Count paragraphs (rough estimate)
    paragraphs = [p.strip() for p in body.split("\n\n") if p.strip() and not p.strip().startswith("#")]

    # Should have content
    if len(body.strip()) < 100:
        errors.append("Markdown body seems too short (< 100 chars)")

    return errors


# =============================================================================
# MAIN TEST RUNNER
# =============================================================================

def test_chef_file(filepath: Path) -> Tuple[str, List[str], List[str]]:
    """Test a single chef file. Returns (chef_id, errors, warnings)."""
    errors = []
    warnings = []

    try:
        content = filepath.read_text()
    except Exception as e:
        return filepath.stem, [f"Cannot read file: {e}"], []

    # Parse frontmatter
    try:
        data, body = extract_frontmatter(content)
    except ValueError as e:
        return filepath.stem, [str(e)], []

    if data is None:
        return filepath.stem, ["No YAML frontmatter found"], []

    chef_id = data.get("chef_id", filepath.stem)

    # Run all validators
    errors.extend(validate_required_fields(data, chef_id))
    errors.extend(validate_traits(data, chef_id))
    errors.extend(validate_non_negotiables(data, chef_id))
    errors.extend(validate_allowed_scope(data, chef_id))
    errors.extend(validate_escalation(data, chef_id))
    errors.extend(validate_rubric(data, chef_id))
    errors.extend(validate_skill_loadout(data, chef_id))
    errors.extend(validate_tool_policy(data, chef_id))

    # Validate body (as warnings, not errors)
    body_issues = validate_markdown_body(body, chef_id)
    warnings.extend(body_issues)

    return chef_id, errors, warnings


def find_chef_files(base_path: Path) -> List[Path]:
    """Find all chef files in chefs directories."""
    files = []

    # Check .claude/chefs/
    claude_chefs = base_path / ".claude" / "chefs"
    if claude_chefs.exists():
        files.extend(claude_chefs.glob("*_chef.md"))

    # Check chefs/ (root)
    root_chefs = base_path / "chefs"
    if root_chefs.exists():
        files.extend(root_chefs.glob("*_chef.md"))

    return sorted(set(files))


def main():
    """Run all tests."""
    # Find project root
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    print(f"\n{'='*60}")
    print("Chef Class Contract Validation Tests")
    print(f"{'='*60}\n")

    chef_files = find_chef_files(project_root)

    if not chef_files:
        print(f"{RED}No chef files found!{RESET}")
        sys.exit(1)

    print(f"Found {len(chef_files)} chef files to test\n")

    total_errors = 0
    total_warnings = 0
    results = []

    for filepath in chef_files:
        rel_path = filepath.relative_to(project_root)
        chef_id, errors, warnings = test_chef_file(filepath)

        results.append((rel_path, chef_id, errors, warnings))
        total_errors += len(errors)
        total_warnings += len(warnings)

    # Print results
    for rel_path, chef_id, errors, warnings in results:
        if errors:
            status = f"{RED}FAIL{RESET}"
        elif warnings:
            status = f"{YELLOW}WARN{RESET}"
        else:
            status = f"{GREEN}PASS{RESET}"

        print(f"[{status}] {rel_path}")

        for error in errors:
            print(f"      {RED}✗ {error}{RESET}")

        for warning in warnings:
            print(f"      {YELLOW}⚠ {warning}{RESET}")

    # Summary
    print(f"\n{'='*60}")
    print(f"Results: {len(chef_files)} files tested")
    print(f"  {GREEN}Passed:{RESET} {len([r for r in results if not r[2]])}")
    print(f"  {RED}Failed:{RESET} {len([r for r in results if r[2]])}")
    print(f"  {YELLOW}Warnings:{RESET} {total_warnings}")
    print(f"{'='*60}\n")

    if total_errors > 0:
        sys.exit(1)

    sys.exit(0)


if __name__ == "__main__":
    main()
