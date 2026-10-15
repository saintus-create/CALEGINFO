"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Scales } from "@phosphor-icons/react";
import { DataTable } from "@/components/spectrumui/data-table";
import { LoadingState } from "@/components/spectrumui/blocks/ai-assistants/loading-state";
import { loadExtras, extras, extraMeta } from "@/lib/engine";

const COLUMNS = [
  {
    id: "rule",
    header: "Rule",
    sortable: true,
    width: 96,
    value: (r) => r.rule || "",
    cell: (r) => <span className="font-mono font-medium">{r.rule}</span>,
  },
  {
    id: "title",
    header: "Rule title",
    value: (r) => r.rule_title || "",
    cell: (r) => (
      <span>
        <span className="font-medium">{r.rule_title}</span>
        {r.text && <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{String(r.text).trim()}</span>}
      </span>
    ),
  },
  {
    id: "division",
    header: "Division",
    sortable: true,
    hideBelow: "md",
    value: (r) => r.title_name || r.title || "",
    cell: (r) => <span className="text-muted-foreground">{r.title_name || r.title}</span>,
  },
];

export default function Rules() {
  const [ready, setReady] = useState(extras.rules.length > 0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let on = true;
    loadExtras()
      .then((ok) => { if (on) { setReady(extras.rules.length > 0); setFailed(!ok && extras.rules.length === 0); } })
      .catch(() => on && setFailed(true));
    return () => { on = false; };
  }, []);

  const rows = useMemo(() => (ready ? extras.rules : []), [ready]);

  if (failed) {
    return (
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Rules data could not be loaded. Refresh the page to try again.</p>
      </div>
    );
  }

  const meta = extraMeta("rules") || {};

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Scales className="h-3.5 w-3.5" /> Judicial Council
      </div>
      <h1 className="mt-3 mb-1 text-2xl font-bold">California Rules of Court</h1>
      <p className="text-sm text-muted-foreground">
        The complete Rules of Court, searchable and sortable by rule number or division
        {meta.retrieved_at ? <> · snapshot {String(meta.retrieved_at).slice(0, 10)}</> : null}.
      </p>

      {!ready ? (
        <div className="mt-6">
          <LoadingState label="Loading the California Rules of Court…" />
        </div>
      ) : (
        <div className="mt-4">
          <DataTable
            data={rows}
            columns={COLUMNS}
            rowId={(r) => String(r.rule)}
            rowLabel={(r) => `Rule ${r.rule}${r.rule_title ? ` — ${r.rule_title}` : ""}`}
            variant="panel"
            density="compact"
            searchable
            searchPlaceholder="Search all rules (e.g. “continuance”, “service of papers”, “8.1115”)…"
            searchText={(r) => [r.rule, r.rule_title, r.text, r.title_name].join(" ")}
            quickFilter={{ columnId: "division", label: "Filter by division" }}
            defaultSort={{ columnId: "rule", direction: "asc" }}
            caption="California Rules of Court."
          />
        </div>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Dated snapshot — verify current rules at{" "}
        <a className="underline hover:text-foreground" href="https://courts.ca.gov/cms/rules/index.cfm?title=all" rel="noopener" target="_blank">
          courts.ca.gov
        </a>.
      </p>
    </div>
  );
}
