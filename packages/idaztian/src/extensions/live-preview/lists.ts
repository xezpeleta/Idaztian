import { Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

/**
 * Live-preview extension for bullet and ordered lists.
 *
 * Behavior:
 * - Bullet lists: replace `-`/`*`/`+` marker with a rendered bullet dot,
 *   UNLESS the cursor is adjacent to (within) the marker characters themselves.
 * - Ordered lists: style the `1.` marker; show raw when cursor is on it.
 * - Task lists: render `[ ]` / `[x]` as checkboxes.
 *
 * "Adjacent to marker" means the cursor head is within [markerFrom, markerTo].
 * Moving anywhere else on the line keeps the bullet rendered.
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

/**
 * Returns true if the cursor head is within [markerFrom, markerTo] (inclusive).
 * This is the "adjacent to marker" check — only reveal raw syntax when the
 * cursor is actually on the marker characters, not just anywhere on the line.
 */
function isCursorOnMarker(view: EditorView, markerFrom: number, markerTo: number): boolean {
    const head = view.state.selection.main.head;
    return head >= markerFrom && head <= markerTo;
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

                    // Task list: - [ ] or - [x]
                    const taskMatch = lineText.match(/^(\s*[-*+]\s+)\[([ xX])\]\s/);
                    if (taskMatch) {
                        const markerStart = line.from;
                        const checkboxStart = line.from + taskMatch[1].length;
                        const checkboxEnd = checkboxStart + 3; // `[ ]` or `[x]`
                        const checked = taskMatch[2].toLowerCase() === 'x';
                        const cursorOnMarker = isCursorOnMarker(view, markerStart, checkboxEnd);

                        if (!cursorOnMarker) {
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
                        const markerTo = markerFrom + 1 + bulletMatch[3].length; // marker char + space
                        const cursorOnMarker = isCursorOnMarker(view, markerFrom, markerTo);

                        if (!cursorOnMarker) {
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
                        const cursorOnMarker = isCursorOnMarker(view, markerFrom, markerTo);

                        if (!cursorOnMarker) {
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
