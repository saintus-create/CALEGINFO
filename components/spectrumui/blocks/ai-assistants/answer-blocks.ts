/**
 * The answer text the server sends is Markdown — paragraphs separated by blank
 * lines, `- ` / `1. ` lists, `##` headings for longer answers, `**bold**`
 * lead-ins and `[p1]`-style citation markers. It used to be painted into a
 * single <p>, where HTML collapses every newline: a five-paragraph answer with
 * a numbered element list arrived on screen as one run-on block, and the list
 * markers were shown as literal text.
 *
 * These two functions are the whole Markdown subset the answers actually use,
 * so the renderer stays predictable (and testable) instead of pulling a full
 * parser into the streaming path.
 */

export type AnswerBlock =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] };

export type InlineToken = {
  type: "text" | "strong" | "code" | "cite" | "link";
  /** Text to print: the marker digits for `cite`, the URL for `link`. */
  value: string;
};

const HEADING_RE = /^[ \t]*#{1,6}[ \t]+(.*)$/;
const BULLET_RE = /^[ \t]*[-*•][ \t]+(.*)$/;
const NUMBERED_RE = /^[ \t]*(\d{1,3})[.)][ \t]+(.*)$/;

/** `**bold**`, `` `code` ``, `[p1]` citation markers, bare URLs. */
const INLINE_RE =
  /(\*\*[^*\n]+\*\*|__[^_\n]+__|`[^`\n]+`|\[[a-z]{0,2}\d{1,3}\]|https?:\/\/[^\s<>()[\]]+)/gi;

/** Sentences sometimes end right after a bare URL — don't swallow the stop. */
const LINK_TRAILING_PUNCTUATION = /[.,;:!?]+$/;

export function parseAnswerBlocks(raw: string): AnswerBlock[] {
  const text = String(raw ?? "").replace(/\r\n?/g, "\n");
  const blocks: AnswerBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    const joined = paragraph.join(" ").replace(/[ \t]+/g, " ").trim();
    if (joined) blocks.push({ kind: "paragraph", text: joined });
    paragraph = [];
  };
  const flushList = () => {
    if (list && list.items.length) {
      blocks.push({ kind: "list", ordered: list.ordered, items: list.items });
    }
    list = null;
  };

  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\s+$/, "");

    if (!line.trim()) {
      // a blank line closes whatever was open — this is the paragraph break
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(HEADING_RE);
    if (heading) {
      flushParagraph();
      flushList();
      const level = (line.match(/#/g) || []).length;
      const title = heading[1].replace(/[ \t]*#+[ \t]*$/, "").trim();
      if (title) blocks.push({ kind: "heading", level, text: title });
      continue;
    }

    const bullet = line.match(BULLET_RE);
    const numbered = line.match(NUMBERED_RE);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ? bullet[1] : numbered![2]).trim());
      continue;
    }

    if (list) {
      // a wrapped line inside a list item, not a new paragraph
      list.items[list.items.length - 1] = `${list.items[list.items.length - 1]} ${line.trim()}`.trim();
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  return blocks;
}

export function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const source = String(text ?? "");
  let last = 0;

  for (const match of source.matchAll(INLINE_RE)) {
    const token = match[0];
    const at = match.index ?? 0;
    if (at > last) tokens.push({ type: "text", value: source.slice(last, at) });
    last = at + token.length;

    if (token.startsWith("**") || token.startsWith("__")) {
      tokens.push({ type: "strong", value: token.slice(2, -2) });
    } else if (token.startsWith("`")) {
      tokens.push({ type: "code", value: token.slice(1, -1) });
    } else if (token.startsWith("[")) {
      tokens.push({ type: "cite", value: token.slice(1, -1) });
    } else {
      const trimmed = token.replace(LINK_TRAILING_PUNCTUATION, "");
      tokens.push({ type: "link", value: trimmed });
      if (trimmed.length !== token.length) {
        tokens.push({ type: "text", value: token.slice(trimmed.length) });
      }
    }
  }

  if (last < source.length) tokens.push({ type: "text", value: source.slice(last) });
  return tokens;
}
