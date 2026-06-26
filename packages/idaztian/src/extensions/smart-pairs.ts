import { closeBracketsKeymap } from '@codemirror/autocomplete';
import { keymap, EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { EditorState, EditorSelection, Prec } from '@codemirror/state';

/**
 * Smart pairs extension — auto-closes brackets, quotes, backticks,
 * and markdown formatting chars (*, _, ~).
 *
 * Key behaviors:
 * - Auto-closes () [] {} "" '' `` ** __ ~~
 * - Does NOT auto-close inside inline code spans
 * - Works alongside selectionWrapExtension (which handles selected-text wrapping)
 */

// Pairs where open ≠ close
const UNEQUAL_PAIRS: Record<string, string> = {
    '(': ')',
    '[': ']',
    '{': '}',
};

// Pairs where open == close
const EQUAL_CHARS = new Set(['*', '_', '`', '"', "'", '~']);

/**
 * Check if a position is inside an InlineCode syntax node.
 */
function isInsideInlineCode(state: EditorState, pos: number): boolean {
    let inside = false;
    syntaxTree(state).iterate({
        from: Math.max(0, pos - 1),
        to: Math.min(state.doc.length, pos + 1),
        enter(node) {
            if (node.name === 'InlineCode') {
                inside = true;
                return false;
            }
        },
    });
    return inside;
}

const bracketHandler = EditorView.inputHandler.of(
    (view, from, to, insert) => {
        if (view.composing || view.state.readOnly) return false;

        const sel = view.state.selection.main;
        // Only handle single-character insertions at cursor
        if (
            insert.length !== 1 ||
            from !== sel.from ||
            to !== sel.to
        )
            return false;

        const state = view.state;
        const ch = insert;
        const pos = sel.head;

        // Don't auto-close inside inline code — user wants literal chars
        if (isInsideInlineCode(state, pos)) {
            return false;
        }

        const doc = state.doc;

        // Handle unequal pairs: (, [, {
        if (ch in UNEQUAL_PAIRS) {
            const close = UNEQUAL_PAIRS[ch];

            if (sel.empty) {
                const nextChar = state.sliceDoc(pos, Math.min(doc.length, pos + 1));
                // Only auto-pair if next char is whitespace, closing bracket, or end-of-line
                if (!nextChar || /\s/.test(nextChar) || nextChar === ')' || nextChar === ']' || nextChar === '}' || nextChar === ',' || nextChar === '.') {
                    view.dispatch(state.update({
                        changes: { from: pos, insert: ch + close },
                        selection: EditorSelection.cursor(pos + 1),
                        userEvent: 'input.type',
                    }));
                    return true;
                }
            }
            return false;
        }

        // Handle equal pairs: *, _, `, ", ', ~
        if (EQUAL_CHARS.has(ch)) {
            if (sel.empty) {
                // Don't auto-close if preceded by a word char (cursor is inside a word like "don't")
                const beforeChar = state.sliceDoc(Math.max(0, pos - 1), pos);
                const nextChar = state.sliceDoc(pos, Math.min(doc.length, pos + 1));

                // Cases where we skip auto-pairing:
                // - After a word character (e.g., typing ' in "don't")
                // - After the same character (e.g., user already typed * for **bold**)
                if (beforeChar === ch || /\w/.test(beforeChar)) {
                    return false;
                }

                // Auto-pair: surrounded by whitespace, start of line, end of line, or punctuation
                const beforeOk = pos === 0 || /\s/.test(beforeChar) || /[({[<,.;:!?]/.test(beforeChar);
                const afterOk = nextChar === '' || /\s/.test(nextChar) || /[)}\]]/.test(nextChar) || /[,.;:!?]/.test(nextChar);

                if (beforeOk && afterOk) {
                    view.dispatch(state.update({
                        changes: { from: pos, insert: ch + ch },
                        selection: EditorSelection.cursor(pos + 1),
                        userEvent: 'input.type',
                    }));
                    return true;
                }

                // Word-start: before is space/line-start, after is word char
                // Auto-pair so user can type *word* easily
                const afterWord = /\w/.test(nextChar);
                if (beforeOk && afterWord) {
                    view.dispatch(state.update({
                        changes: { from: pos, insert: ch + ch },
                        selection: EditorSelection.cursor(pos + 1),
                        userEvent: 'input.type',
                    }));
                    return true;
                }
            }
            return false;
        }

        return false;
    }
);

export function smartPairsExtension() {
    return [
        Prec.highest(bracketHandler),
        keymap.of(closeBracketsKeymap),
    ];
}
