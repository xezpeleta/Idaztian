/**
 * AI Inline Completion — HuggingFace Inference API Provider
 *
 * Lightweight provider that calls the free HuggingFace Inference API
 * (text-generation task). No model download needed — works instantly
 * in any browser. Requires a free HuggingFace access token.
 *
 * The token is stored in localStorage under the given key, so users
 * only need to enter it once.
 */

import type { AiCompletionProvider } from './types';

/**
 * Configuration for the HuggingFace Inference API provider.
 */
export interface HuggingFaceInferenceConfig {
    /**
     * HuggingFace model ID for text generation.
     *
     * @default "HuggingFaceTB/SmolLM2-135M-Instruct"
     */
    modelId?: string;

    /**
     * Maximum new tokens per completion.
     *
     * @default 30
     */
    maxNewTokens?: number;

    /**
     * Generation temperature (0 = deterministic, higher = creative).
     *
     * @default 0.3
     */
    temperature?: number;

    /**
     * localStorage key for the HuggingFace access token.
     *
     * @default "hf_token"
     */
    tokenStorageKey?: string;

    /**
     * System prompt for the model.
     */
    systemPrompt?: string;

    /**
     * Optional callback to request a token from the user.
     * If not provided and no token is found, returns null for all completions.
     *
     * Should return the token or null if the user cancels.
     */
    onTokenRequired?: () => Promise<string | null>;

    /**
     * Called when the provider is ready (token is set).
     */
    onReady?: () => void;

    /**
     * Called when an error occurs.
     */
    onError?: (error: string) => void;
}

/**
 * Create an AiCompletionProvider backed by HuggingFace's free Inference API.
 *
 * This is ideal for the GitHub Pages demo because:
 * - No model download (~30MB+) required
 * - No CORS issues (HF Inference API allows browser requests)
 * - Works instantly once the user enters a free HF token
 * - Zero-cost (free tier, rate-limited)
 *
 * @param config - Provider configuration.
 * @returns An AiCompletionProvider.
 *
 * @example
 * ```ts
 * import { createHuggingFaceInferenceProvider } from 'idaztian';
 *
 * const provider = createHuggingFaceInferenceProvider({
 *   onTokenRequired: async () => prompt('Enter your HF token:'),
 * });
 * ```
 */
export function createHuggingFaceInferenceProvider(
    config: HuggingFaceInferenceConfig = {},
): AiCompletionProvider & { setToken(token: string): void; clearToken(): void } {
    const {
        modelId = 'HuggingFaceTB/SmolLM2-135M-Instruct',
        maxNewTokens = 30,
        temperature = 0.3,
        tokenStorageKey = 'hf_token',
        systemPrompt = 'You are a helpful writing assistant. Continue the text naturally in English. Output ONLY the continuation — no explanations, no greetings, no questions. Match the tone and style of the preceding text.',
        onTokenRequired,
        onReady,
        onError,
    } = config;

    let token_: string | null = null;
    let initialized = false;
    let requestingToken = false;

    async function getToken(): Promise<string | null> {
        // Return cached token
        if (token_) return token_;

        // Try localStorage
        try {
            const stored = localStorage.getItem(tokenStorageKey);
            if (stored) {
                token_ = stored;
                return token_;
            }
        } catch { /* localStorage unavailable */ }

        // Ask user
        if (onTokenRequired) {
            // Prevent concurrent token requests
            if (requestingToken) return null;
            requestingToken = true;
            try {
                const token = await onTokenRequired();
                if (token) {
                    token_ = token;
                    try { localStorage.setItem(tokenStorageKey, token); } catch { /* ignore */ }
                    onReady?.();
                    return token;
                }
                return null;
            } finally {
                requestingToken = false;
            }
        }

        return null;
    }

    /**
     * Set the API token programmatically (e.g., from a settings dialog).
     */
    function setToken(token: string): void {
        token_ = token;
        try { localStorage.setItem(tokenStorageKey, token); } catch { /* ignore */ }
        onReady?.();
    }

    /**
     * Clear the stored token.
     */
    function clearToken(): void {
        token_ = null;
        try { localStorage.removeItem(tokenStorageKey); } catch { /* ignore */ }
    }

    // Try to load token on construction
    getToken().then((t) => {
        if (t && !initialized) {
            initialized = true;
            onReady?.();
        }
    });

    return {
        setToken,
        clearToken,

        async fetchCompletion(context: string, _signal: AbortSignal): Promise<string | null> {
            if (!context.trim()) return null;

            const token = await getToken();
            if (!token) return null;

            const messages = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: context },
            ];

            try {
                const response = await fetch(
                    `https://api-inference.huggingface.co/models/${modelId}/v1/chat/completions`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            messages,
                            max_tokens: maxNewTokens,
                            temperature,
                            stream: false,
                        }),
                    },
                );

                if (!response.ok) {
                    const body = await response.text();
                    const errMsg = `HF API error ${response.status}: ${body.slice(0, 200)}`;
                    onError?.(errMsg);

                    // If unauthorized, clear the bad token
                    if (response.status === 401 || response.status === 403) {
                        clearToken();
                    }
                    return null;
                }

                const data = await response.json();
                const raw = data?.choices?.[0]?.message?.content || '';
                if (!raw) return null;

                // Strip leading whitespace/newlines for clean inline completion
                let cleaned = raw.replace(/^[\n\r\s]+/, '').trimEnd();
                if (cleaned.length === 0) return null;

                return cleaned;
            } catch (err) {
                onError?.((err as Error).message || String(err));
                return null;
            }
        },
    };
}
