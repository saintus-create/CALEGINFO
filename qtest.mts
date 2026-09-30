import { scoreSections } from "./agent/lib/search";
import { loadCode } from "./agent/lib/corpus";
(async () => {
  const pen = await loadCode("PEN");
  const hits = scoreSections(["burglary", "robbery", "What is the difference between burglary and robbery in California?"], pen.map(r => ({ abbr: "PEN", r: r as any })), undefined, 8);
  console.log(hits.map(h => `${h.citation} (score ${Math.round(h.score)})`).join("\n"));
  process.exit(0);
})();
