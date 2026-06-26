import { Range, StateField } from '@codemirror/state';
import { EditorState } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, WidgetType, keymap } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import {
    TableData, LineInfo, parseCells, isSeparatorLine,
    buildTableMarkdown, rebuildTable,
} from '../../utils/table';
import { showTableContextMenu } from '../context-menu';

/**
 * Live-preview extension for GFM tables — "always rendered" approach.
 *
 * The table is ALWAYS displayed as an HTML <table> widget, even when the
 * cursor is inside. Cells are contenteditable; changes are synced back to
 * the markdown source on cell blur.
 *
 * ## Key design: mutable TableRefs
 *
 * Every event-listener closure captures a `TableRefs` object rather than
 * capturing `data` / the widget directly.  CM6 calls `updateDOM()` whenever
 * the widget changes; `updateDOM` updates the refs in place so all existing
 * closures immediately see the latest `data` (correct doc positions) and the
 * latest `widget` (correct method implementations).  This prevents:
 *   - Stale document positions in blur → sync dispatches
 *   - Infinite re-render loops (eq=false → updateDOM=true → DOM preserved)
 *
 * Block decorations MUST live in a StateField — ViewPlugin cannot produce them.
 */

// ── Table parsing ──────────────────────────────────────────────────────────

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
    if (headers.length === 0) return null;
    const rows = allLines
        .slice(2)
        .filter((l) => l.text.trim() && !isSeparatorLine(l.text))
        .map((l) => parseCells(l.text));
    return { headers, rows, allLines, nodeFrom, nodeTo };
}

// ── Sync DOM → markdown ────────────────────────────────────────────────────

function syncTableToMarkdown(
    view: EditorView,
    data: TableData,
    tableEl: HTMLTableElement,
): void {
    const newHeaders: string[] = [];
    tableEl.querySelectorAll<HTMLElement>('th.idz-table-th').forEach((th) => {
        newHeaders.push(th.textContent?.trim() ?? '');
    });

    const newRows: string[][] = [];
    tableEl.querySelectorAll<HTMLElement>('tbody tr:not(.idz-table-ghost-row)').forEach((tr) => {
        const cells: string[] = [];
        tr.querySelectorAll<HTMLElement>('td.idz-table-td').forEach((td) => {
            cells.push(td.textContent?.trim() ?? '');
        });
        if (cells.length > 0) newRows.push(cells);
    });

    if (newHeaders.length === 0) return;

    const newMarkdown = buildTableMarkdown(newHeaders, newRows);
    const oldMarkdown = view.state.doc.sliceString(data.nodeFrom, data.nodeTo);
    if (newMarkdown === oldMarkdown) return;

    view.dispatch({
        changes: { from: data.nodeFrom, to: data.nodeTo, insert: newMarkdown },
        userEvent: 'input',
    });
}

// ── Cell helpers ───────────────────────────────────────────────────────────

function selectAll(cell: HTMLElement): void {
    const range = document.createRange();
    range.selectNodeContents(cell);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
}

function getAllEditableCells(tableEl: HTMLTableElement): HTMLElement[] {
    return Array.from(tableEl.querySelectorAll<HTMLElement>('th.idz-table-th, td.idz-table-td'));
}

// ── Mutable refs (stored on wrapper DOM) ──────────────────────────────────

interface TableRefs {
    data: TableData;
    widget: TableWidget;
}

// ── Widget ─────────────────────────────────────────────────────────────────

class TableWidget extends WidgetType {
    constructor(private readonly data: TableData) { super(); }

    eq(other: WidgetType): boolean {
        if (!(other instanceof TableWidget)) return false;
        const d = this.data;
        const o = other.data;
        return (
            d.nodeFrom === o.nodeFrom &&
            d.nodeTo === o.nodeTo &&
            d.headers.join('\x00') === o.headers.join('\x00') &&
            d.rows.length === o.rows.length &&
            d.rows.every((r, i) => r.join('\x00') === o.rows[i]?.join('\x00'))
        );
    }

    /**
     * Update the existing DOM without recreating it, preserving focus.
     * Also refreshes the shared `refs` so all closures see current data/widget.
     * Returns true  → DOM reused (same dimensions, only content updated).
     * Returns false → CM6 calls toDOM() for a full rebuild (dimensions changed).
     */
    updateDOM(dom: HTMLElement, _view: EditorView): boolean {
        const tableEl = dom.querySelector<HTMLTableElement>('table.idz-table');
        if (!tableEl) return false;

        // Keep refs current so all event-listener closures use fresh data
        const refs = (dom as any).__tableRefs as TableRefs | undefined;
        if (refs) {
            refs.data = this.data;
            refs.widget = this;
        }
        // Keep the lookup attribute in sync with the current document position
        dom.dataset.tableFrom = String(this.data.nodeFrom);

        const ths = Array.from(tableEl.querySelectorAll<HTMLElement>('th.idz-table-th'));
        const trs = Array.from(
            tableEl.querySelectorAll<HTMLElement>('tbody tr:not(.idz-table-ghost-row)')
        );

        // If column or row count changed, fall back to full toDOM rebuild
        if (ths.length !== this.data.headers.length || trs.length !== this.data.rows.length) {
            return false;
        }

        const focused = document.activeElement;

        ths.forEach((th, i) => {
            if (th !== focused) th.textContent = this.data.headers[i] ?? '';
        });

        trs.forEach((tr, r) => {
            const tds = Array.from(tr.querySelectorAll<HTMLElement>('td.idz-table-td'));
            tds.forEach((td, c) => {
                if (td !== focused) td.textContent = this.data.rows[r]?.[c] ?? '';
            });
        });

        return true; // DOM preserved, focus unaffected
    }

    toDOM(view: EditorView): HTMLElement {
        // Outer: block-level element that handles overflow-x for wide tables.
        // CM6 holds a reference to this element; updateDOM receives it.
        const outer = document.createElement('div');
        outer.className = 'idz-table-outer';
        outer.dataset.tableFrom = String(this.data.nodeFrom);

        // Mutable refs — stored on outer (what updateDOM receives).
        const refs: TableRefs = { data: this.data, widget: this };
        (outer as any).__tableRefs = refs;

        // Wrapper: inline-flex, shrinks to table width + lane width.
        // This keeps the add-col lane directly adjacent to the table edge.
        const wrapper = document.createElement('div');
        wrapper.className = 'idz-table-wrapper';

        const tableEl = document.createElement('table');
        tableEl.className = 'idz-table';

        const colCount = this.data.headers.length;

        // ── Head ──────────────────────────────────────────────────────────
        const thead = document.createElement('thead');
        const headTr = document.createElement('tr');

        for (let c = 0; c < colCount; c++) {
            headTr.appendChild(
                this.makeCell('th', this.data.headers[c], -1, c, tableEl, view, refs)
            );
        }

        thead.appendChild(headTr);
        tableEl.appendChild(thead);

        // ── Body ──────────────────────────────────────────────────────────
        const tbody = document.createElement('tbody');

        for (let r = 0; r < this.data.rows.length; r++) {
            const tr = document.createElement('tr');
            for (let c = 0; c < colCount; c++) {
                tr.appendChild(
                    this.makeCell('td', this.data.rows[r][c] ?? '', r, c, tableEl, view, refs)
                );
            }
            tbody.appendChild(tr);
        }

        // Ghost row (dashed line spanning full width, with centred "+" button)
        const ghostRowTr = document.createElement('tr');
        ghostRowTr.className = 'idz-table-ghost-row';
        const ghostRowTd = document.createElement('td');
        ghostRowTd.colSpan = colCount;
        const addRowBtn = document.createElement('button');
        addRowBtn.className = 'idz-table-add-btn idz-table-add-btn--row';
        addRowBtn.type = 'button';
        addRowBtn.title = 'Add row';
        addRowBtn.textContent = '+';
        addRowBtn.addEventListener('mousedown', (e) => e.preventDefault());
        addRowBtn.addEventListener('click', () => refs.widget.addRow(view));
        ghostRowTd.appendChild(addRowBtn);
        ghostRowTr.appendChild(ghostRowTd);
        tbody.appendChild(ghostRowTr);

        tableEl.appendChild(tbody);
        wrapper.appendChild(tableEl);

        // ── Add-column lane (dashed vertical line + centred "+" button) ───
        // Sits as a flex sibling of the table inside the inline-flex wrapper,
        // so it is always exactly as tall as the table and positioned right
        // at its right edge — regardless of how wide the table is.
        const addColLane = document.createElement('div');
        addColLane.className = 'idz-table-add-col-lane';

        const addColBtn = document.createElement('button');
        addColBtn.className = 'idz-table-add-btn idz-table-add-btn--col';
        addColBtn.type = 'button';
        addColBtn.title = 'Add column';
        addColBtn.textContent = '+';
        addColBtn.addEventListener('mousedown', (e) => e.preventDefault());
        addColBtn.addEventListener('click', () => refs.widget.addColumn(view));
        addColLane.appendChild(addColBtn);

        wrapper.appendChild(addColLane);
        outer.appendChild(wrapper);

        // ── Table-specific context menu ────────────────────────────────────
        wrapper.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const targetCell = (e.target as Element).closest<HTMLElement>('[data-row-idx]');
            if (!targetCell) return;
            const rowIdx = parseInt(targetCell.dataset.rowIdx ?? '-1', 10);
            const colIdx = parseInt(targetCell.dataset.colIdx ?? '0', 10);
            showTableContextMenu(e.clientX, e.clientY, view, refs.data, rowIdx, colIdx);
        });

        return outer;
    }

    private makeCell(
        tag: 'th' | 'td',
        content: string,
        rowIdx: number,   // -1 = header row, 0+ = data rows
        colIdx: number,
        tableEl: HTMLTableElement,
        view: EditorView,
        refs: TableRefs,
    ): HTMLElement {
        const cell = document.createElement(tag);
        cell.className = tag === 'th' ? 'idz-table-th' : 'idz-table-td';
        cell.contentEditable = 'true';
        cell.spellcheck = false;
        cell.textContent = content;
        cell.dataset.rowIdx = String(rowIdx);
        cell.dataset.colIdx = String(colIdx);

        cell.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                e.preventDefault();
                const all = getAllEditableCells(tableEl);
                const idx = all.indexOf(cell);
                const next = e.shiftKey ? all[idx - 1] : all[idx + 1];
                if (next) {
                    next.focus();
                    selectAll(next);
                } else {
                    cell.blur();
                }
            }
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                const currentColIdx = parseInt(cell.dataset.colIdx ?? '0', 10);
                const currentRowIdx = parseInt(cell.dataset.rowIdx ?? '-1', 10);
                const targetRowIdx = e.key === 'ArrowUp' ? currentRowIdx - 1 : currentRowIdx + 1;
                const targetCell = tableEl.querySelector<HTMLElement>(
                    `[data-row-idx="${targetRowIdx}"][data-col-idx="${currentColIdx}"]`
                );
                if (targetCell) {
                    targetCell.focus();
                    selectAll(targetCell);
                } else {
                    // Edge of table — exit to the CM6 editor line before/after the table
                    const exitPos = e.key === 'ArrowDown'
                        ? Math.min(refs.data.nodeTo + 1, view.state.doc.length)
                        : Math.max(refs.data.nodeFrom - 1, 0);
                    cell.blur();
                    view.focus();
                    view.dispatch({ selection: { anchor: exitPos }, scrollIntoView: true });
                }
            }
            if (e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault();
                cell.blur();
            }
        });

        // Prevent CM6 from stealing mouse events that belong to the cell
        cell.addEventListener('mousedown', (e) => e.stopPropagation());

        // On blur: sync cell content back to markdown using CURRENT refs.data
        cell.addEventListener('blur', () => {
            syncTableToMarkdown(view, refs.data, tableEl);
        });

        return cell;
    }

    /** Add an empty row at the bottom of the table. */
    addRow(view: EditorView): void {
        const emptyRow = this.data.headers.map(() => '');
        rebuildTable(view, this.data, this.data.headers, [...this.data.rows, emptyRow]);
    }

    /** Add an empty column at the right of the table. */
    addColumn(view: EditorView): void {
        const newHeaders = [...this.data.headers, 'New Column'];
        const newRows = this.data.rows.map((row) => [...row, '']);
        rebuildTable(view, this.data, newHeaders, newRows);
    }

    ignoreEvent(event: Event): boolean {
        const t = event.target;
        if (!(t instanceof Element)) return false;
        // Let CM6 ignore events originating from inside contenteditable cells
        return t.closest('[contenteditable="true"]') !== null;
    }

    /**
     * Map a coordinate within the widget to a document position.
     * Without this, CM6 can't correctly place the cursor when clicking
     * inside or near the table widget — positions drift after the table.
     */
    coordsAt(dom: HTMLElement): { left: number; right: number; top: number; bottom: number } | null {
        const rect = dom.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    }

    get estimatedHeight(): number {
        // -1 means CM6 will measure the actual DOM height.
        // This is correct for tables since their rendered height varies.
        return -1;
    }
}

// ── StateField ─────────────────────────────────────────────────────────────
// Block decorations MUST live in a StateField (ViewPlugin does not allow them).
// Tables are ALWAYS replaced by a widget regardless of cursor position.
// Selection changes do NOT trigger a rebuild — tables are cursor-independent.

function buildTableDecorations(state: EditorState): DecorationSet {
    const decorations: Range<Decoration>[] = [];

    syntaxTree(state).iterate({
        from: 0,
        to: state.doc.length,
        enter(node) {
            if (node.name !== 'Table') return;
            const data = parseTable(state, node.from, node.to);
            if (!data) return false;
            decorations.push(
                Decoration.replace({
                    widget: new TableWidget(data),
                    block: true,
                }).range(node.from, node.to)
            );
            return false;
        },
    });

    decorations.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);
    return Decoration.set(decorations, true);
}

const tableDecorationsField = StateField.define<DecorationSet>({
    create(state) {
        return buildTableDecorations(state);
    },
    update(decos, tr) {
        // Rebuild when the document changed OR when the syntax tree was extended
        // by the incremental background parser (catches tables further down the
        // document that weren't parsed yet on the first create() call).
        if (tr.docChanged || syntaxTree(tr.state) !== syntaxTree(tr.startState)) {
            return buildTableDecorations(tr.state);
        }
        return decos;
    },
    provide(field) {
        return EditorView.decorations.from(field);
    },
});

// ── CM6-level arrow-key keymap ─────────────────────────────────────────────
// When the cursor is in text immediately above or below a table widget block,
// pressing ArrowUp/ArrowDown should enter the table (last/first row) rather
// than skipping the entire block in one keystroke.

function findTableWidgetNear(view: EditorView, direction: 'up' | 'down'): HTMLTableElement | null {
    const sel = view.state.selection.main;
    const cursorLine = view.state.doc.lineAt(sel.head);

    // The line we want to check for adjacency to a table block
    const targetPos = direction === 'up'
        ? cursorLine.from - 1   // position just before this line = end of previous line
        : cursorLine.to + 1;    // position just after this line = start of next line

    if (targetPos < 0 || targetPos > view.state.doc.length) return null;

    // Check if there is a table decoration covering that position
    const decos = view.state.field(tableDecorationsField, false);
    if (!decos) return null;

    let found: HTMLTableElement | null = null;
    decos.between(targetPos - 1, targetPos + 1, (from, _to) => {
        if (found) return false;
        // Find the rendered widget DOM using the data-table-from attribute stamped in toDOM()
        const outer = view.dom.querySelector<HTMLElement>(`[data-table-from="${from}"]`);
        if (!outer) return;
        const tableEl = outer.querySelector<HTMLTableElement>('table.idz-table');
        if (tableEl) found = tableEl;
    });
    return found;
}

function focusTableEdge(
    tableEl: HTMLTableElement,
    direction: 'up' | 'down',
    cursorX: number,
): boolean {
    // Determine which row to target: last row for ArrowUp, first data row for ArrowDown
    const rows = Array.from(
        tableEl.querySelectorAll<HTMLElement>('tr:not(.idz-table-ghost-row)')
    );
    if (rows.length === 0) return false;
    const targetRow = direction === 'up' ? rows[rows.length - 1] : rows[0];
    const cells = Array.from(targetRow.querySelectorAll<HTMLElement>('th.idz-table-th, td.idz-table-td'));
    if (cells.length === 0) return false;

    // Pick the cell whose horizontal centre is closest to the cursor's x position
    let bestCell = cells[0];
    let bestDist = Infinity;
    for (const c of cells) {
        const rect = c.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const dist = Math.abs(cx - cursorX);
        if (dist < bestDist) { bestDist = dist; bestCell = c; }
    }
    bestCell.focus();
    selectAll(bestCell);
    return true;
}

const tableArrowKeymap = keymap.of([
    {
        key: 'ArrowUp',
        run(view) {
            const tableEl = findTableWidgetNear(view, 'up');
            if (!tableEl) return false;
            const coords = view.coordsAtPos(view.state.selection.main.head);
            const cursorX = coords ? (coords.left + coords.right) / 2 : 0;
            return focusTableEdge(tableEl, 'up', cursorX);
        },
    },
    {
        key: 'ArrowDown',
        run(view) {
            const tableEl = findTableWidgetNear(view, 'down');
            if (!tableEl) return false;
            const coords = view.coordsAtPos(view.state.selection.main.head);
            const cursorX = coords ? (coords.left + coords.right) / 2 : 0;
            return focusTableEdge(tableEl, 'down', cursorX);
        },
    },
]);

export function tablesExtension() {
    return [tableDecorationsField, tableArrowKeymap];
}
