import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { toggleWrap, setLinePrefix } from '../utils/markdown';
import { TableData, rebuildTable } from '../utils/table';

// ── Formatting commands ────────────────────────────────────────────────────

export function cmdBold(view: EditorView): boolean {
    return toggleWrap(view.state, view.dispatch, '**');
}

export function cmdItalic(view: EditorView): boolean {
    return toggleWrap(view.state, view.dispatch, '*');
}

export function cmdCode(view: EditorView): boolean {
    return toggleWrap(view.state, view.dispatch, '`');
}

export function cmdStrikethrough(view: EditorView): boolean {
    return toggleWrap(view.state, view.dispatch, '~~');
}

export function cmdLink(view: EditorView): boolean {
    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to);
    const linkText = selectedText || 'link text';
    const insert = `[${linkText}](url)`;
    view.dispatch(view.state.update({
        changes: { from, to, insert },
        selection: { anchor: from + linkText.length + 3, head: from + insert.length - 1 },
    }));
    return true;
}

export function cmdHeading(view: EditorView, level: number): boolean {
    const prefix = '#'.repeat(level) + ' ';
    return setLinePrefix(view.state, view.dispatch, prefix, [/^#{1,6}\s/]);
}

export function cmdBulletList(view: EditorView): boolean {
    return setLinePrefix(view.state, view.dispatch, '- ', [/^[-*+]\s/, /^\d+\.\s/, /^[-*+]\s+\[[ xX]\]\s*/]);
}

export function cmdOrderedList(view: EditorView): boolean {
    return setLinePrefix(view.state, view.dispatch, '1. ', [/^[-*+]\s/, /^\d+\.\s/, /^[-*+]\s+\[[ xX]\]\s*/]);
}

export function cmdTaskList(view: EditorView): boolean {
    return setLinePrefix(view.state, view.dispatch, '- [ ] ', [/^[-*+](\s\[[ xX]\])?\s/, /^\d+\.\s/]);
}

export function cmdBlockquote(view: EditorView): boolean {
    return setLinePrefix(view.state, view.dispatch, '> ', [/^>\s?/]);
}

export function cmdInsertTable(view: EditorView): boolean {
    const { head } = view.state.selection.main;
    const line = view.state.doc.lineAt(head);
    const insert = '\n\n| Column 1 | Column 2 |\n|---|---|\n| Cell 1 | Cell 2 |\n';
    view.dispatch(view.state.update({
        changes: { from: line.to, insert },
        selection: { anchor: line.to + 3 },
        userEvent: 'input',
    }));
    return true;
}

export function cmdInsertCodeBlock(view: EditorView): boolean {
    const { head } = view.state.selection.main;
    const line = view.state.doc.lineAt(head);
    const insert = '\n\n```\n\n```\n';
    view.dispatch(view.state.update({
        changes: { from: line.to, insert },
        selection: { anchor: line.to + 5 },
        userEvent: 'input',
    }));
    return true;
}

export function cmdInsertHorizontalRule(view: EditorView): boolean {
    const { head } = view.state.selection.main;
    const line = view.state.doc.lineAt(head);
    const insert = '\n\n---\n\n';
    view.dispatch(view.state.update({
        changes: { from: line.to, insert },
        selection: { anchor: line.to + 6 },
        userEvent: 'input',
    }));
    return true;
}

export function cmdInsertCallout(view: EditorView, type: string): boolean {
    const { head } = view.state.selection.main;
    const line = view.state.doc.lineAt(head);
    const insert = `\n\n> [!${type}]\n> \n`;
    view.dispatch(view.state.update({
        changes: { from: line.to, insert },
        selection: { anchor: line.to + insert.length - 1 },
        userEvent: 'input',
    }));
    return true;
}

export function cmdInsertFootnote(view: EditorView): boolean {
    const { from, to } = view.state.selection.main;
    const selectedText = view.state.sliceDoc(from, to);
    const label = selectedText || '1';
    const insert = `[^${label}]`;
    view.dispatch(view.state.update({
        changes: { from, to, insert },
        selection: { anchor: from + insert.length },
        userEvent: 'input',
    }));
    return true;
}

// ── State detection ────────────────────────────────────────────────────────

function isNodeActive(state: EditorState, nodeNames: string[]): boolean {
    const { from, to } = state.selection.main;
    let found = false;
    syntaxTree(state).iterate({
        from: Math.max(0, from - 20),
        to: Math.min(state.doc.length, to + 20),
        enter(node) {
            if (nodeNames.includes(node.name) && node.from <= to && node.to >= from) {
                found = true;
                return false;
            }
        },
    });
    return found;
}

export function isBold(state: EditorState): boolean {
    return isNodeActive(state, ['StrongEmphasis']);
}

export function isItalic(state: EditorState): boolean {
    return isNodeActive(state, ['Emphasis']);
}

export function isCodeActive(state: EditorState): boolean {
    return isNodeActive(state, ['InlineCode']);
}

export function isStrikethroughActive(state: EditorState): boolean {
    return isNodeActive(state, ['Strikethrough']);
}

export function getHeadingLevel(state: EditorState): number | null {
    const head = state.selection.main.head;
    const line = state.doc.lineAt(head);
    const match = line.text.match(/^(#{1,6})\s/);
    return match ? match[1].length : null;
}

export function isBulletListActive(state: EditorState): boolean {
    const head = state.selection.main.head;
    const line = state.doc.lineAt(head);
    return /^\s*[-*+]\s/.test(line.text) && !/^\s*[-*+]\s+\[[ xX]\]/.test(line.text);
}

export function isOrderedListActive(state: EditorState): boolean {
    const head = state.selection.main.head;
    const line = state.doc.lineAt(head);
    return /^\s*\d+\.\s/.test(line.text);
}

export function isTaskListActive(state: EditorState): boolean {
    const head = state.selection.main.head;
    const line = state.doc.lineAt(head);
    return /^\s*[-*+]\s+\[[ xX]\]/.test(line.text);
}

export function isBlockquoteActive(state: EditorState): boolean {
    const head = state.selection.main.head;
    const line = state.doc.lineAt(head);
    return /^>/.test(line.text);
}

// ── Table manipulation commands ────────────────────────────────────────────
// Each function receives the current TableData (including document positions)
// and dispatches a single replacement transaction via rebuildTable().

/** Insert a blank data row before the row at `dataRowIdx` (0-based among data rows). */
export function tableAddRowAbove(view: EditorView, data: TableData, dataRowIdx: number): void {
    const newRows = [...data.rows];
    newRows.splice(dataRowIdx, 0, data.headers.map(() => ''));
    rebuildTable(view, data, data.headers, newRows);
}

/** Insert a blank data row after the row at `dataRowIdx`. */
export function tableAddRowBelow(view: EditorView, data: TableData, dataRowIdx: number): void {
    const newRows = [...data.rows];
    newRows.splice(dataRowIdx + 1, 0, data.headers.map(() => ''));
    rebuildTable(view, data, data.headers, newRows);
}

/** Swap the row at `dataRowIdx` with the one above it. */
export function tableMoveRowUp(view: EditorView, data: TableData, dataRowIdx: number): void {
    if (dataRowIdx <= 0) return;
    const newRows = [...data.rows];
    [newRows[dataRowIdx - 1], newRows[dataRowIdx]] = [newRows[dataRowIdx], newRows[dataRowIdx - 1]];
    rebuildTable(view, data, data.headers, newRows);
}

/** Swap the row at `dataRowIdx` with the one below it. */
export function tableMoveRowDown(view: EditorView, data: TableData, dataRowIdx: number): void {
    if (dataRowIdx >= data.rows.length - 1) return;
    const newRows = [...data.rows];
    [newRows[dataRowIdx], newRows[dataRowIdx + 1]] = [newRows[dataRowIdx + 1], newRows[dataRowIdx]];
    rebuildTable(view, data, data.headers, newRows);
}

/** Duplicate the row at `dataRowIdx`, inserting the copy directly below. */
export function tableDuplicateRow(view: EditorView, data: TableData, dataRowIdx: number): void {
    const newRows = [...data.rows];
    newRows.splice(dataRowIdx + 1, 0, [...(data.rows[dataRowIdx] ?? [])]);
    rebuildTable(view, data, data.headers, newRows);
}

/** Delete the row at `dataRowIdx`. Requires at least two data rows to proceed. */
export function tableDeleteRow(view: EditorView, data: TableData, dataRowIdx: number): void {
    if (data.rows.length <= 1) return;
    rebuildTable(view, data, data.headers, data.rows.filter((_, i) => i !== dataRowIdx));
}

/** Insert a blank column to the left of column `colIdx` (0-based). */
export function tableAddColumnLeft(view: EditorView, data: TableData, colIdx: number): void {
    const newHeaders = [...data.headers];
    newHeaders.splice(colIdx, 0, 'Column');
    const newRows = data.rows.map((row) => {
        const r = [...row];
        r.splice(colIdx, 0, '');
        return r;
    });
    rebuildTable(view, data, newHeaders, newRows);
}

/** Insert a blank column to the right of column `colIdx`. */
export function tableAddColumnRight(view: EditorView, data: TableData, colIdx: number): void {
    tableAddColumnLeft(view, data, colIdx + 1);
}

/** Swap column `colIdx` with the one to its left. */
export function tableMoveColumnLeft(view: EditorView, data: TableData, colIdx: number): void {
    if (colIdx <= 0) return;
    const swap = <T>(arr: T[]): T[] => {
        const r = [...arr];
        [r[colIdx - 1], r[colIdx]] = [r[colIdx], r[colIdx - 1]];
        return r;
    };
    rebuildTable(view, data, swap(data.headers), data.rows.map(swap));
}

/** Swap column `colIdx` with the one to its right. */
export function tableMoveColumnRight(view: EditorView, data: TableData, colIdx: number): void {
    if (colIdx >= data.headers.length - 1) return;
    const swap = <T>(arr: T[]): T[] => {
        const r = [...arr];
        [r[colIdx], r[colIdx + 1]] = [r[colIdx + 1], r[colIdx]];
        return r;
    };
    rebuildTable(view, data, swap(data.headers), data.rows.map(swap));
}

/** Delete column `colIdx`. Requires at least two columns to proceed. */
export function tableDeleteColumn(view: EditorView, data: TableData, colIdx: number): void {
    if (data.headers.length <= 1) return;
    rebuildTable(
        view, data,
        data.headers.filter((_, i) => i !== colIdx),
        data.rows.map((row) => row.filter((_, i) => i !== colIdx))
    );
}

/** Sort data rows by column `colIdx` in ascending or descending order. */
export function tableSortByColumn(
    view: EditorView,
    data: TableData,
    colIdx: number,
    direction: 'asc' | 'desc'
): void {
    const sorted = [...data.rows].sort((a, b) => {
        const aVal = (a[colIdx] ?? '').trim().toLowerCase();
        const bVal = (b[colIdx] ?? '').trim().toLowerCase();
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return direction === 'asc' ? cmp : -cmp;
    });
    rebuildTable(view, data, data.headers, sorted);
}
