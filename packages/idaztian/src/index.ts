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
export type { IdaztianConfig, IdaztianExtensionConfig } from './config';
export type { IdaztianEventMap } from './events';
