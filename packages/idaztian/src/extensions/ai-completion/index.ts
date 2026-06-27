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

// Re-export the HuggingFace Inference API provider
export { createHuggingFaceInferenceProvider } from './huggingface-inference-provider';
export type { HuggingFaceInferenceConfig } from './huggingface-inference-provider';
