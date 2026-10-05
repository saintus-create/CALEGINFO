/**
 * Exercises the Judicial Council forms scorer (agent/lib/search.ts) against the
 * packed corpus: form-number lookups must land exactly, and topical queries
 * must surface the expected form family in the top results.
 *
 *   npm run check:forms
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { formNumsIn, scoreForms } from "../agent/lib/search";

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

  console.log(`${forms.length} forms loaded`);
  console.log(`${numbersOk ? "PASS" : "FAIL"} form numbers parsed: ${numbers.join(", ")}`);
  console.log(`${passed}/${CASES.length} query expectations in top 5`);
  if (failures.length) console.log(failures.map((f) => `  MISS ${f}`).join("\n"));

  if (!numbersOk || passed < CASES.length) process.exitCode = 1;
}

main();
