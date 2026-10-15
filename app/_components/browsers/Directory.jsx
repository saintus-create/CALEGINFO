"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Buildings } from "@phosphor-icons/react";
import { Badge } from "@/components/spectrumui/ui/badge";
import { DataTable } from "@/components/spectrumui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/spectrumui/ui/tabs";
import { LoadingState } from "@/components/spectrumui/blocks/ai-assistants/loading-state";
import { loadExtras, extras, extraMeta } from "@/lib/engine";

function money(n) {
  if (n == null) return "";
  return "$" + Number(n).toLocaleString();
}

const AGENCY_COLUMNS = [
  { id: "name", header: "Agency", sortable: true, value: (a) => a.name || "", cell: (a) => <span className="font-medium">{a.name}</span> },
  { id: "type", header: "Type", sortable: true, value: (a) => a.type || "Agency", cell: (a) => <Badge variant="outline">{a.type || "Agency"}</Badge>, hideBelow: "sm" },
  { id: "county", header: "County", sortable: true, hideBelow: "md", value: (a) => a.county || "", cell: (a) => (a.county && a.county !== "Unknown" ? `${a.county} County` : "—") },
  {
    id: "records",
    header: "Records",
    numeric: true,
    value: (a) => (a.contracts || []).length + (a.funding || []).length + (a.settlements || []).length,
    cell: (a) => {
      const n = (a.contracts || []).length + (a.funding || []).length + (a.settlements || []).length;
      return <span className="tabular-nums">{n}</span>;
    },
  },
];

const CONTRACT_COLUMNS = [
  { id: "vendor", header: "Vendor", sortable: true, value: (c) => c.vendor || "", cell: (c) => <span className="font-medium">{c.vendor}</span> },
  { id: "client", header: "Client", value: (c) => c.client || "", hideBelow: "md" },
  { id: "subject", header: "Subject", value: (c) => c.subject || "" },
  { id: "amount", header: "Amount", numeric: true, sortable: true, value: (c) => c.amount ?? 0, cell: (c) => <span className="tabular-nums">{money(c.amount)}</span> },
  { id: "year", header: "Year", numeric: true, sortable: true, hideBelow: "sm", value: (c) => c.year ?? 0 },
];

export default function Directory() {
  const [ready, setReady] = useState(!!extras.directory);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let on = true;
    loadExtras()
      .then((ok) => { if (on) { setReady(!!extras.directory); setFailed(!ok && !extras.directory); } })
      .catch(() => on && setFailed(true));
    return () => { on = false; };
  }, []);

  const dir = extras.directory || {};
  const agencies = useMemo(() => dir.agencies || [], [dir]);
  const contracts = useMemo(() => dir.contracts || [], [dir]);

  if (failed) {
    return (
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <p className="text-sm text-muted-foreground">Directory data could not be loaded. Refresh the page to try again.</p>
      </div>
    );
  }

  const meta = extraMeta("directory") || {};

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Buildings className="h-3.5 w-3.5" /> Public institutions
      </div>
      <h1 className="mt-3 mb-1 text-2xl font-bold">Agency &amp; Public-Records Directory</h1>
      <p className="text-sm text-muted-foreground">
        California agencies, their contracts, funding and settlements, from public records.
      </p>

      {!ready ? (
        <div className="mt-6">
          <LoadingState label="Loading the agency directory…" />
        </div>
      ) : (
        <Tabs defaultValue="agencies" className="mt-5">
          <TabsList>
            <TabsTrigger value="agencies">Agencies ({agencies.length.toLocaleString()})</TabsTrigger>
            <TabsTrigger value="contracts">Contracts ({contracts.length.toLocaleString()})</TabsTrigger>
          </TabsList>

          <TabsContent value="agencies" className="mt-4">
            <DataTable
              data={agencies}
              columns={AGENCY_COLUMNS}
              rowId={(a) => a.name}
              rowLabel={(a) => a.name}
              variant="panel"
              density="compact"
              searchable
              searchPlaceholder="Search agencies by name, type or county…"
              searchText={(a) => [a.name, a.type, a.county].join(" ")}
              quickFilter={{ columnId: "type", label: "Filter by type" }}
              defaultSort={{ columnId: "name", direction: "asc" }}
              caption="California agencies and public bodies."
            />
          </TabsContent>

          <TabsContent value="contracts" className="mt-4">
            <DataTable
              data={contracts}
              columns={CONTRACT_COLUMNS}
              rowId={(c) => `${c.vendor}-${c.client}-${c.year}-${c.amount}`}
              rowLabel={(c) => `${c.vendor} — ${c.client}`}
              variant="panel"
              density="compact"
              searchable
              searchPlaceholder="Search contracts by city, vendor or subject…"
              searchText={(c) => [c.client, c.vendor, c.subject, c.body].join(" ")}
              defaultSort={{ columnId: "amount", direction: "desc" }}
              caption={`Public contracts, ${meta.retrieved_at ? `snapshot ${String(meta.retrieved_at).slice(0, 10)}` : "dated snapshot"}.`}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
