import { Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { isCursorInNodeLines } from '../../utils/cursor';

/**
 * Live-preview extension for ATX headings (# H1 through ###### H6).
 *
 * Behavior:
 * - Always: applies heading size/style CSS class to the heading line
 * - Cursor away from line: hides the `# ` prefix marker
 * - Cursor on line: shows the `# ` prefix marker
 */

const headingMark = Decoration.mark({ class: 'idz-heading-marker' });

function buildHeadingDecorations(view: EditorView): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    const state = view.state;

    for (const { from, to } of view.visibleRanges) {
        syntaxTree(state).iterate({
            from,
            to,
            enter(node) {
                const level = getHeadingLevel(node.name);
                if (level === 0) return;

                const cursorAway = !isCursorInNodeLines(state, node.from, node.to);
                const line = state.doc.lineAt(node.from);

                // Find the end of the `# ` prefix (hashes + space)
                const lineText = line.text;
                const hashMatch = lineText.match(/^(#{1,6})\s/);
                if (!hashMatch) return;

                const hashEnd = line.from + hashMatch[0].length;

                // Always apply heading style to the whole line
                decorations.push(
                    Decoration.mark({ class: `idz-h${level}` }).range(node.from, node.to)
                );

                // Hide the hash prefix when cursor is away
                if (cursorAway) {
                    decorations.push(
                        Decoration.replace({ class: 'idz-heading-marker' }).range(node.from, hashEnd)
                    );
                } else {
                    // Show the marker styled but visible
                    decorations.push(headingMark.range(node.from, hashEnd));
                }
            },
        });
    }

    // Sort decorations by from position (required by CM6)
    decorations.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);
    return Decoration.set(decorations, true);
}

function getHeadingLevel(nodeName: string): number {
    const map: Record<string, number> = {
        ATXHeading1: 1,
        ATXHeading2: 2,
        ATXHeading3: 3,
        ATXHeading4: 4,
        ATXHeading5: 5,
        ATXHeading6: 6,
    };
    return map[nodeName] ?? 0;
}

const headingsPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildHeadingDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.selectionSet || update.viewportChanged) {
                this.decorations = buildHeadingDecorations(update.view);
            }
        }
    },
    { decorations: (v) => v.decorations }
);

export function headingsExtension() {
    return [headingsPlugin];
}
