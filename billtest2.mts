import searchBills from "./agent/tools/search_bills";
// @ts-expect-error tool execute
const out = await searchBills.execute({ queries: ["PREVENTION OF DOMESTIC VIOLENCE SHORT TITLE AND DEFINITIONS"], limit: 4 }, undefined);
for (const s of out.sources || []) console.log("  ", s.measure, "|", String(s.subject).slice(0, 55), "|", s.status);
