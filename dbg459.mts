import { loadCode } from "./agent/lib/corpus";
(async () => {
  const pen = await loadCode("PEN");
  const r: any = pen.find(x => String(x.section) === "459");
  const text = String(r.text || "").toLowerCase();
  console.log("459 'guilty of burglary':", text.includes("guilty of burglary"));
  console.log("459 tail:", text.slice(-80));
  process.exit(0);
})();
