import { EditorState, Transaction, ChangeSpec } from '@codemirror/state';

/**
 * Toggle wrapping the current selection (or word at cursor) with prefix/suffix markers.
 * If the selection is already wrapped, removes the markers.
 */
export function toggleWrap(
    state: EditorState,
    dispatch: (tr: Transaction) => void,
    prefix: string,
    suffix: string = prefix
): boolean {
    const { from, to } = state.selection.main;
    const selectedText = state.sliceDoc(from, to);

    // Check if already wrapped
    const beforePrefix = state.sliceDoc(Math.max(0, from - prefix.length), from);
    const afterSuffix = state.sliceDoc(to, Math.min(state.doc.length, to + suffix.length));

    if (beforePrefix === prefix && afterSuffix === suffix) {
        // Unwrap: remove the markers
        const changes: ChangeSpec = [
            { from: from - prefix.length, to: from, insert: '' },
            { from: to, to: to + suffix.length, insert: '' },
        ];
        dispatch(state.update({ changes, selection: { anchor: from - prefix.length, head: to - prefix.length } }));
        return true;
    }

    if (selectedText.startsWith(prefix) && selectedText.endsWith(suffix) && selectedText.length > prefix.length + suffix.length) {
        // Unwrap inline selection
        const inner = selectedText.slice(prefix.length, selectedText.length - suffix.length);
        dispatch(state.update({
            changes: { from, to, insert: inner },
            selection: { anchor: from, head: from + inner.length },
        }));
        return true;
    }

    // Wrap selection
    dispatch(state.update({
        changes: { from, to, insert: prefix + selectedText + suffix },
        selection: { anchor: from + prefix.length, head: from + prefix.length + selectedText.length },
    }));
    return true;
}

/**
 * Set or replace the prefix of the current line (for headings, lists, blockquotes).
 * If the line already has the given prefix, removes it (toggle).
 */
export function setLinePrefix(
    state: EditorState,
    dispatch: (tr: Transaction) => void,
    prefix: string,
    /** Regex patterns to strip before applying new prefix (e.g. existing heading markers) */
    stripPatterns: RegExp[] = []
): boolean {
    const line = state.doc.lineAt(state.selection.main.head);
    let lineText = line.text;

    // Strip existing patterns
    for (const pattern of stripPatterns) {
        lineText = lineText.replace(pattern, '');
    }

    // Toggle: if line already starts with prefix, remove it
    if (lineText.startsWith(prefix)) {
        const newText = lineText.slice(prefix.length);
        dispatch(state.update({
            changes: { from: line.from, to: line.to, insert: newText },
            selection: { anchor: line.from + Math.max(0, state.selection.main.head - line.from - prefix.length) },
        }));
        return true;
    }

    // Apply prefix
    const newText = prefix + lineText;
    dispatch(state.update({
        changes: { from: line.from, to: line.to, insert: newText },
        selection: { anchor: line.from + prefix.length + (state.selection.main.head - line.from) },
    }));
    return true;
}

/**
 * Count words in a string.
 */
export function wordCount(text: string): number {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
}

/**
 * Count characters (excluding newlines) in a string.
 */
export function charCount(text: string): number {
    return text.replace(/\n/g, '').length;
}
