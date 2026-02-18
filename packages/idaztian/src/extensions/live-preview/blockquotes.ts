import { Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { isCursorInNodeLines } from '../../utils/cursor';

/**
 * Live-preview extension for blockquotes.
 *
 * Behavior:
 * - Cursor away from the blockquote: hides `> ` prefix on each line,
 *   applies blockquote styling
 * - Cursor on any line of the blockquote: shows `> ` prefix, keeps styling
 *
 * NOTE: Decoration.replace() is only used within a single line (the `> ` prefix),
 * so it never spans line breaks — safe for ViewPlugins.
 */

function buildBlockquoteDecorations(view: EditorView): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    const state = view.state;

    for (const { from, to } of view.visibleRanges) {
        syntaxTree(state).iterate({
            from,
            to,
            enter(node) {
                if (node.name === 'Blockquote') {
                    // Is the cursor anywhere in this blockquote block?
                    const cursorOnBlock = isCursorInNodeLines(state, node.from, node.to);

                    // Apply blockquote line decoration to each line in the block
                    let pos = node.from;
                    while (pos <= node.to) {
                        const line = state.doc.lineAt(pos);
                        if (line.from > node.to) break;

                        const lineText = line.text;
                        const markerMatch = lineText.match(/^(\s*>+\s?)/);
                        if (markerMatch) {
                            const markerEnd = line.from + markerMatch[0].length;

                            // Apply blockquote line style
                            decorations.push(
                                Decoration.line({ class: 'idz-blockquote-line' }).range(line.from, line.from)
                            );

                            if (!cursorOnBlock) {
                                // Hide the `> ` marker — stays within the line, safe
                                decorations.push(
                                    Decoration.replace({ class: 'idz-bq-marker' }).range(line.from, markerEnd)
                                );
                            } else {
                                decorations.push(
                                    Decoration.mark({ class: 'idz-marker' }).range(line.from, markerEnd)
                                );
                            }
                        }

                        pos = line.to + 1;
                    }
                    return false;
                }
            },
        });
    }

    decorations.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);
    return Decoration.set(decorations, true);
}

const blockquotesPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildBlockquoteDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.selectionSet || update.viewportChanged) {
                this.decorations = buildBlockquoteDecorations(update.view);
            }
        }
    },
    { decorations: (v) => v.decorations }
);

export function blockquotesExtension() {
    return [blockquotesPlugin];
}
