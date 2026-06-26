import { Range, StateField, EditorState } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

/**
 * Live-preview extension for horizontal rules (thematic breaks).
 *
 * Uses a block widget (via StateField) instead of CSS line decorations.
 * This ensures CM6's HeightOracle properly tracks the HR's visual height
 * and prevents mouse-click position drift after horizontal rules.
 *
 * When the cursor is on the HR line, raw syntax is shown.
 * When the cursor is away, a visual <hr> replaces the text.
 */

class HorizontalRuleWidget extends WidgetType {
    eq(other: WidgetType): boolean {
        return other instanceof HorizontalRuleWidget;
    }

    toDOM(): HTMLElement {
        const hr = document.createElement('hr');
        hr.className = 'idz-hr';
        return hr;
    }

    get estimatedHeight(): number {
        // A visual HR: margin 1.5em top + 1px border + 1.5em bottom
        // At 16px font: 24px + 1px + 24px = 49px
        return 49;
    }

    ignoreEvent(): boolean { return true; }
}

function buildHrDecorations(state: EditorState): DecorationSet {
    const decorations: Range<Decoration>[] = [];

    syntaxTree(state).iterate({
        from: 0,
        to: state.doc.length,
        enter(node) {
            if (node.name !== 'HorizontalRule') return;
            const line = state.doc.lineAt(node.from);
            const sel = state.selection.main;
            const cursorOnLine = sel.from >= line.from && sel.from <= line.to;

            if (cursorOnLine) {
                // Cursor is on the line — show raw syntax (no widget)
                decorations.push(
                    Decoration.mark({ class: 'idz-hr-syntax' }).range(node.from, node.to)
                );
            } else {
                // Cursor away — replace with visual <hr> widget
                decorations.push(
                    Decoration.replace({
                        widget: new HorizontalRuleWidget(),
                        block: true,
                    }).range(node.from, node.to)
                );
            }
            return false;
        },
    });

    decorations.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);
    return Decoration.set(decorations, true);
}

const hrField = StateField.define<DecorationSet>({
    create(state) {
        return buildHrDecorations(state);
    },
    update(decos, tr) {
        if (tr.docChanged || tr.selection || syntaxTree(tr.state) !== syntaxTree(tr.startState)) {
            return buildHrDecorations(tr.state);
        }
        return decos;
    },
    provide(field) {
        return EditorView.decorations.from(field);
    },
});

export function horizontalRulesExtension() {
    return [hrField];
}
