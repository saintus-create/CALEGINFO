import { defineTool } from "eve/tools";
import { z } from "zod";
import { CODE_NAMES, codesFor, loadCode } from "../lib/corpus";
import { scoreSections } from "../lib/search";

function extractCodeHints(queries: string[]): string[] {
  const text = queries.join(" ").toLowerCase();
  const hints = new Set<string>();

  for (const [phrase, abbr] of [
    ["family code", "FAM"], ["penal code", "PEN"], ["civil code", "CIV"],
    ["code of civil procedure", "CCP"], ["government code", "GOV"],
    ["insurance code", "INS"], ["education code", "EDC"], ["evidence code", "EVID"],
    ["welfare and institutions code", "WIC"], ["business and professions code", "BPC"],
    ["health and safety code", "HSC"], ["revenue and taxation code", "RTC"],
    ["vehicle code", "VEH"], ["water code", "WAT"], ["labor code", "LAB"],
    ["elections code", "ELEC"], ["probate code", "PROB"], ["corporations code", "CORP"],
    ["financial code", "FIN"], ["commercial code", "COM"], ["food and agricultural code", "FAC"],
    ["fish and game code", "FGC"], ["public resources code", "PRC"],
    ["public utilities code", "PUC"], ["public contract code", "PCC"],
    ["streets and highways code", "SHC"], ["harbors and navigation code", "HNC"],
    ["military and veterans code", "MVC"], ["unemployment insurance code", "UIC"],
  ] as const) {
    if (text.includes(phrase)) hints.add(abbr);
  }

  for (const q of queries) {
    for (const token of q.match(/\b[A-Z]{2,5}\b/g) || []) {
      if (Object.prototype.hasOwnProperty.call(CODE_NAMES, token)) hints.add(token);
    }
  }

  return [...hints];
}

export default defineTool({
  description:
    "Search the complete California Codes (all 29 codes + the Constitution, every section with full text and legislative history). " +
    "Use this FIRST for any California law question. Returns numbered statute sources like [1], [2] to cite inline.",
  inputSchema: z.object({
    queries: z.array(z.string().min(2)).min(1).max(4).describe("Search phrases — the question's key terms"),
    codes: z.array(z.string()).optional().describe("Optional code abbreviations to prioritize, e.g. [\"CIV\", \"CCP\"]"),
    limit: z.number().int().min(4).max(24).optional(),
  }),
  async execute({ queries, codes, limit }) {
    const explicit = codesFor(codes);
    const hints = codes?.length ? [] : extractCodeHints(queries);
    const inferred = hints.length ? hints : undefined;
    const abbrs = codes?.length ? explicit : (inferred || ["FAM", "CCP", "PEN", "CIV", "GOV", "WIC", "EVID"]);

    const records = (await Promise.all(
      abbrs.map(async (abbr) => {
        const rows = await loadCode(abbr).catch(() => []);
        return rows.map((r) => ({ abbr, r: r as unknown as Record<string, unknown> }));
      }),
    )).flat();

    const hits = scoreSections(queries, records, codes ?? (hints.length ? hints : undefined), limit ?? 16);
    if (!hits.length) return { sources: [], note: "No matching statutes found. Try different terms." };
    return {
      note: "Cite these inline with their bracketed markers, e.g. [1] or [2], right after the sentence each supports.",
      sources: hits.map((h, i) => ({
        marker: `[${i + 1}]`,
        citation: h.citation + (h.repealed ? " (REPEALED)" : ""),
        code: (CODE_NAMES[h.abbr] || h.abbr) + " (" + h.abbr + ")",
        text: h.text,
        ...(h.history ? { legislative_history: h.history } : {}),
      })),
    };
  },
});
