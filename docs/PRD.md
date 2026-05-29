# Idaztian Framework — Product Requirements Document

> **Version**: 1.0  
> **Date**: 2026-02-18  
> **License**: GPL-3.0  
> **Status**: Draft — Pending Review

---

## 1. Executive Summary

**Idaztian** is an open-source JavaScript framework that provides an Obsidian-style live-preview markdown editor for the web. Unlike traditional split-pane editors (edit on the left, preview on the right), Idaztian renders markdown formatting **inline as you type**, hiding the raw syntax unless your cursor is on or near the formatted element.

The framework is designed to be **embedded by developers** into any web application — note-taking tools, CMS platforms, documentation sites, wikis, or blogging engines — while also shipping with a **standalone demo application** that showcases all features.

### Core Value Proposition

| Feature | Traditional Editors | Idaztian |
|---|---|---|
| Preview | Side panel / toggle | Inline, live |
| Syntax visibility | Always visible | Context-aware (show on cursor) |
| Developer integration | Monolithic | Embeddable component |
| Editing feel | Code editor | Rich document editor |

---

## 2. Goals & Non-Goals

### Goals

1. **Live preview editing**: Render markdown styles inline. Hide syntax tokens (e.g. `#`, `**`, `-`) unless the cursor is on the relevant element.
2. **Full CommonMark + Extensions**: Support the complete CommonMark spec, plus GFM tables, task lists, alerts/callouts, math, code blocks with syntax highlighting, footnotes, and more.
3. **Embeddable component**: Ship as a JS library that developers can drop into any project with minimal configuration.
4. **Standalone demo app**: Provide a fully functional single-document editor with file open/download capabilities.
5. **Obsidian-inspired UX**: Match Obsidian's default dark theme and interaction patterns.
6. **Built on proven foundations**: Use CodeMirror 6 as the underlying editor engine.

### Non-Goals (v1)

- Multi-file management / file tree sidebar (delegated to host application)
- Real-time collaboration (roadmap item — architecture should not preclude it)
- Embedded content rendering (iframes, videos)
- Custom theming API (single Obsidian-like theme for v1)
- Mobile-first editing (desktop-first, mobile should be usable but not optimized)
- Backend / server-side features

---

## 3. Target Users

| Persona | Description | Needs |
|---|---|---|
| **App Developer** | Building a note-taking, CMS, or documentation tool | Drop-in editor component, clean API, events, programmatic control |
| **End User** (via demo) | Writer, student, or developer wanting quick markdown editing | Open file → write with live preview → download |

---

## 4. Technical Foundation

### 4.1 Why CodeMirror 6

CodeMirror 6 is selected as the editor engine for these reasons:

- **Obsidian uses it**: Obsidian's own "Live Preview" mode is built on CM6, proving the approach works at scale.
- **Decoration system**: CM6's `Decoration` API allows replacing or styling syntax tokens based on cursor position — the exact mechanism needed for live preview.
- **State management**: Immutable state model (`EditorState`) with transaction-based updates enables predictable behavior and undo/redo.
- **Extensibility**: Plugin architecture via `Extension` arrays makes it easy to add/remove features.
- **Performance**: Viewport-based rendering handles large documents efficiently.
- **Active maintenance**: Actively developed by Marijn Haverbeke, the original author.
- **Collaboration-ready**: CM6's `collab` module provides OT-based collaboration primitives for future use.

### 4.2 Architecture Overview

```
┌──────────────────────────────────────────────────┐
│                  Host Application                │
│  ┌────────────────────────────────────────────┐  │
│  │          Idaztian Framework (npm)          │  │
│  │  ┌──────────────────────────────────────┐  │  │
│  │  │         Public API Layer             │  │  │
│  │  │  - IdaztianEditor class              │  │  │
│  │  │  - Configuration options             │  │  │
│  │  │  - Event emitter                     │  │  │
│  │  │  - Programmatic methods              │  │  │
│  │  └──────────┬───────────────────────────┘  │  │
│  │             │                              │  │
│  │  ┌──────────▼───────────────────────────┐  │  │
│  │  │       Extension Layer                │  │  │
│  │  │  ┌────────┐ ┌────────┐ ┌──────────┐ │  │  │
│  │  │  │Headings│ │  Bold  │ │  Lists   │ │  │  │
│  │  │  │  Ext   │ │  Ext   │ │  Ext     │ │  │  │
│  │  │  └────────┘ └────────┘ └──────────┘ │  │  │
│  │  │  ┌────────┐ ┌────────┐ ┌──────────┐ │  │  │
│  │  │  │ Tables │ │ Code   │ │  Images  │ │  │  │
│  │  │  │  Ext   │ │ Blocks │ │  Ext     │ │  │  │
│  │  │  └────────┘ └────────┘ └──────────┘ │  │  │
│  │  │  ┌────────┐ ┌────────┐ ┌──────────┐ │  │  │
│  │  │  │ Links  │ │ Alerts │ │  Math    │ │  │  │
│  │  │  │  Ext   │ │  Ext   │ │  Ext     │ │  │  │
│  │  │  └────────┘ └────────┘ └──────────┘ │  │  │
│  │  └──────────┬───────────────────────────┘  │  │
│  │             │                              │  │
│  │  ┌──────────▼───────────────────────────┐  │  │
│  │  │       CodeMirror 6 Core              │  │  │
│  │  │  - EditorState / EditorView          │  │  │
│  │  │  - @lezer/markdown parser            │  │  │
│  │  │  - Decoration API                    │  │  │
│  │  │  - Keybindings                       │  │  │
│  │  └──────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  Host-managed: file trees, databases, routing    │
└──────────────────────────────────────────────────┘
```

### 4.3 Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Editor engine | CodeMirror 6 | Proven, extensible, performant |
| Markdown parser | `@lezer/markdown` | CM6's native markdown parser, incremental |
| Math rendering | KaTeX | Fast, reliable LaTeX rendering |
| Syntax highlighting (code blocks) | `@lezer/*` language packages | Consistent with CM6 ecosystem |
| Build tool | Vite | Fast dev server, simple config, tree-shaking |
| Package format | ESM (primary) + UMD (compat) | Modern + legacy support |
| Language | TypeScript | Type safety, better DX for consumers |
| Testing | Vitest | Fast, Vite-native |

---

## 5. Feature Specification

### 5.1 Live Preview Behavior (Core Innovation)

The core editing experience follows the **"reveal on focus"** pattern:

#### General Rule

> When the cursor is **on or inside** a markdown element, the raw syntax tokens are **visible** alongside the rendered style. When the cursor moves **away**, the syntax tokens are **hidden** and only the rendered output is shown.

#### Element-Specific Behavior

| Element | Cursor Away (rendered) | Cursor On (editing) |
|---|---|---|
| **Headings** (`# H1`) | Styled heading text, `#` hidden | `# ` prefix shown, text still styled |
| **Bold** (`**text**`) | **Bold** text, `**` hidden | `**text**` with asterisks shown, text still bold |
| **Italic** (`*text*`) | *Italic* text, `*` hidden | `*text*` with asterisks shown, text still italic |
| **Strikethrough** (`~~text~~`) | ~~Strikethrough~~ text, `~~` hidden | `~~text~~` with tildes shown |
| **Inline code** (`` `code` ``) | Styled code span, backticks hidden | Backticks shown, still styled |
| **Links** (`[text](url)`) | Clickable styled link text | Full `[text](url)` syntax shown |
| **Images** (`![alt](url)`) | Rendered image with alt text | Raw syntax shown, image remains above/below |
| **Bullet lists** (`- item`) | Rendered bullet dot, `-` hidden | `-` visible, still rendered as list |
| **Numbered lists** (`1. item`) | Rendered number, raw `1.` hidden | `1.` visible, still rendered |
| **Task lists** (`- [ ] task`) | Rendered checkbox | `- [ ]` syntax shown alongside checkbox |
| **Blockquotes** (`> text`) | Styled quote block, `>` hidden | `>` visible, still styled |
| **Horizontal rules** (`---`) | Rendered line | Raw `---` shown |
| **Code blocks** (`` ``` ``) | Syntax-highlighted code block | Fence markers (`` ``` ``) shown at top/bottom |
| **Tables** | Rendered HTML table with interactive add row/column handles | Table remains rendered; raw pipe-syntax toggle available via toolbar or shortcut |
| **Math inline** (`$...$`) | Rendered equation | Raw LaTeX with `$` delimiters shown |
| **Math block** (`$$...$$`) | Rendered equation block | Raw LaTeX with `$$` delimiters shown |
| **Footnotes** (`[^1]`) | Superscript reference number | Raw `[^1]` syntax shown |
| **Alerts/Callouts** (`> [!NOTE]`) | Styled callout box with icon | Raw blockquote syntax shown |

#### Cursor Proximity Rules

- **Inline elements** (bold, italic, code, links): Cursor must be inside the element's text range.
- **Block elements** (headings, lists, blockquotes): Cursor must be on the same line.
- **Multi-line blocks** (code blocks, tables, alerts): Cursor must be on any line within the block.

### 5.2 Markdown Support Matrix

#### CommonMark (required)

- [x] Paragraphs
- [x] Headings (ATX `#` style only — Setext not supported)
- [x] Emphasis (`*italic*`, `**bold**`, `***bold italic***`)
- [x] Links (inline, reference, autolinks)
- [x] Images (inline, reference)
- [x] Code spans (inline backtick)
- [x] Code blocks (fenced and indented)
- [x] Blockquotes
- [x] Lists (ordered and unordered, nested)
- [x] Thematic breaks / Horizontal rules
- [x] Hard line breaks
- [x] HTML blocks and inline HTML (rendered)
- [x] Escape sequences

#### Extensions (required)

- [x] GFM Tables
- [x] Task lists / Checkboxes (`- [ ]`, `- [x]`)
- [x] Strikethrough (`~~text~~`)
- [x] Alerts / Callouts (`> [!NOTE]`, `> [!WARNING]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!CAUTION]`)
- [x] Footnotes (`[^1]`, `[^1]: definition`)
- [x] Math / LaTeX (inline `$...$`, block `$$...$$`)
- [x] Syntax highlighting in fenced code blocks (language-specific)
- [x] Autolinks (bare URLs)

#### Extensions (future / roadmap)

- [ ] Wiki-links (`[[page]]`, `[[page|alias]]`)
- [ ] Tags (`#tag`)
- [ ] Mermaid diagram rendering
- [ ] Embedded content (iframes, video)

### 5.3 Editor Features

| Feature | Description | Priority |
|---|---|---|
| Undo / Redo | Full history with Ctrl+Z / Ctrl+Shift+Z | P0 |
| Find & Replace | Ctrl+F / Ctrl+H with regex support | P0 |
| Keyboard shortcuts | Bold, italic, heading, list shortcuts | P0 |
| Line numbers | Optional, off by default | P1 |
| Word / character count | Live count in status bar | P1 |
| Auto-closing pairs | Brackets, quotes, backticks | P0 |
| Smart indent | List continuation, blockquote continuation | P0 |
| Drag & Drop | Drop `.md` files to open, drop images to insert | P1 |
| Paste handling | Paste HTML as markdown, paste images as data URIs | P1 |
| Folding | Fold headings, code blocks | P2 |
| Multiple cursors | Multi-cursor editing (CM6 built-in) | P2 |

### 5.4 Toolbar (Optional)

A configurable floating or fixed toolbar providing:

- Text formatting (bold, italic, strikethrough, code)
- Heading level selector
- List type (bullet, numbered, task)
- Link / Image insertion dialog
- Code block insertion
- Table insertion
- Blockquote
- Horizontal rule
- Math insertion

Toolbar should be opt-in and fully configurable by the host application.

### 5.5 Context Menu (Right-Click)

A custom context menu replaces the browser default on right-click within the editor. The menu is context-sensitive — items are enabled/disabled based on the current selection and cursor position.

#### Menu Structure

```
┌────────────────────────┐
│  Format             ▸  │
│  ├── Bold      Ctrl+B  │
│  ├── Italic    Ctrl+I  │
│  ├── Strikethrough      │
│  ├── Code      Ctrl+E  │
│  └── Math    Ctrl+⇧+M  │
│  Paragraph          ▸  │
│  ├── Bullet list        │
│  ├── Numbered list      │
│  ├── Task list          │
│  ├── Blockquote         │
│  ├── Heading 1  Ctrl+1  │
│  ├── Heading 2  Ctrl+2  │
│  ├── Heading 3  Ctrl+3  │
│  ├── Heading 4  Ctrl+4  │
│  ├── Heading 5  Ctrl+5  │
│  └── Heading 6  Ctrl+6  │
│  Insert             ▸  │
│  ├── Table              │
│  ├── Code block         │
│  ├── Callout            │
│  ├── Footnote           │
│  └── Horizontal rule    │
│─────────────────────────│
│  Cut           Ctrl+X  │
│  Copy          Ctrl+C  │
│  Paste         Ctrl+V  │
│  Paste as plain text    │
│  Select all    Ctrl+A  │
└─────────────────────────┘
```

#### Behavior

- **Format submenu**: Toggle formatting on selected text. Applies to current word if no selection.
- **Paragraph submenu**: Convert current block to the selected type. If already that type, toggle back to paragraph.
- **Insert submenu**: Insert the element at cursor position.
  - **Table**: Inserts a default 2×2 table (1 header row + 1 data row, 2 columns) and immediately renders it.
  - **Callout**: Opens a secondary submenu with callout types (Note, Tip, Important, Warning, Caution).
  - **Code block**: Inserts fenced code block with cursor positioned for language tag input.
- **Clipboard actions**: Standard cut/copy/paste. "Paste as plain text" strips any formatting.
- **Context sensitivity**: Format items show a checkmark (✓) when the selection already has that format applied.

### 5.6 Table Interaction

Tables use a **always-rendered** approach — unlike other elements, tables remain visually rendered even when the cursor is inside them. This provides the best editing experience for tabular data.

#### Rendering

- Tables are always displayed as styled HTML tables, never as raw pipe syntax.
- The first row is rendered as a **bold header row** with a distinct background.
- Cells are editable inline — clicking a cell places the cursor inside it.
- Tab key moves to the next cell; Shift+Tab moves to the previous cell.

#### Add Column (Hover Right Edge)

```
┌──────────┬──────────┐
│ Header 1 │ Header 2 │  ← When mouse hovers here (right edge)
├──────────┼──────────┤     a translucent column appears:
│ Cell 1   │ Cell 2   │
└──────────┴──────────┘
                       ┌───┐
                       │ + │  ← Clickable "+" column
                       ├───┤
                       │   │
                       └───┘
```

- When the mouse hovers near the **right edge** of the table, a translucent "ghost column" appears adjacent to the table.
- The ghost column contains a **"+" button** in the header row.
- Clicking the "+" inserts a new column at the end of the table.
- The ghost column fades away when the mouse moves away.

#### Add Row (Hover Bottom Edge)

```
┌──────────┬──────────┐
│ Header 1 │ Header 2 │
├──────────┼──────────┤
│ Cell 1   │ Cell 2   │
└──────────┴──────────┘
┌──────────┬──────────┐
│          +          │  ← Clickable "+" row (appears on bottom hover)
└──────────┴──────────┘
```

- When the mouse hovers near the **bottom edge** of the table, a translucent "ghost row" appears below the table.
- The ghost row contains a **"+" button** centered in the row.
- Clicking the "+" inserts a new data row at the end of the table.

#### Column & Row Manipulation (Future Enhancement)

- Right-click on a column header → "Delete column", "Insert column left/right"
- Right-click on a row → "Delete row", "Insert row above/below"
- Drag column headers to reorder
- Column width auto-adjust

---

## 6. Public API Design

### 6.1 Initialization

```typescript
import { IdaztianEditor } from 'idaztian';

const editor = new IdaztianEditor({
  // Required
  parent: document.getElementById('editor'),

  // Optional
  initialContent: '# Hello World\n\nStart writing...',
  placeholder: 'Start writing...',
  readOnly: false,
  lineNumbers: false,
  toolbar: true,
  toolbarItems: ['bold', 'italic', 'heading', 'link', 'code', 'list'],
  contextMenu: true,

  // Extension toggles
  extensions: {
    tables: true,
    taskLists: true,
    math: true,
    alerts: true,
    footnotes: true,
    syntaxHighlighting: true,
  },

  // Callbacks
  onChange: (content: string) => { /* markdown string */ },
  onSave: (content: string) => { /* Ctrl+S triggered */ },
  onSelectionChange: (selection) => { /* cursor/selection changed */ },
});
```

### 6.2 Programmatic Methods

```typescript
// Content
editor.getContent(): string;
editor.setContent(markdown: string): void;
editor.insertAt(position: number, text: string): void;
editor.replaceSelection(text: string): void;

// State
editor.getSelection(): { from: number, to: number, text: string };
editor.getCursorPosition(): { line: number, ch: number };
editor.focus(): void;
editor.blur(): void;

// Configuration
editor.setReadOnly(readOnly: boolean): void;
editor.setTheme(theme: 'dark' | 'light'): void;  // future
editor.destroy(): void;

// History
editor.undo(): void;
editor.redo(): void;

// Utilities
editor.getWordCount(): number;
editor.getCharacterCount(): number;
```

### 6.3 Events

```typescript
editor.on('change', (content: string) => {});
editor.on('save', (content: string) => {});
editor.on('selectionChange', (selection) => {});
editor.on('focus', () => {});
editor.on('blur', () => {});
editor.on('ready', () => {});
```

---

## 7. Idatzi Desktop Application

A full-featured **Electron desktop app** that showcases the Idaztian framework as a native application.

### Features

| Feature | Description |
|---|---|
| Full editor | Idaztian editor with all extensions enabled |
| File open | Native Electron `dialog.showOpenDialog` via IPC |
| File download | Native Electron `dialog.showSaveDialog` via IPC |
| Word count | Displayed in a status bar |
| Keyboard shortcuts help | Modal showing available shortcuts |
| Local persistence | Backend HTTP server + localStorage fallback |
| Frameless dark window | Custom title bar with window controls |

### Layout

```
┌──────────────────────────────────────────────┐
│  Idatzi      [—] [□] [✕]                    │
├──────────────────────────────────────────────┤
│  ✍ Idatzi  Just writing. [New][Open][Save]  │
├──────────────────────────────────────────────┤
│                                              │
│           Full-width editor area             │
│        (Idaztian editor component)           │
│                                              │
│                                              │
├──────────────────────────────────────────────┤
│  Words: 342  ·  Characters: 1,847  ·  Lines: 48  │
└──────────────────────────────────────────────┘
```

### Quick Start

```bash
cd idatzi
npm install
npm run dev
```

### Visual Style

The app follows Obsidian's default dark theme:

- Background: `#1e1e1e` (editor), `#181818` (chrome)
- Text: `#dcddde`
- Accent: `#7f6df2` (Obsidian purple)
- Headings: Slightly brighter white with scaled font sizes
- Links: `#7f6df2`
- Code: `#e06c75` on `#2b2b2b` background
- Blockquotes: Left border accent, muted text
- Font: `Inter` for UI, monospace for code

---

## 8. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+B` | Toggle bold |
| `Ctrl+I` | Toggle italic |
| `Ctrl+K` | Insert link |
| `Ctrl+E` | Toggle inline code |
| `Ctrl+Shift+K` | Toggle strikethrough |
| `Ctrl+Shift+M` | Toggle math |
| `Ctrl+1` through `Ctrl+6` | Set heading level |
| `Ctrl+Shift+7` | Toggle numbered list |
| `Ctrl+Shift+8` | Toggle bullet list |
| `Ctrl+Shift+9` | Toggle task list |
| `Ctrl+]` | Indent |
| `Ctrl+[` | Outdent |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | Save (triggers `onSave` callback) |
| `Ctrl+F` | Find |
| `Ctrl+H` | Find & Replace |

---

## 9. Project Structure

```
idaztian/
├── docs/
│   └── PRD.md                    # This document
├── packages/
│   └── idaztian/                 # Framework package (npm publishable)
│       ├── src/
│       │   ├── index.ts          # Public API entry point
│       │   ├── editor.ts         # IdaztianEditor class
│       │   ├── config.ts         # Configuration types & defaults
│       │   ├── events.ts         # Event emitter
│       │   ├── extensions/
│       │   │   ├── index.ts      # Extension registry
│       │   │   ├── live-preview/
│       │   │   │   ├── headings.ts
│       │   │   │   ├── emphasis.ts
│       │   │   │   ├── links.ts
│       │   │   │   ├── images.ts
│       │   │   │   ├── lists.ts
│       │   │   │   ├── code.ts
│       │   │   │   ├── blockquotes.ts
│       │   │   │   ├── tables.ts
│       │   │   │   ├── math.ts
│       │   │   │   ├── alerts.ts
│       │   │   │   ├── footnotes.ts
│       │   │   │   ├── task-lists.ts
│       │   │   │   └── horizontal-rules.ts
│       │   │   ├── toolbar.ts
│       │   │   ├── context-menu.ts
│       │   │   ├── table-interaction.ts
│       │   │   ├── shortcuts.ts
│       │   │   ├── find-replace.ts
│       │   │   ├── word-count.ts
│       │   │   └── smart-pairs.ts
│       │   ├── theme/
│       │   │   └── ilunabar-dark.ts
│       │   └── utils/
│       │       ├── cursor.ts     # Cursor position helpers
│       │       └── markdown.ts   # Markdown manipulation helpers
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── demo/
│   ├── index.html
│   ├── src/
│   │   ├── main.ts
│   │   ├── file-handler.ts       # Open / Download logic
│   │   └── style.css
│   ├── package.json
│   └── vite.config.ts
├── package.json                  # Workspace root
├── LICENSE                       # GPL-3.0
└── README.md
```

---

## 10. Live Preview — Technical Implementation Strategy

This section describes **how** the "reveal on focus" behavior is implemented using CodeMirror 6 primitives.

### 10.1 Decoration-Based Approach

Each live-preview extension follows this pattern:

1. **Parse**: Use `@lezer/markdown` syntax tree to identify syntax nodes (e.g., `ATXHeading`, `StrongEmphasis`, `BulletList`).
2. **Determine visibility**: For each node, check if the cursor (or selection) intersects the node's range.
3. **Apply decorations**:
   - If cursor is **away**: Apply `Decoration.replace()` to hide syntax markers, and `Decoration.mark()` to apply CSS styling to the content.
   - If cursor is **on the element**: Remove the `replace` decorations (showing raw syntax), keep the `mark` decorations (styling persists).
4. **Update on transaction**: Recalculate decorations whenever the document or selection changes.

### 10.2 StateField Pattern

```typescript
// Simplified pseudocode for the heading extension
const headingField = StateField.define<DecorationSet>({
  create(state) { return buildDecorations(state); },
  update(decorations, tr) {
    if (tr.docChanged || tr.selectionSet) {
      return buildDecorations(tr.state);
    }
    return decorations;
  },
  provide(field) {
    return EditorView.decorations.from(field);
  },
});

function buildDecorations(state: EditorState): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const cursor = state.selection.main.head;

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name === 'ATXHeading') {
        const cursorOnHeading = cursor >= node.from && cursor <= node.to;
        const hashEnd = /* find end of hash marks */;

        if (!cursorOnHeading) {
          // Hide the hashes
          decorations.push(
            Decoration.replace({}).range(node.from, hashEnd)
          );
        }
        // Always style the heading text
        const level = /* determine level */;
        decorations.push(
          Decoration.mark({ class: `idz-h${level}` })
            .range(node.from, node.to)
        );
      }
    },
  });

  return Decoration.set(decorations, true);
}
```

### 10.3 Performance Considerations

- **Viewport-only processing**: Only compute decorations for visible content using `view.visibleRanges`.
- **Incremental updates**: Leverage `@lezer/markdown`'s incremental parsing — only re-parse changed regions.
- **Debounce image loading**: Load/render images lazily as they enter the viewport.
- **Widget recycling**: Reuse `WidgetType` instances (for images, math, checkboxes) to minimize DOM operations.

---

## 11. Alerts / Callouts Specification

Aligned with GitHub-style alerts and Obsidian callouts:

### Syntax

```markdown
> [!NOTE]
> This is a note callout.

> [!TIP]
> This is a tip callout.

> [!IMPORTANT]
> This is important.

> [!WARNING]
> Be careful!

> [!CAUTION]
> Danger zone.
```

### Rendering

Each callout type has:
- A distinct **left border color** and **background tint**
- An **icon** (info, lightbulb, exclamation, warning, flame)
- A **title** (the type name, e.g., "Note", "Warning")
- Collapsible content (future enhancement)

| Type | Border Color | Icon |
|---|---|---|
| NOTE | Blue `#2f81f7` | ℹ️ Info circle |
| TIP | Green `#3fb950` | 💡 Lightbulb |
| IMPORTANT | Purple `#a371f7` | ❗ Exclamation |
| WARNING | Yellow `#d29922` | ⚠️ Warning triangle |
| CAUTION | Red `#f85149` | 🔥 Flame |

---

## 12. Accessibility

| Requirement | Implementation |
|---|---|
| Screen reader support | ARIA roles on editor, toolbar, and status bar |
| Keyboard navigation | Full keyboard-only operation (no mouse required) |
| Focus management | Visible focus indicators, logical tab order |
| High contrast | Text meets WCAG AA contrast ratios |
| Reduced motion | Respect `prefers-reduced-motion` media query |
| Semantic structure | Proper heading hierarchy in rendered preview |

---

## 13. Distribution & Integration

### npm Package

```bash
npm install idaztian
```

### CDN (UMD)

```html
<link rel="stylesheet" href="https://unpkg.com/idaztian/dist/idaztian.css">
<script src="https://unpkg.com/idaztian/dist/idaztian.umd.js"></script>
<script>
  const editor = new Idaztian.IdaztianEditor({
    parent: document.getElementById('editor'),
  });
</script>
```

### ESM Import

```javascript
import { IdaztianEditor } from 'idaztian';
```

### Bundle Size Target

- Core (no extensions): < 150 KB gzipped
- Full (all extensions): < 250 KB gzipped
- Extensions should be tree-shakeable

---

## 14. Roadmap

### Phase 1 — Foundation (v0.1) ✅

- [x] Project scaffolding (monorepo, build, TypeScript)
- [x] CodeMirror 6 integration with `@lezer/markdown`
- [x] Core live-preview extensions: headings, emphasis, links, lists, code, blockquotes, horizontal rules
- [x] Obsidian dark theme (Ilunabar Dark)
- [x] Basic keyboard shortcuts (bold, italic, code, link, headings, lists)
- [x] Selection wrap: typing format chars wraps selected text
- [x] Demo app with open/download

### Phase 1.5 — Local Persistence (v0.2) ✅

- [x] Auto-save editor content to browser `localStorage` on every change (debounced)
- [x] On page load, restore the last-edited document from `localStorage` automatically
- [x] Persist document even after closing and reopening the browser/tab

### Phase 2 — Full Spec (v0.5)

- [x] Remaining live-preview extensions: tables, images, math, alerts, footnotes, task lists
- [x] Table interaction (always-rendered, hover +row/+column handles)
- [x] Context menu (right-click with Format/Paragraph/Insert submenus)
- [x] Toolbar component
- [x] Find & Replace
- [x] Smart pairs and indent
- [x] Word/character count
- [x] Paste handling (HTML → markdown, image paste)
- [ ] Drag & drop support

### Phase 2.5 — Framework Configuration & Examples (v0.6) ✅

- [x] Rename `demo` app to `idatzi` as the main Electron desktop showcase
- [x] Create `examples/simple-editor` for integration demonstration
- [x] Robust Configuration API (toggles for theme, readonly mode, toolbar)
- [x] Basic test suite and DOM testing setup
- [x] Light & Dark theme support out of the box
- [x] Easy installation instructions in README

### Phase 3 — Polish (v1.0)

- [x] Comprehensive test suite
- [ ] Accessibility audit & fixes
- [ ] Performance optimization (large documents)
- [x] API documentation site on https://xezpeleta.github.io/Idaztian/docs/
- [x] npm publish
- [x] CDN distribution

### Phase 4 — Future (post v1.0)

- [ ] Real-time collaboration (via CM6 `collab` module)
- [ ] Custom theming API (custom colors)
- [ ] Wiki-links and tags
- [ ] Mermaid diagram rendering
- [ ] Embedded content (iframes, video)
- [ ] Mobile-optimized editing
- [ ] Plugin system for third-party extensions

---

## 15. Success Criteria

| Metric | Target |
|---|---|
| Live preview accuracy | All CommonMark + extension elements render correctly in live preview |
| Cursor-aware syntax toggle | Syntax tokens show/hide within 16ms of cursor movement (60fps) |
| Initial load time | Demo app loads in < 2s on 3G connection |
| Bundle size | Full build < 250 KB gzipped |
| Test coverage | > 80% of core extensions |
| Browser support | Chrome, Firefox, Safari, Edge (latest 2 versions) |

---

## 16. Resolved Decisions

| # | Question | Decision |
|---|---|---|
| 1 | Heading style support | **ATX (`#`) only** — Setext headings (`===`/`---`) are not supported |
| 2 | Image rendering | **max-width: 100%** of the editor width, aspect ratio preserved |
| 3 | Table editing | **Always-rendered** with interactive hover handles for adding rows/columns (see §5.6) |
| 4 | HTML rendering | **Basic block/inline HTML only** — no scripts, no iframes |

---

*Idaztian — "writing" in Basque. A framework for the modern web writer.*
