# California Legislative Information

AI legal research for California law. Ask a question and the research engine retrieves
and cites the governing authority inline:

- **California Codes** — all 29 codes plus the Constitution (162,324 sections, full text)
- **Bills** — the complete 2025–2026 session catalog (5,062 measures) plus optional live
  full-text bill search and bill-detail lookup via Firecrawl
- **Rules of Court** — all 1,501 California Rules of Court
- **Forms** — every statewide Judicial Council form (1,670 forms: numbers, titles,
  plain-language descriptions, mandatory-use flags, effective dates, fillable PDFs,
  translations)
- **Case law** — CourtListener search, plus curated Family Code / DVPA annotations

## Layout

```
app/               Next.js app router (chat at /, library at /codes /bills /rules /forms /directory)
agent/             research engine: tools (search_statutes, search_bills, search_rules,
                   search_forms, search_cases, lookup_section, bill_text_search, bill_detail)
                   and the evidence-ledger research pipeline
components/        chat UI (assistant-ui), browser shells, shadcn primitives
lib/engine.js      browser-side corpus loader, search + scoring, LLM pipeline
public/corpus/     gzip'd corpora consumed by the app (law/, legislation/, rules/, forms/, directory/, cases/)
scripts/           corpus packers that build public/corpus/*
```

## Forms corpus

`public/corpus/forms/FORMS.jsonl.gz` is built by `scripts/fetch_forms.py` from the Judicial
Council's live catalog at `https://selfhelp.courts.ca.gov/json/jcc-forms` (the REST export of
the self-help portal's form index). Each record carries the form number, title, category,
mandatory-use flag, effective date(s), description, official PDF URL, form-information page,
and translation URLs. Each record also carries `series` — the form family used for grouping and
browsing (FL, DV, JV, SC, UD, CP10, GDC, …).

The dev sandbox has no egress to courts.ca.gov, so
`.github/workflows/update-forms.yml` runs the fetch on a GitHub runner and commits the
refreshed gz plus the `extras.datasets[forms]` entry in `public/corpus/manifest.json` back to
the branch. Run it locally anywhere with ordinary internet access:

```bash
python3 scripts/fetch_forms.py                     # fetch live and repack
python3 scripts/fetch_forms.py --input saved.json  # repack a saved payload
```

Other corpora are packed from the saintus-create source repos by `scripts/pack_extras.py`.

## Development

```bash
npm install
npm run dev              # http://localhost:3000
npm run build
npm run check:forms      # forms scorer expectations (needs the packed corpus)
npm run check:forms:corpus  # forms corpus shape + manifest sha256
```

Optional environment variables (see `.env.example`): `SARVAM_API_KEY` for the default model,
`OPENROUTER_API_KEY` for the unfiltered model, `FIRECRAWL_API_KEY` for live bill text/detail
tools, and `DATABASE_URL` / Upstash / Vercel auth vars for production mode.
