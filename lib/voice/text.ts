/**
 * Text helpers shared by the voice pipeline (server routes and browser hooks).
 *
 * These are pure functions with no DOM or Node dependencies so both the API
 * routes and the client hooks can use them — and so the voice check script can
 * exercise them directly.
 */

/** Longest slice of text handed to one speech request. Sarvam's TTS models
 *  cap a single `inputs` entry well above this; staying at 450 keeps every
 *  chunk comfortably inside the limit and gives us natural pause points. */
export const DEFAULT_SPEECH_CHUNK_CHARS = 450;

/** Hard limit for a single /api/voice/speak request. Longer answers are
 *  chunked client-side, so anything above this is a caller bug. */
export const SPEECH_MAX_CHARS = 1000;

/** How many leading characters of a transcript we accept from a client. */
export const MAX_TRANSCRIPT_CHARS = 4000;

/**
 * Turn an assistant answer into something worth hearing: markdown scaffolding,
 * citation chips, link targets and layout tables are noise once spoken.
 */
export function stripMarkdownForSpeech(input: string): string {
  let text = String(input ?? "");

  // Fenced code blocks carry no useful audio.
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/~~~[\s\S]*?~~~/g, " ");

  // HTML comments / tags and stray artifacts.
  text = text.replace(/<!--[\s\S]*?-->/g, " ");
  text = text.replace(/<\/?[a-z][^>]*>/gi, " ");

  // Images -> alt text, links -> label.
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

  // Citation chips the reader renumbers on screen: [1] [p1] [s2] [c3].
  text = text.replace(/\[(?:[pscf]?\d{1,3})\]/gi, " ");

  // Bare URLs (and markdown autolinks already unwrapped above).
  text = text.replace(/https?:\/\/\S+/gi, " ");

  // Table separators then pipes.
  text = text.replace(/^\s*\|?[\s:-]*-[\s|:-]*\|?\s*$/gm, " ");
  text = text.replace(/\|/g, ", ");

  // Headings, block quotes, list bullets, task boxes.
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, " ");
  text = text.replace(/^\s{0,3}>\s?/gm, " ");
  text = text.replace(/^\s{0,3}[-*+]\s+\[[ xX]\]\s+/gm, " ");
  text = text.replace(/^\s{0,3}[-*+]\s+/gm, " ");
  text = text.replace(/^\s{0,3}\d{1,3}[.)]\s+/gm, " ");

  // Horizontal rules.
  text = text.replace(/^\s{0,3}(?:[-*_]\s*){3,}$/gm, " ");

  // Emphasis and inline code markers.
  text = text.replace(/`{1,3}([^`]*)`{1,3}/g, "$1");
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)([^*_]+)\1/g, "$2");
  text = text.replace(/~~(.*?)~~/g, "$1");

  // Statute/text section symbols read better as words when spoken.
  text = text.replace(/§{1,2}\s*/g, "section ");
  text = text.replace(/\s+([,.;:!?])/g, "$1");

  return collapseWhitespace(text);
}

/** Collapse every run of whitespace (including newlines) into single spaces. */
export function collapseWhitespace(input: string): string {
  return String(input ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Abbreviations whose period must not end a sentence. Lowercased keys are
 *  matched case-insensitively; dotted forms are matched literally. */
const ABBREVIATIONS = [
  "e.g",
  "i.e",
  "cf",
  "v",
  "vs",
  "id",
  "ibid",
  "no",
  "nos",
  "mr",
  "mrs",
  "ms",
  "dr",
  "inc",
  "corp",
  "ltd",
  "co",
  "st",
  "etc",
  "sec",
  "secs",
  "ch",
  "chs",
  "art",
  "para",
  "exh",
  "ed",
  "eds",
  "al",
  "cal",
  "cir",
  "ct",
  "app",
  "supp",
  "stat",
  "stats",
  "const",
  "amend",
  "op",
  "cit",
  "repr",
  "fed",
  "gov",
  "u.s.c",
  "u.s",
  "c.f.r",
  "s.ct",
  "f.3d",
  "f.2d",
  "f.supp",
  "rptr",
];

/**
 * Split prose into sentence-ish units without losing a character. Precision
 * matters less than safety here: a split one word early still plays fine,
 * while a dropped word would not, so the function only ever inserts breaks.
 */
export function splitSentences(input: string): string[] {
  const text = String(input ?? "").trim();
  if (!text) return [];

  // Park the periods of decimals, subdivision markers and abbreviations so the
  // splitter below cannot mistake them for sentence ends.
  let guarded = text
    .replace(/(\d)\.(\d)/g, "$1\u0000$2")
    .replace(/\((\d{1,3})\)\./g, "($1)\u0000")
    .replace(/\b([A-Za-z])\.[A-Za-z]\./g, (match) => match.replace(/\./g, "\u0000"));

  for (const abbreviation of ABBREVIATIONS) {
    const pattern = new RegExp(`\\b${escapeRegExp(abbreviation)}\\.`, "gi");
    guarded = guarded.replace(pattern, (match) => match.replace(/\./g, "\u0000"));
  }

  const parts = guarded
    .split(/(?<=[.!?])\s+|\n{2,}/)
    .map((part) => part.replace(/\u0000/g, ".").trim())
    .filter(Boolean);

  // A hard-unwrapped blob with no punctuation still needs to come back whole.
  return parts.length ? parts : [text];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Break text into speech-sized pieces at sentence boundaries, falling back to
 * word boundaries for a single monster sentence. Concatenating the result with
 * a space always reproduces the input text.
 */
export function chunkForSpeech(
  input: string,
  maxChars: number = DEFAULT_SPEECH_CHUNK_CHARS,
): string[] {
  const limit = Math.max(40, Math.floor(maxChars) || DEFAULT_SPEECH_CHUNK_CHARS);
  const text = collapseWhitespace(input);
  if (!text) return [];

  const chunks: string[] = [];
  let current = "";

  const flush = () => {
    if (current) chunks.push(current);
    current = "";
  };

  for (const sentence of splitSentences(text)) {
    if (sentence.length > limit) {
      flush();
      for (const piece of splitByWords(sentence, limit)) chunks.push(piece);
      continue;
    }
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length > limit) {
      flush();
      current = sentence;
    } else {
      current = candidate;
    }
  }

  flush();
  return chunks;
}

function splitByWords(text: string, limit: number): string[] {
  const words = text.split(" ").filter(Boolean);
  const pieces: string[] = [];
  let current = "";
  for (const word of words) {
    if (word.length > limit) {
      if (current) {
        pieces.push(current);
        current = "";
      }
      for (let i = 0; i < word.length; i += limit) pieces.push(word.slice(i, i + limit));
      continue;
    }
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > limit) {
      pieces.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

/**
 * Merge a dictation transcript into whatever the composer already held.
 * Existing text keeps its newline; an empty box starts clean.
 */
export function appendTranscript(existing: string, addition: string): string {
  const base = String(existing ?? "");
  const next = collapseWhitespace(addition);
  if (!next) return base;
  if (!base.trim()) return next;
  if (base.endsWith("\n") || base.endsWith(" ")) return base + next;
  return `${base} ${next}`;
}

/** Trim a transcript to something a request may reasonably carry. */
export function clampTranscript(input: string, max: number = MAX_TRANSCRIPT_CHARS): string {
  const text = collapseWhitespace(input);
  return text.length > max ? text.slice(0, max) : text;
}
