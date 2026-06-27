/**
 * AI Inline Completion — Types
 *
 * Defines the provider interface and configuration shape for
 * the Copilot-style ghost text completion extension.
 */

/**
 * User-implemented completion provider.
 *
 * Implement this interface to call your preferred AI backend
 * (OpenAI, Ollama, Anthropic, Groq, LM Studio, etc.).
 *
 * @example OpenAI-compatible API
 * ```ts
 * const provider: AiCompletionProvider = {
 *   async fetchCompletion(context, signal) {
 *     const res = await fetch('https://api.openai.com/v1/chat/completions', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ...' },
 *       body: JSON.stringify({
 *         model: 'gpt-4o-mini',
 *         messages: [{ role: 'user', content: 'Continue: ' + context }],
 *         max_tokens: 100,
 *       }),
 *       signal,
 *     });
 *     const data = await res.json();
 *     return data.choices?.[0]?.message?.content?.trim() || null;
 *   },
 * };
 * ```
 */
export interface AiCompletionProvider {
    /**
     * Request a text completion from the AI backend.
     *
     * @param context - The text before the cursor (up to maxContextChars).
     * @param signal  - AbortSignal. Abort the fetch if the user types again.
     * @returns The completion text to display as ghost text, or null for no suggestion.
     */
    fetchCompletion(context: string, signal: AbortSignal): Promise<string | null>;
}

/**
 * Configuration for the AI inline completion extension.
 *
 * Provided via `IdaztianEditor` config:
 * ```ts
 * new IdaztianEditor({
 *   parent: el,
 *   extensions: {
 *     aiCompletion: { provider: myProvider, debounceMs: 300 },
 *   },
 * });
 * ```
 *
 * Pass `false` or omit to disable (disabled by default).
 * ```ts
 * extensions: { aiCompletion: false }
 * ```
 */
export interface AiCompletionConfig {
    /**
     * REQUIRED unless `transformersJs` is set.
     * The completion provider that calls your AI backend.
     */
    provider?: AiCompletionProvider;

    /**
     * Milliseconds to wait after the user stops typing before
     * requesting a completion.
     *
     * @default 500
     */
    debounceMs?: number;

    /**
     * Maximum number of characters to send as context to the
     * provider, extracted from before the cursor position.
     *
     * @default 4000
     */
    maxContextChars?: number;

    /**
     * Whether clicking on the ghost text accepts the suggestion.
     *
     * @default true
     */
    acceptOnClick?: boolean;

    /**
     * Show inline accept/reject hint buttons next to the ghost text.
     *
     * @default false
     */
    showAcceptReject?: boolean;

    /**
     * Whether to register default keybindings (Tab to accept, Escape to dismiss).
     * Set to false if you handle these yourself.
     *
     * @default true
     */
    defaultKeymap?: boolean;

    /**
     * Use the built-in Transformers.js provider for fully-local AI completion.
     *
     * When set to `true`, uses Qwen2.5-0.5B-Instruct with q4 quantization
     * running entirely in the browser (WebGPU or WASM fallback).
     *
     * When set to a config object, you can customize the model, dtype, etc.
     *
     * The model is downloaded on first use (~750MB) and cached in the browser.
     * This overrides any manually-provided `provider`.
     *
     * @default undefined
     */
    transformersJs?: boolean | import('./transformers-provider').TransformersJsAiConfig;
}
