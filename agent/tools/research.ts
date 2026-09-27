import { z } from "zod";
import searchStatutes from "./search_statutes";
import searchBills from "./search_bills";
import searchRules from "./search_rules";
import searchCases from "./search_cases";

/**
 * The research engine creates an evidence ledger before answer generation.
 * The ledger is deliberately explicit about what a source can establish,
 * what remains unknown, and what must be verified next.
 */

export const researchInputSchema = z.object({
  question: z.string().min(2),
});

type AuthorityType = "statute" | "case" | "rule" | "bill";
type ResearchMode = "direct" | "analytical" | "deep";
type VerificationState = "retrieved" | "needs_followup" | "unverified";
type RelationshipType =
  | "interprets"
  | "amends"
  | "supersedes"
  | "distinguishes"
  | "potentially_conflicts"
  | "chronologically_related";

type ResearchSource = {
  source_id: string;
  marker: string;
  authority_type: AuthorityType;
  authority_role: "primary" | "binding_interpretation" | "procedural" | "legislative";
  citation: string;
  title: string;
  date: string | null;
  status: string | null;
  jurisdiction: string;
  temporal_fit: "current" | "historical" | "unknown";
  binding_weight: "constitutional" | "statute" | "supreme_court" | "court_of_appeal" | "rule" | "legislative_material";
  relevant_passage: string;
  supported_proposition: string;
  relevance_reason: string;
  verification: VerificationState;
  url: string | null;
};

type Proposition = {
  proposition_id: string;
  source_ids: string[];
  statement: string;
  support_type: "direct_text" | "case_statement" | "legislative_record";
  status: "supported" | "needs_verification";
};

type Relationship = {
  relationship_id: string;
  type: RelationshipType;
  from_source_id: string;
  to_source_id: string;
  reason: string;
  verification: VerificationState;
};

type ChronologyEvent = {
  event_id: string;
  source_id: string;
  date: string | null;
  event: "enacted" | "amended" | "effective" | "interpreted" | "repealed" | "status_change" | "unknown";
  description: string;
};

type EvidenceGap = {
  gap_id: string;
  issue: string;
  why_it_matters: string;
  required_authority: AuthorityType | "any";
  search_queries: string[];
  status: "open" | "addressed";
};

export type ResearchRecord = {
  schema_version: "2.0";
  question: string;
  issue: {
    legal_issue: string;
    jurisdiction: string;
    timeframe: string | null;
    procedural_posture: string | null;
    actors: string[];
    factual_predicates: string[];
    requested_comparison: string | null;
  };
  mode: ResearchMode;
  research_plan: string[];
  sources: ResearchSource[];
  propositions: Proposition[];
  relationships: Relationship[];
  chronology: ChronologyEvent[];
  evidence_gaps: EvidenceGap[];
  verification_tasks: string[];
  research_errors: string[];
  synthesis_requirements: string[];
  answer_contract: {
    must_cite_propositions: boolean;
    citation_format: string;
    may_use_uncited_general_knowledge: false;
    unsupported_claim_action: "research_or_state_unverified";
  };
};

function clean(value: unknown, max = 1600): string {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
}

function terms(question: string): string[] {
  return question
    .replace(/[^\p{L}\p{N}\s§.-]/gu, " ")
    .split(/\s+/)
    .map((x) => x.trim())
    .filter((x) => x.length >= 3)
    .filter((x) => !/^(what|when|where|which|does|did|can|could|would|should|how|why|the|and|for|with|from|about|under|into|have|has|this|that|there|their|they|are|was|were|is|of|to|a|an|in|on|or|be|as|by|it)$/i.test(x));
}

function inferMode(question: string): ResearchMode {
  const q = question.toLowerCase();
  if (/history|historical|former|prior|before|after|amend|amended|effective|retroactive|legislative history|overruled|superseded|conflict|contradict|compare|versus|vs\.?|timeline|procedural history|multiple cases/.test(q)) return "deep";
  if (/mean|means|interpret|interpretation|apply|application|valid|invalid|void|due process|constitutional|exception|element|elements|standard|require|required|whether|because|under .*law|case law/.test(q)) return "analytical";
  return "direct";
}

function inferIssue(question: string) {
  const q = question.toLowerCase();
  const actors = Array.from(new Set(
    (question.match(/\b(?:court|judge|police|officer|prosecutor|district attorney|defendant|petitioner|respondent|agency|legislature|governor|county|city|state)\b/gi) || [])
      .map((x) => x.toLowerCase()),
  ));
  const dates = question.match(/\b(?:19|20)\d{2}\b/g);
  const codeRefs = question.match(/\b(?:[A-Z]{2,5}|Cal\.)\s*(?:Code|Rules?)[^,;]*/g) || [];
  const posture = /appeal|trial|hearing|motion|warrant|arrest|petition|complaint|restraining|order|judgment|sentenc|convict|dismiss/i.test(q)
    ? clean(question.match(/(?:appeal|trial|hearing|motion|warrant|arrest|petition|complaint|restraining order|judgment|sentencing|conviction|dismissal)[^.;]*/i)?.[0] || "", 240)
    : null;
  const comparison = /\b(?:compare|versus|vs\.?|difference|different|same|conflict|contradict|relationship)\b/i.test(question)
    ? clean(question, 280)
    : null;
  const facts = question.split(/[.;?]+/).map((x) => clean(x, 180)).filter(Boolean).slice(0, 5);
  return {
    legal_issue: clean(question, 500),
    jurisdiction: /california|\bca\b|cal\.?/i.test(question) ? "California" : "California unless the sources establish otherwise",
    timeframe: dates?.length ? Array.from(new Set(dates)).join(", ") : null,
    procedural_posture: posture,
    actors,
    factual_predicates: facts,
    requested_comparison: comparison || (codeRefs.length > 1 ? codeRefs.join(" vs. ") : null),
  };
}

function sourceFrom(raw: Record<string, unknown>, authorityType: AuthorityType, index: number): ResearchSource {
  const marker = clean(raw.marker, 40) || `[${authorityType[0]}${index + 1}]`;
  const citation = clean(raw.citation || raw.rule || raw.measure || raw.caseName || raw.cite, 300);
  const title = clean(raw.caseName || raw.subject || raw.rule || raw.measure || raw.citation, 220);
  const dateValue = clean(raw.date || raw.dateFiled, 40);
  const status = clean(raw.status || raw.group, 80) || null;
  const passage = clean(raw.text || raw.snippet || raw.subject || "", 1500);
  const url = clean(raw.url || raw.official_text, 500) || null;
  const bindingWeight =
    authorityType === "statute" ? "statute" :
    authorityType === "rule" ? "rule" :
    authorityType === "bill" ? "legislative_material" :
    /supreme/i.test(clean(raw.court)) ? "supreme_court" : "court_of_appeal";
  const temporalFit = /repealed/i.test(citation) ? "historical" : dateValue ? "unknown" : "unknown";
  const authorityRole =
    authorityType === "statute" ? "primary" :
    authorityType === "case" ? "binding_interpretation" :
    authorityType === "rule" ? "procedural" : "legislative";
  const proposition =
    authorityType === "case"
      ? `${title || "The retrieved opinion"} contains the reported proposition in the cited passage/snippet: “${passage.slice(0, 650)}”`
      : authorityType === "bill"
        ? `${title || "The retrieved legislative record"} reports the legislative status/material shown in the source: “${passage.slice(0, 650)}”`
        : `${citation || title || "The retrieved authority"} states the following relevant text: “${passage.slice(0, 650)}”`;
  return {
    source_id: `s${index + 1}`,
    marker,
    authority_type: authorityType,
    authority_role: authorityRole,
    citation,
    title,
    date: dateValue || null,
    status,
    jurisdiction: authorityType === "case" ? "California appellate courts" : "California",
    temporal_fit: temporalFit,
    binding_weight: bindingWeight,
    relevant_passage: passage,
    supported_proposition: proposition,
    relevance_reason: `Retrieved because its ${authorityType} text or metadata matched the research issue/query.`,
    verification: passage ? "retrieved" : "unverified",
    url,
  };
}

async function runSearch(
  label: string,
  fn: () => Promise<unknown>,
  errors: string[],
): Promise<Record<string, unknown>[]> {
  try {
    const out = await fn();
    const sources = (out as { sources?: unknown })?.sources;
    return Array.isArray(sources) ? sources.filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : [];
  } catch (error) {
    errors.push(`${label}: ${error instanceof Error ? error.message : String(error)}`);
    return [];
  }
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

function queryVariants(issue: ReturnType<typeof inferIssue>, keyTerms: string[]) {
  const legal = keyTerms.slice(0, 8).join(" ");
  const posture = issue.procedural_posture || "";
  const actors = issue.actors.slice(0, 3).join(" ");
  const variants = [
    legal,
    [legal, posture].filter(Boolean).join(" "),
    [legal, actors].filter(Boolean).join(" "),
  ].filter((x) => x.trim().length >= 2);
  return unique(variants, (x) => x.toLowerCase()).slice(0, 4);
}

function addGap(gaps: EvidenceGap[], issue: string, why: string, authority: EvidenceGap["required_authority"], queries: string[]) {
  const id = `g${gaps.length + 1}`;
  gaps.push({ gap_id: id, issue, why_it_matters: why, required_authority: authority, search_queries: queries.slice(0, 3), status: "open" });
}

export async function buildResearchRecord(question: string): Promise<ResearchRecord> {
  const mode = inferMode(question);
  const issue = inferIssue(question);
  const keyTerms = terms(question);
  const queries = queryVariants(issue, keyTerms);
  const errors: string[] = [];
  const sources: ResearchSource[] = [];
  const plan = [
    "Extract the legal issue, jurisdiction, timeframe, actors, procedural posture, and factual predicates.",
    "Retrieve the governing California Code text before relying on interpretation.",
  ];

  const statuteRaw = await runSearch(
    "California Codes",
    () => searchStatutes.execute({ queries, limit: mode === "deep" ? 18 : mode === "analytical" ? 12 : 8 }, undefined as never),
    errors,
  );
  for (const raw of statuteRaw) sources.push(sourceFrom(raw, "statute", sources.length));

  const statuteTopics = statuteRaw
    .slice(0, 5)
    .map((s) => clean(s.citation).replace(/\s*\([^)]*\)\s*$/, ""))
    .filter(Boolean);
  const topicQueries = unique([...queries, ...statuteTopics], (x) => x.toLowerCase()).slice(0, 4);
  const q = question.toLowerCase();

  const needsCases = mode !== "direct" || /case|court|judge|hold|held|interpret|apply|meaning|constitutional|due process|void|valid|invalid/.test(q);
  const needsRules = /court|hearing|filing|file|deadline|service|serve|notice|appeal|appealable|warrant|procedure|procedural|motion|trial|discovery|evidence/.test(q);
  const needsBills = mode === "deep" || /bill|legislature|legislation|amend|chaptered|pending|passed|veto|new law|recent law|current law/.test(q);

  if (needsCases) {
    plan.push("Retrieve published California appellate/Supreme Court decisions that interpret or apply the governing provisions.");
    const raw = await runSearch("California case law", () => searchCases.execute({ queries: topicQueries.slice(0, 3) }, undefined as never), errors);
    for (const s of raw) sources.push(sourceFrom(s, "case", sources.length));
  }
  if (needsRules) {
    plan.push("Check the California Rules of Court for procedural requirements and court mechanics.");
    const raw = await runSearch("California Rules of Court", () => searchRules.execute({ queries: topicQueries, limit: mode === "deep" ? 8 : 5 }, undefined as never), errors);
    for (const s of raw) sources.push(sourceFrom(s, "rule", sources.length));
  }
  if (needsBills) {
    plan.push("Check legislative materials for amendments, chaptered measures, active bills, and recent changes.");
    const raw = await runSearch("California legislative materials", () => searchBills.execute({ queries: topicQueries, limit: mode === "deep" ? 8 : 5 }, undefined as never), errors);
    for (const s of raw) sources.push(sourceFrom(s, "bill", sources.length));
  }

  const propositions: Proposition[] = sources.map((s, i) => ({
    proposition_id: `p${i + 1}`,
    source_ids: [s.source_id],
    statement: s.supported_proposition,
    support_type: s.authority_type === "case" ? "case_statement" : s.authority_type === "bill" ? "legislative_record" : "direct_text",
    status: s.verification === "retrieved" ? "supported" : "needs_verification",
  }));

  const relationships: Relationship[] = [];
  const statutes = sources.filter((s) => s.authority_type === "statute");
  const cases = sources.filter((s) => s.authority_type === "case");
  for (const c of cases.slice(0, 8)) {
    for (const s of statutes.slice(0, 4)) {
      relationships.push({
        relationship_id: `rel${relationships.length + 1}`,
        type: "interprets",
        from_source_id: c.source_id,
        to_source_id: s.source_id,
        reason: "The opinion was retrieved in the same targeted research pass as the statutory provision; the model must verify the actual interpretive relationship from the opinion.",
        verification: "needs_followup",
      });
    }
  }

  const chronology: ChronologyEvent[] = [];
  for (const s of sources) {
    if (s.temporal_fit === "historical") chronology.push({
      event_id: `t${chronology.length + 1}`,
      source_id: s.source_id,
      date: s.date,
      event: "repealed",
      description: "Retrieved authority is marked repealed; its historical effect must be tied to the relevant date.",
    });
    if (s.authority_type === "bill") chronology.push({
      event_id: `t${chronology.length + 1}`,
      source_id: s.source_id,
      date: s.date,
      event: "status_change",
      description: `Legislative material has status ${s.status || "unknown"}; do not treat it as enacted law without verification.`,
    });
  }

  const gaps: EvidenceGap[] = [];
  if (!statutes.length) addGap(gaps, "No governing statute was retrieved.", "The answer cannot safely identify the operative California rule from the initial corpus search.", "statute", queries);
  if (needsCases && !cases.length) addGap(gaps, "Case-law interpretation was requested or implied but no case was retrieved.", "A statutory text alone may not establish judicial interpretation or application.", "case", topicQueries);
  if (needsRules && !sources.some((s) => s.authority_type === "rule")) addGap(gaps, "Procedural authority was requested or implied but no Rule of Court was retrieved.", "Procedure, deadlines, service, and hearing mechanics require procedural authority.", "rule", topicQueries);
  if (needsBills && !sources.some((s) => s.authority_type === "bill")) addGap(gaps, "Legislative-history/current-legislation research was requested but no bill record was retrieved.", "The historical or legislative claim cannot be established from the current corpus alone.", "bill", topicQueries);
  if (mode === "deep" && !sources.some((s) => s.temporal_fit === "historical" || s.authority_type === "bill")) {
    addGap(gaps, "Historical chronology is required but no historical legislative/status evidence was retrieved.", "A current provision may not answer a historical-law question.", "any", topicQueries);
  }

  const verificationTasks = relationships
    .filter((r) => r.verification !== "retrieved")
    .slice(0, 12)
    .map((r) => `Verify ${r.type}: ${r.from_source_id} → ${r.to_source_id}.`);
  if (errors.length) verificationTasks.push(...errors.map((e) => `Research service issue requiring retry: ${e}`));

  const conflicts: Relationship[] = [];
  // Conservative conflict detection: only flag textual signals; never declare a
  // legal conflict merely because two sources have overlapping keywords.
  const byCitation = new Map(sources.map((s) => [s.citation, s]));
  for (const s of sources) {
    if (/repealed|superseded/i.test(s.citation + " " + (s.status || ""))) {
      const current = sources.find((x) => x.authority_type === "statute" && x.source_id !== s.source_id && x.temporal_fit === "current");
      if (current) conflicts.push({
        relationship_id: `rel${relationships.length + conflicts.length + 1}`,
        type: "supersedes",
        from_source_id: current.source_id,
        to_source_id: s.source_id,
        reason: "One retrieved authority appears current while the other is marked repealed/superseded; verify the effective dates before treating them as inconsistent.",
        verification: "needs_followup",
      });
    }
  }
  relationships.push(...conflicts);

  const synthesis = [
    "Every substantive legal proposition in the final answer must cite one or more proposition IDs using the source marker attached to that proposition.",
    "The model may synthesize supported propositions, but may not introduce uncited legal facts from pretrained/general knowledge.",
    "If a proposition is not supported by the record, conduct a targeted follow-up search or state that the proposition remains unverified.",
    "Do not convert a case's reasoning into statutory text, and do not treat a bill as enacted law unless its status establishes enactment.",
    "Use source hierarchy explicitly: operative statutory/rule text, binding judicial interpretation, then legislative material for legislative-history questions.",
    "Do not declare a conflict merely from keyword overlap; investigate chronology, jurisdiction, and the actual holdings/text.",
  ];
  if (mode === "deep") synthesis.push("Reconstruct enacted → amended → effective → interpreted → superseded/repealed chronology whenever the date can change the answer.");

  return {
    schema_version: "2.0",
    question,
    issue,
    mode,
    research_plan: plan,
    sources,
    propositions,
    relationships,
    chronology,
    evidence_gaps: gaps,
    verification_tasks: verificationTasks,
    research_errors: errors,
    synthesis_requirements: synthesis,
    answer_contract: {
      must_cite_propositions: true,
      citation_format: "Use the source marker shown for the supporting proposition, e.g. [1], [c1], [r1], [b1].",
      may_use_uncited_general_knowledge: false,
      unsupported_claim_action: "research_or_state_unverified",
    },
  };
}

export default {
  description: "Run the mandatory California-law research pass and return a schema-versioned evidence ledger with sources, propositions, relationships, chronology, gaps, and verification tasks.",
  inputSchema: researchInputSchema,
  execute: async ({ question }: z.infer<typeof researchInputSchema>) => buildResearchRecord(question),
};
