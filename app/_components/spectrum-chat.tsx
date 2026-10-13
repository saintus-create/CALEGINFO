"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ChatEmptyState } from "@/components/spectrumui/blocks/ai-assistants/chat-empty-state";
import { MessageActions } from "@/components/spectrumui/blocks/ai-assistants/message-actions";
import { PromptComposer } from "@/components/spectrumui/blocks/ai-assistants/prompt-composer";
import { StreamingText } from "@/components/spectrumui/blocks/ai-assistants/streaming-text";
import { MobileDockNav } from "@/app/_components/mobile-dock-nav";
import { SiteHeader } from "@/app/_components/site-header";
import { PageColumn, PageGrid } from "@/components/layout/page-grid";
import { SuggestionBanner } from "@/components/spectrumui/blocks/ai-assistants/suggestion-banner";
import { ThinkingDots } from "@/components/spectrumui/blocks/ai-assistants/thinking-dots";
import type { Citation, SuggestedPrompt } from "@/components/spectrumui/blocks/ai-assistants/types";

type Role = "user" | "assistant";

/** The gate's own disclosure vocabulary. An answer that says something could
 *  not be sourced is the signal for offering a narrower follow-up. */
function gapDisclosed(text: string) {
  return /unverified|not (?:contained|found) in the (?:corpus|record)|no (?:case )?authority|could not (?:be )?verif/i.test(
    text,
  );
}

/** StreamingText calls new URL(url).hostname, so a relative deep-link (or a
 *  bare fragment) would throw and break the answer. Resolve against the
 *  origin, falling back to the official source. */
function absoluteUrl(raw?: string): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://leginfo.legislature.ca.gov";
  if (!raw) return base + "/";
  try {
    return new URL(raw, base).href;
  } catch {
    return base + "/";
  }
}

interface Turn {
  id: string;
  role: Role;
  content: string;
  streaming?: boolean;
  citations?: Citation[];
  followUps?: SuggestedPrompt[];
}

const SUGGESTIONS: SuggestedPrompt[] = [
  { id: "s1", label: "Statute of limitations for personal injury", prompt: "What is the statute of limitations for personal injury in California?" },
  { id: "s2", label: "Landlord entry rules", prompt: "When can a landlord enter a rental unit in California?" },
  { id: "s3", label: "Elements of burglary", prompt: "What are the elements of burglary in California?" },
  { id: "s4", label: "At-will employment exceptions", prompt: "What are the exceptions to at-will employment in California?" },
];

/** split the server's trailing AUTHORITIES / FOLLOWUPS blocks out of the answer */
function splitAnswer(raw: string) {
  const authAt = raw.search(/\n\s*AUTHORITIES:/i);
  const follAt = raw.search(/\n\s*FOLLOWUPS:/i);
  const cut = Math.min(
    authAt === -1 ? raw.length : authAt,
    follAt === -1 ? raw.length : follAt,
  );
  const body = raw.slice(0, cut).trim();

  const citations: Citation[] = [];
  if (authAt !== -1) {
    const rest = raw.slice(authAt);
    const end = follAt !== -1 && follAt > authAt ? follAt - authAt : rest.length;
    for (const line of rest.slice(0, end).split("\n")) {
      const m = line.match(/^\s*\[([^\]]+)\]\s*(.*)$/);
      if (!m) continue;
      const raw = m[1].trim();
      // The server writes "[p1 PEN § 211](#law-authority:/codes?…)" or
      // "[p1] PEN § 211". The marker is the first token; the rest is the label.
      const marker = raw.split(/\s+/)[0];
      let label = raw.slice(marker.length).trim();
      let url = "";
      const link = m[2].match(/^\((#law-authority:[^)]+)\)\s*$/);
      if (link) {
        url = link[1].replace(/^#law-authority:/, "");
        if (!label) label = "Library reference";
      } else if (!label) {
        label = m[2].trim();
      }
      const index = parseInt(marker.replace(/\D/g, ""), 10) || citations.length + 1;
      citations.push({ id: marker, index, url: absoluteUrl(url), title: label || marker });
    }
  }

  const followUps: SuggestedPrompt[] = [];
  if (follAt !== -1) {
    for (const line of raw.slice(follAt).split("\n")) {
      const t = line.trim();
      if (!t.startsWith("-")) continue;
      const label = t.replace(/^[-*\d.)\s]+/, "").trim();
      if (label.length > 2) followUps.push({ id: `f${followUps.length + 1}`, label, prompt: label });
    }
  }

  // The blocks only style bare-digit markers, and the server emits [p1] /
  // [s2] / [c3]. Renumber the inline markers to the citation index so they
  // render as chips instead of literal text.
  let out = body;
  if (citations.length) {
    const byMarker = new Map(citations.map((c) => [c.id.toLowerCase(), c.index]));
    out = body.replace(/\[([a-z]{1,2}\d{1,3})\]/gi, (m, marker: string) => {
      const idx = byMarker.get(String(marker).toLowerCase());
      return idx ? `[${idx}]` : m;
    });
  }

  return { body: out, citations, followUps };
}

export function SpectrumChat() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [models, setModels] = useState<Array<{ id: string; name: string; available?: boolean }>>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((d) => setModels(Array.isArray(d?.models) ? d.models : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [turns]);

  const send = useCallback(
    async (text: string) => {
      const q = text.trim();
      if (!q || busy) return;
      setNotice(null);
      setBusy(true);

      const userId = `u${Date.now()}`;
      const botId = `a${Date.now()}`;
      const history = turns
        .filter((t) => t.role === "user" || !t.streaming)
        .map((t) => ({
          id: t.id,
          role: t.role,
          parts: [{ type: "text" as const, text: t.content }],
        }));

      setTurns((prev) => [
        ...prev,
        { id: userId, role: "user", content: q },
        { id: botId, role: "assistant", content: "", streaming: true },
      ]);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            messages: [...history, { id: userId, role: "user", parts: [{ type: "text", text: q }] }],
          }),
        });

        if (!res.ok || !res.body) {
          const msg = await res.text().catch(() => "");
          setNotice(msg || `Request failed (${res.status})`);
          setTurns((prev) => prev.filter((t) => t.id !== botId));
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let acc = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;
            try {
              const evt = JSON.parse(payload) as { type?: string; delta?: string };
              if (evt.type === "text-delta" && evt.delta) {
                acc += evt.delta;
                setTurns((prev) =>
                  prev.map((t) => (t.id === botId ? { ...t, content: acc } : t)),
                );
              }
            } catch {
              /* ignore non-JSON keepalives */
            }
          }
        }

        const { body, citations, followUps } = splitAnswer(acc);
        setTurns((prev) =>
          prev.map((t) =>
            t.id === botId ? { ...t, content: body, streaming: false, citations, followUps } : t,
          ),
        );
      } catch {
        setNotice("Could not reach the research service.");
        setTurns((prev) => prev.filter((t) => t.id !== botId));
      } finally {
        setBusy(false);
      }
    },
    [busy, turns],
  );

  const empty = turns.length === 0;

  return (
    <div className="flex h-dvh w-full flex-col bg-background text-foreground">
      <SiteHeader />
      <MobileDockNav />

      <main ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        {empty ? (
          <PageGrid className="min-h-full content-center gap-y-8 py-8">
            <PageColumn className="col-content measure">
              <ChatEmptyState
                title="Ask anything about California law"
                subtitle="Every answer is cited to the statute, rule or case it comes from."
                prompts={SUGGESTIONS}
                onSelectPrompt={(item) => send(item.prompt ?? item.label)}
                variant="Centered"
                className="mx-auto max-w-none"
              />
            </PageColumn>
            <PageColumn className="col-content measure">
              <PromptComposer
                placeholder="Ask anything about California law…"
                models={models.map((m) => ({
                  id: m.id,
                  name: m.name,
                  disabled: m.available === false,
                }))}
                defaultModelId={models[0]?.id}
                onSend={(value: string) => send(value)}
                isGenerating={busy}
                className="max-w-none"
              />
            </PageColumn>
          </PageGrid>
        ) : (
          <PageGrid className="gap-y-7 py-6 lg:py-8">
            {turns.map((t) =>
              t.role === "user" ? (
                <PageColumn key={t.id} className="col-content measure flex justify-end">
                  <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-3 text-body">
                    {t.content}
                  </div>
                </PageColumn>
              ) : (
                <PageColumn key={t.id} className="col-content measure flex flex-col gap-3">
                  {t.streaming && !t.content ? (
                    <ThinkingDots label="Researching California law" />
                  ) : (
                    <>
                      <StreamingText
                        text={t.content}
                        streaming={t.streaming}
                        citations={t.citations}
                        followUps={t.followUps}
                        onFollowUp={(p) => send(p.prompt ?? p.label)}
                        variant="Sources"
                        className="max-w-none"
                      />
                      {!t.streaming && (
                        <MessageActions
                          content={t.content}
                          onCopy={() => {
                            navigator.clipboard?.writeText(t.content);
                          }}
                        />
                      )}
                      {!t.streaming && gapDisclosed(t.content) && (
                        <SuggestionBanner
                          suggestion="Narrow this to the statutes that actually support it"
                          detail="This answer flagged something the corpus does not cover."
                          onApply={() =>
                            send(
                              "Narrow the previous answer to the specific statutes that support it, and drop anything you cannot source.",
                            )
                          }
                        />
                      )}
                    </>
                  )}
                </PageColumn>
              ),
            )}

            {notice && (
              <PageColumn className="col-content measure rounded-xl border border-border bg-muted/40 px-3 py-2 text-caption text-muted-foreground">
                {notice}
              </PageColumn>
            )}
          </PageGrid>
        )}
      </main>

      {!empty && (
        <div className="shrink-0 border-t border-border/60 bg-background">
          <PageGrid className="py-3">
            <PageColumn className="col-content measure">
              <PromptComposer
                placeholder="Ask anything about California law…"
                models={models.map((m) => ({
                  id: m.id,
                  name: m.name,
                  disabled: m.available === false,
                }))}
                defaultModelId={models[0]?.id}
                onSend={(value: string) => send(value)}
                isGenerating={busy}
                className="max-w-none"
              />
            </PageColumn>
          </PageGrid>
        </div>
      )}
      {notice && empty && (
        <div role="alert" className="fixed bottom-4 left-1/2 z-10 w-[min(92vw,var(--grid-measure))] -translate-x-1/2 rounded-xl border border-border bg-background px-4 py-3 text-body shadow-lg">
          {notice}
        </div>
      )}
    </div>
  );
}
export default SpectrumChat;
