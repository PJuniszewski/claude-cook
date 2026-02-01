#!/usr/bin/env python3
"""
Tests for chef files in .claude/agents/.
Verifies that all expected chef files exist with correct structure.

Run: python3 tests/test_chef_sync.py
"""

import os
import sys
import re
from pathlib import Path

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"

EXPECTED_CHEFS = [
    "architect_chef.md",
    "docs_chef.md",
    "engineer_chef.md",
    "product_chef.md",
    "qa_chef.md",
    "release_chef.md",
    "sanitation_inspector_chef.md",
    "security_chef.md",
    "sous_chef.md",
    "ux_chef.md",
]

REQUIRED_FIELDS = [
    "chef_id",
    "version",
    "phase_affinity",
    "output_contract",
    "traits",
    "non_negotiables",
    "allowed_scope",
    "escalation",
    "rubric",
]


def check_chef_structure(filepath: Path) -> list[str]:
    """Check if chef file has required YAML fields."""
    content = filepath.read_text()
    errors = []

    for field in REQUIRED_FIELDS:
        if f"{field}:" not in content:
            errors.append(f"Missing field: {field}")

    # Check for review_v1 output contract
    if "format: review_v1" not in content:
        errors.append("Missing output_contract format: review_v1")

    return errors


def main():
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    agents_dir = project_root / ".claude" / "agents"

    print(f"\n{'='*60}")
    print("Chef Files Validation Test")
    print(f"{'='*60}\n")

    if not agents_dir.exists():
        print(f"{RED}.claude/agents/ does not exist{RESET}")
        sys.exit(1)

    # Get all chef files
    chef_files = {f.name: f for f in agents_dir.glob("*_chef.md")}

    print(f"Found {len(chef_files)} chef files in .claude/agents/\n")

    errors = []
    warnings = []

    # Check for expected chefs
    for expected in EXPECTED_CHEFS:
        if expected not in chef_files:
            errors.append(f"Missing expected chef: {expected}")

    # Check each chef file structure
    for name, filepath in sorted(chef_files.items()):
        structure_errors = check_chef_structure(filepath)

        if structure_errors:
            print(f"  [{RED}INVALID{RESET}] {name}")
            for err in structure_errors:
                print(f"      - {err}")
            errors.extend([f"{name}: {e}" for e in structure_errors])
        else:
            print(f"  [{GREEN}VALID{RESET}] {name}")

    if warnings:
        print(f"\n{YELLOW}Warnings:{RESET}")
        for w in warnings:
            print(f"  ⚠ {w}")

    if errors:
        print(f"\n{RED}Errors:{RESET}")
        for e in errors:
            print(f"  ✗ {e}")

    print(f"\n{'='*60}")
    if errors:
        print(f"{RED}VALIDATION FAILED{RESET}")
        sys.exit(1)
    else:
        print(f"{GREEN}All chef files are valid{RESET}")
        sys.exit(0)


if __name__ == "__main__":
    main()
