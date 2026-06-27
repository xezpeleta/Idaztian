/**
 * Idaztian Framework — Public API
 *
 * @example
 * ```ts
 * import { IdaztianEditor } from 'idaztian';
 *
 * const editor = new IdaztianEditor({
 *   parent: document.getElementById('editor'),
 *   initialContent: '# Hello World',
 * });
 * ```
 */

export { IdaztianEditor } from './editor';
export { aiCompletion, createTransformersJsProvider, getTransformersJsState, createHuggingFaceInferenceProvider } from './extensions/ai-completion';
export type { IdaztianConfig, IdaztianExtensionConfig } from './config';
export type { IdaztianEventMap } from './events';
export type { AiCompletionProvider, AiCompletionConfig } from './extensions/ai-completion/types';
export type { TransformersJsAiConfig } from './extensions/ai-completion/transformers-provider';
export type { HuggingFaceInferenceConfig } from './extensions/ai-completion/huggingface-inference-provider';
