import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { toggleWrap, setLinePrefix } from '../utils/markdown';

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
