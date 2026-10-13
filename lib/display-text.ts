/**
 * Display-time normalisation for corpus text.
 *
 * The codes, the Rules of Court and the Judicial Council forms are published
 * with a handful of characters that none of the faces this app ships
 * (Monument Grotesk Regular/Medium/Bold, Italic, Mono, Semi-Mono) contain, so
 * those runs were drawn from whatever fallback font the reader's system
 * supplied — a different width, weight and vertical fit in the middle of a
 * statute. Every mapping below has an exact replacement inside the loaded
 * faces. Nothing here rewrites the corpus; it only changes the codepoint on
 * its way to the screen.
 *
 * Deliberately left alone: primes (U+2032, U+2033), the checkbox and
 * geometric squares (U+25A1, U+25FB, U+25FC, U+2610) and the box-drawing
 * pieces used to redraw forms in the CCP and Elections Code (U+23AA–U+23B1).
 * They have no equivalent in the shipped faces, and a fallback glyph is
 * better than turning a foot/inch mark or a form's rule into an ASCII lookalike.
 */

/** Codepoint → same-looking codepoint that the shipped faces contain. */
const REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  // invisible characters: they render as nothing, break text selection, and
  // hide the character a search box is looking for
  [/[\u200b\u200e\u2060\u206d\ufeff]/g, ""],
  // narrow no-break space (48 uses in the codes) → no-break space
  [/\u202f/g, "\u00a0"],
  // Unicode hyphens (15 uses) → hyphen-minus, the only hyphen the faces have
  [/[\u2010\u2011\u2012]/g, "-"],
  // horizontal bar (rule 4.107's title) → em dash
  [/\u2015/g, "\u2014"],
  // U+201B is a reversed-9 mis-encoding of a right single quote (35 uses)
  [/\u201b/g, "\u2019"],
  // modifier letter apostrophe (2 uses: "the Indian childʼs tribe")
  [/\u02bc/g, "\u2019"],
  // Greek question mark standing in for a semicolon (SHC)
  [/\u037e/g, ";"],
];

export function displayText(value: string | null | undefined): string {
  if (!value) return "";
  let out = String(value);
  for (const [pattern, replacement] of REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
