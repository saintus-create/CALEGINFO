#!/usr/bin/env python3
"""Sanity-check the forms corpus and its ranking.

Verifies the packed gz exists, matches the manifest, and that the shape of every
record is usable by the app and the search_forms tool. The TypeScript scorer
itself is exercised by `npm run check:forms` (scripts/check_forms.ts).

Usage: python3 scripts/check_forms.py
"""

from __future__ import annotations

import gzip
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CORPUS = ROOT / "public" / "corpus"
FORMS = CORPUS / "forms" / "FORMS.jsonl.gz"
MANIFEST = CORPUS / "manifest.json"

REQUIRED = ("number", "title", "mandatory")
EXPECTED_NUMBERS = ["FL-100", "DV-110", "UD-100", "SC-100", "FW-001", "CR-100", "JV-100", "ADOPT-200", "POS-030", "GC-210(PE)"]


def main() -> int:
    if not FORMS.exists():
        print(f"FAIL: {FORMS.relative_to(ROOT)} is missing — run the update workflow or scripts/fetch_forms.py")
        return 1

    raw = FORMS.read_bytes()
    records = [json.loads(line) for line in gzip.decompress(raw).decode("utf-8").splitlines() if line.strip()]
    problems: list[str] = []

    for rec in records:
        for key in REQUIRED:
            if key not in rec:
                problems.append(f"{rec.get('number', '?')}: missing {key}")
        if not rec.get("pdf_url", "").startswith("https://www.courts.ca.gov/documents/"):
            problems.append(f"{rec.get('number')}: unexpected pdf_url {rec.get('pdf_url')!r}")
        if not rec.get("effective"):
            problems.append(f"{rec.get('number')}: no effective date")

    for rec in records:
        series = str(rec.get("series") or "")
        if not series or not series.isalpha():
            problems.append(f"{rec.get('number')}: bad series {series!r}")
        elif not (str(rec.get("number", "")).startswith(series) or str(rec.get("prefix", "")).startswith(series)):
            problems.append(f"{rec.get('number')}: series {series!r} does not match number/prefix")

    series_count = len({r["series"] for r in records})
    numbers = {r["number"] for r in records}
    for expected in EXPECTED_NUMBERS:
        if expected not in numbers:
            problems.append(f"expected form {expected} not in corpus")

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    entry = next((d for d in manifest.get("extras", {}).get("datasets", []) if d.get("key") == "forms"), None)
    sha = hashlib.sha256(raw).hexdigest()
    if not entry:
        problems.append("manifest has no extras.datasets entry with key 'forms'")
    else:
        if entry.get("sha256") != sha:
            problems.append("manifest sha256 does not match FORMS.jsonl.gz (repack and update the manifest)")
        if entry.get("records") != len(records):
            problems.append(f"manifest records={entry.get('records')} but gz holds {len(records)}")
        if entry.get("series") not in (None, series_count):
            problems.append(f"manifest series={entry.get('series')} but gz holds {series_count}")

    categories = {r.get("category") for r in records if r.get("category")}
    mandatory = sum(1 for r in records if r.get("mandatory"))
    print(
        f"{len(records)} forms | {series_count} series | {len(categories)} categories | {mandatory} mandatory | "
        f"{sum(1 for r in records if r.get('description'))} with descriptions | sha256 {sha[:12]}"
    )
    if problems:
        print("\n".join(f"FAIL: {p}" for p in problems[:20]))
        return 1
    print("forms corpus OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
