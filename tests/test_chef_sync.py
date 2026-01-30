#!/usr/bin/env python3
"""
Tests for chef file synchronization between directories.
Ensures .claude/chefs/ and chefs/ are in sync.

Run: python3 tests/test_chef_sync.py
"""

import os
import sys
import hashlib
from pathlib import Path

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"


def get_file_hash(filepath: Path) -> str:
    """Get MD5 hash of file content."""
    return hashlib.md5(filepath.read_bytes()).hexdigest()


def main():
    script_dir = Path(__file__).parent
    project_root = script_dir.parent

    claude_chefs_dir = project_root / ".claude" / "chefs"
    root_chefs_dir = project_root / "chefs"

    print(f"\n{'='*60}")
    print("Chef File Synchronization Test")
    print(f"{'='*60}\n")

    if not claude_chefs_dir.exists():
        print(f"{RED}.claude/chefs/ does not exist{RESET}")
        sys.exit(1)

    if not root_chefs_dir.exists():
        print(f"{YELLOW}chefs/ does not exist - skipping sync check{RESET}")
        sys.exit(0)

    # Get all chef files from .claude/chefs/
    claude_chefs = {f.name: f for f in claude_chefs_dir.glob("*_chef.md")}
    root_chefs = {f.name: f for f in root_chefs_dir.glob("*_chef.md")}

    errors = []
    warnings = []

    # Check for missing files
    missing_in_root = set(claude_chefs.keys()) - set(root_chefs.keys())
    missing_in_claude = set(root_chefs.keys()) - set(claude_chefs.keys())

    for name in missing_in_root:
        warnings.append(f"Missing in chefs/: {name}")

    for name in missing_in_claude:
        warnings.append(f"Missing in .claude/chefs/: {name}")

    # Check for content differences
    common = set(claude_chefs.keys()) & set(root_chefs.keys())
    out_of_sync = []

    for name in sorted(common):
        claude_hash = get_file_hash(claude_chefs[name])
        root_hash = get_file_hash(root_chefs[name])

        if claude_hash != root_hash:
            out_of_sync.append(name)
            errors.append(f"OUT OF SYNC: {name}")

    # Print results
    print(f"Files in .claude/chefs/: {len(claude_chefs)}")
    print(f"Files in chefs/: {len(root_chefs)}")
    print(f"Common files: {len(common)}")
    print()

    for name in sorted(common):
        if name in out_of_sync:
            status = f"{RED}OUT OF SYNC{RESET}"
        else:
            status = f"{GREEN}IN SYNC{RESET}"
        print(f"  [{status}] {name}")

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
        print(f"{RED}SYNC CHECK FAILED{RESET}")
        print(f"Run: cp .claude/chefs/*_chef.md chefs/")
        sys.exit(1)
    else:
        print(f"{GREEN}All common files are in sync{RESET}")
        sys.exit(0)


if __name__ == "__main__":
    main()
