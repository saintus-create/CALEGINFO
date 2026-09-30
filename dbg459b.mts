import { scoreSections } from "./agent/lib/search";
import { loadCode } from "./agent/lib/corpus";
(async () => {
  const pen = await loadCode("PEN");
  const hits = scoreSections(["burglary", "robbery", "What is the difference between burglary and robbery in California?"], pen.map(r => ({ abbr: "PEN", r: r as any })), undefined, 30);
  for (const h of hits.slice(0, 12)) console.log(h.citation, Math.round(h.score));
  const t = hits.find(h => h.citation.includes("459"));
  console.log("459:", t ? Math.round(t.score) : "NOT IN TOP 30");
  process.exit(0);
})();
