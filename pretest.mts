import { CODE_NAMES, loadCode } from "./agent/lib/corpus";
import { scoreSections } from "./agent/lib/search";
import searchBills from "./agent/tools/search_bills";
const question = "In the Family Code, what is domestic abuse? List all of them, every element.";
const records: Array<{ abbr: string; r: Record<string, unknown> }> = [];
for (const a of Object.keys(CODE_NAMES)) {
  for (const r of await loadCode(a).catch(() => [])) records.push({ abbr: a, r: r as Record<string, unknown> });
}
const hits = scoreSections([question], records, undefined, 6);
const structuralQueries = hits.slice(0,2).map((h) => (h.structural || "").split(">").map((x: string) => x.trim().replace(/^\d+\.\s*/, "")).join(" ")).filter((x) => x.length > 3);
console.log("structural queries:", JSON.stringify(structuralQueries));
const billQueries = [...new Set([question, ...structuralQueries])].slice(0, 3);
// @ts-expect-error tool
const out = await searchBills.execute({ queries: billQueries, limit: 3 }, undefined);
console.log("bills:", (out.sources||[]).map((s: any) => `${s.measure} (${s.status}) — ${String(s.subject).slice(0,50)}`).join("\n  "));
