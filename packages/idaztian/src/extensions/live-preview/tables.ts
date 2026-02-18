import { Range, StateField } from '@codemirror/state';
import { EditorState } from '@codemirror/state';
import {
    Decoration, DecorationSet, EditorView,
    WidgetType, keymap,
} from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { isCursorInNodeLines } from '../../utils/cursor';

/**
 * Live-preview extension for GFM tables.
 *
 * IMPORTANT: block decorations (block: true) MUST live in a StateField, not a
 * ViewPlugin. ViewPlugin only allows non-block (inline/line) decorations.
 *
 * Behavior:
 * - Cursor away: render a fully-styled HTML <table> widget; clicking a row enters edit mode
 * - Cursor in table: apply line-level decorations (header row, hide separator, row styling)
 * - Tab / Shift+Tab: navigate between cells
 * - Hover handles: right-edge "+" to add column, bottom-edge "+" to add row
 */

// ── Helpers ────────────────────────────────────────────────────────────────

function parseCells(lineText: string): string[] {
    let s = lineText.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split('|').map((c) => c.trim());
}

function isSeparatorLine(text: string): boolean {
    const t = text.trim();
    return t.length > 0 && /^\|?[\s|:\-]+\|?$/.test(t) && t.includes('-');
}

interface LineInfo { from: number; to: number; text: string }

interface TableData {
    headers: string[];
    rows: string[][];
    allLines: LineInfo[];
    nodeFrom: number;
    nodeTo: number;
}

function parseTable(state: EditorState, nodeFrom: number, nodeTo: number): TableData | null {
    const allLines: LineInfo[] = [];
    let pos = nodeFrom;
    while (pos <= nodeTo) {
        const line = state.doc.lineAt(pos);
        if (line.from > nodeTo) break;
        allLines.push({ from: line.from, to: line.to, text: line.text });
        pos = line.to + 1;
    }
    if (allLines.length < 2) return null;

    const headers = parseCells(allLines[0].text);
    const rows = allLines
        .slice(2)
        .filter((l) => l.text.trim() && !isSeparatorLine(l.text))
        .map((l) => parseCells(l.text));

    return { headers, rows, allLines, nodeFrom, nodeTo };
}

// ── Table Widget (cursor away) ─────────────────────────────────────────────

class TableWidget extends WidgetType {
    constructor(private readonly data: TableData) { super(); }

    eq(other: TableWidget): boolean {
        return (
            other.data.nodeFrom === this.data.nodeFrom &&
            other.data.nodeTo === this.data.nodeTo &&
            other.data.headers.join('|') === this.data.headers.join('|')
        );
    }

    toDOM(view: EditorView): HTMLElement {
        const wrapper = document.createElement('div');
        wrapper.className = 'idz-table-wrapper';

        const table = document.createElement('table');
        table.className = 'idz-table';

        // Header
        const thead = document.createElement('thead');
        const headerTr = document.createElement('tr');
        headerTr.className = 'idz-table-header-row';
        for (const h of this.data.headers) {
            const th = document.createElement('th');
            th.className = 'idz-table-th';
            th.textContent = h;
            th.addEventListener('click', () => this.enterEdit(view, 0));
            headerTr.appendChild(th);
        }
        thead.appendChild(headerTr);
        table.appendChild(thead);

        // Body
        const tbody = document.createElement('tbody');
        let dataRowIndex = 0;
        for (const row of this.data.rows) {
            const tr = document.createElement('tr');
            tr.className = 'idz-table-row';
            const rowIdx = dataRowIndex;
            for (const cell of row) {
                const td = document.createElement('td');
                td.className = 'idz-table-td';
                td.textContent = cell;
                td.addEventListener('click', () => this.enterEdit(view, rowIdx + 2));
                tr.appendChild(td);
            }
            tbody.appendChild(tr);
            dataRowIndex++;
        }
        table.appendChild(tbody);

        wrapper.appendChild(table);
        this.attachHoverHandles(wrapper, view);

        return wrapper;
    }

    private enterEdit(view: EditorView, lineIdx: number): void {
        const lines = this.data.allLines;
        const target = lines[Math.min(lineIdx, lines.length - 1)];
        const firstPipe = target.text.indexOf('|');
        const pos = firstPipe >= 0 ? target.from + firstPipe + 2 : target.from;
        view.dispatch({ selection: { anchor: Math.min(pos, target.to) } });
        view.focus();
    }

    private attachHoverHandles(wrapper: HTMLElement, view: EditorView): void {
        const ghostCol = document.createElement('div');
        ghostCol.className = 'idz-table-ghost-col';
        ghostCol.setAttribute('aria-hidden', 'true');
        const addColBtn = document.createElement('button');
        addColBtn.className = 'idz-table-add-btn';
        addColBtn.textContent = '+';
        addColBtn.title = 'Add column';
        addColBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.addColumn(view);
        });
        ghostCol.appendChild(addColBtn);
        wrapper.appendChild(ghostCol);

        const ghostRow = document.createElement('div');
        ghostRow.className = 'idz-table-ghost-row';
        ghostRow.setAttribute('aria-hidden', 'true');
        const addRowBtn = document.createElement('button');
        addRowBtn.className = 'idz-table-add-btn';
        addRowBtn.textContent = '+';
        addRowBtn.title = 'Add row';
        addRowBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.addRow(view);
        });
        ghostRow.appendChild(addRowBtn);
        wrapper.appendChild(ghostRow);

        wrapper.addEventListener('mouseenter', () => {
            ghostCol.classList.add('idz-table-ghost--visible');
            ghostRow.classList.add('idz-table-ghost--visible');
        });
        wrapper.addEventListener('mouseleave', () => {
            ghostCol.classList.remove('idz-table-ghost--visible');
            ghostRow.classList.remove('idz-table-ghost--visible');
        });
    }

    private addColumn(view: EditorView): void {
        const changes: Array<{ from: number; to: number; insert: string }> = [];
        for (let i = 0; i < this.data.allLines.length; i++) {
            const line = this.data.allLines[i];
            if (!line.text.trim()) continue;
            const lastPipeIdx = line.text.lastIndexOf('|');
            if (lastPipeIdx < 0) continue;
            const insertPos = line.from + lastPipeIdx;
            if (isSeparatorLine(line.text)) {
                changes.push({ from: insertPos, to: insertPos, insert: '|---' });
            } else if (i === 0) {
                changes.push({ from: insertPos, to: insertPos, insert: '| New Column ' });
            } else {
                changes.push({ from: insertPos, to: insertPos, insert: '|  ' });
            }
        }
        if (changes.length) {
            view.dispatch({ changes, userEvent: 'input' });
            view.focus();
        }
    }

    private addRow(view: EditorView): void {
        const lastLine = this.data.allLines[this.data.allLines.length - 1];
        const cells = this.data.headers.map(() => '  ').join(' | ');
        const newRow = `\n| ${cells} |`;
        view.dispatch({
            changes: { from: lastLine.to, insert: newRow },
            selection: { anchor: lastLine.to + 3 },
            userEvent: 'input',
        });
        view.focus();
    }

    ignoreEvent(): boolean { return false; }
    get estimatedHeight(): number { return -1; }
}

// ── Build decorations (takes EditorState, not EditorView) ──────────────────
//
// Block decorations MUST be produced by a StateField — ViewPlugin is
// only allowed to yield non-block (mark / inline-replace / line) decorations.

function buildTableDecorations(state: EditorState): DecorationSet {
    const decorations: Range<Decoration>[] = [];

    syntaxTree(state).iterate({
        from: 0,
        to: state.doc.length,
        enter(node) {
            if (node.name !== 'Table') return;

            const data = parseTable(state, node.from, node.to);
            if (!data) return false;

            const cursorInTable = isCursorInNodeLines(state, node.from, node.to);

            if (!cursorInTable) {
                // Block replacement — legal here because we're in a StateField
                decorations.push(
                    Decoration.replace({
                        widget: new TableWidget(data),
                        block: true,
                    }).range(node.from, node.to)
                );
            } else {
                // Line-level decorations for editing mode (no block flag needed)
                for (let i = 0; i < data.allLines.length; i++) {
                    const line = data.allLines[i];
                    if (isSeparatorLine(line.text)) {
                        decorations.push(
                            Decoration.line({ class: 'idz-table-sep-line' })
                                .range(line.from, line.from)
                        );
                    } else if (i === 0) {
                        decorations.push(
                            Decoration.line({ class: 'idz-table-editing-header' })
                                .range(line.from, line.from)
                        );
                    } else {
                        decorations.push(
                            Decoration.line({ class: 'idz-table-editing-row' })
                                .range(line.from, line.from)
                        );
                    }
                }
            }

            return false;
        },
    });

    decorations.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);
    return Decoration.set(decorations, true);
}

// ── StateField ─────────────────────────────────────────────────────────────

const tableDecorationsField = StateField.define<DecorationSet>({
    create(state) {
        return buildTableDecorations(state);
    },
    update(decos, tr) {
        if (tr.docChanged || tr.selection) {
            return buildTableDecorations(tr.state);
        }
        return decos.map(tr.changes);
    },
    provide(field) {
        return EditorView.decorations.from(field);
    },
});

// ── Cell navigation (Tab / Shift+Tab) ──────────────────────────────────────

function cellStartPositions(lineText: string, lineFrom: number): number[] {
    const positions: number[] = [];
    let i = 0;
    while (i < lineText.length) {
        if (lineText[i] === '|') {
            i++;
            while (i < lineText.length && lineText[i] === ' ') i++;
            if (i < lineText.length && lineText[i] !== '|') {
                positions.push(lineFrom + i);
            }
        } else {
            i++;
        }
    }
    return positions;
}

function getTableRangeAt(state: EditorState, pos: number): { from: number; to: number } | null {
    let result: { from: number; to: number } | null = null;
    syntaxTree(state).iterate({
        from: Math.max(0, pos - 1),
        to: Math.min(state.doc.length, pos + 1),
        enter(node) {
            if (node.name === 'Table') {
                result = { from: node.from, to: node.to };
                return false;
            }
        },
    });
    return result;
}

function tabInTable(view: EditorView, backward: boolean): boolean {
    const state = view.state;
    const head = state.selection.main.head;
    const currentLine = state.doc.lineAt(head);

    if (!currentLine.text.includes('|')) return false;

    const tableNode = getTableRangeAt(state, head);
    if (!tableNode) return false;

    const cells = cellStartPositions(currentLine.text, currentLine.from);
    if (cells.length === 0) return false;

    const currentCell = cells.filter((p) => p <= head).length - 1;

    if (!backward) {
        if (currentCell < cells.length - 1) {
            view.dispatch({ selection: { anchor: cells[currentCell + 1] } });
            return true;
        }
        if (currentLine.number < state.doc.lines) {
            let nextLine = state.doc.line(currentLine.number + 1);
            if (isSeparatorLine(nextLine.text) && currentLine.number + 1 < state.doc.lines) {
                nextLine = state.doc.line(currentLine.number + 2);
            }
            if (nextLine.from <= tableNode.to) {
                const nextCells = cellStartPositions(nextLine.text, nextLine.from);
                if (nextCells.length > 0) {
                    view.dispatch({ selection: { anchor: nextCells[0] } });
                    return true;
                }
            }
        }
    } else {
        if (currentCell > 0) {
            view.dispatch({ selection: { anchor: cells[currentCell - 1] } });
            return true;
        }
        if (currentLine.number > 1) {
            let prevLine = state.doc.line(currentLine.number - 1);
            if (isSeparatorLine(prevLine.text) && currentLine.number > 2) {
                prevLine = state.doc.line(currentLine.number - 2);
            }
            if (prevLine.from >= tableNode.from) {
                const prevCells = cellStartPositions(prevLine.text, prevLine.from);
                if (prevCells.length > 0) {
                    view.dispatch({ selection: { anchor: prevCells[prevCells.length - 1] } });
                    return true;
                }
            }
        }
    }
    return false;
}

const tableKeymap = keymap.of([
    { key: 'Tab', run(view) { return tabInTable(view, false); } },
    { key: 'Shift-Tab', run(view) { return tabInTable(view, true); } },
]);

export function tablesExtension() {
    return [tableDecorationsField, tableKeymap];
}
