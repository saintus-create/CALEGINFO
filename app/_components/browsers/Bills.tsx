"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowSquareOut, Bank } from "@phosphor-icons/react";
import { Badge } from "@/components/spectrumui/ui/badge";
import { Switch } from "@/components/spectrumui/ui/switch";
import { Label } from "@/components/spectrumui/ui/label";
import { DataTable, type DataTableColumn } from "@/components/spectrumui/data-table";
import { LoadingState } from "@/components/spectrumui/blocks/ai-assistants/loading-state";
import { loadExtras, extras, extraMeta } from "@/lib/engine";

export interface Bill {
  measure: string;
  group?: string;
  subject?: string;
  author?: string;
  chamber?: string;
  type?: string;
  status?: string;
  special?: boolean;
  fam?: boolean;
  terms?: string[];
  url?: string;
}

/** Chaptered is law; Vetoed is dead; everything else is still moving. */
const BADGE_VARIANT: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
  Chaptered: "default",
  Vetoed: "destructive",
  Inactive: "secondary",
};

const COLUMNS: DataTableColumn<Bill>[] = [
  {
    id: "measure",
    header: "Measure",
    sortable: true,
    width: 190,
    value: (b) => b.measure || "",
    cell: (b) => (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span className="font-medium">{b.measure}</span>
        <Badge variant={BADGE_VARIANT[b.group || ""] || "outline"}>{b.group || "—"}</Badge>
        {b.special && <Badge variant="outline">special session</Badge>}
        {b.fam && <Badge variant="outline">family law</Badge>}
      </span>
    ),
  },
  {
    id: "subject",
    header: "Subject",
    value: (b) => b.subject || "",
    cell: (b) => (
      <span>
        <span className="font-medium">{b.subject}</span>
        {b.author && <span className="mt-0.5 block text-xs text-muted-foreground">{b.author}</span>}
      </span>
    ),
  },
  { id: "chamber", header: "Chamber", sortable: true, hideBelow: "md", value: (b) => b.chamber || "" },
  { id: "type", header: "Type", sortable: true, hideBelow: "lg", value: (b) => b.type || "" },
  {
    id: "text",
    header: "",
    value: () => "",
    cell: (b) =>
      b.url ? (
        <a className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground" href={b.url} rel="noopener" target="_blank">
          Official text <ArrowSquareOut className="h-3 w-3" />
        </a>
      ) : null,
  },
];

export default function Bills() {
  const [ready, setReady] = useState(extras.bills.length > 0);
  const [failed, setFailed] = useState(false);
  const [famOnly, setFamOnly] = useState(false);

  useEffect(() => {
    let on = true;
    loadExtras()
      .then((ok: boolean) => { if (on) { setReady(extras.bills.length > 0); setFailed(!ok && extras.bills.length === 0); } })
      .catch(() => on && setFailed(true));
    return () => { on = false; };
  }, []);

  // lib/engine is JS, so extras.bills arrives as never[]; the row shape is known here.
  const allBills = extras.bills as Bill[];
  const rows = useMemo(() => (ready ? (famOnly ? allBills.filter((b) => b.fam) : allBills) : []), [ready, famOnly, allBills]);
  const famCount = useMemo(() => (ready ? allBills.filter((b) => b.fam).length : 0), [ready, allBills]);

  if (failed) {
    return (
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Bill data could not be loaded. Refresh the page to try again.</p>
      </div>
    );
  }

  const meta = extraMeta("bills") || {};

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Bank className="h-3.5 w-3.5" /> Legislation
      </div>
      <h1 className="mt-3 mb-1 text-2xl font-bold">Bills &amp; Measures — {meta.session || "2025-2026"} Session</h1>
      <p className="text-sm text-muted-foreground">
        Every measure introduced this session, from the official LegInfo bill index
        {meta.retrieved_at ? <> · snapshot {String(meta.retrieved_at).slice(0, 10)}</> : null}.{" "}
        Status tells you where each measure stands — <b>Chaptered</b> means it became law.
      </p>

      {!ready ? (
        <div className="mt-6">
          <LoadingState label="Loading the 2025-2026 session bill catalog…" />
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-2">
            <Switch id="fam-only" checked={famOnly} onCheckedChange={setFamOnly} />
            <Label htmlFor="fam-only" className="cursor-pointer text-xs text-muted-foreground">
              Family-law related only ({famCount.toLocaleString()})
            </Label>
          </div>

          <div className="mt-3">
            <DataTable
              data={rows}
              columns={COLUMNS}
              rowId={(b) => b.measure}
              rowLabel={(b) => `${b.measure} — ${b.subject || ""}`}
              variant="panel"
              density="compact"
              searchable
              searchPlaceholder="Search subject, author, or measure number…"
              searchText={(b) => [b.measure, b.subject, b.author, (b.terms || []).join(" "), b.status].join(" ")}
              defaultSort={{ columnId: "measure", direction: "asc" }}
              pageSize={200}
              caption={`Bills and measures of the ${meta.session || "2025-2026"} session.`}
            />
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Dated snapshot of the official index — verify status and text at{" "}
        <a className="underline hover:text-foreground" href="https://leginfo.legislature.ca.gov/faces/billSearchClient.xhtml?session_year=20252026" rel="noopener" target="_blank">
          leginfo.legislature.ca.gov
        </a>.
      </p>
    </div>
  );
}
