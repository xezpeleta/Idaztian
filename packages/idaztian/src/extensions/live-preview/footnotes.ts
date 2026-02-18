import { Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { isCursorInRange } from '../../utils/cursor';

/**
 * Live-preview extension for footnotes.
 *
 * Inline references [^1]:
 * - Cursor away: replaced with a superscript widget showing the label
 * - Cursor on: raw `[^1]` syntax shown
 *
 * Footnote definitions [^1]: text:
 * - Always styled distinctly (muted, smaller)
 */

class FootnoteRefWidget extends WidgetType {
    constructor(private readonly label: string) { super(); }

    eq(other: FootnoteRefWidget): boolean {
        return other.label === this.label;
    }

    toDOM(): HTMLElement {
        const sup = document.createElement('sup');
        sup.className = 'idz-footnote-ref';
        sup.textContent = this.label;
        sup.setAttribute('aria-label', `Footnote ${this.label}`);
        return sup;
    }

    ignoreEvent(): boolean { return true; }
}

function buildFootnoteDecorations(view: EditorView): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    const state = view.state;

    // We scan the full document text with regex since @lezer/markdown
    // may not expose footnote nodes directly in all configurations.
    const text = state.doc.toString();

    // Match inline footnote references: [^label]
    // Must NOT be followed by `:` (that's a definition)
    const refPattern = /\[\^([^\]]+)\](?!:)/g;
    let match: RegExpExecArray | null;

    while ((match = refPattern.exec(text)) !== null) {
        const from = match.index;
        const to = from + match[0].length;
        const label = match[1];

        // Only process if in visible range
        const inVisible = view.visibleRanges.some(r => from >= r.from && to <= r.to);
        if (!inVisible) continue;

        const cursorOn = isCursorInRange(state, from, to);

        if (!cursorOn) {
            decorations.push(
                Decoration.replace({
                    widget: new FootnoteRefWidget(label),
                }).range(from, to)
            );
        } else {
            decorations.push(
                Decoration.mark({ class: 'idz-footnote-ref-syntax' }).range(from, to)
            );
        }
    }

    // Match footnote definitions: [^label]: text (at start of line)
    const defPattern = /^\[\^([^\]]+)\]:/gm;
    while ((match = defPattern.exec(text)) !== null) {
        const from = match.index;
        const to = from + match[0].length;

        const inVisible = view.visibleRanges.some(r => from >= r.from && to <= r.to);
        if (!inVisible) continue;

        // Style the definition marker
        decorations.push(
            Decoration.mark({ class: 'idz-footnote-def' }).range(from, to)
        );
    }

    decorations.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);
    return Decoration.set(decorations, true);
}

const footnotesPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildFootnoteDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.selectionSet || update.viewportChanged) {
                this.decorations = buildFootnoteDecorations(update.view);
            }
        }
    },
    { decorations: (v) => v.decorations }
);

export function footnotesExtension() {
    return [footnotesPlugin];
}
