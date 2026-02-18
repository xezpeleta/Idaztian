import { Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { isCursorInNodeLines } from '../../utils/cursor';

/**
 * Live-preview extension for horizontal rules (thematic breaks).
 *
 * Behavior:
 * - Cursor away: applies a CSS class that renders the line as an <hr>-like
 *   visual using CSS (display:none + ::before pseudo-element trick via line deco)
 * - Cursor on line: shows raw syntax
 *
 * NOTE: Decoration.replace() with block:true must NOT be used in ViewPlugins
 * because it can span line breaks. We use Decoration.line() instead.
 */


function buildHrDecorations(view: EditorView): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    const state = view.state;

    for (const { from, to } of view.visibleRanges) {
        syntaxTree(state).iterate({
            from,
            to,
            enter(node) {
                if (node.name === 'HorizontalRule') {
                    const cursorAway = !isCursorInNodeLines(state, node.from, node.to);
                    const line = state.doc.lineAt(node.from);

                    if (cursorAway) {
                        // Use a line decoration to hide the text and show the HR via CSS
                        decorations.push(
                            Decoration.line({ class: 'idz-hr-line' }).range(line.from, line.from)
                        );
                    } else {
                        decorations.push(
                            Decoration.mark({ class: 'idz-hr-syntax' }).range(node.from, node.to)
                        );
                    }
                }
            },
        });
    }

    decorations.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);
    return Decoration.set(decorations, true);
}

const hrPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildHrDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.selectionSet || update.viewportChanged) {
                this.decorations = buildHrDecorations(update.view);
            }
        }
    },
    { decorations: (v) => v.decorations }
);

export function horizontalRulesExtension() {
    return [hrPlugin];
}
