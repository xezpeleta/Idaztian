import { Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

/**
 * Live-preview extension for horizontal rules (thematic breaks).
 *
 * Strategy: mix of Decoration.line() for the visual HR and an inline
 * zero-width "spacer" widget at the end of the line that sets the correct
 * line height. This way:
 *
 * - The HR text ("---") is still editable (cursor can enter the line).
 * - The line height is set to 49px (matching the HR visual) via the spacer
 *   widget's estimatedHeight, so CM6's HeightOracle stays accurate.
 * - No block widget means no cursor navigation issues.
 */

class HrSpacerWidget extends WidgetType {
    eq(other: WidgetType): boolean {
        return other instanceof HrSpacerWidget;
    }

    toDOM(): HTMLElement {
        const span = document.createElement('span');
        span.setAttribute('aria-hidden', 'true');
        span.style.display = 'inline';
        return span;
    }

    /**
     * Set the line height to 49px: 24px top margin + 1px border + 24px bottom.
     * This tells CM6's HeightOracle this line is tall, so pixel-to-position
     * mapping stays accurate when navigating across HRs.
     */
    get estimatedHeight(): number {
        return 49;
    }

    ignoreEvent(): boolean { return true; }
}

function buildHrDecorations(view: EditorView): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    const state = view.state;

    for (const { from, to } of view.visibleRanges) {
        syntaxTree(state).iterate({
            from,
            to,
            enter(node) {
                if (node.name === 'HorizontalRule') {
                    const line = state.doc.lineAt(node.from);
                    const sel = state.selection.main;
                    const cursorOnLine = sel.from >= line.from && sel.from <= line.to;

                    // Line decoration for the HR visual
                    decorations.push(
                        Decoration.line({ class: 'idz-hr-line' }).range(line.from, line.from)
                    );

                    // Spacer widget to set correct line height for HeightOracle
                    decorations.push(
                        Decoration.widget({
                            widget: new HrSpacerWidget(),
                            side: 1,
                        }).range(line.to, line.to)
                    );

                    // Syntax highlighting when cursor is on the line
                    if (cursorOnLine) {
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
