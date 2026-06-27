/**
 * AI Inline Completion — Public API
 *
 * Factory function that assembles all the extension pieces
 * (state, plugins, keymap) into a single CodeMirror extension array.
 *
 * @example
 * ```ts
 * import { aiCompletion } from 'idaztian';
 *
 * const ext = aiCompletion({
 *   provider: {
 *     async fetchCompletion(context, signal) { ... }
 *   },
 *   debounceMs: 300,
 * });
 * ```
 */

import type { Extension } from '@codemirror/state';
import type { AiCompletionConfig } from './types';
import { AiCompletionState } from './state';
import { createFetchPlugin } from './fetch-plugin';
import { createRenderPlugin } from './render-plugin';
import { aiCompletionKeymap } from './keymap';
import { createTransformersJsProvider } from './transformers-provider';
import type { TransformersJsAiConfig } from './transformers-provider';

/**
 * Injected once to set ghost text and action button styles.
 */
let stylesInjected = false;

function injectStyles(): void {
    if (stylesInjected || typeof document === 'undefined') return;
    stylesInjected = true;

    const style = document.createElement('style');
    style.setAttribute('data-idz', 'ai-completion');
    style.textContent = `
/* Ghost text suggestion — dimmed, italic, non-editable feel */
.cm-ai-ghost-text {
  opacity: 0.38;
  color: inherit;
  font-style: italic;
  pointer-events: none;
}

/* Allow clicks if acceptOnClick is enabled (overrides pointer-events: none) */
.cm-ai-ghost-text[style*="cursor: pointer"] {
  pointer-events: auto;
}

/* Accept/Reject hint buttons */
.cm-ai-ghost-actions {
  display: inline-flex;
  gap: 2px;
  margin-left: 4px;
  font-size: 0.75em;
  vertical-align: middle;
  opacity: 0.5;
}

.cm-ai-ghost-accept-btn,
.cm-ai-ghost-reject-btn {
  background: none;
  border: 1px solid color-mix(in srgb, currentColor 20%, transparent);
  border-radius: 3px;
  padding: 0 4px;
  cursor: pointer;
  color: inherit;
  opacity: 0.6;
  font-family: inherit;
  font-size: inherit;
  line-height: 1.4;
}

.cm-ai-ghost-accept-btn:hover,
.cm-ai-ghost-reject-btn:hover {
  opacity: 1;
  background: color-mix(in srgb, currentColor 10%, transparent);
}
`;
    document.head.appendChild(style);
}

/**
 * Create the AI inline completion extension.
 *
 * Returns an array of CodeMirror extensions that together provide
 * ghost-text completion powered by the given provider.
 *
 * @param config - Configuration object. `provider` is required.
 * @returns Array of CodeMirror extensions to install in the editor.
 */
export function aiCompletion(config: AiCompletionConfig): Extension[] {
    let {
        provider,
        debounceMs = 500,
        maxContextChars = 4000,
        acceptOnClick = true,
        showAcceptReject = false,
        defaultKeymap = true,
        transformersJs,
    } = config;

    // If transformersJs is set, create the built-in provider automatically.
    // This overrides any manually-provided provider.
    if (transformersJs) {
        const tfConfig: TransformersJsAiConfig =
            typeof transformersJs === 'object' ? transformersJs : {};
        provider = createTransformersJsProvider(tfConfig);
    }

    // Validate that we have a provider
    if (!provider) {
        throw new Error(
            'aiCompletion: either `provider` or `transformersJs` must be provided',
        );
    }

    // Inject ghost text styles (once, lazily)
    injectStyles();

    const extensions: Extension[] = [
        // State field — must be first so plugins can read it
        AiCompletionState,

        // Fetch plugin — listens for changes, calls provider
        createFetchPlugin(provider, debounceMs, maxContextChars),

        // Render plugin — reads state, creates ghost text decorations
        createRenderPlugin(acceptOnClick, showAcceptReject),
    ];

    // Optional keybindings (Tab = accept, Escape = dismiss)
    if (defaultKeymap) {
        extensions.push(aiCompletionKeymap);
    }

    return extensions;
}

// Re-export the built-in Transformers.js provider
export { createTransformersJsProvider, getTransformersJsState } from './transformers-provider';
export type { TransformersJsAiConfig } from './transformers-provider';
