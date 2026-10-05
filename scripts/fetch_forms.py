#!/usr/bin/env python3
"""Build the California court forms corpus for public/corpus/forms/.

Source (official, live): the Judicial Council's self-help portal exposes the
complete statewide Judicial Council forms catalog as JSON —
  https://selfhelp.courts.ca.gov/json/jcc-forms
(Drupal view "jcc_forms_search_json_api", REST export display.)

Each record carries the form number, title, plain-language description, the
topic category, the mandatory-use flag, the effective/revision date(s), the
official PDF URL, the form-information page, and translation URLs.

Outputs:
  public/corpus/forms/FORMS.jsonl.gz   gzip'd JSONL, one form per line
  public/corpus/manifest.json          gains/replaces an "extras.datasets" entry
                                       with key "forms" ("datasets" untouched)

The app consumes the gz in the browser via DecompressionStream, exactly like
the bills / rules / directory corpora (see scripts/pack_extras.py).

This sandboxed dev environment cannot reach courts.ca.gov, so the request is
run by .github/workflows/update-forms.yml on a GitHub runner, which commits
the refreshed corpus back to the branch. Running it locally works anywhere
with ordinary internet access:

  python3 scripts/fetch_forms.py            # fetch live
  python3 scripts/fetch_forms.py --input jcc-forms.json   # use a saved payload
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import re
import sys
import time
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CORPUS = ROOT / "public" / "corpus"
OUT = CORPUS / "forms" / "FORMS.jsonl.gz"

SOURCE_URL = "https://selfhelp.courts.ca.gov/json/jcc-forms"
OFFICIAL_SOURCE = "https://selfhelp.courts.ca.gov/find-forms/all-by-category"
UA = "caleginfo-forms-packer/1.0 (+https://github.com/saintus-create/CALEGINFO)"

MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def fetch(url: str, attempts: int = 4) -> bytes:
    last: Exception | None = None
    for i in range(attempts):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as resp:
                return resp.read()
        except Exception as e:  # noqa: BLE001 - retry any transport error
            last = e
            print(f"  attempt {i + 1}/{attempts} failed: {e}", file=sys.stderr)
            time.sleep(3 * (i + 1))
    raise SystemExit(f"could not download {url}: {last}")


def parse_date(raw: str) -> str | None:
    """'07/01/2025' -> 'July 1, 2025'"""
    raw = (raw or "").strip()
    if not raw:
        return None
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%m/%d/%y"):
        try:
            d = datetime.strptime(raw, fmt)
            return f"{MONTHS[d.month - 1]} {d.day}, {d.year}"
        except ValueError:
            continue
    return raw


def sort_key_date(raw: str) -> tuple[int, int, int]:
    raw = (raw or "").strip()
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%m/%d/%y"):
        try:
            d = datetime.strptime(raw, fmt)
            return (d.year, d.month, d.day)
        except ValueError:
            continue
    return (0, 0, 0)


def clean(text: object) -> str:
    return " ".join(str(text or "").split())


def series_of(number: str, prefix: str) -> str:
    """Form family used for grouping: 'FL-1XX' -> 'FL', 'CP10' -> 'CP'.

    The source splits some families into number ranges (FL-1XX ... FL-9XX) and
    omits the prefix for a few forms (CP10, CP10.5, GDC-001), so fall back to
    the leading letters of the form number.
    """
    head = (prefix or "").split("-")[0]
    if head.isalpha():
        return head
    match = re.match(r"^([A-Z]+)", number or "")
    return match.group(1) if match else (prefix or "")


def normalize(rec: dict) -> dict | None:
    number = clean(rec.get("id")).upper()
    if not number:
        return None
    title = clean(rec.get("title"))
    if not title:
        return None

    raw_dates = [d.strip() for d in str(rec.get("field_date_effective") or "").split(",") if d.strip()]
    raw_dates.sort(key=sort_key_date, reverse=True)
    effective = parse_date(raw_dates[0]) if raw_dates else None

    languages = {
        clean(k).lower(): v for k, v in dict(rec.get("other_languages") or {}).items() if v
    }

    mandatory = str(rec.get("field_mandatory") or "").strip().lower() in {"true", "1", "yes"}

    out = {
        "number": number,
        "title": title,
        "mandatory": mandatory,
        "series": series_of(number, clean(rec.get("form_prefix")).upper()),
    }
    optional = {
        "category": clean(rec.get("form_category")) or clean(rec.get("form_prefix_category")),
        "prefix": clean(rec.get("form_prefix")).upper(),
        "effective": effective,
        "effective_dates": raw_dates,
        "description": clean(rec.get("description")),
        "pdf_url": clean(rec.get("url")),
        "info_url": clean(rec.get("alias")),
        "languages": sorted(languages.keys()),
        "language_urls": languages,
    }
    for key, value in optional.items():
        if value not in ("", None, [], {}):
            out[key] = value
    return out


def build(records: list[dict]) -> list[dict]:
    out: dict[str, dict] = {}
    for rec in records:
        norm = normalize(rec)
        if not norm:
            continue
        prev = out.get(norm["number"])
        if prev is None:
            out[norm["number"]] = norm
            continue
        # keep the richer record (more fields populated) for duplicate numbers
        if len(norm) > len(prev):
            out[norm["number"]] = norm
    forms = sorted(out.values(), key=lambda f: (f["series"], f["number"]))
    return forms


def write_gz(path: Path, payload: bytes) -> str:
    path.parent.mkdir(parents=True, exist_ok=True)
    buf = io.BytesIO()
    with gzip.GzipFile(fileobj=buf, mode="wb", mtime=0) as f:
        f.write(payload)
    data = buf.getvalue()
    path.write_bytes(data)
    return hashlib.sha256(data).hexdigest()


def update_manifest(entry: dict) -> None:
    path = CORPUS / "manifest.json"
    manifest = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    extras = manifest.setdefault("extras", {})
    extras.setdefault("format", "fern-corpus-extras-v1")
    datasets = [d for d in extras.get("datasets", []) if d.get("key") != "forms"]
    datasets.append(entry)
    extras["datasets"] = datasets
    path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", help="read a saved JSON payload instead of fetching")
    args = ap.parse_args()

    if args.input:
        raw = Path(args.input).read_bytes()
    else:
        print(f"fetching {SOURCE_URL}", file=sys.stderr)
        raw = fetch(SOURCE_URL)

    records = json.loads(raw.decode("utf-8"))
    if not isinstance(records, list) or not records:
        raise SystemExit("unexpected payload: expected a non-empty JSON array")

    forms = build(records)
    payload = "\n".join(json.dumps(f, ensure_ascii=False, separators=(",", ":")) for f in forms).encode("utf-8") + b"\n"
    sha = write_gz(OUT, payload)

    categories = sorted({f["category"] for f in forms if f.get("category")})
    prefixes = sorted({f["prefix"] for f in forms if f.get("prefix")})
    series = sorted({f["series"] for f in forms if f.get("series")})
    entry = {
        "sha256": sha,
        "key": "forms",
        "name": "Judicial Council Forms (statewide)",
        "file": "forms/FORMS.jsonl.gz",
        "records": len(forms),
        "mandatory": sum(1 for f in forms if f.get("mandatory")),
        "categories": len(categories),
        "prefixes": len(prefixes),
        "series": len(series),
        "retrieved_at": datetime.now(timezone.utc).isoformat(),
        "source": SOURCE_URL,
        "official_source": OFFICIAL_SOURCE,
    }
    update_manifest(entry)

    print(f"wrote {OUT.relative_to(ROOT)} — {len(forms)} forms, {len(categories)} categories, sha256 {sha[:12]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
