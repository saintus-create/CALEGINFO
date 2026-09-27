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
import research from "@/agent/tools/research";

const KEY = process.env.SARVAM_API_KEY;
if (!KEY) console.warn("[api/chat] SARVAM_API_KEY is not configured");

const sarvam = createOpenAICompatible({
  name: "sarvam",
  baseURL: "https://api.sarvam.ai/v1",
  apiKey: KEY || "",
  headers: KEY ? { "api-subscription-key": KEY } : {},
});

type SourceMap = Map<string, string>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StreamPart = { type: string; [k: string]: any };

function recordSources(out: unknown, map: SourceMap) {
  const sources = (out as { sources?: unknown })?.sources;
  if (!Array.isArray(sources)) return;
  for (const s of sources) {
    if (!s || typeof s !== "object") continue;
    const item = s as Record<string, unknown>;
    if (typeof item.marker !== "string") continue;
    const key = item.marker.replace(/[\[\]\s]/g, "").toLowerCase();
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

const AUTHORITIES_MARKER = "AUTHORITIES:";
const CITED_RE = /\[\s*([sbrcp]?\d{1,2})\s*\]/gi;

function researchBlock(record: Awaited<ReturnType<typeof research.execute>>): string {
  const authorities = (record as any).authorities || [];
  return [
    "MANDATORY RESEARCH RECORD — THIS IS EVIDENCE, NOT THE FINAL ANSWER",
    `Research mode: ${(record as any).mode}`,
    `Question: ${(record as any).question}`,
    "",
    "RESEARCH PLAN:",
    ...((record as any).research_plan || []).map((x: string) => `- ${x}`),
    "",
    "AUTHORITIES / EVIDENCE:",
    ...authorities.map((s: any) => {
      const marker = s.marker || "[source]";
      const type = s.authority_type || "source";
      const citation = s.citation || s.rule || s.measure || s.caseName || "";
      const detail = s.text || s.snippet || s.subject || "";
      return `${marker} (${type}) ${citation}\n${String(detail).slice(0, 1400)}`;
    }),
    "",
    "RELATIONSHIPS:",
    ...((record as any).relationships || []).map((x: string) => `- ${x}`),
    "",
    "CHRONOLOGY FLAGS:",
    ...((record as any).chronology || []).map((x: string) => `- ${x}`),
    "",
    "SYNTHESIS REQUIREMENTS:",
    ...((record as any).synthesis_requirements || []).map((x: string) => `- ${x}`),
    "",
    "Use the evidence record to reason. Do not turn an inference into a quotation or attribute a case's reasoning to statutory text.",
  ].join("\n");
}

export const maxDuration = 300;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const question = lastUserQuestion(messages);
  if (!question) return new Response("A research question is required.", { status: 400 });
  if (!KEY) return new Response("Research service is not configured.", { status: 503 });

  const sourceMap: SourceMap = new Map();
  let record: Awaited<ReturnType<typeof research.execute>>;
  try {
    // This is the architectural gate: every substantive request receives a
    // server-side research pass before the model is allowed to synthesize.
    record = await research.execute({ question }, undefined as never);
    recordSources(record, sourceMap);
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
  };

  const system = `${SYSTEM_PROMPT}\n\n${researchBlock(record)}\n\nThe research pass above has already occurred. You may conduct additional targeted tool calls when a missing authority, exact section, conflict, or chronology point needs verification. Do not restart broad searching merely to add volume. The answer must be a synthesis of the evidence record and any verified follow-up research.`;

  const result = streamText({
    model: sarvam("sarvam-105b-conversations"),
    system,
    tools: TOOLS,
    stopWhen: stepCountIs(10),
    prepareStep: (() => {
      let step = 0;
      return () => {
        step += 1;
        return step >= 8 ? { toolChoice: "none" as const } : {};
      };
    })(),
    onError: (error) => console.error("[api/chat]", error),
    messages: await convertToModelMessages(messages),
  });

  let acc = "";
  let forwarded = 0;
  let suppressedAt = -1;
  const tailGuard = AUTHORITIES_MARKER.length - 1;

  const appendBlock = (controller: TransformStreamDefaultController<StreamPart>, text: string) => {
    if (!text) return;
    const id = "law-" + Math.random().toString(36).slice(2, 10);
    controller.enqueue({ type: "text-start", id });
    controller.enqueue({ type: "text-delta", id, delta: text });
    controller.enqueue({ type: "text-end", id });
  };

  const sourceStream = (result.toUIMessageStream() as unknown as ReadableStream<StreamPart>).pipeThrough(
    new TransformStream<StreamPart, StreamPart>({
      transform(part, controller) {
        if (part.type === "text-delta" && suppressedAt < 0) {
          acc += part.delta;
          const idx = acc.indexOf(AUTHORITIES_MARKER);
          if (idx >= 0) {
            if (idx > forwarded) controller.enqueue({ type: "text-delta", id: part.id, delta: acc.slice(forwarded, idx) });
            suppressedAt = idx;
          } else {
            const safe = Math.max(forwarded, acc.length - tailGuard);
            if (safe > forwarded) {
              controller.enqueue({ type: "text-delta", id: part.id, delta: acc.slice(forwarded, safe) });
              forwarded = safe;
            }
          }
          return;
        }
        if (part.type === "text-delta") return;
        if (part.type === "text-end" && suppressedAt < 0) {
          if (acc.length > forwarded) controller.enqueue({ type: "text-delta", id: part.id, delta: acc.slice(forwarded) });
          forwarded = acc.length;
          controller.enqueue(part);
          return;
        }
        if (part.type === "finish") {
          if (suppressedAt < 0 && acc.length > forwarded) {
            const id = "law-tail-flush";
            controller.enqueue({ type: "text-start", id });
            controller.enqueue({ type: "text-delta", id, delta: acc.slice(forwarded) });
            controller.enqueue({ type: "text-end", id });
          }
          const citedText = suppressedAt >= 0 ? acc.slice(0, suppressedAt) : acc;
          const cited: string[] = [];
          const seen = new Set<string>();
          const re = new RegExp(CITED_RE.source, "gi");
          let m: RegExpExecArray | null;
          while ((m = re.exec(citedText))) {
            const key = m[1].toLowerCase();
            if (!seen.has(key) && sourceMap.has(key)) {
              seen.add(key);
              cited.push(key);
            }
          }
          if (cited.length) {
            appendBlock(controller, "\n\nAUTHORITIES:\n" + cited.map((k) => `[${k}] ${sourceMap.get(k)}`).join("\n") + "\n");
          }
          if (suppressedAt >= 0) {
            const followups = acc.slice(suppressedAt).match(/\n[ \t]*FOLLOWUPS:[ \t]*\n([\s\S]*)$/i);
            if (followups?.[1]?.trim()) appendBlock(controller, "\nFOLLOWUPS:\n" + followups[1].trim() + "\n");
          }
          controller.enqueue(part);
          return;
        }
        controller.enqueue(part);
      },
    }),
  );

  const uiStream = createUIMessageStream({ execute: ({ writer }) => writer.merge(sourceStream as any) });
  return createUIMessageStreamResponse({ stream: uiStream });
}
