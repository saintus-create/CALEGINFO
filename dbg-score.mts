import { loadCode } from "./agent/lib/corpus";
import { termsOf } from "./agent/lib/search";
const queries = ["domestic abuse", "in family code as domestic abuse list all of them"];
for (const q of queries) console.log(`q="${q}" terms=`, termsOf(q).join(","));
(async () => {
  const fam = await loadCode("FAM");
  for (const sec of ["6203", "1816", "6451"]) {
    const r: any = fam.find(x => String(x.section) === sec);
    const text = String(r.text || "").toLowerCase();
    console.log(`--- ${sec} (${r.citation})`);
    console.log("  text starts:", text.slice(0, 90).replace(/\n/g, " "));
    for (const t of ["domestic", "abuse", "family"]) {
      console.log(`  term "${t}": count=${text.split(t).length - 1} | citation-has=${String(r.citation).toLowerCase().includes(t)}`);
    }
    console.log("  has 'guilty of abuse':", text.includes("guilty of abuse"));
    console.log("  sentence-init 'abuse is the':", /(?:^|[.;:\n]\s*)abuse is the\b/i.test(text));
    console.log("  has '\"abuse\" means':", text.includes("\u201cabuse\u201d means") || text.includes('"abuse" means'));
  }
  process.exit(0);
})();
