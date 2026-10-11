#!/usr/bin/env python3
"""Sanity-check the forms corpus and its ranking.

Verifies the packed gz exists, matches the manifest, and that the shape of every
record is usable by the app and the search_forms tool. Also guards the two ways
a refresh can silently lose data:

  * a truncated upstream export — the record-count floor catches a payload that
    packed and hashed cleanly but lost records, which the manifest cannot catch
    because fetch_forms.py rewrites the manifest from the same short payload;
  * prose that advertises a stale catalog size — the tool description and the
    browser system prompt both quote the count, and `scripts/sync_forms_count.py`
    rewrites them before this check confirms the rewrite landed.

The TypeScript scorer itself is exercised by `npm run check:forms`
(scripts/check_forms.ts).

Usage: python3 scripts/check_forms.py
"""

from __future__ import annotations

import gzip
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CORPUS = ROOT / "public" / "corpus"
FORMS = CORPUS / "forms" / "FORMS.jsonl.gz"
MANIFEST = CORPUS / "manifest.json"

REQUIRED = ("number", "title", "mandatory")
EXPECTED_NUMBERS = ["FL-100", "DV-110", "UD-100", "SC-100", "FW-001", "CR-100", "JV-100", "ADOPT-200", "POS-030", "GC-210(PE)"]

# A truncated upstream response (paginated or interrupted export) would still
# pack and hash cleanly, so guard the size directly: the Judicial Council
# catalog has held ~1,670 forms since 2026, and a real shrink that large means
# the fetch lost records rather than the state retiring forms.
MIN_RECORDS = 1500

# Where the corpus size is advertised in prose; both must track the packed gz so
# a refresh cannot leave the tool description and system prompt citing a stale
# count.
ADVERTISED_COUNTS = (
    ROOT / "agent" / "tools" / "search_forms.ts",
    ROOT / "lib" / "engine.js",
)


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

    for rec in records:
        syn = rec.get("synonyms")
        if syn is None:
            continue  # packed before field_synonyms was carried over
        if not isinstance(syn, list) or not all(isinstance(s, str) and s.strip() for s in syn):
            problems.append(f"{rec.get('number')}: bad synonyms {syn!r}")
        elif any(s != s.lower() for s in syn):
            problems.append(f"{rec.get('number')}: synonyms must be lowercase {syn!r}")

    series_count = len({r["series"] for r in records})
    numbers = {r["number"] for r in records}
    if len(numbers) != len(records):
        problems.append(f"{len(records) - len(numbers)} duplicate form numbers in corpus")
    if len(records) < MIN_RECORDS:
        problems.append(
            f"only {len(records)} forms packed (expected at least {MIN_RECORDS}) — "
            "the upstream export looks truncated; refusing to shrink the corpus"
        )
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

    # Every comma-grouped number quoted in the prose that advertises the catalog
    # size must be the real size, or a refresh leaves the tool description and
    # system prompt citing a stale count.
    formatted = f"{len(records):,}"
    for path in ADVERTISED_COUNTS:
        if not path.exists():
            problems.append(f"{path.relative_to(ROOT)} is missing")
            continue
        quoted = set(re.findall(r"\b\d{1,3}(?:,\d{3})+\b", path.read_text(encoding="utf-8")))
        if quoted and quoted != {formatted}:
            problems.append(
                f"{path.relative_to(ROOT)} advertises {sorted(quoted)} but the corpus holds {formatted} forms"
            )

    categories = {r.get("category") for r in records if r.get("category")}
    mandatory = sum(1 for r in records if r.get("mandatory"))
    synonyms = sum(1 for r in records if r.get("synonyms"))
    if entry and entry.get("synonyms") is not None and entry.get("synonyms") != synonyms:
        problems.append(f"manifest synonyms={entry.get('synonyms')} but gz holds {synonyms}")
    print(
        f"{len(records)} forms | {series_count} series | {len(categories)} categories | {mandatory} mandatory | "
        f"{sum(1 for r in records if r.get('description'))} with descriptions | {synonyms} with synonyms | "
        f"sha256 {sha[:12]}"
    )
    if problems:
        print("\n".join(f"FAIL: {p}" for p in problems[:20]))
        return 1
    print("forms corpus OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
