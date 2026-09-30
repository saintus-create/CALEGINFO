import { loadCode } from "./agent/lib/corpus";
(async () => {
  const pen = await loadCode("PEN");
  const s459 = pen.find((r: any) => String(r.section) === "459");
  const s999 = pen.find((r: any) => String(r.section) === "999e");
  console.log("459 keys:", Object.keys(s459 || {}));
  console.log("459 citation:", s459?.citation, "| heading:", (s459 as any).heading, "| ch:", (s459 as any).chapter);
  console.log("459 text head:", String(s459?.text || "").slice(0, 130));
  console.log("999e citation:", s999?.citation, "| heading:", (s999 as any).heading, "| ch:", (s999?.chapter))
  process.exit(0);
})();
