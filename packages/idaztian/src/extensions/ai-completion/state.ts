/**
 * AI Inline Completion — State
 *
 * StateField that holds the currently active ghost text suggestion
 * and the document snapshot at the time of the request.
 */

import { StateField, StateEffect, type Text } from '@codemirror/state';

/**
 * Internal state value: the ghost text and the document
 * that was current when the completion was requested.
 */
export interface AiCompletionStateValue {
    /** The ghost-text suggestion to display, or null if none is active. */
    suggestion: string | null;
    /**
     * Snapshot of the document text at the time the completion was
     * requested. If the doc has changed by the time the completion
     * arrives, the suggestion is discarded.
     */
    doc: Text | null;
}

/**
 * StateEffect dispatched when a completion arrives from the provider.
 */
export const AiCompletionEffect = StateEffect.define<{
    /** The completion text, or null to clear. */
    suggestion: string | null;
    /** The document snapshot this completion was requested for. */
    doc: Text;
}>();

/**
 * StateEffect to explicitly dismiss the current suggestion
 * (used by Escape key, etc.).
 */
export const AiCompletionClearEffect = StateEffect.define();

/**
 * Tracks the active ghost text suggestion.
 *
 * The suggestion is cleared whenever:
 * - The document changes (user typed or deleted text)
 * - The selection changes
 * - A clear effect is dispatched
 */
export const AiCompletionState = StateField.define<AiCompletionStateValue>({
    create(): AiCompletionStateValue {
        return { suggestion: null, doc: null };
    },

    update(value, tr): AiCompletionStateValue {
        // Check for explicit clear effect
        const clearEffect = tr.effects.find(e =>
            e.is(AiCompletionClearEffect)
        );
        if (clearEffect) {
            return { suggestion: null, doc: null };
        }

        // Check for incoming completion effect
        const completionEffect = tr.effects.find(e =>
            e.is(AiCompletionEffect)
        );
        if (completionEffect) {
            // Only accept the suggestion if the document hasn't changed
            // since the completion was requested
            if (completionEffect.value.doc === tr.state.doc) {
                return {
                    suggestion: completionEffect.value.suggestion,
                    doc: completionEffect.value.doc,
                };
            }
            return { suggestion: null, doc: null };
        }

        // If the document changed or selection moved, clear the suggestion
        if (tr.docChanged || tr.selection) {
            return { suggestion: null, doc: null };
        }

        // Otherwise, keep the current value (handles transactions from
        // other plugins that don't affect our logic)
        return value;
    },
});
