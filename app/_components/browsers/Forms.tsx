"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowSquareOut, FileText } from "@phosphor-icons/react";
import { Badge } from "@/components/spectrumui/ui/badge";
import { Switch } from "@/components/spectrumui/ui/switch";
import { Label } from "@/components/spectrumui/ui/label";
import { DataTable, type DataTableColumn } from "@/components/spectrumui/data-table";
import { LoadingState } from "@/components/spectrumui/blocks/ai-assistants/loading-state";
import { loadExtras, extras, extraMeta } from "@/lib/engine";

export interface FormRow {
  number: string;
  title?: string;
  description?: string;
  category?: string;
  mandatory?: boolean;
  effective?: string;
  pdf_url?: string;
  info_url?: string;
}

const COLUMNS: DataTableColumn<FormRow>[] = [
  {
    id: "number",
    header: "Form",
    sortable: true,
    value: (f: FormRow) => f.number || "",
    cell: (f: FormRow) => <span className="font-mono font-medium">{f.number}</span>,
  },
  {
    id: "title",
    header: "Title",
    value: (f: FormRow) => f.title || "",
    cell: (f: FormRow) => (
      <span>
        <span className="font-medium">{f.title}</span>
        {f.description && <span className="mt-0.5 block text-xs text-muted-foreground">{f.description}</span>}
      </span>
    ),
  },
  {
    id: "category",
    header: "Category",
    sortable: true,
    hideBelow: "md",
    value: (f: FormRow) => f.category || "Uncategorized",
  },
  {
    id: "use",
    header: "Use",
    sortable: true,
    hideBelow: "sm",
    value: (f: FormRow) => (f.mandatory ? "Mandatory" : "Optional"),
    cell: (f: FormRow) => <Badge variant={f.mandatory ? "default" : "outline"}>{f.mandatory ? "Mandatory" : "Optional"}</Badge>,
  },
  {
    id: "effective",
    header: "Effective",
    sortable: true,
    hideBelow: "lg",
    value: (f: FormRow) => f.effective || "",
  },
  {
    id: "links",
    header: "",
    value: () => "",
    cell: (f: FormRow) => (
      <span className="flex items-center gap-2">
        {f.pdf_url && (
          <a className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" href={f.pdf_url} rel="noopener" target="_blank">
            PDF <ArrowSquareOut className="h-3 w-3" />
          </a>
        )}
        {f.info_url && (
          <a className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" href={f.info_url} rel="noopener" target="_blank">
            Info <ArrowSquareOut className="h-3 w-3" />
          </a>
        )}
      </span>
    ),
  },
];

// The page passes a deep-link target (?q=/?form=/?number=). Spectrum's DataTable owns
// its own search, and it exposes no initial-query prop, so the target is accepted
// and not auto-applied rather than the page being broken by an unknown prop.
export default function Forms({ jumpForm: _jumpForm }: { jumpForm?: string | null } = {}) {
  const [ready, setReady] = useState(extras.forms.length > 0);
  const [failed, setFailed] = useState(false);
  const [mandatoryOnly, setMandatoryOnly] = useState(false);

  useEffect(() => {
    let on = true;
    loadExtras()
      .then((ok: boolean) => { if (on) { setReady(extras.forms.length > 0); setFailed(!ok && extras.forms.length === 0); } })
      .catch(() => on && setFailed(true));
    return () => { on = false; };
  }, []);

  // lib/engine is JS, so extras.forms arrives as never[]; the row shape is known here.
  const allForms = extras.forms as FormRow[];
  const rows = useMemo(
    () => (ready ? (mandatoryOnly ? allForms.filter((f) => f.mandatory) : allForms) : []),
    [ready, mandatoryOnly, allForms],
  );
  const mandatoryCount = useMemo(() => (ready ? allForms.filter((f) => f.mandatory).length : 0), [ready, allForms]);

  if (failed) {
    return (
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Form data could not be loaded. Refresh the page to try again.</p>
      </div>
    );
  }

  const meta = extraMeta("forms") || {};

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <FileText className="h-3.5 w-3.5" /> Judicial Council
      </div>
      <h1 className="mt-3 mb-1 text-2xl font-bold">California Court Forms</h1>
      <p className="text-sm text-muted-foreground">
        Every statewide Judicial Council form — numbers, titles, plain-language descriptions, mandatory-use flags,
        effective dates, fillable PDFs and translations.
        {mandatoryCount ? <> {Number(mandatoryCount).toLocaleString()} are mandatory for all courts.</> : null}
      </p>

      {!ready ? (
        <div className="mt-6">
          <LoadingState label="Loading the Judicial Council form catalog…" />
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-2">
            <Switch id="mandatory-only" checked={mandatoryOnly} onCheckedChange={setMandatoryOnly} />
            <Label htmlFor="mandatory-only" className="cursor-pointer text-xs text-muted-foreground">
              Mandatory forms only ({mandatoryCount.toLocaleString()})
            </Label>
          </div>

          <div className="mt-3">
            <DataTable
              data={rows}
              columns={COLUMNS}
              rowId={(f) => f.number}
              rowLabel={(f) => `Form ${f.number} — ${f.title}`}
              variant="panel"
              density="compact"
              searchable
              searchPlaceholder="Search forms by number or topic…"
              searchText={(f) => [f.number, f.title, f.description, f.category].join(" ")}
              quickFilter={{ columnId: "category", label: "Filter by category" }}
              defaultSort={{ columnId: "number", direction: "asc" }}
              caption={`Statewide Judicial Council forms, ${meta.retrieved_at ? `snapshot ${String(meta.retrieved_at).slice(0, 10)}` : "dated snapshot"}.`}
            />
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Statewide Judicial Council forms only — superior courts publish additional local forms.{" "}
        <a className="underline hover:text-foreground" href="https://selfhelp.courts.ca.gov/find-forms" rel="noopener" target="_blank">
          Verify at California Courts
        </a>
      </p>
    </div>
  );
}
