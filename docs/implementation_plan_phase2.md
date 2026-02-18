# Phase 2 — Full Spec (v0.5) Implementation Plan
Phase 2 is split into two subphases to manage complexity, with tables and interactive components deferred to Phase 2B.

## Phase 2A — Live-Preview Extensions + Editor Features (v0.3)
All new live-preview extensions, editor features, and the paste/drag-drop workflow.

### Live-Preview Extensions
Each follows the existing ViewPlugin.fromClass + buildDecorations pattern from Phase 1.

#### [NEW] task-lists.ts
Render `- [ ]` / `- [x]` as interactive checkboxes via WidgetType.

- Cursor away: Replace markers with a styled checkbox widget
- Cursor on line: Show raw syntax alongside checkbox
- Click: Toggle `[ ]` ↔ `[x]` in the document source

#### [NEW] alerts.ts
Render `> [!NOTE]`, `> [!WARNING]`, etc. as styled callout boxes (PRD §11).

- 5 types: NOTE (blue), TIP (green), IMPORTANT (purple), WARNING (yellow), CAUTION (red)
- Cursor away: Styled callout with icon + title, `> [!TYPE]` syntax hidden
- Cursor on block: Raw syntax visible, callout styling preserved

#### [NEW] footnotes.ts
Render `[^1]` as superscript reference numbers.

- Cursor away: Superscript widget replaces `[^1]`
- Cursor on element: Raw syntax shown
- Footnote definitions (`[^1]: text`) styled distinctly

#### [NEW] images.ts
Render `![alt](url)` as inline images.

- Cursor away: `<img>` widget with max-width: 100%, lazy-loaded
- Cursor on element: Raw syntax shown, image remains visible
- Broken images → alt text + error icon

#### [NEW] math.ts
Render `$...$` (inline) and `$$...$$` (block) as KaTeX equations.

- Disabled by default (`math: false` in config — already set)
- KaTeX lazy-loaded via dynamic import() on first math encounter
- Cursor away: Rendered equation widget
- Cursor on element: Raw LaTeX with delimiters
- Parse errors → raw text + error indicator

### Editor Features

#### [NEW] smart-pairs.ts
Auto-close brackets, quotes, backticks. Wraps CM6's `closeBrackets()` from @codemirror/autocomplete.

#### [NEW] word-count.ts
CM6 panel extension rendering a status bar with live word/character/line count. Replaces the current ad-hoc implementation in the demo's `main.ts`.

#### [NEW] paste-handler.ts
Intercept paste events to convert HTML → Markdown.

- Primary use case: Copy a fragment from a website, paste into Idaztian → auto-converted to markdown
- Uses `turndown` library for reliable HTML→MD conversion
- Image paste → insert as data URI

#### [NEW] drag-drop.ts
- `.md` file drop → read and insert content
- Image file drop → insert as `![filename](data:...)` or trigger upload callback

#### [MODIFY] Find & Replace styling
CM6 search is already wired. Add theme styles in `ilunabar-dark.ts` to match the dark theme.

### Cross-Cutting Changes (2A)
| File | Change |
|------|--------|
| `extensions/index.ts` | Register all new extensions, gated by config flags |
| `ilunabar-dark.ts` | CSS for alerts, footnotes, images, math, task lists, search panel, status bar |
| `config.ts` | Add config for paste handler, drag & drop callback, word count panel |
| Demo app | Update sample content to showcase all 2A features |

### New Dependencies (2A)
| Package | Purpose | Size |
|---------|---------|------|
| `katex` | LaTeX/math rendering (lazy-loaded) | ~300 KB, loaded on demand |
| `turndown` | HTML → Markdown paste conversion | ~30 KB |
| `@codemirror/autocomplete` | Smart pairs (closeBrackets) | Minimal (CM6 ecosystem) |

## Phase 2B — Tables + Interactive Components (v0.5)
Tables, context menu, and toolbar — the interactive, high-complexity features.

### Tables

#### [NEW] tables.ts
Always-rendered table (PRD §5.6). Pipe syntax is never shown directly.

- Parse Table Lezer nodes → render as HTML `<table>` via WidgetType
- First row = bold header with distinct background
- Cells are editable inline — changes sync back to markdown source
- Tab / Shift+Tab navigates between cells

#### [NEW] table-interaction.ts
Hover handles for adding rows/columns:

- Right edge hover → ghost column with "+" button
- Bottom edge hover → ghost row with "+" button
- Future: right-click for delete/insert/reorder

### Interactive Components

#### [NEW] context-menu.ts
Custom right-click menu (PRD §5.5) with Format / Paragraph / Insert submenus.

- Reuses command logic from `shortcuts.ts`
- Context-sensitive: checkmarks for active formatting
- Gated by `config.contextMenu` (default true)

#### [NEW] toolbar.ts
Configurable toolbar (PRD §5.4).

- Buttons for all formatting and insertion actions
- Toggle state reflects current cursor context
- Configurable items via `config.toolbarItems`
- Gated by `config.toolbar` (default false)

### Cross-Cutting Changes (2B)
Same files as 2A: extension registry, theme, config, and demo app updated for tables, context menu, and toolbar.

## Verification Plan
After each batch, run the demo and verify interactively:

```bash
docker run --rm -it -v "$(pwd)":/app -w /app -p 5173:5173 node:lts npm run dev
```

**Phase 2A checklist**: task list checkboxes, alert callouts, footnote superscripts, image rendering, math equations, smart pairs, status bar, HTML paste conversion, file drag & drop, search panel styling.

**Phase 2B checklist**: table rendering + cell editing, hover handles, context menu actions, toolbar buttons + toggle state.

**Build check**: `docker run --rm -it -v "$(pwd)":/app -w /app node:lts npm run build` — no TS errors, reasonable bundle size.
