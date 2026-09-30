import { scoreSections } from "./agent/lib/search";
import { loadCode } from "./agent/lib/corpus";
(async () => {
  const fam = await loadCode("FAM");
  const hits = scoreSections(["domestic abuse", "in family code as domestic abuse list all of them"], fam.map(r => ({ abbr: "FAM", r: r as any })), undefined, 5);
  console.log(hits.map(h => h.citation).join("\n"));
  process.exit(0);
})();
