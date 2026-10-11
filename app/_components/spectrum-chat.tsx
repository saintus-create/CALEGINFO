"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  ChatEmptyState,
} from "@/components/spectrumui/blocks/ai-assistants/chat-empty-state";
import {
  ConversationList,
  type ConversationEntry,
} from "@/components/spectrumui/blocks/ai-assistants/conversation-list";
import { MessageActions } from "@/components/spectrumui/blocks/ai-assistants/message-actions";
import { PromptComposer } from "@/components/spectrumui/blocks/ai-assistants/prompt-composer";
import { StreamingText } from "@/components/spectrumui/blocks/ai-assistants/streaming-text";
import { ThinkingDots } from "@/components/spectrumui/blocks/ai-assistants/thinking-dots";
import { MegaSitemapFooter } from "@/components/spectrumui/blocks/footers/mega-sitemap-footer";
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
  const [activeId, setActiveId] = useState<string | undefined>();
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

  const conversations: ConversationEntry[] = turns
    .filter((t) => t.role === "user")
    .map((t) => ({ id: t.id, title: t.content.slice(0, 48), group: "Today" }));
  if (conversations.length) conversations[0].pinned = true;

  const empty = turns.length === 0;

  return (
    <div className="flex h-dvh w-full bg-background text-foreground">
      <aside className="hidden w-64 shrink-0 border-r border-border/60 lg:block">
        <ConversationList
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border/60 px-4">
          <span className="text-[15px] font-semibold tracking-tight">
            California Legislative Information
          </span>
          <nav className="ml-auto hidden items-center gap-1 text-[13px] sm:flex">
            {[
              ["Codes", "/codes"],
              ["Bills", "/bills"],
              ["Rules", "/rules"],
              ["Directory", "/directory"],
              ["Forms", "/forms"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
        </header>

        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6">
            {empty && (
              <ChatEmptyState
                title="California law, answered."
                subtitle="The complete California Codes, 2025-26 bills, Rules of Court, and case law — cited inline."
                prompts={SUGGESTIONS}
                onSelectPrompt={(p) => send(p.prompt ?? p.label)}
              />
            )}

            {turns.map((t) =>
              t.role === "user" ? (
                <div key={t.id} className="flex justify-end">
                  <div className="max-w-[85%] rounded-[18px] border border-border/40 bg-muted/70 px-3.5 py-2 text-[15px] leading-6">
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
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-[13px] text-muted-foreground">
                {notice}
              </div>
            )}

            {empty && (
              <MegaSitemapFooter
                brand="California Legislative Information"
                tagline="AI legal research for California law — the complete Codes, bills, Rules of Court and case law."
                columns={[
                  {
                    groups: [
                      {
                        title: "Browse",
                        links: [
                          { label: "California Codes", href: "/codes" },
                          { label: "Bills", href: "/bills" },
                          { label: "Rules of Court", href: "/rules" },
                        ],
                      },
                    ],
                  },
                  {
                    groups: [
                      {
                        title: "More",
                        links: [
                          { label: "Directory", href: "/directory" },
                          { label: "Judicial Council Forms", href: "/forms" },
                        ],
                      },
                    ],
                  },
                ]}
                legal={[
                  { label: "Not legal advice", href: "#" },
                  { label: "Verify against official sources", href: "#" },
                ]}
                copyright="AI-generated · verify against official sources"
                className="mt-4 rounded-xl border border-border/60"
              />
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-border/60 bg-background/80 px-4 py-3 backdrop-blur">
          <div className="mx-auto w-full max-w-2xl">
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
      </div>
    </div>
  );
}

export default SpectrumChat;
