/**
 * AI Inline Completion — Render Plugin
 *
 * ViewPlugin that reads the AiCompletionState and
 * creates DecorationSets for ghost text rendering.
 */

import {
    Decoration,
    type DecorationSet,
    ViewPlugin,
    type ViewUpdate,
    type EditorView,
} from '@codemirror/view';
import { AiCompletionState, AiCompletionClearEffect, AiCompletionEffect } from './state';
import { GhostTextWidget, AcceptRejectWidget } from './decorations';

/**
 * Accept the current suggestion: insert it into the document
 * and move the cursor to the end of the inserted text.
 */
function acceptSuggestion(view: EditorView): boolean {
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
 * Reject/dismiss the current suggestion.
 */
function rejectSuggestion(view: EditorView): boolean {
    const state = view.state.field(AiCompletionState, false);
    if (!state || !state.suggestion) return false;

    view.dispatch({
        effects: AiCompletionClearEffect.of(null),
    });

    return true;
}

/**
 * Create the render plugin.
 *
 * Provides a DecorationSet that renders the ghost text
 * and optional accept/reject buttons.
 */
export function createRenderPlugin(
    acceptOnClick: boolean,
    showAcceptReject: boolean,
) {
    return ViewPlugin.fromClass(
        class RenderPlugin {
            decorations: DecorationSet;

            constructor(view: EditorView) {
                this.decorations = this.buildDecorations(view);
            }

            update(update: ViewUpdate) {
                // Rebuild decorations when state or viewport changes
                if (
                    update.viewportChanged ||
                    update.docChanged ||
                    update.selectionSet ||
                    this.needsUpdate(update)
                ) {
                    this.decorations = this.buildDecorations(update.view);
                }
            }

            needsUpdate(update: ViewUpdate): boolean {
                // Check if the AiCompletionState effect was dispatched
                return update.transactions.some(tr =>
                    tr.effects.some(
                        e =>
                            e.is(AiCompletionEffect) ||
                            e.is(AiCompletionClearEffect),
                    ),
                );
            }

            buildDecorations(view: EditorView): DecorationSet {
                const state = view.state.field(AiCompletionState, false);
                if (!state || !state.suggestion) {
                    return Decoration.none;
                }

                const cursor = view.state.selection.main.head;
                const decos: { from: number; to: number; value: Decoration }[] = [];

                // Ghost text widget at cursor position
                decos.push({
                    from: cursor,
                    to: cursor,
                    value: Decoration.widget({
                        widget: new GhostTextWidget(
                            state.suggestion,
                            acceptSuggestion,
                            acceptOnClick,
                        ),
                        side: 1, // After the cursor position
                    }),
                });

                // Optional accept/reject buttons
                if (showAcceptReject) {
                    decos.push({
                        from: cursor,
                        to: cursor,
                        value: Decoration.widget({
                            widget: new AcceptRejectWidget(
                                acceptSuggestion,
                                rejectSuggestion,
                            ),
                            side: 1,
                        }),
                    });
                }

                return Decoration.set(decos, true);
            }
        },
        {
            decorations: (v) => v.decorations,
        },
    );
}
