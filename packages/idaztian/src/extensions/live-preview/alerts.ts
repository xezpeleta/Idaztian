import { Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { isCursorInNodeLines } from '../../utils/cursor';

/**
 * Live-preview extension for GitHub-style alerts / Obsidian callouts.
 *
 * Syntax:
 *   > [!NOTE]
 *   > Content here
 *
 * Behavior:
 * - Cursor away: styled callout box with icon + title, `> [!TYPE]` line hidden
 * - Cursor on block: raw blockquote syntax shown, callout styling preserved
 */

type AlertType = 'NOTE' | 'TIP' | 'IMPORTANT' | 'WARNING' | 'CAUTION';

const ALERT_CONFIG: Record<AlertType, { icon: string; label: string; cssClass: string }> = {
    NOTE: { icon: 'ℹ', label: 'Note', cssClass: 'idz-alert-note' },
    TIP: { icon: '💡', label: 'Tip', cssClass: 'idz-alert-tip' },
    IMPORTANT: { icon: '❗', label: 'Important', cssClass: 'idz-alert-important' },
    WARNING: { icon: '⚠', label: 'Warning', cssClass: 'idz-alert-warning' },
    CAUTION: { icon: '🔥', label: 'Caution', cssClass: 'idz-alert-caution' },
};

class AlertHeaderWidget extends WidgetType {
    constructor(
        private readonly type: AlertType,
    ) { super(); }

    eq(other: AlertHeaderWidget): boolean {
        return other.type === this.type;
    }

    toDOM(): HTMLElement {
        const cfg = ALERT_CONFIG[this.type];
        const div = document.createElement('div');
        div.className = `idz-alert-header idz-alert-header-${this.type.toLowerCase()}`;

        const icon = document.createElement('span');
        icon.className = 'idz-alert-icon';
        icon.textContent = cfg.icon;
        icon.setAttribute('aria-hidden', 'true');

        const label = document.createElement('span');
        label.className = 'idz-alert-label';
        label.textContent = cfg.label;

        div.appendChild(icon);
        div.appendChild(label);
        return div;
    }

    ignoreEvent(): boolean { return true; }
}

function buildAlertDecorations(view: EditorView): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    const state = view.state;

    for (const { from, to } of view.visibleRanges) {
        syntaxTree(state).iterate({
            from,
            to,
            enter(node) {
                if (node.name !== 'Blockquote') return;

                // Check first line for [!TYPE] pattern
                const firstLine = state.doc.lineAt(node.from);
                const firstLineText = firstLine.text;
                const alertMatch = firstLineText.match(/^\s*>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
                if (!alertMatch) return;

                const alertType = alertMatch[1].toUpperCase() as AlertType;
                const cfg = ALERT_CONFIG[alertType];
                const cursorOnBlock = isCursorInNodeLines(state, node.from, node.to);

                // Apply alert container class to each line in the block
                let pos = node.from;
                let isFirstLine = true;
                while (pos <= node.to) {
                    const line = state.doc.lineAt(pos);
                    if (line.from > node.to) break;

                    const lineText = line.text;
                    const markerMatch = lineText.match(/^(\s*>+\s?)/);
                    const markerEnd = markerMatch ? line.from + markerMatch[0].length : line.from;

                    // Style the line as part of the alert block
                    decorations.push(
                        Decoration.line({ class: `idz-alert-line ${cfg.cssClass}` }).range(line.from, line.from)
                    );

                    if (isFirstLine) {
                        if (!cursorOnBlock) {
                            // Replace the entire first line ("> [!NOTE]") with the header widget
                            decorations.push(
                                Decoration.replace({
                                    widget: new AlertHeaderWidget(alertType),
                                    block: false,
                                }).range(line.from, line.to)
                            );
                        } else {
                            // Show raw syntax, style the marker
                            decorations.push(
                                Decoration.mark({ class: 'idz-marker' }).range(line.from, markerEnd)
                            );
                            decorations.push(
                                Decoration.mark({ class: 'idz-alert-type-syntax' }).range(markerEnd, line.to)
                            );
                        }
                        isFirstLine = false;
                    } else {
                        if (!cursorOnBlock) {
                            // Hide the `> ` prefix on content lines
                            if (markerMatch && markerEnd > line.from) {
                                decorations.push(
                                    Decoration.replace({}).range(line.from, markerEnd)
                                );
                            }
                        } else {
                            // Show `> ` styled
                            if (markerMatch && markerEnd > line.from) {
                                decorations.push(
                                    Decoration.mark({ class: 'idz-marker' }).range(line.from, markerEnd)
                                );
                            }
                        }
                    }

                    pos = line.to + 1;
                }

                return false; // Don't descend into blockquote children
            },
        });
    }

    decorations.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);
    return Decoration.set(decorations, true);
}

const alertsPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildAlertDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.selectionSet || update.viewportChanged) {
                this.decorations = buildAlertDecorations(update.view);
            }
        }
    },
    { decorations: (v) => v.decorations }
);

export function alertsExtension() {
    return [alertsPlugin];
}
