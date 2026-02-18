import { EditorState } from '@codemirror/state';

/**
 * Check if the editor's main cursor/selection intersects a given range.
 */
export function isCursorInRange(state: EditorState, from: number, to: number): boolean {
    const { from: selFrom, to: selTo } = state.selection.main;
    return selFrom <= to && selTo >= from;
}

/**
 * Check if the editor's main cursor is on a specific line (1-indexed).
 */
export function isCursorOnLine(state: EditorState, lineNumber: number): boolean {
    const cursorLine = state.doc.lineAt(state.selection.main.head).number;
    return cursorLine === lineNumber;
}

/**
 * Get the line number(s) spanned by a syntax node range.
 */
export function getNodeLineRange(
    state: EditorState,
    from: number,
    to: number
): { startLine: number; endLine: number } {
    return {
        startLine: state.doc.lineAt(from).number,
        endLine: state.doc.lineAt(to).number,
    };
}

/**
 * Check if the cursor is on any line within a node's range.
 */
export function isCursorInNodeLines(
    state: EditorState,
    from: number,
    to: number
): boolean {
    const cursorLine = state.doc.lineAt(state.selection.main.head).number;
    const { startLine, endLine } = getNodeLineRange(state, from, to);
    return cursorLine >= startLine && cursorLine <= endLine;
}
