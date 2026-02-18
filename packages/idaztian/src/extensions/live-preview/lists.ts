import { Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { isCursorInNodeLines } from '../../utils/cursor';

/**
 * Live-preview extension for bullet and ordered lists.
 *
 * Behavior:
 * - Bullet lists: replace `-`/`*`/`+` marker with a rendered bullet dot when cursor is away
 * - Ordered lists: style the `1.` marker when cursor is away
 * - Task lists: render `[ ]` / `[x]` as checkboxes
 * - Cursor on the list item line: show raw marker
 */

class BulletWidget extends WidgetType {
    toDOM(): HTMLElement {
        const span = document.createElement('span');
        span.className = 'idz-bullet';
        span.textContent = '•';
        span.setAttribute('aria-hidden', 'true');
        return span;
    }
    eq(): boolean { return true; }
    ignoreEvent(): boolean { return false; }
}

class CheckboxWidget extends WidgetType {
    constructor(private readonly checked: boolean) { super(); }

    toDOM(): HTMLElement {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'idz-checkbox';
        input.checked = this.checked;
        input.setAttribute('aria-label', this.checked ? 'Done' : 'To do');
        return input;
    }

    eq(other: CheckboxWidget): boolean { return other.checked === this.checked; }
    ignoreEvent(): boolean { return false; }
}

function buildListDecorations(view: EditorView): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    const state = view.state;

    for (const { from, to } of view.visibleRanges) {
        syntaxTree(state).iterate({
            from,
            to,
            enter(node) {
                // ListItem contains the marker
                if (node.name === 'ListItem') {
                    const line = state.doc.lineAt(node.from);
                    const lineText = line.text;
                    const cursorAway = !isCursorInNodeLines(state, node.from, node.from);

                    // Task list: - [ ] or - [x]
                    const taskMatch = lineText.match(/^(\s*[-*+]\s+)\[([ xX])\]\s/);
                    if (taskMatch) {
                        const markerStart = line.from;
                        const checkboxStart = line.from + taskMatch[1].length;
                        const checkboxEnd = checkboxStart + 3; // `[ ]` or `[x]`
                        const checked = taskMatch[2].toLowerCase() === 'x';

                        if (cursorAway) {
                            // Hide the bullet marker
                            decorations.push(
                                Decoration.replace({ widget: new BulletWidget() }).range(markerStart, checkboxStart)
                            );
                            // Replace [ ] / [x] with checkbox widget
                            decorations.push(
                                Decoration.replace({ widget: new CheckboxWidget(checked) }).range(checkboxStart, checkboxEnd)
                            );
                        }
                        return;
                    }

                    // Bullet list: - item, * item, + item
                    const bulletMatch = lineText.match(/^(\s*)([-*+])(\s)/);
                    if (bulletMatch) {
                        const indent = bulletMatch[1].length;
                        const markerFrom = line.from + indent;
                        const markerTo = markerFrom + 1 + bulletMatch[3].length; // marker + space

                        if (cursorAway) {
                            decorations.push(
                                Decoration.replace({ widget: new BulletWidget() }).range(markerFrom, markerTo)
                            );
                        } else {
                            decorations.push(
                                Decoration.mark({ class: 'idz-marker' }).range(markerFrom, markerTo)
                            );
                        }
                        return;
                    }

                    // Ordered list: 1. item
                    const orderedMatch = lineText.match(/^(\s*)(\d+\.)(\s)/);
                    if (orderedMatch) {
                        const indent = orderedMatch[1].length;
                        const markerFrom = line.from + indent;
                        const markerTo = markerFrom + orderedMatch[2].length + orderedMatch[3].length;

                        if (cursorAway) {
                            decorations.push(
                                Decoration.mark({ class: 'idz-ordered-marker' }).range(markerFrom, markerTo)
                            );
                        } else {
                            decorations.push(
                                Decoration.mark({ class: 'idz-marker' }).range(markerFrom, markerTo)
                            );
                        }
                    }
                }
            },
        });
    }

    decorations.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);
    return Decoration.set(decorations, true);
}

const listsPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildListDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.selectionSet || update.viewportChanged) {
                this.decorations = buildListDecorations(update.view);
            }
        }
    },
    { decorations: (v) => v.decorations }
);

export function listsExtension() {
    return [listsPlugin];
}
