/**
 * AI Inline Completion — Transformers.js Provider
 *
 * Optional built-in provider that runs text completion entirely
 * in the browser using Transformers.js and ONNX Runtime (WebGPU/WASM).
 *
 * This is a standalone module — it dynamically imports Transformers.js
 * only when the user opts in, keeping the core library size small.
 */

import type { AiCompletionProvider } from './types';

/**
 * Configuration for the built-in Transformers.js provider.
 */
export interface TransformersJsAiConfig {
    /**
     * HuggingFace model ID to use for text generation.
     *
     * @default "onnx-community/Qwen2.5-0.5B-Instruct"
     */
    modelId?: string;

    /**
     * Quantization data type.
     * - 'q4' (~750MB) — 4-bit weights, fp32 activations (most compatible)
     * - 'q4f16' (~500MB) — 4-bit weights, fp16 activations (may crash on WASM)
     * - 'fp16' (~1GB) — best quality, largest download (may crash on WASM)
     *
     * NOTE: 'q4f16' and 'fp16' can cause ONNX Runtime crashes in browsers
     * due to a known graph optimization bug (see transformers.js #1698).
     * Use 'q4' for browser compatibility.
     *
     * @default "q4"
     */
    dtype?: 'q4' | 'q4f16' | 'fp16';

    /**
     * Device to use for inference.
     * - 'webgpu' — fastest, requires WebGPU support
     * - 'wasm' — CPU fallback, slower but universally available
     *
     * @default "webgpu"
     */
    device?: 'webgpu' | 'wasm';

    /**
     * Maximum new tokens to generate per completion.
     *
     * @default 40
     */
    maxNewTokens?: number;

    /**
     * Generation temperature (0 = deterministic, higher = more creative).
     *
     * @default 0.3
     */
    temperature?: number;

    /**
     * System prompt prepended to every completion request.
     * Use this to guide the model's behavior.
     *
     * @default "You are a concise writing assistant. Your task is to continue the provided text naturally. Output ONLY the continuation — never add explanations, greetings, or commentary. Match the tone, style, and language of the preceding text exactly."
     */
    systemPrompt?: string;

    /**
     * Called with progress updates during model loading (0-100).
     * Use this to show a loading indicator to the user.
     */
    onProgress?: (progress: number, status: string) => void;

    /**
     * Called when the model has finished loading and is ready.
     */
    onReady?: () => void;

    /**
     * Called when the model fails to load with an error message.
     */
    onError?: (error: string) => void;
}

/** Internal state for the lazy-loaded Transformers.js pipeline. */
interface TransformersState {
    generator: any | null;
    loading: boolean;
    ready: boolean;
    loadPromise: Promise<any> | null;
    error: string | null;
}

const state: TransformersState = {
    generator: null,
    loading: false,
    ready: false,
    loadPromise: null,
    error: null,
};

/**
 * Strip the instruction prompt prefix from model output.
 * Instruct models sometimes repeat part of the prompt or add
 * a system-like prefix. We strip everything before the actual
 * continuation.
 */
function cleanOutput(raw: string, context: string): string | null {
    if (!raw) return null;

    // Remove the context/prompt prefix from the output
    let cleaned = raw;

    // If output starts with the context, remove it
    if (cleaned.startsWith(context)) {
        cleaned = cleaned.slice(context.length);
    }

    // Strip leading newlines but keep inline spaces
    cleaned = cleaned.replace(/^[\n\r]+/, '').trimEnd();

    // Don't return empty strings
    if (cleaned.length === 0) return null;

    return cleaned;
}

/**
 * Check if WebGPU is available in the current browser.
 */
function isWebGPUAvailable(): boolean {
    try {
        return typeof navigator !== 'undefined' && 'gpu' in navigator;
    } catch {
        return false;
    }
}

/**
 * Create an AiCompletionProvider backed by Transformers.js.
 *
 * The model is lazy-loaded on the first completion request, so the
 * initial download happens only when the user actually types.
 *
 * @param config - Model and generation configuration.
 * @returns An AiCompletionProvider ready to use with aiCompletion().
 *
 * @example
 * ```ts
 * import { createTransformersJsProvider } from 'idaztian';
 *
 * const provider = createTransformersJsProvider({
 *   modelId: 'onnx-community/Qwen2.5-0.5B-Instruct',
 *   dtype: 'q4',
 *   onProgress: (pct, status) => console.log(`${pct}%: ${status}`),
 *   onReady: () => console.log('Model ready!'),
 * });
 * ```
 */
export function createTransformersJsProvider(
    config: TransformersJsAiConfig = {},
): AiCompletionProvider & { preload(): Promise<void> } {
    const {
        modelId = 'onnx-community/Qwen2.5-0.5B-Instruct',
        dtype: preferredDtype = 'q4',
        device: preferredDevice,
        maxNewTokens = 40,
        temperature = 0.3,
        systemPrompt = 'You are a concise writing assistant. Your task is to continue the provided text naturally. Output ONLY the continuation — never add explanations, greetings, or commentary. Match the tone, style, and language of the preceding text exactly.',
        onProgress,
        onReady,
        onError,
    } = config;

    // Auto-detect best device
    const device = preferredDevice ?? (isWebGPUAvailable() ? 'webgpu' : 'wasm');

    /**
     * Dynamically import Transformers.js and initialize the pipeline.
     * Called lazily on first use.
     */
    async function loadModel(): Promise<any> {
        if (state.generator) return state.generator;
        if (state.error) throw new Error(state.error);

        if (state.loadPromise) {
            // Model is already loading — wait for it
            return state.loadPromise;
        }

        state.loading = true;

        try {
            // Dynamic import — only loads Transformers.js when needed
            const { pipeline } = await import('@huggingface/transformers');

            state.generator = await pipeline(
                'text-generation',
                modelId,
                {
                    device,
                    dtype: preferredDtype,
                    progress_callback: (progress: any) => {
                        if (progress.status === 'progress' && onProgress) {
                            const pct = Math.round((progress.loaded / progress.total) * 100);
                            onProgress(pct, `Loading model... ${pct}%`);
                        }
                    },
                },
            );

            state.ready = true;
            state.loading = false;
            onReady?.();
            return state.generator;
        } catch (err) {
            state.loading = false;
            const msg = (err as Error).message || String(err);
            state.error = msg;
            onError?.(msg);
            throw err;
        }
    }

    return {
        /**
         * Preload the model without waiting for a completion request.
         * Call this when the user enables AI to start the download early.
         */
        async preload(): Promise<void> {
            await loadModel();
        },

        async fetchCompletion(context: string, _signal: AbortSignal): Promise<string | null> {
            // Quick guard: don't try to complete empty/whitespace context
            if (!context.trim()) return null;

            try {
                const generator = await loadModel();
                if (!generator) return null;

                const messages = [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: context },
                ];

                // Transformers.js v3+ automatically applies the model's
                // chat template (e.g., Qwen's <|im_start|> format)
                const result = await generator(messages, {
                    max_new_tokens: maxNewTokens,
                    temperature,
                    do_sample: temperature > 0,
                });

                // With messages input, v3+ returns an array with the
                // assistant message at the end
                const outMessages = (result as any)[0];
                const raw = outMessages?.generated_text?.at(-1)?.content || '';
                return cleanOutput(raw, context);
            } catch {
                return null;
            }
        },
    };
}

/**
 * Get the current state of the Transformers.js provider.
 * Useful for showing loading/ready/error UI.
 */
export function getTransformersJsState(): {
    loading: boolean;
    ready: boolean;
    error: string | null;
} {
    return {
        loading: state.loading,
        ready: state.ready,
        error: state.error,
    };
}
