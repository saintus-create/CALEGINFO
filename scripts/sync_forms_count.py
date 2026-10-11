#!/usr/bin/env python3
"""Keep the advertised forms-catalog size in sync with the packed corpus.

Two places quote the catalog size in prose — the search_forms tool description
and the browser system prompt. `scripts/check_forms.py` fails when either
drifts from the packed gz, which is the point: a stale "1,670 forms" tells the
model it has coverage it does not have. But that guard must not *block* a
legitimate refresh, so this rewrites the quoted figure first and the check then
confirms the rewrite landed.

Each file is expected to quote exactly one distinct comma-grouped number (the
catalog size). If that ever stops being true the script refuses to guess which
figure to replace, rather than silently rewriting an unrelated number.

Usage: python3 scripts/sync_forms_count.py
"""

from __future__ import annotations

import gzip
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FORMS = ROOT / "public" / "corpus" / "forms" / "FORMS.jsonl.gz"

# Files that quote the catalog size, and the single token each must quote.
ADVERTISED = (
    ROOT / "agent" / "tools" / "search_forms.ts",
    ROOT / "lib" / "engine.js",
)

GROUPED_NUMBER = re.compile(r"\b\d{1,3}(?:,\d{3})+\b")


def main() -> int:
    if not FORMS.exists():
        print(f"FAIL: {FORMS.relative_to(ROOT)} is missing — nothing to sync against", file=sys.stderr)
        return 1

    with gzip.open(FORMS, "rt", encoding="utf-8") as fh:
        count = sum(1 for line in fh if line.strip())
    formatted = f"{count:,}"
    print(f"corpus holds {formatted} forms")

    changed: list[str] = []
    problems: list[str] = []
    for path in ADVERTISED:
        rel = path.relative_to(ROOT)
        if not path.exists():
            problems.append(f"{rel} is missing")
            continue
        text = path.read_text(encoding="utf-8")
        quoted = set(GROUPED_NUMBER.findall(text))
        if not quoted:
            # The file stopped quoting a size — nothing to drift, nothing to do.
            continue
        if quoted == {formatted}:
            continue
        if len(quoted) > 1:
            problems.append(
                f"{rel} quotes several comma-grouped numbers {sorted(quoted)}; "
                f"cannot tell which is the catalog size — update it by hand"
            )
            continue
        stale = quoted.pop()
        path.write_text(text.replace(stale, formatted), encoding="utf-8")
        changed.append(f"{rel}: {stale} -> {formatted}")

    for line in changed:
        print(f"  updated {line}")
    if not changed:
        print("  advertised counts already current")
    if problems:
        print("\n".join(f"FAIL: {p}" for p in problems), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
