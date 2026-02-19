import { Range, StateField, EditorState } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, WidgetType, keymap } from '@codemirror/view';
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

// Lucide SVG icons (minimalist, 16×16, stroke-based)
const LUCIDE_ICONS: Record<AlertType, string> = {
    NOTE: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
    TIP: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
    IMPORTANT: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
    WARNING: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
    CAUTION: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>`,
};

const ALERT_CONFIG: Record<AlertType, { label: string; cssClass: string }> = {
    NOTE: { label: 'Note', cssClass: 'idz-alert-note' },
    TIP: { label: 'Tip', cssClass: 'idz-alert-tip' },
    IMPORTANT: { label: 'Important', cssClass: 'idz-alert-important' },
    WARNING: { label: 'Warning', cssClass: 'idz-alert-warning' },
    CAUTION: { label: 'Caution', cssClass: 'idz-alert-caution' },
};

class AlertHeaderWidget extends WidgetType {
    constructor(
        private readonly type: AlertType,
        private readonly isFirst: boolean,
        private readonly from: number,
    ) { super(); }

    eq(other: AlertHeaderWidget): boolean {
        return other.type === this.type && other.isFirst === this.isFirst && other.from === this.from;
    }

    toDOM(view: EditorView): HTMLElement {
        const cfg = ALERT_CONFIG[this.type];
        const div = document.createElement('div');

        // Combine classes: header base + generic line styles + type specific style
        let classes = `idz-alert-header idz-alert-line ${cfg.cssClass}`;
        if (this.isFirst) classes += ' idz-alert-first';
        div.className = classes;

        const icon = document.createElement('span');
        icon.className = 'idz-alert-icon';
        icon.innerHTML = LUCIDE_ICONS[this.type];
        icon.setAttribute('aria-hidden', 'true');

        const label = document.createElement('span');
        label.className = 'idz-alert-label';
        label.textContent = cfg.label;

        div.appendChild(icon);
        div.appendChild(label);

        // Handle click to reveal the underlying text
        div.addEventListener('mousedown', (e) => {
            // Prevent default browser selection of the widget
            e.preventDefault();
            // Ensure editor has focus
            view.focus();

            // Try to find the exact position based on click coordinates
            const pos = view.posAtCoords({ x: e.clientX, y: e.clientY }, false);
            const anchor = pos !== null ? pos : this.from;

            // Set cursor to the calculated position
            view.dispatch({
                selection: { anchor },
                scrollIntoView: true
            });
        });

        return div;
    }

    ignoreEvent(): boolean { return true; }
}

const alertStateField = StateField.define<DecorationSet>({
    create(state) {
        return buildAlertDecorations(state);
    },
    update(decorations, tr) {
        if (tr.docChanged || tr.selection) {
            return buildAlertDecorations(tr.state);
        }
        return decorations.map(tr.changes);
    },
    provide: (field) => EditorView.decorations.from(field),
});

function buildAlertDecorations(state: EditorState): DecorationSet {
    const decorations: Range<Decoration>[] = [];

    syntaxTree(state).iterate({
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

            // Collect all lines first
            const lines: Array<{ from: number; to: number; text: string }> = [];
            let pos = node.from;
            while (pos <= node.to) {
                const line = state.doc.lineAt(pos);
                if (line.from > node.to) break;
                lines.push({ from: line.from, to: line.to, text: line.text });
                pos = line.to + 1;
            }

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const isFirst = i === 0;
                const isLast = i === lines.length - 1;

                const markerMatch = line.text.match(/^(\s*>+\s?)/);
                const markerEnd = markerMatch ? line.from + markerMatch[0].length : line.from;

                // Determine if we are in "Header Widget Mode"
                const showHeaderWidget = isFirst && !cursorOnBlock;

                if (showHeaderWidget) {
                    // Line wrapper should be hidden/collapsed logic
                    decorations.push(
                        Decoration.line({ class: 'idz-alert-header-row' }).range(line.from, line.from)
                    );
                    // Block widget
                    decorations.push(
                        Decoration.replace({
                            widget: new AlertHeaderWidget(alertType, true, line.from),
                            block: true,
                            side: -1
                        }).range(line.from, line.to)
                    );
                } else {
                    // Standard line styling (raw text or content lines)
                    let lineClass = `idz-alert-line ${cfg.cssClass}`;
                    if (isFirst) lineClass += ' idz-alert-first';
                    if (isLast) lineClass += ' idz-alert-last';

                    decorations.push(
                        Decoration.line({ class: lineClass }).range(line.from, line.from)
                    );

                    if (isFirst) {
                        // Must be cursorOnBlock here
                        // Show raw syntax, style the marker
                        decorations.push(
                            Decoration.mark({ class: 'idz-marker' }).range(line.from, markerEnd)
                        );
                        decorations.push(
                            Decoration.mark({ class: 'idz-alert-type-syntax' }).range(markerEnd, line.to)
                        );
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
                }
            }
        },
    });

    return Decoration.set(decorations, true);
}

export const alertNavigationKeymap = keymap.of([
    {
        key: 'ArrowDown',
        run: (view) => {
            const { state } = view;
            const head = state.selection.main.head;
            const currentLine = state.doc.lineAt(head);

            if (currentLine.number >= state.doc.lines) return false;

            const nextLine = state.doc.line(currentLine.number + 1);

            // Check if next line is a callout header (matches > [!TYPE])
            if (nextLine.text.match(/^\s*>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i)) {
                view.dispatch({
                    selection: { anchor: nextLine.from },
                    scrollIntoView: true
                });
                return true;
            }
            return false;
        },
    },
    {
        key: 'ArrowUp',
        run: (view) => {
            const { state } = view;
            const head = state.selection.main.head;
            const currentLine = state.doc.lineAt(head);

            if (currentLine.number <= 1) return false;

            const prevLine = state.doc.line(currentLine.number - 1);

            // Check if prev line is a callout header
            if (prevLine.text.match(/^\s*>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i)) {
                view.dispatch({
                    selection: { anchor: prevLine.from },
                    scrollIntoView: true
                });
                return true;
            }
            return false;
        },
    },
]);

export function alertsExtension() {
    return [alertStateField, alertNavigationKeymap];
}
