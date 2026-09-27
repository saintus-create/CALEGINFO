import { z } from "zod";
import searchStatutes from "./search_statutes";
import searchBills from "./search_bills";
import searchRules from "./search_rules";
import searchCases from "./search_cases";

/**
 * The research engine is deliberately separate from the model's answer prompt.
 * It creates an evidence record first; the model then synthesizes that record.
 */
export const researchInputSchema = z.object({
  question: z.string().min(2),
});

type Source = Record<string, unknown>;

type ResearchRecord = {
  question: string;
  mode: "direct" | "analytical" | "deep";
  research_plan: string[];
  authorities: Source[];
  relationships: string[];
  conflicts: string[];
  chronology: string[];
  synthesis_requirements: string[];
};

function terms(question: string): string[] {
  return question
    .replace(/[^\p{L}\p{N}\s§.-]/gu, " ")
    .split(/\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 3)
    .filter((x) => !/^(what|when|where|which|does|did|can|could|would|should|how|why|the|and|for|with|from|about|under|into|have|has|this|that|there|their|they|are|was|were)$/i.test(x));
}

function inferMode(question: string): "direct" | "analytical" | "deep" {
  const q = question.toLowerCase();
  if (/history|historical|former|prior|before|after|amend|amended|effective|retroactive|legislative history|overruled|superseded|conflict|contradict|compare|versus|vs\.?|timeline|procedural history|multiple cases/.test(q)) return "deep";
  if (/mean|means|interpret|interpretation|apply|application|valid|invalid|void|due process|constitutional|exception|element|elements|standard|require|required|whether|because|under .*law|case law/.test(q)) return "analytical";
  return "direct";
}

function unique<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const k = key(item);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export async function buildResearchRecord(question: string): Promise<ResearchRecord> {
  const mode = inferMode(question);
  const keyTerms = terms(question);
  const focused = keyTerms.slice(0, 8).join(" ") || question.slice(0, 180);
  const queries = unique(
    [focused, keyTerms.slice(0, 4).join(" "), keyTerms.slice(0, 6).join(" ")],
    (x) => x.toLowerCase(),
  ).filter(Boolean).slice(0, 3);

  const authorities: Source[] = [];
  const plan: string[] = ["Identify the legal issue, jurisdiction, and relevant time period."];
  const relationships: string[] = [];
  const conflicts: string[] = [];
  const chronology: string[] = [];

  const statuteOut = await searchStatutes.execute({ queries, limit: mode === "deep" ? 18 : mode === "analytical" ? 12 : 8 }, undefined as never).catch(() => ({ sources: [] }));
  const statutes = (statuteOut?.sources || []) as Source[];
  authorities.push(...statutes.map((s) => ({ ...s, authority_type: "statute", role: "primary" })));
  plan.push("Retrieve the governing California Code provisions before relying on interpretation or secondary material.");

  const statuteTopics = statutes
    .slice(0, 4)
    .map((s) => String(s.citation || "").replace(/\s*\([^)]*\)\s*$/, ""))
    .filter(Boolean);
  const topicQueries = unique([focused, ...statuteTopics], (x) => x.toLowerCase()).slice(0, 3);

  const needsCases = mode !== "direct" || /case|court|judge|hold|held|interpret|apply|meaning|constitutional|due process|void|valid|invalid/.test(question.toLowerCase());
  const needsRules = /court|hearing|filing|file|deadline|service|serve|notice|appeal|appealable|warrant|procedure|procedural|motion|trial|discovery|evidence/.test(question.toLowerCase());
  const needsBills = mode === "deep" || /bill|legislature|legislation|amend|chaptered|pending|passed|veto|new law|recent law|current law/.test(question.toLowerCase());

  if (needsCases) {
    plan.push("Find published California appellate/Supreme Court decisions that interpret or apply the governing provisions.");
    const out = await searchCases.execute({ queries: topicQueries.slice(0, 2) }, undefined as never).catch(() => ({ sources: [] }));
    const cases = (out?.sources || []) as Source[];
    authorities.push(...cases.map((s) => ({ ...s, authority_type: "case", role: "interpretive" })));
  }

  if (needsRules) {
    plan.push("Check California Rules of Court for procedural requirements, deadlines, and court mechanics.");
    const out = await searchRules.execute({ queries: topicQueries, limit: mode === "deep" ? 8 : 5 }, undefined as never).catch(() => ({ sources: [] }));
    const rules = (out?.sources || []) as Source[];
    authorities.push(...rules.map((s) => ({ ...s, authority_type: "rule", role: "procedural" })));
  }

  if (needsBills) {
    plan.push("Check the legislative record for amendments, chaptered measures, active bills, and recent changes affecting the issue.");
    const out = await searchBills.execute({ queries: topicQueries, limit: mode === "deep" ? 8 : 5 }, undefined as never).catch(() => ({ sources: [] }));
    const bills = (out?.sources || []) as Source[];
    authorities.push(...bills.map((s) => ({ ...s, authority_type: "bill", role: "legislative" })));
  }

  const repealed = authorities.filter((s) => String(s.citation || "").includes("REPEALED"));
  if (repealed.length) chronology.push("At least one retrieved statutory provision is marked repealed; do not treat it as current law without establishing the relevant date.");
  if (authorities.some((s) => s.authority_type === "bill")) chronology.push("Legislative materials are evidence of legislative activity; distinguish chaptered law from active, vetoed, or otherwise non-enacted measures.");

  const statuteCites = authorities.filter((s) => s.authority_type === "statute").map((s) => String(s.citation || s.marker || "")).filter(Boolean);
  const caseNames = authorities.filter((s) => s.authority_type === "case").map((s) => String(s.caseName || "")).filter(Boolean);
  if (statuteCites.length && caseNames.length) relationships.push(`Compare the retrieved cases against the governing provisions: ${statuteCites.slice(0, 4).join(", ")} ↔ ${caseNames.slice(0, 4).join(", ")}.`);
  if (statuteCites.length) relationships.push("Treat statutory text as the operative rule and cases as interpretations/applications; do not attribute a judicial gloss to the statute itself.");

  const markers = unique(authorities.map((s) => String(s.marker || "")).filter(Boolean), (x) => x);
  const synthesis = [
    "State what each important source actually establishes before drawing the conclusion.",
    "Separate quoted/source-supported propositions from the model's synthesis.",
    "Do not use a source merely because it shares keywords with the question; explain its relevance to the proposition being asserted.",
    "Check jurisdiction and temporal fit, and identify material uncertainty or conflicting authority rather than smoothing it over.",
  ];
  if (mode === "deep") synthesis.push("Reconstruct chronology where dates, amendments, historical versions, or procedural history can change the answer.");
  if (markers.length) synthesis.push(`Available evidence markers: ${markers.join(", ")}. Cite only propositions actually supported by those sources.`);

  return { question, mode, research_plan: plan, authorities, relationships, conflicts, chronology, synthesis_requirements: synthesis };
}

export default {
  description: "Run the mandatory California-law research pass. Builds a structured evidence record across primary statutes and, when relevant, cases, rules, and legislative materials before synthesis.",
  inputSchema: researchInputSchema,
  execute: async ({ question }: z.infer<typeof researchInputSchema>) => buildResearchRecord(question),
};
