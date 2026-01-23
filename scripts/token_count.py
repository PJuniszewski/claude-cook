#!/usr/bin/env python3
"""Token counting module using Anthropic's count_tokens API."""
from __future__ import annotations

import json
import os
import sys
import urllib.request
import urllib.error
from typing import Optional

API_URL = "https://api.anthropic.com/v1/messages/count_tokens"
API_VERSION = "2023-06-01"
DEFAULT_TIMEOUT = 15


def _log(msg: str) -> None:
    """Write debug log to file for diagnostics."""
    try:
        from datetime import datetime
        with open("/tmp/token_count_debug.log", "a") as f:
            f.write(f"{datetime.now().isoformat()} - {msg}\n")
    except:
        pass


def count_tokens(
    content: str,
    model: str,
    api_key: Optional[str] = None,
    timeout: int = DEFAULT_TIMEOUT,
) -> int:
    """
    Count tokens for content using Anthropic's count_tokens API.

    Args:
        content: The text content to count tokens for.
        model: The model name (e.g., "claude-sonnet-4-20250514").
        api_key: Anthropic API key. Falls back to ANTHROPIC_API_KEY env var.
        timeout: Request timeout in seconds.

    Returns:
        Number of input tokens.

    Raises:
        ValueError: If API key is missing.
        RuntimeError: If API request fails.
    """
    _log(f"count_tokens called: content_len={len(content)}, model={model}, timeout={timeout}")

    key = api_key or os.environ.get("ANTHROPIC_API_KEY")
    key_source = "param" if api_key else ("env" if key else "none")
    key_preview = f"{key[:8]}...{key[-4:]}" if key and len(key) > 12 else "N/A"
    _log(f"API key: source={key_source}, preview={key_preview}")

    if not key:
        _log("ERROR: ANTHROPIC_API_KEY not set")
        raise ValueError("ANTHROPIC_API_KEY not set")

    payload = {
        "model": model,
        "messages": [{"role": "user", "content": content}],
    }

    headers = {
        "Content-Type": "application/json",
        "anthropic-version": API_VERSION,
        "x-api-key": key,
    }

    data = json.dumps(payload).encode("utf-8")
    _log(f"Request payload size: {len(data)} bytes")
    req = urllib.request.Request(API_URL, data=data, headers=headers, method="POST")

    try:
        _log(f"Sending request to {API_URL} with timeout={timeout}s...")
        import time
        start = time.time()
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            elapsed = time.time() - start
            result = json.loads(resp.read().decode("utf-8"))
            tokens = result.get("input_tokens", 0)
            _log(f"SUCCESS: {tokens} tokens (took {elapsed:.2f}s)")
            return tokens
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        _log(f"HTTP ERROR {e.code}: {body[:500]}")
        raise RuntimeError(f"API error {e.code}: {body}") from e
    except urllib.error.URLError as e:
        _log(f"URL ERROR: {e.reason}")
        raise RuntimeError(f"Network error: {e.reason}") from e
    except TimeoutError as e:
        _log(f"TIMEOUT after {timeout}s")
        raise RuntimeError(f"Request timeout after {timeout}s") from e
    except Exception as e:
        _log(f"UNEXPECTED ERROR: {type(e).__name__}: {e}")
        raise RuntimeError(f"Unexpected error: {e}") from e


def count_tokens_safe(
    content: str,
    model: str,
    api_key: Optional[str] = None,
    timeout: int = DEFAULT_TIMEOUT,
    default: int = -1,
) -> int:
    """
    Count tokens with error handling. Returns default on failure.

    Args:
        content: The text content to count tokens for.
        model: The model name.
        api_key: Anthropic API key.
        timeout: Request timeout in seconds.
        default: Value to return on error.

    Returns:
        Number of input tokens, or default on error.
    """
    try:
        return count_tokens(content, model, api_key, timeout)
    except Exception as e:
        print(f"[trimmer] token count error: {e}", file=sys.stderr)
        return default


if __name__ == "__main__":
    # Simple CLI for testing
    import argparse

    parser = argparse.ArgumentParser(description="Count tokens for text content")
    parser.add_argument("--model", required=True, help="Model name")
    parser.add_argument("--file", help="File to read content from (or use stdin)")
    args = parser.parse_args()

    if args.file:
        with open(args.file, "r", encoding="utf-8") as f:
            content = f.read()
    else:
        content = sys.stdin.read()

    try:
        tokens = count_tokens(content, args.model)
        print(f"Tokens: {tokens}")
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
