#!/usr/bin/env python3
"""Pack the California superior-court directory into public/corpus/courts/.

Why this exists: the site's forms corpus is the complete *statewide* Judicial
Council catalog, but every one of California's 58 superior courts also adopts
its own local forms, and the Judicial Council publishes no central index of
them — its self-help guidance simply says "find your county court to get local
forms". So the gap a filer actually hits ("does my county need anything on top
of FL-100?") cannot be closed from a single feed.

This packs the authoritative per-court directory so the app can at least route
a filer to the right court. Source: the Judicial Council's Local Rules index,
which links every one of the 58 trial courts —
  https://www4.courts.ca.gov/6168.htm

Two things worth knowing about that source:

  * Court domains are NOT uniform. 17 of the 58 are not on a
    `<county>.courts.ca.gov` subdomain at all (lacourt.org, occourts.org,
    sdcourt.ca.gov, sb-court.org, sjcourts.org, scscourt.org, stanct.org,
    nccourt.net, cc-courts.org, amadorcourt.org, mariposacourt.org,
    santacruzcourt.org, buttecourt.ca.gov, glenncourt.ca.gov,
    lassencourt.ca.gov, plumascourt.ca.gov, saccourt.ca.gov), so the list
    cannot be generated programmatically from county names.

  * The index links each court's LOCAL RULES page, not a local-forms page.
    `local_forms` is therefore only recorded where it was separately verified
    by fetching that county's site; every other court gets `site` (the court's
    own origin), which is the correct entry point. Guessing the remaining
    local-forms URLs would put fabricated links in front of filers.

Outputs:
  public/corpus/courts/COURTS.json.gz
  public/corpus/manifest.json  (adds/replaces an extras.datasets entry, key "courts")

Usage: python3 scripts/pack_courts.py
"""

from __future__ import annotations

import gzip
import hashlib
import io
import json
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
CORPUS = ROOT / "public" / "corpus"
OUT = CORPUS / "courts" / "COURTS.json.gz"

SOURCE_URL = "https://www4.courts.ca.gov/6168.htm"
OFFICIAL_SOURCE = "https://www4.courts.ca.gov/superiorcourts.htm"
RETRIEVED = "2026-10-10"

# county, court, local-rules URL from the Judicial Council index, rules
# effective date, and (only where separately verified) the local-forms page.
COURTS: list[tuple[str, str, str, str, str | None]] = [
    ("Alameda", "Superior Court of California, County of Alameda", "http://www.alameda.courts.ca.gov/Pages.aspx/Local-Rules(1)", "July 1, 2024", None),
    ("Alpine", "Superior Court of California, County of Alpine", "https://www.alpine.courts.ca.gov/generalinfo/localrules.htm", "July 1, 2024", None),
    ("Amador", "Superior Court of California, County of Amador", "http://www.amadorcourt.org/gi-localRules.aspx", "January 1, 2023", None),
    ("Butte", "Superior Court of California, County of Butte", "https://www.buttecourt.ca.gov/LocalRules/CurrentRules/", "July 1, 2024", None),
    ("Calaveras", "Superior Court of California, County of Calaveras", "http://www.calaveras.courts.ca.gov/general-info/local-rules", "July 1, 2024", None),
    ("Colusa", "Superior Court of California, County of Colusa", "https://www.colusa.courts.ca.gov/forms-filings", "July 1, 2015", None),
    ("Contra Costa", "Superior Court of California, County of Contra Costa", "https://www.cc-courts.org/general/local-rules.aspx", "January 1, 2024", None),
    ("Del Norte", "Superior Court of California, County of Del Norte", "https://www.delnorte.courts.ca.gov/general-information/local-rules", "July 1, 2023", None),
    ("El Dorado", "Superior Court of California, County of El Dorado", "https://www.eldorado.courts.ca.gov/general-information/local-rules-information-services", "July 1, 2024", None),
    ("Fresno", "Superior Court of California, County of Fresno", "https://www.fresno.courts.ca.gov/forms-filing/local-rules", "July 1, 2024", None),
    ("Glenn", "Superior Court of California, County of Glenn", "http://www.glenncourt.ca.gov/general-info/local-rules.shtml", "July 1, 2022", None),
    ("Humboldt", "Superior Court of California, County of Humboldt", "https://www.humboldt.courts.ca.gov/forms-filings/local-rules", "July 1, 2024", None),
    ("Imperial", "Superior Court of California, County of Imperial", "https://www.imperial.courts.ca.gov/general-information/local-rules", "July 1, 2024", None),
    ("Inyo", "Superior Court of California, County of Inyo", "https://www.inyo.courts.ca.gov/forms-filing/local-rules", "July 1, 2024", None),
    ("Kern", "Superior Court of California, County of Kern", "https://www.kern.courts.ca.gov/forms-filing/local-rules-court", "July 1, 2024", None),
    ("Kings", "Superior Court of California, County of Kings", "https://www.kings.courts.ca.gov/generalinfo/localrules.htm", "July 1, 2024", None),
    ("Lake", "Superior Court of California, County of Lake", "https://www.lake.courts.ca.gov/ff/index.htm", "July 1, 2024", None),
    ("Lassen", "Superior Court of California, County of Lassen", "http://www.lassencourt.ca.gov/general_info/localrules.shtml", "July 1, 2024", None),
    ("Los Angeles", "Superior Court of California, County of Los Angeles", "http://www.lacourt.org/courtrules/ui/index.aspx?tab=2", "July 1, 2024", None),
    ("Madera", "Superior Court of California, County of Madera", "https://www.madera.courts.ca.gov/general-information/local-rules", "July 1, 2024", None),
    ("Marin", "Superior Court of California, County of Marin", "https://www.marin.courts.ca.gov/general-information/local-rules", "July 1, 2024", None),
    ("Mariposa", "Superior Court of California, County of Mariposa", "http://www.mariposacourt.org/generalinfo/localrules.shtml", "January 1, 2019", None),
    ("Mendocino", "Superior Court of California, County of Mendocino", "https://www.mendocino.courts.ca.gov/general_info/courtrules.html", "July 1, 2024", None),
    ("Merced", "Superior Court of California, County of Merced", "http://www.merced.courts.ca.gov/local_rules.shtml", "July 1, 2024", None),
    ("Modoc", "Superior Court of California, County of Modoc", "https://www.modoc.courts.ca.gov/generalinfo/local-rules.htm", "July 1, 2024", None),
    ("Mono", "Superior Court of California, County of Mono", "http://www.mono.courts.ca.gov/generalinfo/localrules.htm", "July 1, 2024", None),
    ("Monterey", "Superior Court of California, County of Monterey", "https://www.monterey.courts.ca.gov/general-information/local-rules-court", "July 1, 2024", None),
    ("Napa", "Superior Court of California, County of Napa", "http://www.napa.courts.ca.gov/general-info/local-rules", "July 1, 2024", None),
    ("Nevada", "Superior Court of California, County of Nevada", "http://nccourt.net/forms/local-rules.shtml", "July 1, 2024", None),
    ("Orange", "Superior Court of California, County of Orange", "http://www.occourts.org/directory/local-rules/local-rules-of-court/", "July 1, 2024", None),
    ("Placer", "Superior Court of California, County of Placer", "https://www.placer.courts.ca.gov/forms-filing/local-rules-court", "July 1, 2024", None),
    ("Plumas", "Superior Court of California, County of Plumas", "http://www.plumascourt.ca.gov/Local%20Rules.htm", "July 1, 2024", None),
    ("Riverside", "Superior Court of California, County of Riverside", "https://www.riverside.courts.ca.gov/GeneralInfo/LocalRules/local-rules.php", "July 1, 2024", None),
    ("Sacramento", "Superior Court of California, County of Sacramento", "http://www.saccourt.ca.gov/local-rules/local-rules.aspx", "July 1, 2024", None),
    ("San Benito", "Superior Court of California, County of San Benito", "https://www.sanbenito.courts.ca.gov/general-information/local-rules", "July 1, 2024", None),
    ("San Bernardino", "Superior Court of California, County of San Bernardino", "http://www.sb-court.org/FormsandRules.aspx", "July 1, 2024", "https://sanbernardino.courts.ca.gov/forms-filing/local-forms"),
    ("San Diego", "Superior Court of California, County of San Diego", "http://www.sdcourt.ca.gov/pls/portal/url/page/sdcourt/generalinformation/localrulesofcourt", "January 1, 2024", None),
    ("San Francisco", "Superior Court of California, County of San Francisco", "https://sf.courts.ca.gov/general-information/local-rules-court", "July 1, 2024", "https://sf.courts.ca.gov/forms-fees/local-forms"),
    ("San Joaquin", "Superior Court of California, County of San Joaquin", "https://www.sjcourts.org/general-info/local-rules/", "July 1, 2024", "https://www.sjcourts.org/local-forms"),
    ("San Luis Obispo", "Superior Court of California, County of San Luis Obispo", "http://www.slo.courts.ca.gov/gi/rules.htm", "July 1, 2024", None),
    ("San Mateo", "Superior Court of California, County of San Mateo", "https://www.sanmateo.courts.ca.gov/general-information/local-rules", "July 1, 2024", "https://sanmateo.courts.ca.gov/forms-filing/local-forms"),
    ("Santa Barbara", "Superior Court of California, County of Santa Barbara", "https://www.santabarbara.courts.ca.gov/forms-filing/local-rules", "January 1, 2024", None),
    ("Santa Clara", "Superior Court of California, County of Santa Clara", "http://www.scscourt.org/general_info/rules/rules_home.shtml", "July 1, 2024", None),
    ("Santa Cruz", "Superior Court of California, County of Santa Cruz", "http://www.santacruzcourt.org/forms-filing/local-rules", "July 1, 2024", "https://www.santacruz.courts.ca.gov/forms-filing/local-forms"),
    ("Shasta", "Superior Court of California, County of Shasta", "http://www.shasta.courts.ca.gov/PDFs/ROC.pdf", "July 1, 2024", "https://shasta.courts.ca.gov/forms-filing/local-forms"),
    ("Sierra", "Superior Court of California, County of Sierra", "https://www.sierra.courts.ca.gov/forms-filing", "July 1, 2024", None),
    ("Siskiyou", "Superior Court of California, County of Siskiyou", "http://www.siskiyou.courts.ca.gov/generalinfo/localrules.htm", "July 1, 2024", None),
    ("Solano", "Superior Court of California, County of Solano", "https://solano.courts.ca.gov/administration/local-rules-of-court/", "July 1, 2024", "https://solano.courts.ca.gov/court-forms"),
    ("Sonoma", "Superior Court of California, County of Sonoma", "http://sonoma.courts.ca.gov/info/local-rules", "July 1, 2024", None),
    ("Stanislaus", "Superior Court of California, County of Stanislaus", "http://www.stanct.org/local-rules-fee-schedule", "July 1, 2024", None),
    ("Sutter", "Superior Court of California, County of Sutter", "https://www.sutter.courts.ca.gov/general-information/local-rules-court", "July 1, 2018", None),
    ("Tehama", "Superior Court of California, County of Tehama", "https://www.tehama.courts.ca.gov/general-information/local-rules", "January 1, 2015", None),
    ("Trinity", "Superior Court of California, County of Trinity", "https://www.trinity.courts.ca.gov/general-information/local-rules", "July 1, 2021", None),
    ("Tulare", "Superior Court of California, County of Tulare", "https://www.tulare.courts.ca.gov/forms-filing", "July 1, 2024", None),
    ("Tuolumne", "Superior Court of California, County of Tuolumne", "https://www.tuolumne.courts.ca.gov/forms-filing/local-rules", "January 1, 2023", None),
    ("Ventura", "Superior Court of California, County of Ventura", "http://www.ventura.courts.ca.gov/local-rules.html", "July 1, 2024", None),
    ("Yolo", "Superior Court of California, County of Yolo", "https://www.yolo.courts.ca.gov/general-information/local-rules-news-notices-orders-and-policies", "January 1, 2023", None),
    ("Yuba", "Superior Court of California, County of Yuba", "https://www.yuba.courts.ca.gov/general-information/local-rules-court", "January 1, 2024", None),
]

EXPECTED_COUNTIES = 58


def origin(url: str) -> str:
    p = urlparse(url)
    return f"{p.scheme}://{p.netloc}" if p.netloc else url


def build() -> list[dict]:
    out = []
    for county, court, rules_url, effective, forms_url in COURTS:
        rec = {
            "county": county,
            "court": court,
            # Derived from the Judicial Council index link so `site` is always
            # traceable to the authoritative source. Note that a court can run
            # more than one origin — San Bernardino's rules are on sb-court.org
            # while its local forms are on sanbernardino.courts.ca.gov — so
            # `local_forms` is stored as a full URL rather than a path.
            "site": origin(rules_url),
            "local_rules": rules_url,
            "rules_effective": effective,
        }
        # Only where the page was actually fetched — see module docstring.
        if forms_url:
            rec["local_forms"] = forms_url
        out.append(rec)
    out.sort(key=lambda r: r["county"])
    return out


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
    datasets = [d for d in extras.get("datasets", []) if d.get("key") != "courts"]
    datasets.append(entry)
    extras["datasets"] = datasets
    path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    courts = build()
    if len(courts) != EXPECTED_COUNTIES:
        print(
            f"FAIL: {len(courts)} courts, expected {EXPECTED_COUNTIES} — California has one "
            "superior court per county, so a different number means this table is incomplete",
            file=sys.stderr,
        )
        return 1
    counties = {c["county"] for c in courts}
    if len(counties) != len(courts):
        print("FAIL: duplicate county in court directory", file=sys.stderr)
        return 1

    payload = json.dumps(courts, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    sha = write_gz(OUT, payload)
    verified = sum(1 for c in courts if c.get("local_forms"))
    update_manifest({
        "sha256": sha,
        "key": "courts",
        "name": "Superior Court Directory (58 counties)",
        "file": "courts/COURTS.json.gz",
        "courts": len(courts),
        "local_forms_verified": verified,
        # A fixed date, not datetime.now(): this table is curated from the index
        # rather than re-scraped, so stamping the clock would make every run look
        # like a change and commit noise. It records when the index was read.
        "retrieved_at": RETRIEVED,
        "source": SOURCE_URL,
        "official_source": OFFICIAL_SOURCE,
    })
    print(
        f"wrote {OUT.relative_to(ROOT)} — {len(courts)} courts, "
        f"{verified} with a verified local-forms page, sha256 {sha[:12]}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
