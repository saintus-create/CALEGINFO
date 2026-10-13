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

### B. Type scale — *done, see Round 2 below*

The live surfaces used 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14,
15, 16, 17, 20 and 26px, several arbitrary (`text-[13.5px]`, `text-[12.5px]`,
`text-[10.5px]`), with body copy at 13px in one browser, 13.5px in another, 14px
in a third and 15px in the chat. Replaced by a seven-step token scale — Round 2.

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

`scripts/check_classes.py` (`npm run check:classes`) walks the live markup,
extracts every class token and fails if the built stylesheet has no rule for it —
the check that would have caught both `.eyebrow` and `metric-card`. It exits 1
when something is missing, so it can gate a build:

```bash
npm run dev &                    # or let the script boot its own dev server
python3 scripts/check_classes.py # 528 tokens, "every class has a rule", exit 0
```

```bash
npm run dev                      # fetch /codes and grep the CSS chunk for .eyebrow
node check.mts                   # literal \uXXXX sequences in the runtime prompt (expect 0)
npx tsx -e 'import {displayText} from "./lib/display-text"; console.log(displayText("two\u2011year"))'

# round 2: the scale must compile, and no legacy size may survive in the live files
curl -s localhost:3000/codes | grep -oE '/_next/static/[^"]+\.css' | sort -u | \
  xargs -I{} curl -s "localhost:3000{}" | grep -oE '\.text-(micro|meta|label|body|lede|title|display)[ {]' | sort -u
grep -rn 'text-sm\|text-xs\|text-\[1[0-4]' app/_components/browsers app/_components/spectrum-chat.tsx \
  components/spectrumui/blocks/ai-assistants/{streaming-text,prompt-composer,chat-empty-state,suggestion-banner,thinking-dots}.tsx   # expect no output
```

---

# Round 2 — typographic polish: scale, weight, measure, place

Round 1 fixed what was broken. Round 2 sets the type: one scale, real weights,
one measure per surface, and numbers that line up. Verified against the
compiled stylesheet (7 scale utilities emitted, every legacy arbitrary size gone
from the live DOM) and a temporary render harness that exercised the answer
component with a real multi-block answer (deleted before commit).

## Three weights, not four — `font-semibold` was painting Bold

Monument Grotesk ships 400 / 500 / 700 (plus italics). CSS resolves
`font-weight: 600` to 700, so **`font-semibold` and `font-bold` were the same
face**: the product's intended Regular → Medium → Semibold → Bold ladder was
really Regular → Medium → Bold, with "semibold" and "bold" indistinguishable
next to each other in a page header. The scale now names the weight it means:

* **Bold 700** — display, page titles, `h3` inside a written answer (the one
  place a 700 heading is right, because it is competing with 15px body copy);
* **Medium 500** — eyebrow labels, section/rule citation lines, unit and chapter
  summaries, nav, form titles, emphasis (`**lead-in**` is now *darker* Medium,
  not Bold);
* **Regular 400** — all body copy.

`font-semibold` is gone from every live surface (the eight remaining uses are in
vendored Spectrum blocks that no route renders).

## The scale (globals.css, `@theme`)

Seven steps, each carrying its own leading and tracking, so a call site states a
typographic decision rather than a size:

| token | size | leading | tracking | used for |
| --- | --- | --- | --- | --- |
| `text-micro` | 11px | 1.35 | 0.07em | eyebrow labels, status pills, chips, "Effective…", vendor tags |
| `text-meta` | 12px | 1.5 | 0 | metadata, descriptions, captions, footnotes |
| `text-label` | 13px | 1.5 | 0 | nav, controls, source rows, form numbers, follow-up buttons |
| `text-body` | 15px | **1.68** | 0 | **statute text, rule text, answers, chat, page ledes** |
| `text-lede` | 17px | 1.55 | −0.011em | page ledes; `h3` inside an answer |
| `text-title` | 24px | 1.15 | −0.021em | page titles |
| `text-display` | 28px | 1.12 | −0.025em | the chat's opening statement — the only display size |

Before → after, by surface:

| surface | before | after |
| --- | --- | --- |
| statute body (Codes) | 14px / 1.25 | **15px / 1.68**, measure 70ch |
| statute citation line | 14px / 700 | 15px / **500**, full contrast |
| rule body | 14px | 15px / 1.68, measure 70ch |
| form title / description | 13px / 12px | 15px medium / 13px |
| page titles (5 pages) | 24px / 700 / tracking 0 | 24px / 700 / **−0.021em**, `text-balance` |
| page ledes | 13–14px muted | **15px**, `foreground/90`, max-w 58–68ch |
| chat answer | 13.5px / 1.7, 520px | **15px / 1.68**, 68ch |
| chat hero | 16px / 600 | **28px / 700 / −0.025em** |
| composer field | 13.5px | 15px desktop / 16px touch (iOS zoom guard) |
| authority source rows | 12.5px | 13px with hostname + in-app link |
| `/method` body | 13.5px | 15px / 68ch, 24px display-restrained title |

Total distinct sizes in the live surfaces: **17 → 8** (11 / 12 / 13 / 15 / 17 /
24 / 28, plus 16px soft-keyboard guards on text inputs). No arbitrary
`text-[Npx]` remains outside those two guards.

## Measure and place

* **One column, three widths, aligned.** The answer, the composer and the hero
  all sit on `68ch`; statute and rule text read at `70ch`; ledes and descriptions
  cap at `58–72ch` so they stop running the full `max-w-4xl` card width. Before,
  the composer was a 560px box inside a 768px column while the answer was 520px —
  three different left/right edges down one screen.
* **`text-balance` on every title and `text-pretty` on long card copy**, so a
  24px title no longer leaves one orphaned word on its second line.
* **Numbers are figures, not letters.** `tabular-nums` on counts, dates,
  inventory pills (the codes rail badges), SHA hashes, section/rule numbers,
  citation markers and the model counter — a column of them no longer jitters.
* **Contrast does the hierarchy on the reading surfaces.** The citation line
  (`CIV § 1955.5`) sits at full contrast in Medium; the statute body one step
  back at `foreground/90`; history and annotations in muted italic 12px. The
  answer uses the same `foreground/90` body so the chat and the browser read
  alike.
* **Micro labels are labels, not tiny text.** `.eyebrow` and the section labels
  now use the 11px token with 0.075em tracking and uppercase, and every uppercase
  micro label got `tracking-normal` before it where the token's tracking would
  double up — the audit script that lists `text-micro` without `uppercase` or
  `tracking-normal` returns nothing.
* **Rail and chrome.** The codes rail moved off the hard-coded `neutral-*`
  palette onto `foreground` / `muted-foreground` / `muted` tokens, its count
  badge became a mono, tabular figure in a muted pill instead of brand blue with
  a blue tint, and the dock tooltip joined the scale.
* **Controls.** `Input`, `Textarea`, `Button`, `Select`, `Label` and `Badge`
  (shared by all five browsers) moved onto the same tokens — 15px fields and
  buttons at `text-label`, badges as uppercase micro — so the chrome no longer
  argues with the content it frames.

## Also corrected in this round

* `className="metric-card"` on the Rules title cards: a second undefined class,
  same failure mode as `.eyebrow` in Round 1. The cards now carry the border,
  padding and hover state they were missing, with a `Title 1` micro label over
  the title and a tabular rule count.
* Citation chips were a fixed 15px square holding up to five characters
  (`[c123]`), so long markers were clipped; they now grow (`min-w` + padding).
* Bare URLs in an answer are now links, with trailing sentence punctuation kept
  out of the href.

## Still open after this round

The vendored Spectrum UI blocks (`components/spectrumui/blocks/**`,
`components/assistant-ui/**`) still carry their own sizes (8.5–14px), their own
`neutral-*` palette and 57 straight apostrophes. No route renders them today, so
they cost nothing at runtime — but if any is ever wired in, it will arrive with
the old type. Either bring them onto the tokens, or delete the unused half of
the folder (see Open question D).
