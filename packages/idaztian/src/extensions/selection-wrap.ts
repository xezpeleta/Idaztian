import { EditorView, keymap } from '@codemirror/view';
import { EditorSelection, SelectionRange, Transaction } from '@codemirror/state';

/**
 * Pairs for auto-wrapping selected text.
 * Key: the character the user types
 * Value: [openingDelimiter, closingDelimiter]
 */
const WRAP_PAIRS: Record<string, [string, string]> = {
    '*': ['*', '*'],
    '_': ['_', '_'],
    '`': ['`', '`'],
    '~': ['~', '~'],
    '"': ['"', '"'],
    "'": ["'", "'"],
    '(': ['(', ')'],
    '[': ['[', ']'],
    '{': ['{', '}'],
};

/**
 * Wraps each selection range with the given open/close delimiters.
 * If there is no selection (cursor only), returns false to let the
 * default key handler insert the character normally.
 */
function wrapSelection(
    view: EditorView,
    open: string,
    close: string
): boolean {
    const { state } = view;

    // Only act when at least one range has a non-empty selection
    const hasSelection = (state.selection.ranges as SelectionRange[]).some((r) => !r.empty);
    if (!hasSelection) return false;

    const changes: { from: number; to: number; insert: string }[] = [];
    const newRanges: { anchor: number; head: number }[] = [];

    for (const range of state.selection.ranges as SelectionRange[]) {
        if (range.empty) {
            // No selection on this range — leave cursor in place
            newRanges.push({ anchor: range.anchor, head: range.head });
            continue;
        }

        const selectedText = state.sliceDoc(range.from, range.to);
        const wrapped = open + selectedText + close;

        changes.push({ from: range.from, to: range.to, insert: wrapped });

        // Keep the inner text selected (excluding the delimiters)
        const anchor = range.from + open.length;
        const head = range.from + open.length + selectedText.length;
        newRanges.push({ anchor, head });
    }

    const tr: Partial<Transaction> = state.update({
        changes,
        selection: EditorSelection.create(
            newRanges.map((r) => EditorSelection.range(r.anchor, r.head)),
            state.selection.mainIndex
        ),
        userEvent: 'input',
    });

    view.dispatch(tr as Transaction);
    return true;
}

/**
 * Extension that intercepts format characters when text is selected,
 * wrapping the selection instead of replacing it.
 *
 * Characters handled: * _ ` ~ " ' ( [ {
 */
export function selectionWrapExtension() {
    const keymapEntries = Object.entries(WRAP_PAIRS).map(([key, [open, close]]) => ({
        key,
        run(view: EditorView): boolean {
            return wrapSelection(view, open, close);
        },
    }));

    return keymap.of(keymapEntries);
}
