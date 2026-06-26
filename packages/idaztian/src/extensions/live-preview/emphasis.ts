import { Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { isCursorInRange } from '../../utils/cursor';
import { hideRange, showMarker } from '../../utils/decoration';

/**
 * Live-preview extension for emphasis: bold, italic, strikethrough.
 *
 * Behavior:
 * - Always: applies bold/italic CSS styling
 * - Cursor away: hides the `**`, `*`, `~~` delimiter markers
 *   (invisible but space-preserving — no cursor column drift)
 * - Cursor on element: shows the delimiter markers
 */

function buildEmphasisDecorations(view: EditorView): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    const state = view.state;

    for (const { from, to } of view.visibleRanges) {
        syntaxTree(state).iterate({
            from,
            to,
            enter(node) {
                // Bold+Italic: ***text***
                if (node.name === 'StrongEmphasis' || node.name === 'Emphasis') {
                    const text = state.sliceDoc(node.from, node.to);
                    const cursorOn = isCursorInRange(state, node.from, node.to);

                    // Determine delimiter length from the actual syntax, not assumptions.
                    // This handles cases like **bold** (2) and ___italic___ (3) correctly.
                    let delimLen = 0;
                    if (/^\*{1,3}/.test(text)) {
                        delimLen = (text.match(/^\*{1,3}/) as RegExpMatchArray)[0].length;
                    } else if (/^_{1,3}/.test(text)) {
                        delimLen = (text.match(/^_{1,3}/) as RegExpMatchArray)[0].length;
                    } else {
                        delimLen = node.name === 'StrongEmphasis' ? 2 : 1;
                    }

                    const openFrom = node.from;
                    const openTo = node.from + delimLen;
                    const closeFrom = node.to - delimLen;
                    const closeTo = node.to;

                    const cssClass =
                        delimLen === 3
                            ? 'idz-bold-italic'
                            : node.name === 'StrongEmphasis'
                                ? 'idz-bold'
                                : 'idz-italic';

                    // Always style the content (bold/italic visual)
                    decorations.push(
                        Decoration.mark({ class: cssClass }).range(node.from, node.to)
                    );

                    if (!cursorOn) {
                        // Hide delimiters — space-preserving (no Decoration.replace!)
                        decorations.push(hideRange(openFrom, openTo));
                        if (closeFrom > openTo) {
                            decorations.push(hideRange(closeFrom, closeTo));
                        }
                    } else {
                        // Show delimiters styled
                        decorations.push(showMarker(openFrom, openTo));
                        if (closeFrom > openTo) {
                            decorations.push(showMarker(closeFrom, closeTo));
                        }
                    }
                }

                // Strikethrough: ~~text~~
                if (node.name === 'Strikethrough') {
                    const cursorOn = isCursorInRange(state, node.from, node.to);
                    const delimLen = 2;
                    const openFrom = node.from;
                    const openTo = node.from + delimLen;
                    const closeFrom = node.to - delimLen;
                    const closeTo = node.to;

                    decorations.push(
                        Decoration.mark({ class: 'idz-strikethrough' }).range(node.from, node.to)
                    );

                    if (!cursorOn) {
                        decorations.push(hideRange(openFrom, openTo));
                        if (closeFrom > openTo) {
                            decorations.push(hideRange(closeFrom, closeTo));
                        }
                    } else {
                        decorations.push(showMarker(openFrom, openTo));
                        if (closeFrom > openTo) {
                            decorations.push(showMarker(closeFrom, closeTo));
                        }
                    }
                }
            },
        });
    }

    decorations.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);
    return Decoration.set(decorations, true);
}

const emphasisPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildEmphasisDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.selectionSet || update.viewportChanged) {
                this.decorations = buildEmphasisDecorations(update.view);
            }
        }
    },
    { decorations: (v) => v.decorations }
);

export function emphasisExtension() {
    return [emphasisPlugin];
}
