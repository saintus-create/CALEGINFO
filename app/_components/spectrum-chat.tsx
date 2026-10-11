"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpen,
  Buildings,
  FileText,
  Scales,
  Scroll,
  type Icon,
} from "@phosphor-icons/react";

import { AIChatCard } from "@/components/spectrumui/ai-chat-card";
import { MessageActions } from "@/components/spectrumui/blocks/ai-assistants/message-actions";
import { PromptComposer } from "@/components/spectrumui/blocks/ai-assistants/prompt-composer";
import { StreamingText } from "@/components/spectrumui/blocks/ai-assistants/streaming-text";
import { ThinkingDots } from "@/components/spectrumui/blocks/ai-assistants/thinking-dots";
import type { Citation, SuggestedPrompt } from "@/components/spectrumui/blocks/ai-assistants/types";

type Role = "user" | "assistant";

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
      const marker = m[1].trim();
      let label = m[2].trim();
      let url = "";
      const link = label.match(/\[([^\]]*)\]\(([^)]+)\)/);
      if (link) {
        label = link[1] || label;
        url = link[2];
      }
      const index = parseInt(marker.replace(/\D/g, ""), 10) || citations.length + 1;
      citations.push({ id: marker, index, url, title: label || marker });
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

  return { body, citations, followUps };
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
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border/60 px-5 sm:px-7">
        <a href="/" className="text-[15px] font-medium tracking-[-0.2px]">
          California Legislative Information
        </a>
        <nav className="ml-auto hidden items-center gap-1 text-[13px] sm:flex">
          {(
            [
              ["Codes", "/codes", BookOpen],
              ["Bills", "/bills", Scroll],
              ["Rules", "/rules", Scales],
              ["Directory", "/directory", Buildings],
              ["Forms", "/forms", FileText],
            ] as Array<[string, string, Icon]>
          ).map(([label, href, Glyph]) => (
            <a
              key={href}
              href={href}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Glyph aria-hidden className="size-4" weight="regular" />
              {label}
            </a>
          ))}
        </nav>
      </header>

      <main ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        {empty ? (
          <div className="grid min-h-full place-items-center px-4 py-8 sm:px-6">
            <AIChatCard
              title="California Legal Research"
              subtitle="Search statutes, bills, court rules, forms, and case law"
              greeting="California law, answered."
              prompt="Ask a legal question and get an answer grounded in California authority."
              prompts={SUGGESTIONS.map((item) => item.prompt ?? item.label)}
              placeholder="Ask anything about California law…"
              onSend={(value) => send(value)}
              className="min-h-[520px] max-w-[520px]"
            />
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 py-8 sm:px-6">
            {turns.map((t) =>
              t.role === "user" ? (
                <div key={t.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-[18px] bg-muted px-4 py-2.5 text-[15px] leading-6">
                    {t.content}
                  </div>
                </div>
              ) : (
                <div key={t.id} className="flex flex-col gap-3">
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
                      />
                      {!t.streaming && (
                        <MessageActions
                          content={t.content}
                          onCopy={() => {
                            navigator.clipboard?.writeText(t.content);
                          }}
                        />
                      )}
                    </>
                  )}
                </div>
              ),
            )}

            {notice && (
              <div className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-[13px] text-muted-foreground">
                {notice}
              </div>
            )}
          </div>
        )}
      </main>

      {!empty && (
        <div className="shrink-0 border-t border-border/60 bg-background px-4 py-3">
          <div className="mx-auto w-full max-w-3xl">
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
            />
          </div>
        </div>
      )}
      {notice && empty && (
        <div role="alert" className="fixed bottom-4 left-1/2 z-10 w-[min(92vw,520px)] -translate-x-1/2 rounded-xl border border-border bg-background px-4 py-3 text-sm shadow-lg">
          {notice}
        </div>
      )}
    </div>
  );
}
export default SpectrumChat;
