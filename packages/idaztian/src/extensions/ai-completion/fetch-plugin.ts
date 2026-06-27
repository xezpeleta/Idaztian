/**
 * AI Inline Completion — Fetch Plugin
 *
 * ViewPlugin that listens for document changes, debounces,
 * extracts context, calls the provider, and dispatches
 * the result as a StateEffect.
 */

import { ViewPlugin, type ViewUpdate } from '@codemirror/view';
import type { AiCompletionProvider } from './types';
import { AiCompletionEffect, AiCompletionClearEffect } from './state';

/**
 * Extract the text context before the cursor.
 */
function extractContext(
    doc: string,
    cursorPos: number,
    maxChars: number,
): string {
    const start = Math.max(0, cursorPos - maxChars);
    return doc.slice(start, cursorPos);
}

/**
 * Clean up the completion text returned by the provider.
 * - Trim leading newlines only (keep inline space for natural cursor adjacency)
 * - Trim trailing whitespace
 * - Handle null/empty
 */
function cleanCompletion(text: string | null): string | null {
    if (!text) return null;
    // Remove only leading newlines; keep inline space/tabs that
    // naturally follow the cursor position.
    const cleaned = text.replace(/^[\n\r]+/, '').replace(/\s+$/, '');
    return cleaned.length > 0 ? cleaned : null;
}

/**
 * Create the fetch plugin.
 *
 * Listens for document changes and triggers debounced
 * completion requests to the provider.
 */
export function createFetchPlugin(
    provider: AiCompletionProvider,
    debounceMs: number,
    maxContextChars: number,
) {
    return ViewPlugin.fromClass(
        class FetchPlugin {
            controller: AbortController | null = null;
            debounceTimer: ReturnType<typeof setTimeout> | null = null;

            update(update: ViewUpdate) {
                // Only react to document changes
                if (!update.docChanged) return;

                // Don't fetch if the editor is read-only
                if (update.state.readOnly) return;

                // Don't fetch on empty documents
                if (update.state.doc.length === 0) {
                    this.clearPending();
                    return;
                }

                // Cancel any in-flight request and pending timer
                this.cancel();

                // Start debounce timer
                this.debounceTimer = setTimeout(() => {
                    this.fetch(update);
                }, debounceMs);
            }

            destroy() {
                this.cancel();
            }

            cancel() {
                if (this.debounceTimer) {
                    clearTimeout(this.debounceTimer);
                    this.debounceTimer = null;
                }
                if (this.controller) {
                    this.controller.abort();
                    this.controller = null;
                }
            }

            clearPending() {
                this.cancel();
                // Dispatch a clear effect via the current view if available
                // This is best-effort; the plugin lifecyle handles it
            }

            async fetch(update: ViewUpdate) {
                const doc = update.state.doc.toString();
                const cursorPos = update.state.selection.main.head;
                const context = extractContext(doc, cursorPos, maxContextChars);

                // Don't fetch if context is empty
                if (!context.trim()) return;

                this.controller = new AbortController();
                const signal = this.controller.signal;

                // Snapshot the document at request time for staleness check
                const docSnapshot = update.state.doc;

                try {
                    const raw = await provider.fetchCompletion(context, signal);
                    const suggestion = cleanCompletion(raw);

                    // Don't dispatch if we were cancelled or destroyed
                    if (signal.aborted) return;

                    update.view.dispatch({
                        effects: AiCompletionEffect.of({
                            suggestion,
                            doc: docSnapshot,
                        }),
                    });
                } catch (err) {
                    if ((err as Error).name === 'AbortError') {
                        // Expected — user typed before response arrived
                        return;
                    }
                    // Log real errors but don't crash
                    console.warn(
                        '[Idaztian AI Completion] Fetch failed:',
                        err,
                    );
                    // Clear the suggestion on error
                    update.view.dispatch({
                        effects: AiCompletionClearEffect.of(null),
                    });
                } finally {
                    // Controller cleanup handled in cancel()
                }
            }
        },
    );
}
