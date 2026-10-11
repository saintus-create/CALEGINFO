import React, { useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlass,
  ArrowSquareOut,
  CircleNotch,
  FileText,
  Download,
  CheckCircle,
  Translate,
  X,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { loadExtras, extras, extraMeta, formSeries, rankForms } from "@/lib/engine";

const LANGUAGE_LABELS = {
  spanish: "Spanish",
  chinese: "Chinese",
  chinese_traditional: "Chinese (traditional)",
  korean: "Korean",
  vietnamese: "Vietnamese",
  tagalog: "Tagalog",
  arabic: "Arabic",
  farsi: "Farsi",
  hmong: "Hmong",
  punjabi: "Punjabi",
  russian: "Russian",
  cambodian: "Cambodian",
};

function FormRow({ f, onCategory }) {
  const languages = (f.languages || []).filter((l) => f.language_urls && f.language_urls[l]);
  return (
    <div className="p-3.5 hover:bg-muted/40 transition-colors">
      <div className="flex items-start gap-2 flex-wrap">
        <span className="font-mono text-[13px] font-semibold tracking-tight">{f.number}</span>
        {f.mandatory ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle weight="fill" className="h-2.5 w-2.5" /> Mandatory
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            Optional use
          </span>
        )}
        {f.category && (
          <button
            className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            onClick={() => onCategory(f.category)}
            type="button"
          >
            {f.category}
          </button>
        )}
        {f.effective && (
          <span className="ml-auto whitespace-nowrap text-[11px] text-muted-foreground">
            Effective {f.effective}
          </span>
        )}
      </div>

      <div className="mt-1.5 text-[13px] font-medium leading-snug">{f.title}</div>
      {f.description && (
        <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.description}</div>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]">
        {f.pdf_url && (
          <a
            className="inline-flex items-center gap-1 rounded-md border border-foreground/15 px-2 py-1 font-medium text-foreground transition-colors hover:border-foreground/35 hover:bg-muted"
            href={f.pdf_url}
            target="_blank"
            rel="noopener"
          >
            <Download className="h-3 w-3" /> Fillable PDF
          </a>
        )}
        {f.info_url && (
          <a
            className="inline-flex items-center gap-1 rounded-md border border-foreground/15 px-2 py-1 font-medium text-foreground transition-colors hover:border-foreground/35 hover:bg-muted"
            href={f.info_url}
            target="_blank"
            rel="noopener"
          >
            Form info <ArrowSquareOut className="h-3 w-3" />
          </a>
        )}
        {languages.length > 0 && (
          <details className="inline-block">
            <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-md border border-foreground/15 px-2 py-1 font-medium text-foreground transition-colors hover:border-foreground/35 hover:bg-muted [&::-webkit-details-marker]:hidden">
              <Translate className="h-3 w-3" /> {languages.length} translation{languages.length > 1 ? "s" : ""}
            </summary>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {languages.map((l) => (
                <a
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                  href={f.language_urls[l]}
                  key={l}
                  target="_blank"
                  rel="noopener"
                >
                  {LANGUAGE_LABELS[l] || l}
                </a>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

export default function Forms({ jumpForm }) {
  const [ready, setReady] = useState(extras.forms.length > 0);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState(jumpForm || "");
  const [category, setCategory] = useState("all");
  const [series, setSeries] = useState("all");
  const [mandatoryOnly, setMandatoryOnly] = useState(false);
  const [shown, setShown] = useState(60);

  useEffect(() => {
    let on = true;
    loadExtras()
      .then((ok) => {
        if (on) {
          setReady(extras.forms.length > 0);
          setFailed(!ok && extras.forms.length === 0);
        }
      })
      .catch(() => on && setFailed(true));
    return () => {
      on = false;
    };
  }, []);

  useEffect(() => {
    if (jumpForm) setQuery(jumpForm);
  }, [jumpForm]);

  const meta = extraMeta("forms") || {};
  const total = meta.records || extras.forms.length;
  const mandatoryCount = meta.mandatory || extras.forms.filter((f) => f.mandatory).length;

  const categories = useMemo(() => {
    if (!ready) return [];
    const counts = new Map();
    for (const f of extras.forms) {
      const c = f.category || "Uncategorized";
      counts.set(c, (counts.get(c) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [ready]);

  const prefixes = useMemo(() => {
    if (!ready) return [];
    const counts = new Map();
    for (const f of extras.forms) {
      const p = formSeries(f);
      if (p) counts.set(p, (counts.get(p) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [ready]);

  const results = useMemo(() => {
    if (!ready) return [];
    const q = query.trim();
    return rankForms(q ? [q] : [], { mandatoryOnly, category, series });
  }, [ready, query, category, series, mandatoryOnly]);

  if (failed) {
    return <div className="p-6 text-sm text-muted-foreground">Forms data could not be loaded. Refresh the page to try again.</div>;
  }
  if (!ready) {
    return (
      <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <CircleNotch className="h-4 w-4 animate-spin" /> Loading the Judicial Council forms catalog…
      </div>
    );
  }

  const filtered = query || category !== "all" || series !== "all" || mandatoryOnly;

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="eyebrow">
        <FileText className="h-3.5 w-3.5" /> Judicial Council
      </div>
      <h1 className="text-2xl font-bold mt-3 mb-1">California Court Forms</h1>
      <p className="text-sm text-muted-foreground">
        <b>{Number(total).toLocaleString()} statewide Judicial Council forms</b> — every official court form, with form
        numbers, plain-language descriptions, mandatory-use flags, effective dates, fillable PDFs, and translations.
        {mandatoryCount ? <> {Number(mandatoryCount).toLocaleString()} are mandatory for all courts.</> : null}
      </p>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9 h-11"
              onChange={(e) => {
                setQuery(e.target.value);
                setShown(60);
              }}
              placeholder="Search forms by number or topic (e.g. “FL-100”, “restraining order”, “eviction”)…"
              value={query}
            />
            {query && (
              <button
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setQuery("")}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <Select
            onValueChange={(v) => {
              setSeries(v);
              setShown(60);
            }}
            value={series}
          >
            <SelectTrigger className="h-11 w-full sm:w-44">
              <SelectValue placeholder="All form series" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All form series</SelectItem>
              {prefixes.map(([p, n]) => (
                <SelectItem key={p} value={p}>
                  {p} ({n})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            onValueChange={(v) => {
              setCategory(v);
              setShown(60);
            }}
            value={category}
          >
            <SelectTrigger className="h-10 w-full sm:w-80">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories ({categories.length})</SelectItem>
              {categories.map(([c, n]) => (
                <SelectItem key={c} value={c}>
                  {c} ({n})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2 sm:ml-auto">
            <Switch checked={mandatoryOnly} id="mandatory-only" onCheckedChange={(v) => { setMandatoryOnly(v); setShown(60); }} />
            <Label className="text-xs text-muted-foreground" htmlFor="mandatory-only">
              Mandatory forms only
            </Label>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>
          {filtered ? (
            <>
              <b className="text-foreground">{results.length.toLocaleString()}</b> form
              {results.length === 1 ? "" : "s"} match
            </>
          ) : (
            <>Browse all forms, or search by number or topic</>
          )}
        </span>
        {filtered && (
          <button
            className="inline-flex items-center gap-1 hover:text-foreground"
            onClick={() => {
              setQuery("");
              setCategory("all");
              setSeries("all");
              setMandatoryOnly(false);
              setShown(60);
            }}
            type="button"
          >
            <X className="h-3 w-3" /> Reset
          </button>
        )}
      </div>

      {!filtered && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {categories.slice(0, 14).map(([c, n]) => (
            <button
              className="rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              key={c}
              onClick={() => {
                setCategory(c);
                setShown(60);
              }}
              type="button"
            >
              {c} <span className="opacity-60">{n}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border">
        {results.slice(0, shown).map((f, i) => (
          <div className="border-b last:border-b-0" key={f.number + "-" + i}>
            <FormRow f={f} onCategory={setCategory} />
          </div>
        ))}
        {results.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No forms match “{query}”. Try a form number (FL-100, DV-110) or a broader topic word.
          </div>
        )}
        {results.length > shown && (
          <button
            className="w-full border-t p-2.5 text-xs text-muted-foreground hover:bg-muted/40"
            onClick={() => setShown(shown + 120)}
            type="button"
          >
            Show more ({(results.length - shown).toLocaleString()} remaining)
          </button>
        )}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Statewide Judicial Council forms only — superior courts publish additional local forms.{" "}
        <a
          className="inline-flex items-center gap-1 underline hover:text-foreground"
          href="https://selfhelp.courts.ca.gov/find-forms"
          target="_blank"
          rel="noopener"
        >
          Verify at California Courts <ArrowSquareOut className="h-3 w-3" />
        </a>
      </p>
    </div>
  );
}
