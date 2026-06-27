/**
 * AI Inline Completion — Keymap
 *
 * Tab to accept, Escape to dismiss ghost text suggestions.
 */

import { Prec } from '@codemirror/state';
import { keymap, type EditorView } from '@codemirror/view';
import { AiCompletionState, AiCompletionClearEffect } from './state';

/**
 * Accept: insert the suggestion at cursor and move cursor to end.
 */
function accept(view: EditorView): boolean {
    const state = view.state.field(AiCompletionState, false);
    if (!state || !state.suggestion) return false;

    const cursor = view.state.selection.main.head;
    const suggestion = state.suggestion;

    view.dispatch({
        changes: { from: cursor, insert: suggestion },
        selection: { anchor: cursor + suggestion.length },
    });

    return true;
}

/**
 * Dismiss: clear the current suggestion.
 */
function dismiss(view: EditorView): boolean {
    const state = view.state.field(AiCompletionState, false);
    if (!state || !state.suggestion) return false;

    view.dispatch({
        effects: AiCompletionClearEffect.of(null),
    });

    return true;
}

/**
 * Keybindings for ghost text interaction.
 *
 * `Prec.highest` ensures these bindings take priority
 * over indentation and other Tab/Escape handlers when
 * a suggestion is active.
 */
export const aiCompletionKeymap = Prec.highest(
    keymap.of([
        {
            key: 'Tab',
            run: accept,
        },
        {
            key: 'Escape',
            run: dismiss,
        },
    ]),
);
