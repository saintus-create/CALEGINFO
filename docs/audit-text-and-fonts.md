# Text, typography and font audit

Scope: every surface that renders text in the running app — the chat (`/`), the
five browsers (`/codes`, `/bills`, `/rules`, `/forms`, `/directory`) and `/method` —
plus the font pipeline that draws it.

Method: the app was run (`npm run dev`, Next 16.3.4) and each route fetched, so
findings are against the **compiled** CSS and HTML rather than the source. Font
coverage was measured by dumping the `cmap` of every shipped face with
`fontTools` and diffing it against (a) every non-ASCII character in app-authored
JSX and (b) every character in the 52 MB corpus the browsers render verbatim.
The runtime system prompt was read back out of `constants/system-prompt.ts` by
evaluating the string literal (that is what `check.mts` exists to do).

Nine defects were found and corrected; four items are recommendations that need
a product decision.

---

## Corrected

### 1. Answers were printed as one run-on paragraph (highest impact)

`components/spectrumui/blocks/ai-assistants/streaming-text.tsx` painted the whole
model answer into a single `<p>`, splitting on `**bold**` and `[1]` only. HTML
collapses newlines inside a paragraph, so:

* paragraph breaks (`\n\n`) disappeared — a five-paragraph answer arrived as one wall of text;
* `1.` / `- ` element lists lost their markers' layout and printed as literal `1.` / `- ` runs;
* `##` headings printed their hashes;
* the server's own contract assumes the opposite: `validateSynthesis()` in
  `app/api/chat/route.ts` splits the answer on blank lines to count paragraphs,
  and the system prompt asks for enumerated elements.

Fixed by rendering the Markdown subset the answers actually use. New
`components/spectrumui/blocks/ai-assistants/answer-blocks.ts` (pure, testable)
parses the text into headings / paragraphs / ordered+unordered lists and
tokenises inline `**bold**`, `` `code` ``, `[p1]` citation markers and bare URLs;
`streaming-text.tsx` renders those as real block elements, with the streaming
caret attached to the last block. The wide measure (`max-w-[520px]`) and the
13.5px body size were raised to `max-w-[68ch]` / 15px so the answer is set at the
same size as the question and lines up with the composer.

### 2. `class="eyebrow"` had no CSS at all

All five browsers use `<div className="eyebrow">` for the small label above each
page title ("Primary law library", "Legislation", "Judicial Council", …).

* `grep -c eyebrow` over the compiled CSS chunk: **0**. The rule was never written.
* Those five labels were rendering as unstyled body text (no small caps, no
  tracking, no muted colour, icon unaligned).

Fixed: `.eyebrow` is now defined in `app/globals.css` (11px, 500, `0.08em`
tracking, uppercase, `muted-foreground`, flex row with the icon) — matching the
treatment the same label already had inline in `Directory.jsx`.

### 3. Two literal `\u2014` sequences were reaching the model

`constants/system-prompt.ts` had two doubly-escaped `\\u2014` inside the
"how to research" paragraph, so the runtime prompt contained the eight
characters `\u2014` — not an em dash — in the middle of two instructions.

* `node check.mts` before: `literal \uXXXX in runtime prompt: 2`.
* after: `0`, with the em-dash count going 18 → 20.

Fixed (single-escaped). `check.mts` now reports a clean prompt.

### 4. Every authority was labelled with this app's own hostname

`spectrum-chat.tsx` resolved each deep-link against `window.location.origin`
before handing it to the renderer, and the renderer printed
`new URL(url).hostname` next to the citation. Consequences:

* a statute deep-link (`/codes?code=PEN&section=459`) displayed the reader's own
  host (`localhost:3000`, the preview host) as its source;
* a citation with no URL at all (plain `[p1] Pen. Code § 187`) resolved to
  `origin + "/"` and was *also* stamped with the app's hostname;
* nothing was clickable, so the library deep-links the server builds were dead
  text.

Fixed: URLs are passed through untouched; `citationLink()` in `streaming-text.tsx`
labels absolute URLs with their real hostname, labels relative library links
"Open in library", labels nothing when there is no URL, and makes each authority
row a link (new tab for external sources, in-app for library links).

### 5. Corpus characters with no glyph in any shipped face

The browsers print statute, rule and form text verbatim. Of the 67 distinct
non-ASCII characters in `public/corpus/**`, **23 are absent from every Monument
Grotesk face** (742 occurrences), so those runs were drawn from whatever fallback
font the reader's OS supplied — a different width and weight inside a statute.

Fixed for the cases that have an exact, same-looking replacement inside the
shipped faces — new `lib/display-text.ts`, applied at the render sites in all
five browsers, 106 occurrences:

| Character | Uses | Now |
| --- | --- | --- |
| U+202F narrow no-break space | 48 | U+00A0 no-break space |
| U+201B reversed-9 quote (mis-encoded `’`) | 35 | U+2019 |
| U+2011 non-breaking hyphen | 15 | `-` (ASCII) |
| U+206D invisible operator | 3 | *removed* |
| U+02BC modifier apostrophe | 2 | U+2019 |
| U+200B zero-width space | 1 | *removed* |
| U+037E Greek question mark (mis-encoded `;`) | 1 | `;` |
| U+2015 horizontal bar | 1 | U+2014 |

Deliberately **left alone** and documented in the module: the primes
(U+2033/U+2032, 471 uses), the ballot and geometric squares (U+25FB/U+25FC/U+25A1/U+2610,
64 uses) and the box-drawing pieces that redraw forms in the CCP and Elections
Code (U+23AA–U+23B1, 97 uses). None has an equivalent in the loaded faces, and a
fallback glyph beats silently turning a foot/inch mark into an ASCII lookalike.
If those runs matter visually, the fix is a symbol fallback face, not more
substitution — see *Open questions* below.

### 6. Shift+Enter newlines vanished from the user's own message

The composer sends a newline on Shift+Enter, and the bubble rendered it with
default whitespace collapsing, so a multi-line question came back as one line.
Fixed with `whitespace-pre-wrap break-words` on the bubble.

### 7. iOS zoomed the page when the composer took focus

The composer `<textarea>` was 13.5px. iOS Safari zooms the viewport whenever a
focused field is under 16px, so tapping the main input re-laid-out the page.
Fixed with `text-[16px]` plus a `pointer: fine` override that keeps the 13.5px
design size on desktop.

### 8. A stray brand-blue token contradicted its own comment

`app/globals.css` declared `--color-primary: oklch(0.52 0.19 262)` in `:root`
directly under a comment saying that blue had been removed. It compiled to
`--color-primary: #245fd4`. Nothing reads it today (the theme block is
`@theme inline`, so every `*-primary` utility resolves through `--primary`,
which is neutral), but any future `var(--color-primary)` — or a `color-mix`
against it — would have painted brand blue into a deliberately zero-chroma
palette. Removed.

### 9. Headings were the only serif in the product

`.aui-md h1–h4` forced `Georgia, "Iowan Old Style", "Palatino Linotype", …` — a
serif stack in a product whose every other surface is Monument Grotesk, and no
member of that stack is loaded anywhere. Removed, so headings inherit the brand
face; the weight and tracking are unchanged.

---

## Open questions (need a decision, not a code change)

### A. Monument Grotesk is shipped and served under a licence that forbids it

The eight `app/fonts/MonumentGrotesk-*.otf` files (1.36 MB) embed this licence
text:

> Lawful use of the fonts or the data contained within the font files excludes
> modifying, reassembling, renaming, storing on publicly available servers,
> redistibutring and selling.

They are in the repository, bundled by `next/font/local` and served from
`/_next/static/media/…` to every visitor. Meanwhile `app/fonts` also contains
`space-grotesk-latin.woff2` (22 KB) and `SPACE-GROTESK-OFL.txt` — a real
SIL OFL 1.1 Space Grotesk **variable** font (wght 300–700) that nothing loads,
under a comment (until this audit) claiming *it* was the self-hosted face. Two
options, both are the user's call:

1. **Licence Monument Grotesk** (Dinamo web/site licence), keep the face, and
   drop the dead Space Grotesk files.
2. **Switch to the bundled OFL Space Grotesk**: it is 22 KB instead of 1.36 MB,
   is a variable font (so `font-semibold` would resolve to a real 600 instead of
   Bold, and `font-light` to a real 300), and needs no licence. The wordmark and
   the `CaMark` letterforms are Monument Grotesk-derived, so they would need a
   look, but they are already outlines/settings rather than font references.

Either way: the OTFs are served as uncompressed `format("opentype")` with
`display: swap`; subsetting/converting to woff2 would cut roughly a megabyte and
the fallback-flash on first paint.

### B. Type scale

The live surfaces use 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14,
15, 16, 17, 20 and 26px, several of them arbitrary (`text-[13.5px]`,
`text-[12.5px]`, `text-[10.5px]`). Body copy is 13px in the forms browser, 13.5px
on `/method`, 14px (`text-sm`) in the codes browser and 15px in the chat. Two
sub-11px sizes are used for `font-mono` labels (`text-[10.5px]`, `text-[9.5px]`)
and the citation chip digits were 8.5px. A four-step scale (11 / 13 / 15 / and
one display size) would remove most of them; this audit only raised the sizes
that were below a comfortable floor in the answer body and the composer.

### C. Straight apostrophes inside words

57 occurrences in 55 files, e.g. `Rules.jsx:175` ("California's trial and
appellate courts"), `mobile-dock-nav.tsx:9`, `spectrum-chat.tsx:19,59`,
`star-mark.tsx:6`. Most are in the vendored Spectrum UI blocks
(`components/spectrumui/**`, `components/assistant-ui/**`), which also use the
hard-coded `neutral-*` palette instead of the app's tokens. App-authored copy
elsewhere is consistently typographic (`’`, `—`, `“ ”`), so this is drift rather
than style.

### D. Two Markdown renderers, one of them unreachable

`components/assistant-ui/law-markdown.tsx` (with `components/assistant-ui/**`,
`components/runtime/**` and `components/examples/base.tsx`) is not reachable from
any route — only the Storybook and the template demo import it. That means the
`.law-cite-chip`, `.law-authority-pill`, `.law-followup-pill`, `.law-section-label`
and `.law-ai-warning` rules in `globals.css` are dead, and `.law-followup-pill` is
declared twice (the second wins). The live chat has its own, now block-aware,
renderer. Worth either wiring the rich renderer into the chat or deleting the
dead path so the two cannot drift further.

### E. Smaller items seen and left as-is

* `package.json` still names the project `eve-chat-template`; `agent/instructions.md` is 0 bytes.
* `package-lock.json` is stale (it predates the Storybook devDependencies); the
  Dockerfile and CI install from `pnpm-lock.yaml`.
* `:focus-visible { box-shadow: none }` in `globals.css` removes the ring on any
  component that draws focus with a shadow rather than an outline.
* The composer caps at `max-w-[560px]` inside a `max-w-3xl` column, so it sits
  slightly left of centre on wide screens.

---

## Verified correct (checked, no change needed)

* **Glyph coverage of app text.** App-authored live text uses 7 non-ASCII
  characters (§ · – — “ ” …); all are in every shipped face, so no missing-glyph
  boxes originate in the UI itself.
* **Font loading.** 10 `@font-face` rules are emitted (8 faces + 2 metric-matched
  fallbacks); `--font-grotesk` and `--font-grotesk-mono` resolve and
  `font-family: grotesk, grotesk Fallback` is what the body computes to.
* **`font-mono` is a real mono.** Monument Grotesk Mono/Semi-Mono ship a `tnum`
  feature and a fixed advance, so `tabular-nums` on the numbers is genuine.
* **Weight resolution.** The family has 400/500/700 (+ italics) and no 600/300:
  `font-semibold` (61 uses) resolves to Bold 700 and `font-light` (1 use) to
  Regular 400 by CSS matching. That keeps a real regular/medium/bold hierarchy;
  it is now documented at the `localFont` calls rather than left implicit.
* **The 700-italic, 500-italic and mono faces are all registered**, so no
  browser-synthesised bold or oblique is triggered by the styles the app uses
  (no `italic` is applied to `font-mono` anywhere).
* **Theme wiring.** `@custom-variant dark (&:is(.dark *))` means the vendored
  blocks' `dark:` variants follow the app's theme toggle, not
  `prefers-color-scheme`; the boot script sets the class before first paint.
* **Legal-text integrity.** The corpus is never rewritten; normalisation happens
  at the render site only (`lib/display-text.ts`).

## Reproducing the checks

```bash
npm run dev                      # fetch /codes and grep the CSS chunk for .eyebrow
node check.mts                   # literal \uXXXX sequences in the runtime prompt (expect 0)
npx tsx -e 'import {displayText} from "./lib/display-text"; console.log(displayText("two\u2011year"))'
```
