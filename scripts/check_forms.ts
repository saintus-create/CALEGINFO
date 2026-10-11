/**
 * Exercises the Judicial Council forms scorer (agent/lib/search.ts) against the
 * packed corpus: form-number lookups must land exactly, and topical queries
 * must surface the expected form family in the top results. Also validates the
 * editorial `synonyms` the packer carries over from the portal's
 * `field_synonyms` — skipped when the corpus predates that field.
 *
 *   npm run check:forms
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { formNumsIn, formSynonyms, scoreForms } from "../agent/lib/search";

const forms: Array<Record<string, unknown>> = gunzipSync(
  readFileSync("public/corpus/forms/FORMS.jsonl.gz"),
)
  .toString("utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));

// [query, form that must appear in the top 5]
const CASES: Array<[string[], string]> = [
  [["FL-100"], "FL-100"],
  [["DV-110 temporary restraining order"], "DV-110"],
  [["domestic violence restraining order"], "DV-100"],
  [["eviction unlawful detainer"], "UD-100"],
  [["request to waive court fees"], "FW-001"],
  [["small claims"], "SC-100"],
  [["how to serve small claims papers"], "SC-104"],
  [["adoption request stepparent"], "ADOPT-200"],
  [["guardianship petition"], "GC-210"],
  [["guardian of minor petition"], "GC-210"],
  [["proof of service"], "POS-030"],
];

function main() {
  if (!forms.length) throw new Error("forms corpus is empty — run the update workflow first");

  const numbers = formNumsIn("what form is FL 100 and DV-110 and jv 101(a)");
  const expectedNumbers = ["FL-100", "DV-110", "JV-101(A)"];
  const numbersOk = expectedNumbers.every((n) => numbers.includes(n));

  let passed = 0;
  const failures: string[] = [];
  for (const [queries, expected] of CASES) {
    const hits = scoreForms(queries, forms, 5).map((h) => h.number);
    if (hits.includes(expected)) passed++;
    else failures.push(`${JSON.stringify(queries)} -> ${hits.join(", ")} (missing ${expected})`);
  }

  // Editorial synonyms: the portal only populates field_synonyms on some series
  // (the restraining-order families), so a corpus packed before the field was
  // carried over legitimately has none — skip rather than fail.
  const withSyn = forms.filter((f) => formSynonyms(f).length);
  let synOk = true;
  const synProblems: string[] = [];
  if (withSyn.length) {
    for (const f of withSyn) {
      if (!formSynonyms(f).every((s) => s && s === s.toLowerCase())) {
        synOk = false;
        synProblems.push(`${String(f.number)}: synonyms not lowercase ${JSON.stringify(f.synonyms)}`);
      }
    }
    // A query phrased with synonym wording must still surface its own family.
    const probe = withSyn[0];
    const phrase = formSynonyms(probe)[0];
    const series = String(probe.series || "");
    const hits = scoreForms([phrase], forms, 5);
    if (!hits.some((h) => String(h.number).startsWith(series))) {
      synOk = false;
      synProblems.push(`"${phrase}" -> ${hits.map((h) => h.number).join(", ")} (no ${series} form)`);
    }
  }
  if (synProblems.length) console.log(synProblems.map((p) => `  SYN ${p}`).join("\n"));

  console.log(`${forms.length} forms loaded`);
  console.log(`${numbersOk ? "PASS" : "FAIL"} form numbers parsed: ${numbers.join(", ")}`);
  console.log(`${passed}/${CASES.length} query expectations in top 5`);
  console.log(
    withSyn.length
      ? `${synOk ? "PASS" : "FAIL"} synonyms on ${withSyn.length} forms`
      : "SKIP synonyms — corpus predates field_synonyms (repack via scripts/fetch_forms.py)",
  );
  if (failures.length) console.log(failures.map((f) => `  MISS ${f}`).join("\n"));

  if (!numbersOk || passed < CASES.length || !synOk) process.exitCode = 1;
}

main();
