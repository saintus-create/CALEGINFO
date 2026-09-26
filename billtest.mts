import searchBills from "./agent/tools/search_bills";
for (const q of ["domestic violence", "domestic abuse protective orders family code", "in the family code what is domestic abuse list all of them every element"]) {
  // @ts-expect-error tool execute
  const out = await searchBills.execute({ queries: [q], limit: 4 }, undefined);
  console.log("Q:", q);
  for (const s of out.sources || []) console.log("  ", s.measure, "|", String(s.subject).slice(0, 60), "|", s.status);
}
