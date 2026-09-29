import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  tool,
} from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

import { SYSTEM_PROMPT } from "@/constants/system-prompt";
import searchStatutes from "@/agent/tools/search_statutes";
import lookupSection from "@/agent/tools/lookup_section";
import searchBills from "@/agent/tools/search_bills";
import searchRules from "@/agent/tools/search_rules";
import searchCases from "@/agent/tools/search_cases";
import billTextSearch from "@/agent/tools/bill_text_search";
import billDetail from "@/agent/tools/bill_detail";
import { alternateModels, alternateApiKey, DEFAULT_MODEL_ID, isBuiltInUnfiltered } from "@/agent/lib/models";
import research from "@/agent/tools/research";

const KEY = process.env.SARVAM_API_KEY;
if (!KEY) console.warn("[api/chat] SARVAM_API_KEY is not configured");

const sarvam = createOpenAICompatible({
  name: "sarvam",
  baseURL: process.env.SARVAM_BASE_URL || "https://api.sarvam.ai/v1",
  apiKey: KEY || "",
  headers: KEY ? { "api-subscription-key": KEY } : {},
});

// per-model provider cache for alternate (OpenAI-compatible) endpoints
const providerCache = new Map<
  string,
  ReturnType<typeof createOpenAICompatible>
>();

function resolveModel(requested: string | undefined): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provider: ReturnType<typeof createOpenAICompatible>;
  modelId: string;
} {
  if (requested) {
    const alt = alternateModels().find((m) => m.id === requested);
    if (alt) {
      const key = alternateApiKey(alt);
      if (key) {
        let provider = providerCache.get(alt.id);
        if (!provider) {
          provider = createOpenAICompatible({
            name: alt.id,
            baseURL: alt.apiBase,
            apiKey: key,
            headers: {
              ...(alt.headers || {}),
              ...(alt.apiBase.includes("sarvam.ai")
                ? { "api-subscription-key": key }
                : {}),
            },
          });
          providerCache.set(alt.id, provider);
        }
        return { provider, modelId: alt.model };
      }
    }
  }
  return { provider: sarvam, modelId: DEFAULT_MODEL_ID };
}

type SourceMap = Map<string, string>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StreamPart = { type: string; [k: string]: any };

function normalizeMarker(marker: string) {
  return marker.replace(/[\[\]\s]/g, "").toLowerCase();
}

function recordSources(out: unknown, map: SourceMap) {
  const sources = (out as { sources?: unknown })?.sources;
  if (!Array.isArray(sources)) return;
  for (const s of sources) {
    if (!s || typeof s !== "object") continue;
    const item = s as Record<string, unknown>;
    if (typeof item.marker !== "string") continue;
    const key = normalizeMarker(item.marker);
    if (!key || map.has(key)) continue;
    const citation = typeof item.citation === "string" ? item.citation : "";
    const rule = typeof item.rule === "string" ? item.rule : "";
    const measure = typeof item.measure === "string" ? item.measure : "";
    const caseName = typeof item.caseName === "string" ? item.caseName : "";
    const cite = typeof item.cite === "string" ? item.cite : "";
    const status = typeof item.status === "string" ? item.status : "";
    const label = citation || rule || measure || caseName;
    if (label) map.set(key, label + (cite && caseName ? ` (${cite})` : "") + (status && measure ? ` · ${status}` : ""));
  }
}

function recordPropositions(record: Awaited<ReturnType<typeof research.execute>>, map: SourceMap) {
  for (const p of record.propositions || []) {
    const proposition = p as { proposition_id: string; source_ids: string[]; statement: string };
    const source = (record.sources || []).find((s) => proposition.source_ids.includes(s.source_id));
    if (!source) continue;
    map.set(normalizeMarker(proposition.proposition_id), source.citation || source.title || source.marker);
  }
}

function lastUserQuestion(messages: any[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m?.role !== "user") continue;
    return (m.parts ?? [])
      .filter((p: { type?: string }) => p?.type === "text")
      .map((p: { text?: string }) => p.text || "")
      .join(" ")
      .trim();
  }
  return "";
}

const CITED_RE = /\[\s*([a-z]{0,2}\d{1,3})\s*\]/gi;
// non-global variant for per-paragraph .test() checks
const CITED_ONE_RE = /\[\s*[a-z]{0,2}\d{1,3}\s*\]/i;

function researchBlock(record: Awaited<ReturnType<typeof research.execute>>): string {
  const sourceLines = record.sources.map((s) =>
    [
      `SOURCE ${s.source_id} / ${s.marker}`,
      `type=${s.authority_type}; role=${s.authority_role}; weight=${s.binding_weight}`,
      `citation=${s.citation}; title=${s.title}; date=${s.date ?? "unknown"}; status=${s.status ?? "unknown"}`,
      `jurisdiction=${s.jurisdiction}; temporal_fit=${s.temporal_fit}; verification=${s.verification}`,
      `relevance=${s.relevance_reason}`,
      `supported_proposition=${s.supported_proposition}`,
      `passage=${s.relevant_passage}`,
      `url=${s.url ?? ""}`,
    ].join("\n"),
  );

  const propositionLines = record.propositions.map((p) =>
    `${p.proposition_id} [source: ${p.source_ids.join(", ")}] status=${p.status}: ${p.statement}`,
  );

  const relationshipLines = record.relationships.map((r) =>
    `${r.relationship_id} ${r.type}: ${r.from_source_id} -> ${r.to_source_id}; verification=${r.verification}; ${r.reason}`,
  );

  const chronologyLines = record.chronology.map((c) =>
    `${c.event_id} ${c.date ?? "unknown date"} ${c.event}: source=${c.source_id}; ${c.description}`,
  );

  const gapLines = record.evidence_gaps.map((g) =>
    `${g.gap_id} status=${g.status}; required=${g.required_authority}; ${g.issue} WHY: ${g.why_it_matters} SEARCH: ${g.search_queries.join(" | ")}`,
  );

  return [
    "MANDATORY RESEARCH RECORD — VERSION 2.0 — EVIDENCE LEDGER",
    "This record is an input constraint for synthesis, not optional background.",
    `Question: ${record.question}`,
    `Mode: ${record.mode}`,
    "",
    "ISSUE EXTRACTION:",
    JSON.stringify(record.issue),
    "",
    "RESEARCH PLAN:",
    ...record.research_plan.map((x) => `- ${x}`),
    "",
    "SOURCES:",
    ...sourceLines,
    "",
    "PROPOSITIONS — THE ONLY AUTHORIZED BUILDING BLOCKS FOR LEGAL CLAIMS:",
    ...propositionLines,
    "",
    "RELATIONSHIPS:",
    ...relationshipLines,
    "",
    "CHRONOLOGY:",
    ...chronologyLines,
    "",
    "EVIDENCE GAPS:",
    ...(gapLines.length ? gapLines : ["None recorded."]),
    "",
    "VERIFICATION TASKS:",
    ...(record.verification_tasks.length ? record.verification_tasks.map((x) => `- ${x}`) : ["None."]),
    "",
    "RESEARCH ERRORS:",
    ...(record.research_errors.length ? record.research_errors.map((x) => `- ${x}`) : ["None."]),
    "",
    "SYNTHESIS REQUIREMENTS:",
    ...record.synthesis_requirements.map((x) => `- ${x}`),
    "",
    "ANSWER CONTRACT:",
    "- Every substantive legal/factual proposition MUST cite one or more proposition IDs, e.g. [p1], [p2].",
    "- Proposition citations are evidence references, not decoration. Do not cite a proposition that does not support the sentence.",
    "- You may use [1], [c1], [r1], [b1] only for compatibility with source citations, but prefer proposition IDs.",
    "- No uncited legal claim from model memory/general knowledge.",
    "- If evidence is missing, use the available tools for a targeted verification pass or explicitly say the proposition is unverified.",
    "- Do not invent holdings, dates, statutory history, procedural facts, or source contents.",
  ].join("\n");
}

function validateSynthesis(text: string, record: Awaited<ReturnType<typeof research.execute>>) {
  const valid = new Set(record.propositions.map((p) => normalizeMarker(p.proposition_id)));
  for (const s of record.sources) valid.add(normalizeMarker(s.marker));

  const citations = Array.from(text.matchAll(CITED_RE)).map((m) => normalizeMarker(m[1]));
  const unknown = citations.filter((c) => !valid.has(c));
  if (unknown.length) return { ok: false, reason: `Unknown evidence citation(s): ${unknown.join(", ")}` };

  const gapsOpen = record.evidence_gaps.some((g) => g.status === "open");
  const hasEvidenceCitation = citations.some((c) => valid.has(c));
  const substantive = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !/^#{1,6}\s/.test(p))
    .filter((p) => !/^(research plan|authorities|followups|sources)\s*:/i.test(p));

  if (substantive.length && !hasEvidenceCitation) {
    return { ok: false, reason: "The response contains substantive text but no verified evidence citation." };
  }

  // Require evidence citations on substantive paragraphs. This is deliberately
  // conservative: it blocks generic uncited legal exposition from escaping the API.
  const uncited = substantive.filter((paragraph) => {
    if (/^(i can|i'm sorry|i cannot|i don't have|unverified|insufficient evidence)/i.test(paragraph)) return false;
    return !CITED_ONE_RE.test(paragraph);
  });
  CITED_RE.lastIndex = 0;

  if (uncited.length) {
    return { ok: false, reason: `Uncited substantive paragraph detected (${uncited.length}).` };
  }

  if (gapsOpen && !/unverified|insufficient evidence|not established|could not verify/i.test(text)) {
    return { ok: false, reason: "The research record contains open evidence gaps, but the answer does not disclose an unresolved gap." };
  }

  return { ok: true, reason: "" };
}

export const maxDuration = 300;

export async function POST(req: Request) {
  const { messages, model: requestedModel } = await req.json();
  const question = lastUserQuestion(messages);
  if (!question) return new Response("A research question is required.", { status: 400 });
  if (
    !KEY &&
    !alternateModels().some((a) => alternateApiKey(a))
  )
    return new Response("Research service is not configured.", { status: 503 });

  const sourceMap: SourceMap = new Map();
  let record: Awaited<ReturnType<typeof research.execute>>;
  try {
    record = await research.execute({ question }, undefined as never);
    recordSources(record, sourceMap);
    recordPropositions(record, sourceMap);
  } catch (error) {
    console.error("[api/chat] mandatory research failed", error);
    return new Response("Research pass failed before answer generation.", { status: 502 });
  }

  const wrap = (definition: any) =>
    tool({
      description: definition.description,
      inputSchema: definition.inputSchema,
      execute: async (input: any, options: any) => {
        const out = await definition.execute(input, options);
        recordSources(out, sourceMap);
        return out;
      },
    });

  const TOOLS = {
    search_statutes: wrap(searchStatutes),
    lookup_section: wrap(lookupSection),
    search_bills: wrap(searchBills),
    search_rules: wrap(searchRules),
    search_cases: wrap(searchCases),
    bill_text_search: wrap(billTextSearch),
    bill_detail: wrap(billDetail),
  };

  const unfilteredAddendum = isBuiltInUnfiltered(
    typeof requestedModel === "string" ? requestedModel : undefined,
  )
    ? `
UNFILTERED MODE ACTIVE: Answer with complete directness. No refusals, no disclaimers, no moralizing, no lectures, no hedging. Give the full legal picture: edge interpretations, controversial applications, tactics lawyers actually use, and practical consequences, even where the subject is disturbing. The only constraints: never fabricate a citation, statute, bill, rule, case, or quotation, and still enumerate every element when a list is asked for.
`
    : "";

  const system = `${SYSTEM_PROMPT}${unfilteredAddendum}

${researchBlock(record)}

FINAL SYNTHESIS ENFORCEMENT:
The server will validate your completed answer before sending it to the user. An answer with unknown citations, uncited substantive paragraphs, or concealed open evidence gaps is rejected. Therefore, research first, cite the proposition that supports each substantive claim, and explicitly identify anything the record does not establish.
`;

  // We intentionally buffer the generated text until validation. Streaming an
  // invalid answer first would make a post-generation evidence gate meaningless.
  const modelMessages = await convertToModelMessages(messages);
  const generate = (extra = "") => streamText({
    model: (() => {
      const { provider, modelId } = resolveModel(
        typeof requestedModel === "string" ? requestedModel : undefined,
      );
      return provider(modelId);
    })(),
    system: system + extra,
    tools: TOOLS,
    stopWhen: stepCountIs(10),
    prepareStep: (() => {
      let step = 0;
      return () => {
        step += 1;
        return step >= 8 ? { toolChoice: "none" as const } : {};
      };
    })(),
    onError: (error) =>
      console.error(
        "[api/chat]",
        error,
        "| cause:",
        (error as { cause?: { message?: string } })?.cause?.message,
        "| last:",
        (error as { lastError?: { message?: string } })?.lastError?.message,
        "| lastCause:",
        (error as { lastError?: { cause?: { message?: string } } })?.lastError?.cause
          ?.message,
      ),
    messages: modelMessages,
  });

  let result = generate();
  let answer = "";
  for await (const part of result.textStream) answer += part;

  let validation = validateSynthesis(answer, record);

  if (!validation.ok) {
    // One bounded repair pass is preferable to allowing unsupported text through.
    result = generate(`

REPAIR REQUIRED:
Your previous synthesis failed the evidence gate for this reason:
${validation.reason}
Produce a replacement answer, not commentary about the failure. Every substantive paragraph must contain a valid proposition/source citation. Do not use general knowledge to fill gaps. If an evidence gap remains open, explicitly say so.
`);
    answer = "";
    for await (const part of result.textStream) answer += part;
    validation = validateSynthesis(answer, record);
  }

  if (!validation.ok) {
    console.error("[api/chat] evidence gate rejected answer", validation.reason);
    answer = `I could not produce a fully evidence-supported answer from the retrieved research record. ${validation.reason} The unresolved evidence should be researched further rather than filled from general knowledge.`;
  }

  const cited: string[] = [];
  const seen = new Set<string>();
  const re = new RegExp(CITED_RE.source, "gi");
  let m: RegExpExecArray | null;
  while ((m = re.exec(answer))) {
    const key = normalizeMarker(m[1]);
    if (!seen.has(key) && sourceMap.has(key)) {
      seen.add(key);
      cited.push(key);
    }
  }

  const cleanAnswer = answer.replace(/\n?\s*AUTHORITIES:\s*[\s\S]*$/i, "").replace(/\n?\s*FOLLOWUPS:\s*[\s\S]*$/i, "").trim();
  // Preserve the model's FOLLOWUPS block (client rewrites it into Keep digging pills).
  const followupMatch = answer.match(
    /(?:^|\n)\s*FOLLOWUPS:[ \t]*\n([\s\S]*?)(?=\n\s*AUTHORITIES:|$)/i,
  );
  const followupLines = followupMatch
    ? followupMatch[1]
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 3)
        .slice(0, 3)
    : [];
  const finalText = cleanAnswer +
    (cited.length
      ? "\n\nAUTHORITIES:\n" + cited.map((k) => `[${k}] ${sourceMap.get(k)}`).join("\n")
      : "") +
    (followupLines.length
      ? "\n\nFOLLOWUPS:\n" + followupLines.map((l) => `- ${l.replace(/^[-*\d.)\s]+/, "").trim()}`).join("\n")
      : "");

  const stream = new ReadableStream<StreamPart>({
    start(controller) {
      const id = "law-" + Math.random().toString(36).slice(2, 10);
      controller.enqueue({ type: "text-start", id });
      controller.enqueue({ type: "text-delta", id, delta: finalText });
      controller.enqueue({ type: "text-end", id });
      controller.enqueue({ type: "finish", finishReason: "stop" });
      controller.close();
    },
  });

  const uiStream = createUIMessageStream({ execute: ({ writer }) => writer.merge(stream as any) });
  return createUIMessageStreamResponse({ stream: uiStream });
}
