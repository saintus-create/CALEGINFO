import React, { useEffect, useMemo, useState } from "react";
import {
  MagnifyingGlass,
  ArrowSquareOut,
  Buildings,
  CircleNotch,
  ShieldCheck,
  SealCheck,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { loadExtras, extras, extraMeta } from "@/lib/engine";
import { displayText } from "@/lib/display-text";

function money(n) {
  if (n == null) return "";
  const v = Number(n);
  if (isNaN(v)) return String(n);
  return "$" + v.toLocaleString();
}

function AgencyRow({ a }) {
  const detail = (a.contracts || []).length + (a.funding || []).length + (a.settlements || []).length > 0;
  return (
    <details className="border-b last:border-b-0" open={false}>
      <summary className={"flex items-center gap-2 px-3.5 py-2.5 text-body " + (detail ? "cursor-pointer hover:bg-muted/40" : "cursor-default")}
        onClick={(e) => { if (!detail) e.preventDefault(); }}>
        <span className="font-medium text-pretty">{displayText(a.name)}</span>
        {a.post && <SealCheck weight="fill" className="h-3.5 w-3.5 text-emerald-600 shrink-0" aria-label="POST certified" />}
        <span className="ms-auto flex items-center gap-2 whitespace-nowrap text-micro font-normal tracking-normal text-muted-foreground">
          {a.county && a.county !== "Unknown" ? a.county + " County" : ""}
          <span className="rounded-full bg-muted px-2 py-0.5 text-micro font-medium uppercase">{a.type || "Agency"}</span>
        </span>
      </summary>
      {detail && (
        <div className="space-y-2 px-3.5 pb-3 text-meta">
          {(a.contracts || []).length > 0 && (
            <div>
              <div className="mb-1.5 text-micro font-medium uppercase text-muted-foreground/80">Contracts</div>
              {a.contracts.map((c, i) => (
                <div key={i} className="rounded-md border p-2 mb-1">
                  <div className="text-label font-medium text-foreground">{displayText(c.vendor)}{c.amount != null ? " — " + money(c.amount) : ""}{c.year ? " (" + c.year + ")" : ""}</div>
                  {c.purpose && <div className="text-muted-foreground mt-0.5">{displayText(c.purpose)}</div>}
                  {c.citation && <a href={c.citation} target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 text-micro font-normal tracking-normal text-muted-foreground underline decoration-border underline-offset-[3px] transition-colors hover:text-foreground hover:decoration-muted-foreground">Source <ArrowSquareOut className="h-3 w-3" /></a>}
                </div>
              ))}
            </div>
          )}
          {(a.settlements || []).length > 0 && (
            <div>
              <div className="mb-1.5 text-micro font-medium uppercase text-muted-foreground/80">Settlements</div>
              {a.settlements.map((s, i) => (
                <div key={i} className="rounded-md border p-2 mb-1">
                  <div className="text-label font-medium text-foreground">{displayText(s.case || s.name || "Settlement")}{s.amount != null ? " — " + money(s.amount) : ""}{s.year ? " (" + s.year + ")" : ""}</div>
                  {(s.purpose || s.description) && <div className="text-muted-foreground mt-0.5">{displayText(s.purpose || s.description)}</div>}
                  {s.citation && <a href={s.citation} target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 text-micro font-normal tracking-normal text-muted-foreground underline decoration-border underline-offset-[3px] transition-colors hover:text-foreground hover:decoration-muted-foreground">Source <ArrowSquareOut className="h-3 w-3" /></a>}
                </div>
              ))}
            </div>
          )}
          {(a.funding || []).length > 0 && (
            <div>
              <div className="mb-1.5 text-micro font-medium uppercase text-muted-foreground/80">Funding</div>
              {a.funding.map((f, i) => (
                <div key={i} className="rounded-md border p-2 mb-1">
                  <div className="text-label font-medium text-foreground">{displayText(f.program || f.source || "Funding")}{f.amount != null ? " — " + money(f.amount) : ""}{f.year ? " (" + f.year + ")" : ""}</div>
                  {f.citation && <a href={f.citation} target="_blank" rel="noopener" className="mt-1 inline-flex items-center gap-1 text-micro font-normal tracking-normal text-muted-foreground underline decoration-border underline-offset-[3px] transition-colors hover:text-foreground hover:decoration-muted-foreground">Source <ArrowSquareOut className="h-3 w-3" /></a>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </details>
  );
}

export default function Directory() {
  const [ready, setReady] = useState(!!extras.directory);
  const [failed, setFailed] = useState(false);
  const [sub, setSub] = useState("agencies");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(300);

  useEffect(() => {
    let on = true;
    loadExtras().then((ok) => { if (on) { setReady(!!extras.directory); setFailed(!ok && !extras.directory); } }).catch(() => on && setFailed(true));
    return () => { on = false; };
  }, []);
  useEffect(() => { setShown(300); }, [q, sub]);

  const dir = extras.directory;
  const agencies = useMemo(() => {
    if (!dir) return [];
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return dir.agencies;
    return dir.agencies.filter((a) => {
      const hay = (a.name + " " + a.type + " " + a.county).toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [dir, q]);

  const rich = useMemo(() => (dir ? dir.agencies.filter((a) =>
    (a.contracts || []).length + (a.funding || []).length + (a.settlements || []).length > 0) : []), [dir]);

  const contracts = useMemo(() => {
    if (!dir) return [];
    const tokens = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!tokens.length) return dir.contracts;
    return dir.contracts.filter((c) => {
      const hay = (c.client + " " + c.vendor + " " + c.subject + " " + c.body).toLowerCase();
      return tokens.every((t) => hay.includes(t));
    });
  }, [dir, q]);

  if (failed) return <div className="p-6 text-body text-muted-foreground">Directory data could not be loaded. Refresh the page to try again.</div>;
  if (!ready || !dir) {
    return (
      <div className="flex items-center gap-2 p-6 text-body text-muted-foreground">
        <CircleNotch className="h-4 w-4 animate-spin" /> Loading the agency directory…
      </div>
    );
  }

  const meta = extraMeta("directory") || {};
  const subTab = (id, label, count) => (
    <button key={id} onClick={() => setSub(id)}
      className={"rounded-md px-3 py-1.5 text-label transition-colors " + (sub === id ? "bg-background text-foreground shadow-sm font-medium" : "text-muted-foreground hover:text-foreground")}>
      {label}{count != null ? <span className="ms-1.5 text-micro font-normal tracking-normal tabular-nums opacity-70">{count.toLocaleString()}</span> : null}
    </button>
  );

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <div className="eyebrow"><Buildings className="h-3.5 w-3.5" /> Public institutions</div>
      <h1 className="text-title font-bold mt-3 mb-2 text-balance">Agency &amp; Public-Records Directory</h1>
      <p className="max-w-[64ch] text-body text-muted-foreground/90">
        <span className="tabular-nums">{dir.agencies.length.toLocaleString()}</span> California state and local agencies
        {meta.agencies ? "" : ""}, public-records research on policing vendors, and municipal
        surveillance contracts pulled from city Legistar systems.
      </p>

      <div className="flex items-center gap-1 rounded-lg bg-muted p-1 mt-4 w-fit max-w-full overflow-x-auto">
        {subTab("agencies", "All agencies", dir.agencies.length)}
        {subTab("records", "Public records", rich.length + dir.vendors.length)}
        {subTab("contracts", "Municipal contracts", dir.contracts.length)}
      </div>

      {sub !== "records" && (
        <div className="relative mt-4">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={sub === "agencies" ? "Search agencies by name, type, or county…" : "Search contracts by city, vendor, or subject…"}
            className="pl-9 h-11" />
        </div>
      )}

      {sub === "agencies" && (
        <div className="mt-4 rounded-xl border overflow-hidden">
          {agencies.slice(0, shown).map((a, i) => <AgencyRow key={a.id || i} a={a} />)}
          {agencies.length === 0 && <div className="p-6 text-center text-body text-muted-foreground">No agencies match “{q}”.</div>}
          {agencies.length > shown && (
            <button className="w-full border-t p-2.5 text-meta tabular-nums text-muted-foreground hover:bg-muted/40" onClick={() => setShown(shown + 300)}>
              Show more ({(agencies.length - shown).toLocaleString()} remaining)
            </button>
          )}
        </div>
      )}

      {sub === "records" && (
        <div className="mt-4 space-y-4">
          <div className="flex items-start gap-3 rounded-xl border bg-muted/20 p-4 text-body">
            <ShieldCheck weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span className="max-w-[76ch] text-muted-foreground">
              Research dossier on <span className="tabular-nums">{rich.length}</span> law-enforcement agencies with public-records
              findings — vendor contracts, settlements, and funding — plus the{" "}
              <span className="tabular-nums">{dir.vendors.length}</span> vendors behind them. Every entry links to its public source.
            </span>
          </div>
          {rich.map((a) => <div key={a.id} className="rounded-xl border"><AgencyRow a={a} /></div>)}
          <div className="pt-2 text-micro font-medium uppercase text-muted-foreground">Vendors</div>
          <div className="grid sm:grid-cols-2 gap-3">
            {dir.vendors.map((v, i) => (
              <div key={v.id || i} className="rounded-xl border p-3.5">
                <div className="text-body font-medium text-pretty">{displayText(v.name)}</div>
                {(v.services || []).length > 0 && (
                  <ul className="mt-1.5 list-disc space-y-0.5 ps-4 text-label text-muted-foreground">
                    {v.services.map((s, j) => <li key={j}>{s}</li>)}
                  </ul>
                )}
                {(v.agencies || []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {v.agencies.map((id) => {
                      const ag = dir.agencies.find((x) => x.id === id);
                      return <span key={id} className="rounded-full bg-muted px-2 py-0.5 text-micro font-normal tracking-normal text-muted-foreground">{ag ? ag.name : id}</span>;
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {sub === "contracts" && (
        <div className="mt-4 rounded-xl border divide-y overflow-hidden">
          {contracts.map((c, i) => (
            <div key={i} className="p-3.5">
              <div className="flex flex-wrap items-center gap-2 text-micro font-normal tracking-normal">
                <span className="text-label font-medium capitalize text-foreground">{displayText(c.client)}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{displayText(c.vendor)}</span>
                <span className={"rounded-full border px-2 py-0.5 font-medium uppercase " + (c.status === "Passed" ? "border-emerald-300 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400" : "text-muted-foreground")}>{c.status}</span>
                <span className="ms-auto whitespace-nowrap tabular-nums text-muted-foreground">{c.date}{c.file ? " · " + c.file : ""}</span>
              </div>
              <div className="mt-1.5 max-w-[80ch] text-body text-pretty line-clamp-3">{displayText(c.subject)}</div>
              <div className="mt-2 flex items-center gap-2 text-micro font-normal tracking-normal text-muted-foreground">
                {c.body && <span>{c.body}</span>}
                {c.url && (
                  <a href={c.url} target="_blank" rel="noopener" className="ms-auto inline-flex items-center gap-1 underline decoration-border underline-offset-[3px] transition-colors hover:text-foreground hover:decoration-muted-foreground">
                    Legistar record <ArrowSquareOut className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
          {contracts.length === 0 && <div className="p-6 text-center text-body text-muted-foreground">No contracts match “{q}”.</div>}
        </div>
      )}

      <p className="mt-5 max-w-[80ch] text-meta text-muted-foreground">
        Compiled from public records requests and open municipal data — a dated research snapshot; verify details with the agencies listed.
      </p>
    </div>
  );
}
