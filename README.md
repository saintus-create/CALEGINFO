# California Legislative Information

AI legal research over California's own published material — the Codes,
2025–26 bills, Rules of Court, Judicial Council forms, and a public-records
directory.

## The grid

Every horizontal position on the site comes from one 12-column grid, and every
vertical one from one 4px baseline. A surface either spans whole columns of the
page grid or it is spaced in multiples of the baseline — there are no ad-hoc
max-widths, margins or paddings in the layout.

### Tokens

Defined in `app/globals.css`. Change these, not the call sites:

| Token | Value | What it is |
| --- | --- | --- |
| `--grid-columns` | `12` | columns per page grid |
| `--grid-gutter` | 20px → 24px | gap between columns (`sm` up) |
| `--grid-margin` | 20 → 24 → 32 → 40px | page margin outside the first/last column |
| `--grid-page-max` | 1344px | where the grid stops growing |
| `--grid-measure` | 672px | max line length for prose |
| `--grid-header` | 56px | the single header height |
| `--baseline` | 4px | vertical rhythm unit |
| `--baseline-step` | 24px | the line body copy sits on |

The spacing tokens are also Tailwind utilities — `gap-gutter`, `px-margin`,
`h-header` — and they read the live variables, so they follow the breakpoints.

### Columns

| Class | Placement from `lg` | Used by |
| --- | --- | --- |
| `col-content` | columns 3–10 | the site's content column: chat turns, the composer, prose, browse lists |
| `col-rail` | columns 1–3 | the Codes rail (hidden below `lg`) |
| `col-main` | columns 4–12 | the content beside the rail |
| `col-wide` | columns 2–11 | opt-in, for tables that need the room |

Below `lg` every one of them is full width.

### In components

- `<PageGrid>` — the container: 12 columns, live gutter and margin, capped and
  centred. Called by `SiteHeader`, `BrowseShell` and the chat.
- `<PageColumn start={..} span={..} smStart={..} smSpan={..} lgStart={..} lgSpan={..}>`
  — a surface on the grid, placed in columns. `start`/`span` are mobile-first;
  the `sm`/`lg` props override them. Omit both and pass a semantic class.
- `<BrowseShell active="/codes" rail={…}>` — the library shell. It owns the
  grid; pages supply content, not widths.

### Text box trim

Headings carry `text-box-trim: trim-both` from the base layer, so the cap of a
title sits exactly on the grid line it is placed on rather than half a
line-height below it. Labels, chips and tabular rows get the same treatment
from the `text-trim` utility (and `text-trim-start` / `text-trim-end` for one
edge only). Engines that do not support it ignore the declarations — which is
why every line-height in the type scale is still a whole multiple of 4px.

### Type scale

`text-eyebrow` 11/16 · `text-meta` 12/16 · `text-caption` 13/20 · `text-body`
14/24 · `text-lead` 15/24 · `text-title-md` 16/24 · `text-title-lg` 20/28 ·
`text-title-xl` 24/32 · `text-display` 30/40. Pills use the `.chip`
primitive (24px tall), labels use `.eyebrow`.

### Checking an alignment

The site draws its own grid: press **shift + G**, or add `?grid=1` to any URL.
The overlay is built from the same tokens as the layout, so it cannot drift
from it. A reference page lives in Storybook at **Layout/PageGrid**.

## Development

```bash
npm install --legacy-peer-deps
npm run dev          # http://localhost:3000
npm run typecheck
npm run storybook    # component reference
```
