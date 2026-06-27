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
    const {
        provider,
        debounceMs = 500,
        maxContextChars = 4000,
        acceptOnClick = true,
        showAcceptReject = false,
        defaultKeymap = true,
    } = config;

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
