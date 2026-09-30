import { loadCode } from "./agent/lib/corpus";
(async () => {
  const fam = await loadCode("FAM");
  for (const sec of ["6203", "6305", "6309"]) {
    const r: any = fam.find(x => String(x.section) === sec);
    console.log(sec, "|", [r.division, r.part, r.chapter, r.article].filter(Boolean).join(" > "), "| text has 'abuse':", String(r.text).toLowerCase().split("abuse").length - 1);
  }
  const pen = await loadCode("PEN");
  for (const sec of ["459", "463", "211", "1192.7"]) {
    const r: any = pen.find(x => String(x.section) === sec);
    console.log(sec, "|", [r.division, r.part, r.chapter, r.article].filter(Boolean).join(" > "), "| text has 'burglary':", String(r.text).toLowerCase().split("burglary").length - 1, "| 'robbery':", String(r.text).toLowerCase().split("robbery").length - 1);
  }
  process.exit(0);
})();
