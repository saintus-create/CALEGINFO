import searchCases from "./agent/tools/search_cases";
// @ts-expect-error tool execute
const out = await searchCases.execute({ queries: ["family code 6203 abuse definition domestic violence"] }, undefined);
console.log("note:", out.note);
for (const s of out.sources || []) console.log("  ", s.caseName, "|", s.cite, "|", String(s.snippet).slice(0, 80));
