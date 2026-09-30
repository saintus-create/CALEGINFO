"use client";

import type { FC, ComponentPropsWithoutRef } from "react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import { useAui } from "@assistant-ui/react";
import { useRouter } from "next/navigation";
import remarkGfm from "remark-gfm";

const CITE_HREF = "law-cite:";
const FOLLOWUP_HREF = "law-followup:";
const AUTHORITY_HREF = "law-authority:";

/** [1] [s2] [b3] [r1] [c4] — citation markers from corpus tools + pre-retrieval */
const CITE_RE = /\[\s*([a-z]{0,2}\d{1,3})\s*\]/gi;

const FOLLOWUP_RE =
  /(?:^|\n)[ \t]*FOLLOWUPS:[ \t]*\n([\s\S]*?)(?=\n[ \t]*AUTHORITIES:|$)/i;

const AUTHORITIES_RE =
  /(?:^|\n)[ \t]*AUTHORITIES:[ \t]*\n([\s\S]*?)(?=\n[ \t]*FOLLOWUPS:|$)/i;

type Aui = ReturnType<typeof useAui>;

function sendPromptFactory(aui: Aui) {
  return (prompt: string) => {
    if (aui.thread().getState().isRunning) return;
    aui.thread().append({
      content: [{ type: "text", text: prompt }],
      runConfig: aui.composer().getState().runConfig,
    });
  };
}

const LawLink: FC<ComponentPropsWithoutRef<"a">> = ({ href, children, ...props }) => {
  const aui = useAui();
  const router = useRouter();
  const sendPrompt = sendPromptFactory(aui);

  if (typeof href === "string" && href.startsWith(`#law-cite:`)) {
    const url = decodeURIComponent(href.slice("#law-cite:".length));
    return (
      <a
        {...props}
        href={url}
        className="law-cite-chip"
        title="Open in library"
        onClick={(e) => {
          e.preventDefault();
          router.push(url);
        }}
      >
        {children}
      </a>
    );
  }
  if (typeof href === "string" && href.startsWith(`#${CITE_HREF}`)) {
    const marker = decodeURIComponent(href.slice(CITE_HREF.length + 1));
    return (
      <a
        {...props}
        href={`#cite-${marker}`}
        className="law-cite-chip"
        title={`Authority ${marker}`}
        onClick={(e) => e.preventDefault()}
      >
        {marker}
      </a>
    );
  }

  if (typeof href === "string" && href.startsWith(`#${AUTHORITY_HREF}`)) {
    const target = href.slice(`#${AUTHORITY_HREF}`.length);
    if (target.startsWith("/")) {
      return (
        <a
          {...props}
          href={target}
          className="law-authority-pill"
          title="Open in library"
          onClick={(e) => {
            e.preventDefault();
            router.push(target);
          }}
        >
          {children}
        </a>
      );
    }
    return <span className="law-authority-pill">{children}</span>;
  }

  if (typeof href === "string" && href.startsWith(`#${FOLLOWUP_HREF}`)) {
    const question = decodeURIComponent(href.slice(FOLLOWUP_HREF.length + 1));
    return (
      <button
        type="button"
        className="law-followup-pill"
        onClick={() => sendPrompt(question)}
      >
        {question}
      </button>
    );
  }

  return (
    <a {...props} href={href} target="_blank" rel="noreferrer" className="law-md-link">
      {children}
    </a>
  );
};

const preprocess = (text: string): string => {
  let t = text;

  // Rewrite the AUTHORITIES block (emitted by the model) into pills.
  // Route-emitted entries may carry a library deep-link:
  //   [1 Penal Code § 459](#law-authority:/codes?code=PEN&section=459)
  const markerUrls: Record<string, string> = {};
  t = t.replace(AUTHORITIES_RE, (_m, block: string) => {
    const entries: Array<{ marker: string; label: string; url?: string }> = [];
    for (const line of block.split("\n")) {
      const link = line.trim().match(/^\[(.+?)\]\(#law-authority:(.+?)\)$/);
      const plain = line.trim().match(/^\[([^\]]+)\]\s*(.+)$/);
      if (link) {
        const label = link[1].trim();
        const marker = label.split(/\s+/)[0];
        entries.push({ marker, label: label.slice(marker.length).trim(), url: link[2] });
        markerUrls[marker] = link[2];
      } else if (plain) {
        entries.push({ marker: plain[1].trim(), label: plain[2].trim() });
      }
    }
    if (!entries.length) return "";
    return (
      "\n\nAuthorities:\n\n" +
      entries
        .map((e) =>
          e.url
            ? `[${e.marker} ${e.label}](#${AUTHORITY_HREF}${e.url})`
            : `[${e.marker} ${e.label}](#${AUTHORITY_HREF}${encodeURIComponent(e.marker)})`,
        )
        .join("\n\n") +
      "\n" +
      "\n\nAI-generated · verify against official sources\n"
    );
  });

  // Rewrite the trailing FOLLOWUPS block into Keep digging pills.
  t = t.replace(FOLLOWUP_RE, (_m, block: string) => {
    const qs = block
      .split("\n")
      .map((l) => l.trim().replace(/^[-*\d.)\s]+/, "").trim())
      .filter((l) => l.length > 3)
      .slice(0, 3);
    if (!qs.length) return "";
    return (
      "\n\nKeep digging:\n\n" +
      qs.map((q) => `[${q}](#${FOLLOWUP_HREF}${encodeURIComponent(q)})`).join("\n\n") +
      "\n"
    );
  });

  // Rewrite citation markers into links so they render as chips.
  t = t.replace(CITE_RE, (_m, marker: string) =>
    markerUrls[marker]
      ? `[${marker}](#law-cite:${encodeURIComponent(markerUrls[marker])})`
      : `[${marker}](#${CITE_HREF}${encodeURIComponent(marker)})`,
  );

  return t;
};

const LawParagraph: FC<ComponentPropsWithoutRef<"p">> = ({ children, ...props }) => {
  const text =
    typeof children === "string"
      ? children
      : Array.isArray(children)
        ? children.filter((c) => typeof c === "string").join("")
        : "";
  if (text.startsWith("AI-generated ·")) {
    return (
      <p {...props} className="law-ai-warning">
        {children}
      </p>
    );
  }
  if (text === "Keep digging:" || text === "Authorities:") {
    return (
      <p {...props} className="law-section-label">
        {children}
      </p>
    );
  }
  return <p {...props}>{children}</p>;
};

export function LawMarkdownText() {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="aui-md"
      preprocess={preprocess}
      components={{ a: LawLink, p: LawParagraph }}
    />
  );
}
