# AI Inline Completion — Implementation Plan

> **Status:** Draft  
> **Target:** `packages/idaztian`  
> **Feature:** Copilot-style ghost text inline completion for markdown writing

---

## 1. Overview

Add an optional built-in extension to Idaztian that provides **AI-powered sentence/paragraph completion** displayed as **ghost text** after the cursor. The user presses **Tab** to accept or **Escape** to dismiss. The backend is the `fetchFn` provider pattern: the library itself is backend-agnostic — it just calls a user-provided async function. The user wires any OpenAI-compatible API (OpenAI, Ollama, LM Studio, Groq, etc.) into that function.

### UX behavior (matching Copilot / VS Code ghost text)

- User types text normally.
- After a configurable **debounce** (default 500ms), the extension extracts the context window and calls the provider.
- If the provider returns completion text, it's rendered as **dimmed ghost text** inline at the cursor position.
- **Tab** → ghost text is committed as real document content, cursor moves to end.
- **Escape** (or any typing/backspace that changes the doc) → ghost text dismissed.
- **Click on ghost text** → accepts the suggestion (configurable on/off).

### What this is NOT

- NOT a dropdown autocomplete picker (that's `@codemirror/autocomplete` territory).
- NOT a chat interface.
- NOT a "rewrite this paragraph" tool (though it could be extended later).
- NOT specific to code — it's designed for **natural language / markdown writing**.

---

## 2. Architecture

### 2.1. File structure

```
packages/idaztian/src/extensions/
├── ai-completion/
│   ├── index.ts           # Public API: aiCompletion() extension factory
│   ├── types.ts           # Interfaces: AiCompletionProvider, AiCompletionConfig, etc.
│   ├── state.ts           # StateField and StateEffect for ghost text state
│   ├── decorations.ts     # GhostTextWidget (inline dimmed text widget)
│   ├── fetch-plugin.ts    # ViewPlugin that debounces and calls provider
│   ├── render-plugin.ts   # ViewPlugin that reads StateField and creates DecorationSet
│   └── keymap.ts          # Tab/Escape keybindings
├── index.ts               # [MODIFIED] import & wire in buildExtensions()
```

### 2.2. Data flow

```
User types
    │
    ▼
fetch-plugin (ViewPlugin)
    ├── update() detects docChanged
    ├── Debounce 500ms (configurable)
    ├── Extracts context window (last N chars or lines)
    ├── Calls provider.fetchCompletion(context, signal)
    │       │
    │       ▼
    │   User's async function → OpenAI-compatible API
    │       │
    │       ▼
    │   Returns string | null
    │
    ├── Dispatches StateEffect { text, doc }
    │
    ▼
AiCompletionState (StateField)
    ├── Stores current suggestion text + document snapshot
    ├── Invalidates if doc changes (typing dismisses ghost text)
    │
    ▼
render-plugin (ViewPlugin)
    ├── Reads StateField
    ├── If suggestion exists → creates GhostTextWidget Decoration
    │   └── Decoration.widget({ widget: GhostTextWidget, side: 1 }).range(cursorPos)
    ├── If no suggestion → Decoration.none
    │
    ▼
GhostTextWidget (WidgetType)
    ├── toDOM() → <span class="cm-ghost-text">dimmed text</span>
    ├── lineBreaks getter → handles multiline completions
    ├── onclick → accept suggestion (if config.acceptOnClick)
    │
    ▼
Keymap
    ├── Tab → if suggestion exists, insert text & move cursor, else fall through
    └── Escape → dismiss suggestion
```

### 2.3. Component responsibilities

| Component | Role |
|-----------|------|
| `types.ts` | All TypeScript interfaces. The `AiCompletionProvider` is the contract users implement. |
| `state.ts` | `AiCompletionState` (StateField) — holds `{ suggestion: string \| null, doc: Text }`. Invalidated on any doc change. |
| `decorations.ts` | `GhostTextWidget` class (WidgetType). Renders dimmed text inline. Handles multiline via `lineBreaks` getter. Accept-on-click behavior. |
| `fetch-plugin.ts` | `ViewPlugin.fromClass`. On `docChanged`, debounces, calls provider, dispatches StateEffect. Handles AbortController for cancellation on new typing. |
| `render-plugin.ts` | `ViewPlugin.fromClass`. Provides `DecorationSet`. Reads state field, builds ghost text decoration. |
| `keymap.ts` | `Prec.highest(keymap.of(...))`. Tab accept, Escape reject. Only intercepts when a suggestion is active. |
| `index.ts` | Public factory function `aiCompletion(config)`. Returns array of extensions. |

---

## 3. API Design

### 3.1. Provider interface

```typescript
/**
 * User-implemented completion provider.
 * Call any OpenAI-compatible API here.
 *
 * @param context  The text before the cursor (last N chars or full doc prefix)
 * @param signal   AbortSignal — abort the fetch if user types again
 * @returns        Completion string, or null if no suggestion
 */
export interface AiCompletionProvider {
  fetchCompletion(context: string, signal: AbortSignal): Promise<string | null>;
}
```

### 3.2. Configuration

```typescript
export interface AiCompletionConfig {
  /**
   * REQUIRED: The completion provider.
   * Implement AiCompletionProvider to call your OpenAI-compatible API.
   */
  provider: AiCompletionProvider;

  /**
   * Milliseconds to wait after the user stops typing before
   * requesting a completion. Default: 500.
   */
  debounceMs?: number;

  /**
   * Maximum number of characters from the document to send as
   * context to the provider. Default: 4000.
   *
   * The context is extracted from before the cursor position.
   */
  maxContextChars?: number;

  /**
   * Whether clicking on the ghost text accepts the suggestion.
   * Default: true.
   */
  acceptOnClick?: boolean;

  /**
   * Show inline accept/reject hint buttons next to the ghost text.
   * Default: true.
   */
  showAcceptReject?: boolean;

  /**
   * Whether to register default keybindings (Tab/Escape).
   * Default: true.
   */
  defaultKeymap?: boolean;
}
```

### 3.3. IdaztianConfig integration

Add to `IdaztianExtensionConfig`:

```typescript
export interface IdaztianExtensionConfig {
  // ... existing fields ...

  /** AI-powered inline completion (disabled by default) */
  aiCompletion?: AiCompletionConfig | false;
}
```

### 3.4. Public API export

```typescript
// src/index.ts
export { aiCompletion } from './extensions/ai-completion';
export type { AiCompletionProvider, AiCompletionConfig } from './extensions/ai-completion/types';
```

### 3.5. Usage example (user-side)

```typescript
import { IdaztianEditor } from 'idaztian';

const editor = new IdaztianEditor({
  parent: document.getElementById('editor'),
  initialContent: '# My Notes\n\n',
  extensions: {
    aiCompletion: {
      provider: {
        async fetchCompletion(context, signal) {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: 'You are a writing assistant. Continue the user\'s text naturally in the same style. Provide ONLY the continuation, no explanations. Keep it concise — 1-2 sentences.',
                },
                { role: 'user', content: context },
              ],
              max_tokens: 150,
              temperature: 0.7,
            }),
            signal, // Pass through for cancellation
          });

          const data = await response.json();
          return data.choices?.[0]?.message?.content?.trim() || null;
        },
      },
      debounceMs: 500,
    },
  },
});
```

#### Ollama (local) example

```typescript
provider: {
  async fetchCompletion(context, signal) {
    const response = await fetch('http://localhost:11434/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2',
        messages: [
          { role: 'system', content: 'Continue the text naturally. Output ONLY the continuation.' },
          { role: 'user', content: context },
        ],
        max_tokens: 100,
        stream: false,
      }),
      signal,
    });
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  },
},
```

---

## 4. Implementation Details

### 4.1. State management

The `StateField` must handle these edge cases:

1. **Doc change during fetch**: The `StateEffect` includes a `doc: Text` snapshot. On receipt, the field checks `tr.state.doc === effect.value.doc`. If the doc changed (user kept typing), the suggestion from the stale fetch is discarded.

2. **Multiple rapid fetches**: Each fetch stores its AbortController. On new typing, the previous controller is aborted before starting a new fetch.

3. **No suggestion returned**: If provider returns `null` or empty string, no ghost text is shown.

4. **Bare newline at end**: If the suggestion starts with a newline (common with LLMs), trim leading whitespace/newlines to avoid weird rendering.

### 4.2. GhostTextWidget

```typescript
class GhostTextWidget extends WidgetType {
  constructor(
    private readonly text: string,
    private readonly onAccept: (view: EditorView) => boolean,
  ) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const span = document.createElement('span');
    span.className = 'cm-ghost-text';
    span.style.cssText = 'opacity: 0.4; font-style: italic; cursor: pointer;';
    span.textContent = this.text;

    span.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.onAccept(view);
    });

    return span;
  }

  get lineBreaks(): number {
    // Count newlines so CodeMirror knows this widget spans multiple lines
    return (this.text.match(/\n/g) || []).length;
  }

  eq(other: GhostTextWidget): boolean {
    return other.text === this.text;
  }
}
```

### 4.3. Context extraction

The context sent to the LLM is the text **before the cursor**, up to `maxContextChars` (default 4000):

```typescript
function extractContext(state: EditorState, maxChars: number): string {
  const cursor = state.selection.main.head;
  const start = Math.max(0, cursor - maxChars);
  return state.sliceDoc(start, cursor);
}
```

This is intentionally simple. Future iterations could include:
- Full document prefix for longer context
- Heading-aware context windowing (send the current section only)
- Conversation history across multiple completions

### 4.4. Debounce + cancellation

```typescript
class FetchPlugin {
  private controller: AbortController | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;

  update(update: ViewUpdate) {
    if (!update.docChanged) return;

    // Clear previous pending fetch
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.controller) this.controller.abort();

    this.debounceTimer = setTimeout(async () => {
      this.controller = new AbortController();
      const context = extractContext(update.state, this.maxChars);
      try {
        const suggestion = await this.provider.fetchCompletion(context, this.controller.signal);
        // Dispatch effect if doc hasn't changed
        update.view.dispatch({
          effects: AiCompletionEffect.of({
            text: suggestion,
            doc: update.state.doc,
          }),
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          // Log or notify about real errors
          console.warn('AI completion fetch failed:', err);
        }
      }
    }, this.debounceMs);
  }
}
```

### 4.5. Keybindings

```typescript
const aiCompletionKeymap = Prec.highest(
  keymap.of([
    {
      key: 'Tab',
      run: (view) => {
        const suggestion = view.state.field(AiCompletionState)?.suggestion;
        if (!suggestion) return false; // Fall through to default Tab behavior

        const cursor = view.state.selection.main.head;
        view.dispatch({
          changes: { from: cursor, insert: suggestion },
          selection: { anchor: cursor + suggestion.length },
        });
        // Clear suggestion (StateField update handles this since doc changed)
        return true;
      },
    },
    {
      key: 'Escape',
      run: (view) => {
        const suggestion = view.state.field(AiCompletionState)?.suggestion;
        if (!suggestion) return false;

        view.dispatch({
          effects: AiCompletionEffect.of({ text: null, doc: view.state.doc }),
        });
        return true;
      },
    },
  ]),
);
```

### 4.6. CSS

Minimal CSS shipped with the library (injected or part of `style.css`):

```css
.cm-ghost-text {
  opacity: 0.4;
  filter: grayscale(30%);
  font-style: italic;
  cursor: pointer;
  transition: opacity 0.15s;
}

.cm-ghost-text:hover {
  opacity: 0.65;
}

.cm-ghost-accept {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  margin-left: 8px;
  font-size: 0.75em;
  opacity: 0.6;
  user-select: none;
}

.cm-ghost-accept-btn {
  color: #007acc;
  cursor: pointer;
  padding: 1px 6px;
  border-radius: 3px;
  border: 1px solid rgba(0, 122, 204, 0.3);
  background: rgba(0, 122, 204, 0.1);
}

.cm-ghost-accept-btn:hover {
  background: rgba(0, 122, 204, 0.2);
}
```

---

## 5. Integration Points

### 5.1. `buildExtensions()` in `src/extensions/index.ts`

```typescript
export function buildExtensions(config: IdaztianExtensionConfig): Extension[] {
  const extensions: Extension[] = [
    // ... existing extensions ...
  ];

  // AI completion (disabled by default)
  if (config.aiCompletion && config.aiCompletion !== false) {
    extensions.push(aiCompletion(config.aiCompletion));
  }

  return extensions;
}
```

### 5.2. `IdaztianConfig` in `src/config.ts`

Add to `IdaztianExtensionConfig`:
```typescript
aiCompletion?: AiCompletionConfig | false;
```

No changes needed in `IdaztianConfig` itself — it's nested under `extensions`.

### 5.3. Public exports in `src/index.ts`

```typescript
export { aiCompletion } from './extensions/ai-completion';
export type { AiCompletionProvider, AiCompletionConfig } from './extensions/ai-completion/types';
```

---

## 6. Edge Cases & Considerations

| Edge case | Handling |
|-----------|----------|
| User types while fetch in flight | AbortController cancels previous request |
| Suggestion arrives but doc changed | StateEffect carries doc snapshot; field rejects stale |
| Provider returns empty string | Treated as "no suggestion", ghost text not shown |
| Provider returns text starting with `\n` | Trim leading whitespace from suggestion |
| Provider returns multi-paragraph text | GhostTextWidget handles via `lineBreaks` getter |
| User deletes text (backspace) | Triggers docChanged → new fetch after debounce |
| Cursor not at end of document | Only fetch when selection is a single cursor at doc end? Or always from cursor? → Always from cursor, context is text before cursor |
| Tab without suggestion | Falls through to default Tab behavior (indent) |
| Rapid typing | Debounce ensures we don't flood the API |
| Network error / API 429 | Catch in fetch-plugin, log warning, no crash |
| Read-only mode | Should not fetch; check `state.readOnly` |
| Editor destroyed mid-fetch | AbortController aborted in plugin destroy() |
| Theme compatibility | Ghost text should use relative colors or CSS variables to work with dark/light themes |

---

## 7. Testing Strategy

### 7.1. Unit tests (vitest + jsdom)

- **StateField**: Verifies suggestion is stored and cleared on doc change.
- **StateEffect with stale doc**: Effect with old doc snapshot is rejected.
- **GhostTextWidget**: Renders with correct text content and CSS class.
- **Keymap**: Tab inserts suggestion and clears state; Escape clears state; Tab without suggestion returns false.
- **Context extraction**: Correct text slice for various cursor positions and maxChars values.
- **Leading whitespace trimming**: Suggestion starting with `\n` is cleaned.

### 7.2. Integration tests

- Full editor with `aiCompletion` config → typing triggers fetch → ghost text appears.
- Accept via Tab → text committed to document.
- Reject via Escape → ghost text dismissed.
- Typing new characters after suggestion → dismisses and starts new fetch.

### 7.3. Mock provider

```typescript
const mockProvider: AiCompletionProvider = {
  async fetchCompletion(context: string, _signal: AbortSignal) {
    // Simple: always suggest " world" unless context is empty
    if (!context.trim()) return null;
    return ' continued text here.';
  },
};
```

---

## 8. Dependencies

No new npm dependencies required. The implementation uses only existing packages:

| Package | Usage |
|---------|-------|
| `@codemirror/state` | `StateField`, `StateEffect`, `EditorState`, `Prec`, `Facet` |
| `@codemirror/view` | `ViewPlugin`, `Decoration`, `WidgetType`, `keymap`, `EditorView`, `ViewUpdate` |

The `fetch` API is used for the provider call — this is a browser built-in, no polyfill needed.

---

## 9. File-by-file Implementation Order

1. **`types.ts`** — Interfaces (no deps)
2. **`state.ts`** — StateField + StateEffect (depends on types)
3. **`decorations.ts`** — GhostTextWidget + AcceptIndicatorWidget (depends on types, state)
4. **`keymap.ts`** — Tab/Escape keybindings (depends on state)
5. **`fetch-plugin.ts`** — Debounced fetch ViewPlugin (depends on types, state)
6. **`render-plugin.ts`** — Decoration rendering ViewPlugin (depends on decorations, state)
7. **`index.ts`** — aiCompletion() factory (depends on all above)
8. **`extensions/index.ts`** — Wire into buildExtensions (minor edit)
9. **`config.ts`** — Add to IdaztianExtensionConfig (minor edit)
10. **`src/index.ts`** — Public exports (minor edit)
11. **Tests** — ai-completion.test.ts

---

## 10. Future Enhancements (out of scope for v1)

- **Accept partial (word-by-word)**: Ctrl+Right accepts next word instead of full completion
- **Multi-suggestion cycling**: Alt+] / Alt+[ to cycle through alternatives
- **Conversation history**: Accumulate context across multiple accepted completions
- **Heading-aware context**: Send only the current section, not raw char window
- **Streaming rendering**: Render tokens from SSE as they arrive
- **Inline edit mode**: Similar to marimo-team's codemirror-ai, select text and request rewrite
- **Provider presets**: Built-in helper functions for OpenAI, Ollama, Anthropic to reduce boilerplate
- **Rate limit handling**: Retry with backoff on 429
- **Cache**: Don't re-request for identical contexts

---

## 11. References

- **codemirror-extension-inline-suggestion** (saminzadeh): Minimal reference implementation using `StateField` + `Decoration.widget` + `WidgetType`. All logic in one file. ~150 LOC. [GitHub](https://github.com/saminzadeh/codemirror-extension-inline-suggestion)
- **codemirror-ai** (marimo-team): More sophisticated with diff-based suggestions (add/remove/modify), tooltip UI for diffs, multiple suggestion types. Modular file structure. [GitHub](https://github.com/marimo-team/codemirror-ai)
- **codemirror-codeium** (val-town): Codeium-specific integration using protobuf. Uses `.ghostText` CSS class convention. [GitHub](https://github.com/val-town/codemirror-codeium)
- **CodeMirror Discuss**: [Inline suggested texts](https://discuss.codemirror.net/t/inline-suggested-texts/4714) — Marijn's recommendation: use inline widget with `side: 1` and implement `lineBreaks` for multiline.
- **CodeMirror Docs**: [Decoration Reference](https://codemirror.net/docs/ref/#view.Decoration), [WidgetType](https://codemirror.net/docs/ref/#view.WidgetType)
