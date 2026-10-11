import { defineTool } from "eve/tools";
import { z } from "zod";
import { loadCourts } from "../lib/corpus";

type Court = {
  county: string;
  court: string;
  site: string;
  local_rules: string;
  rules_effective?: string;
  local_forms?: string;
};

/**
 * Rank the 58 superior courts against a county mention. Mirrors findCourt() in
 * lib/engine.js so the browser and the agent agree on which court a filer means.
 */
function scoreCourts(query: string, courts: Court[]): Array<{ court: Court; score: number }> {
  const q = String(query || "")
    .toLowerCase()
    .replace(/\bcount(?:y|ies)\b/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!q) return [];

  const out: Array<{ court: Court; score: number }> = [];
  for (const c of courts) {
    const county = String(c.county).toLowerCase();
    let score = 0;
    if (county === q) score = 100;
    else if (county.startsWith(q) || q.startsWith(county)) score = 70;
    else if (county.includes(q) || q.includes(county)) score = 45;
    else {
      const hits = q.split(" ").filter((w) => w.length > 2 && county.includes(w)).length;
      if (hits) score = 20 * hits;
    }
    if (score > 0) out.push({ court: c, score });
  }
  out.sort((a, b) => b.score - a.score || a.court.county.localeCompare(b.court.county));
  return out;
}

export default defineTool({
  description:
    "Find a California county's superior court and where it publishes its LOCAL forms and local rules. " +
    "Use this whenever a question depends on the county — local forms, local rules, filing locally, or " +
    "whether a statewide Judicial Council form is enough. This matters because the statewide forms catalog " +
    "covers only Judicial Council forms: each of the 58 superior courts also adopts its own local forms, and " +
    "the Judicial Council keeps no central index of them. Pass the county name (\"Alameda\", \"San Bernardino\", " +
    "\"Contra Costa\"); the word \"county\" and surrounding text are tolerated. Returns sources like [ct1] to cite.",
  inputSchema: z.object({
    county: z
      .string()
      .min(2)
      .describe("County name, optionally inside a longer phrase, e.g. \"Los Angeles\" or \"filing in Ventura County\""),
    limit: z.number().int().min(1).max(5).optional(),
  }),
  async execute({ county, limit }) {
    const courts = (await loadCourts().catch(() => [])) as Court[];
    if (!courts.length) return { sources: [], note: "Court directory unavailable." };

    const hits = scoreCourts(county, courts).slice(0, limit ?? 3);
    if (!hits.length) {
      return {
        sources: [],
        note:
          `No California superior court matched "${county}". California has exactly 58 counties, one superior ` +
          "court each — check the spelling, or ask which county the case is filed in.",
      };
    }

    return {
      note:
        "Cite the court inline with its bracketed marker, e.g. [ct1]. Be explicit that the statewide Judicial " +
        "Council forms are only part of what a filer may need: this court can also require local forms. Give the " +
        "local-forms link when one is provided; when it is not, send the filer to the court's own site and tell " +
        "them to look for \"local forms\" there, and do not invent a form number or a URL. Local form numbers can " +
        "collide with Judicial Council numbers (a county may have its own \"FL-5\" or \"CR-1\" that is unrelated " +
        "to the statewide FL or CR series), so always name the court alongside a local form number.",
      sources: hits.map(({ court: c }, i) => ({
        marker: `[ct${i + 1}]`,
        citation: `${c.court} — official site`,
        county: c.county,
        court: c.court,
        site: c.site,
        ...(c.local_forms
          ? { local_forms: c.local_forms }
          : {
              local_forms: null,
              local_forms_note:
                "No verified local-forms page on file for this court. Direct the filer to the court site above " +
                "and its \"local forms\" section; do not guess a URL.",
            }),
        local_rules: c.local_rules,
        ...(c.rules_effective ? { rules_effective: c.rules_effective } : {}),
      })),
    };
  },
});
