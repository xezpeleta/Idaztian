import { EditorView } from '@codemirror/view';

/**
 * Shared table data types and pure helpers.
 * Imported by both tables.ts (widget) and commands.ts (manipulation).
 */

export interface LineInfo {
    from: number;
    to: number;
    text: string;
}

export interface TableData {
    headers: string[];
    rows: string[][];
    allLines: LineInfo[];
    nodeFrom: number;
    nodeTo: number;
}

export function parseCells(lineText: string): string[] {
    let s = lineText.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split('|').map((c) => c.trim());
}

export function isSeparatorLine(text: string): boolean {
    const t = text.trim();
    return t.length > 0 && /^\|?[\s|:\-]+\|?$/.test(t) && t.includes('-');
}

/** Build an aligned GFM markdown table string from headers + rows. */
export function buildTableMarkdown(headers: string[], rows: string[][]): string {
    const colCount = headers.length;
    if (colCount === 0) return '';

    const colWidths = Array.from({ length: colCount }, (_, i) => {
        let w = (headers[i] ?? '').length;
        for (const row of rows) w = Math.max(w, (row[i] ?? '').length);
        return Math.max(3, w);
    });

    const pad = (s: string, w: number): string =>
        (s ?? '') + ' '.repeat(Math.max(0, w - (s ?? '').length));

    return [
        '| ' + headers.map((h, i) => pad(h, colWidths[i])).join(' | ') + ' |',
        '|' + colWidths.map((w) => '-'.repeat(w + 2)).join('|') + '|',
        ...rows.map((row) =>
            '| ' +
            Array.from({ length: colCount }, (_, i) => pad(row[i] ?? '', colWidths[i])).join(' | ') +
            ' |'
        ),
    ].join('\n');
}

/** Replace the entire table range in the document with rebuilt markdown. */
export function rebuildTable(
    view: EditorView,
    data: TableData,
    headers: string[],
    rows: string[][]
): void {
    const newMarkdown = buildTableMarkdown(headers, rows);
    const oldMarkdown = view.state.doc.sliceString(data.nodeFrom, data.nodeTo);
    if (newMarkdown === oldMarkdown) return;
    view.dispatch({
        changes: { from: data.nodeFrom, to: data.nodeTo, insert: newMarkdown },
        userEvent: 'input',
    });
}
