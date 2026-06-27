# Changelog

## [1.2.1] — 2025-06-27

### Editor Framework (`idaztian`)

#### Changed
- **Default model upgraded from SmolLM-135M-Instruct to SmolLM2-135M-Instruct** — ~2× better instruction following (IFEval 29.9 vs 17.2), trained on 2T tokens vs ~600B. Same 135M parameter count, no speed regression.

---

## [1.2.0] — 2025-06-27

### Editor Framework (`idaztian`)

#### Added
- **Built-in Transformers.js provider** (`createTransformersJsProvider`) — fully-local browser-side AI completions using Transformers.js with q4 quantization. Supports WebGPU with WASM fallback. Model cached in IndexedDB.
  - Optional `@huggingface/transformers` peer dependency
  - `getTransformersJsState()` for progress/status monitoring
  - `preload()` for eager model loading

---

## [1.1.0] — 2025-06-27

### Editor Framework (`idaztian`)

#### Added
- **AI inline completion** — Copilot-style ghost text completions powered by a pluggable provider interface. Enable via `extensions.aiCompletion` in the config.
  - `AiCompletionProvider` interface with `fetchCompletion(context, signal)` — works with any OpenAI-compatible API (OpenAI, Ollama, Groq, LM Studio, etc.)
  - Inline ghost text widget displayed as dimmed text after the cursor
  - **Tab** to accept a suggestion, **Escape** to dismiss
  - Debounced provider calls with `AbortController` cancellation on new input
  - Document snapshot staleness check — completions from stale state are discarded
  - All exports from `idaztian`: `aiCompletion`, `AiCompletionProvider`, `AiCompletionConfig`

### Documentation
- README: added AI completion feature to the list and full usage example
- Landing page (`docs/index.html`): added AI Autocompletion feature card
- Implementation plan at `docs/ai-inline-completion-plan.md`

---

## [1.0.4] — 2025-04-13

### Editor Framework (`idaztian`)

#### Fixed
- UX cursor navigation issues in live preview

### idatzi (desktop app)
- Extracted to its own repository: [xezpeleta/idatzi](https://github.com/xezpeleta/idatzi)

---

## [1.0.3] — 2025-04-08

### idatzi (desktop app)

#### Added
- Sidebar file browser with directory navigation
- Open files/directories from CLI and macOS Finder
- Redesigned file actions: inline new file, context menu save/delete

#### Fixed
- Context menu visibility on empty space and file nodes
- Context target path capture timing

---

## [1.0.2] — 2025-04-02

### idatzi (desktop app)

#### Changed
- Migrated from Tauri to Electron

---

## [1.0.1] — 2025-03-28

### Editor Framework (`idaztian`)

#### Added
- Heading marker color in dark and light themes
- Docker Compose setup for development

---

## [1.0.0] — 2025-03-25

### Editor Framework (`idaztian`)

#### Added
- Initial release
- Live preview markdown editing with context-aware syntax reveal
- Block widgets: tables, code blocks, horizontal rules, blockquotes, alert callouts
- Inline and block LaTeX math via KaTeX
- Auto-closing pairs with code context awareness
- Smart list continuation
- Paste HTML-to-markdown conversion
- Drag-and-drop file import
- Context-aware toolbar
- Dark and light themes
- Framework-agnostic: works with any web stack

### idatzi (desktop app)

#### Added
- Initial Electron-based desktop editor with file browser, toolbar, and themes
