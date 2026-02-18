import { Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

/**
 * Live-preview extension for bullet and ordered lists.
 *
 * Marker visibility rule (applies to ALL list types):
 *   Show raw markdown syntax ONLY when the cursor is directly adjacent to
 *   (i.e. within) the marker characters — no spaces tolerance.
 *   Moving anywhere else on the line keeps the rendered widget.
 *
 * Checkbox:
 *   - Rendered as a real <input type="checkbox"> when cursor is away from `[ ]`/`[x]`
 *   - Clicking the checkbox toggles the underlying `[ ]` ↔ `[x]` in the document
 *   - Show raw `[ ]`/`[x]` only when cursor is within those exact characters
 */

// ── Widgets ──────────────────────────────────────────────────────────────────

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
    constructor(
        private readonly checked: boolean,
        private readonly from: number, // position of `[` in the document
        private readonly to: number,   // position after `]`
    ) { super(); }

    toDOM(view: EditorView): HTMLElement {
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'idz-checkbox';
        input.checked = this.checked;
        input.setAttribute('aria-label', this.checked ? 'Done' : 'To do');

        // Toggle [ ] ↔ [x] in the document on click
        input.addEventListener('mousedown', (e) => {
            e.preventDefault(); // prevent focus steal
        });
        input.addEventListener('click', (e) => {
            e.preventDefault();
            const replacement = this.checked ? '[ ]' : '[x]';
            view.dispatch(view.state.update({
                changes: { from: this.from, to: this.to, insert: replacement },
                userEvent: 'input',
            }));
        });

        return input;
    }

    eq(other: CheckboxWidget): boolean {
        return other.checked === this.checked && other.from === this.from;
    }
    ignoreEvent(): boolean { return false; }
}

// ── Cursor proximity check ────────────────────────────────────────────────────

/**
 * Returns true if the cursor head is within [markerFrom, markerTo] (inclusive).
 * "Within" means directly on the marker characters — no spaces tolerance.
 */
function isCursorOnMarker(view: EditorView, markerFrom: number, markerTo: number): boolean {
    const head = view.state.selection.main.head;
    return head >= markerFrom && head <= markerTo;
}

// ── Decoration builder ────────────────────────────────────────────────────────

function buildListDecorations(view: EditorView): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    const state = view.state;

    for (const { from, to } of view.visibleRanges) {
        syntaxTree(state).iterate({
            from,
            to,
            enter(node) {
                if (node.name !== 'ListItem') return;

                const line = state.doc.lineAt(node.from);
                const text = line.text;

                // ── Task list: - [ ] text  or  - [x] text ──────────────────
                const taskMatch = text.match(/^(\s*)([-*+])(\s+)(\[([ xX])\])(\s?)/);
                if (taskMatch) {
                    const indent = taskMatch[1].length;
                    const spaceBetween = taskMatch[3].length;
                    const checkboxStr = taskMatch[4]; // `[ ]` or `[x]`
                    const checked = taskMatch[5].toLowerCase() === 'x';
                    const trailingSpace = taskMatch[6].length;

                    // Bullet marker: the `-` character (and its trailing space)
                    const bulletFrom = line.from + indent;
                    const checkboxFrom = bulletFrom + 1 + spaceBetween;
                    const checkboxTo = checkboxFrom + checkboxStr.length;

                    const cursorOnBullet = isCursorOnMarker(view, bulletFrom, bulletFrom + 1);
                    const cursorOnCheckbox = isCursorOnMarker(view, checkboxFrom, checkboxTo);

                    if (!cursorOnBullet && !cursorOnCheckbox) {
                        // Render bullet as •
                        decorations.push(
                            Decoration.replace({ widget: new BulletWidget() })
                                .range(bulletFrom, checkboxFrom)
                        );
                        // Render checkbox as <input>
                        decorations.push(
                            Decoration.replace({
                                widget: new CheckboxWidget(checked, checkboxFrom, checkboxTo),
                            }).range(checkboxFrom, checkboxTo + trailingSpace)
                        );
                    } else if (cursorOnBullet) {
                        // Show raw bullet marker, render checkbox
                        decorations.push(
                            Decoration.mark({ class: 'idz-marker' }).range(bulletFrom, bulletFrom + 1)
                        );
                        decorations.push(
                            Decoration.replace({
                                widget: new CheckboxWidget(checked, checkboxFrom, checkboxTo),
                            }).range(checkboxFrom, checkboxTo + trailingSpace)
                        );
                    } else {
                        // cursorOnCheckbox: show raw [ ] / [x], render bullet as •
                        decorations.push(
                            Decoration.replace({ widget: new BulletWidget() })
                                .range(bulletFrom, checkboxFrom)
                        );
                        decorations.push(
                            Decoration.mark({ class: 'idz-marker' }).range(checkboxFrom, checkboxTo)
                        );
                    }

                    // Mark the bullet char for styling even when shown raw
                    if (cursorOnBullet) {
                        decorations.push(
                            Decoration.mark({ class: 'idz-marker' })
                                .range(bulletFrom, bulletFrom + 1)
                        );
                    }

                    return;
                }

                // ── Bullet list: - item, * item, + item ────────────────────
                const bulletMatch = text.match(/^(\s*)([-*+])(\s)/);
                if (bulletMatch) {
                    const indent = bulletMatch[1].length;
                    const markerFrom = line.from + indent;
                    const markerTo = markerFrom + 1; // just the `-` / `*` / `+` char
                    const markerWithSpaceTo = markerTo + bulletMatch[3].length;

                    const cursorOnMarker = isCursorOnMarker(view, markerFrom, markerTo);

                    if (!cursorOnMarker) {
                        decorations.push(
                            Decoration.replace({ widget: new BulletWidget() })
                                .range(markerFrom, markerWithSpaceTo)
                        );
                    } else {
                        decorations.push(
                            Decoration.mark({ class: 'idz-marker' })
                                .range(markerFrom, markerWithSpaceTo)
                        );
                    }
                    return;
                }

                // ── Ordered list: 1. item ──────────────────────────────────
                const orderedMatch = text.match(/^(\s*)(\d+\.)(\s)/);
                if (orderedMatch) {
                    const indent = orderedMatch[1].length;
                    const markerFrom = line.from + indent;
                    const markerTo = markerFrom + orderedMatch[2].length; // e.g. `1.`
                    const markerWithSpaceTo = markerTo + orderedMatch[3].length;

                    const cursorOnMarker = isCursorOnMarker(view, markerFrom, markerTo);

                    if (!cursorOnMarker) {
                        decorations.push(
                            Decoration.mark({ class: 'idz-ordered-marker' })
                                .range(markerFrom, markerWithSpaceTo)
                        );
                    } else {
                        decorations.push(
                            Decoration.mark({ class: 'idz-marker' })
                                .range(markerFrom, markerWithSpaceTo)
                        );
                    }
                }
            },
        });
    }

    decorations.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);
    return Decoration.set(decorations, true);
}

// ── Plugin ────────────────────────────────────────────────────────────────────

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
