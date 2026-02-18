import { keymap } from '@codemirror/view';
import { defaultKeymap, historyKeymap, history, indentWithTab } from '@codemirror/commands';
import { searchKeymap } from '@codemirror/search';
import { EditorState, Transaction } from '@codemirror/state';
import { toggleWrap, setLinePrefix } from '../utils/markdown';

/**
 * Keyboard shortcuts for Idaztian editor.
 */

const HEADING_STRIP_PATTERN = /^#{1,6}\s/;

function makeHeadingCommand(level: number) {
    return (view: { state: EditorState; dispatch: (tr: Transaction) => void }): boolean => {
        const prefix = '#'.repeat(level) + ' ';
        return setLinePrefix(view.state, view.dispatch, prefix, [HEADING_STRIP_PATTERN]);
    };
}

function makeBulletListCommand(
    view: { state: EditorState; dispatch: (tr: Transaction) => void }
): boolean {
    return setLinePrefix(view.state, view.dispatch, '- ', [/^[-*+]\s/, /^\d+\.\s/]);
}

function makeOrderedListCommand(
    view: { state: EditorState; dispatch: (tr: Transaction) => void }
): boolean {
    return setLinePrefix(view.state, view.dispatch, '1. ', [/^[-*+]\s/, /^\d+\.\s/]);
}

function makeTaskListCommand(
    view: { state: EditorState; dispatch: (tr: Transaction) => void }
): boolean {
    return setLinePrefix(view.state, view.dispatch, '- [ ] ', [/^[-*+](\s\[[ xX]\])?\s/, /^\d+\.\s/]);
}

/**
 * On Enter, continue the current list item:
 * - Bullet list  → insert `\n<indent>- ` (or `* ` / `+ ` matching the original)
 * - Ordered list → insert `\n<indent><n+1>. `
 * - Task list   → insert `\n<indent>- [ ] `
 * - Empty marker → remove the marker and exit the list
 * Returns false when not on a list line, letting defaultKeymap handle it.
 */
function continueListCommand(
    view: { state: EditorState; dispatch: (tr: Transaction) => void }
): boolean {
    const state = view.state;
    const { head } = state.selection.main;
    const line = state.doc.lineAt(head);
    const text = line.text;

    // Task list: - [ ] text
    const taskMatch = text.match(/^(\s*)([-*+])\s+\[([ xX])\]\s?(.*)$/);
    if (taskMatch) {
        const indent = taskMatch[1];
        const marker = taskMatch[2];
        const content = taskMatch[4];
        // Empty task item → exit list
        if (!content.trim()) {
            view.dispatch(state.update({
                changes: { from: line.from, to: line.to, insert: '' },
                selection: { anchor: line.from },
                userEvent: 'input',
            }));
            return true;
        }
        const insert = `\n${indent}${marker} [ ] `;
        view.dispatch(state.update({
            changes: { from: head, to: head, insert },
            selection: { anchor: head + insert.length },
            userEvent: 'input',
        }));
        return true;
    }

    // Bullet list: - text, * text, + text
    const bulletMatch = text.match(/^(\s*)([-*+])\s(.*)$/);
    if (bulletMatch) {
        const indent = bulletMatch[1];
        const marker = bulletMatch[2];
        const content = bulletMatch[3];
        // Empty bullet → exit list
        if (!content.trim()) {
            view.dispatch(state.update({
                changes: { from: line.from, to: line.to, insert: '' },
                selection: { anchor: line.from },
                userEvent: 'input',
            }));
            return true;
        }
        const insert = `\n${indent}${marker} `;
        view.dispatch(state.update({
            changes: { from: head, to: head, insert },
            selection: { anchor: head + insert.length },
            userEvent: 'input',
        }));
        return true;
    }

    // Ordered list: 1. text
    const orderedMatch = text.match(/^(\s*)(\d+)\.\s(.*)$/);
    if (orderedMatch) {
        const indent = orderedMatch[1];
        const num = parseInt(orderedMatch[2], 10);
        const content = orderedMatch[3];
        // Empty ordered item → exit list
        if (!content.trim()) {
            view.dispatch(state.update({
                changes: { from: line.from, to: line.to, insert: '' },
                selection: { anchor: line.from },
                userEvent: 'input',
            }));
            return true;
        }
        const insert = `\n${indent}${num + 1}. `;
        view.dispatch(state.update({
            changes: { from: head, to: head, insert },
            selection: { anchor: head + insert.length },
            userEvent: 'input',
        }));
        return true;
    }

    return false;
}

export function shortcutsExtension(onSave?: (content: string) => void) {
    return [
        history(),
        keymap.of([
            // Bold: Ctrl+B
            {
                key: 'Mod-b',
                run(view) {
                    return toggleWrap(view.state, view.dispatch, '**');
                },
            },
            // Italic: Ctrl+I
            {
                key: 'Mod-i',
                run(view) {
                    return toggleWrap(view.state, view.dispatch, '*');
                },
            },
            // Inline code: Ctrl+E
            {
                key: 'Mod-e',
                run(view) {
                    return toggleWrap(view.state, view.dispatch, '`');
                },
            },
            // Strikethrough: Ctrl+Shift+K
            {
                key: 'Mod-Shift-k',
                run(view) {
                    return toggleWrap(view.state, view.dispatch, '~~');
                },
            },
            // Insert link: Ctrl+K
            {
                key: 'Mod-k',
                run(view) {
                    const { from, to } = view.state.selection.main;
                    const selectedText = view.state.sliceDoc(from, to);
                    const linkText = selectedText || 'link text';
                    const insert = `[${linkText}](url)`;
                    view.dispatch(view.state.update({
                        changes: { from, to, insert },
                        selection: { anchor: from + linkText.length + 3, head: from + insert.length - 1 },
                    }));
                    return true;
                },
            },
            // Headings: Ctrl+1 through Ctrl+6
            { key: 'Mod-1', run: makeHeadingCommand(1) },
            { key: 'Mod-2', run: makeHeadingCommand(2) },
            { key: 'Mod-3', run: makeHeadingCommand(3) },
            { key: 'Mod-4', run: makeHeadingCommand(4) },
            { key: 'Mod-5', run: makeHeadingCommand(5) },
            { key: 'Mod-6', run: makeHeadingCommand(6) },
            // Bullet list: Ctrl+Shift+8
            { key: 'Mod-Shift-8', run: makeBulletListCommand },
            // Ordered list: Ctrl+Shift+7
            { key: 'Mod-Shift-7', run: makeOrderedListCommand },
            // Task list: Ctrl+Shift+9
            { key: 'Mod-Shift-9', run: makeTaskListCommand },
            // Save: Ctrl+S
            {
                key: 'Mod-s',
                run(view) {
                    onSave?.(view.state.doc.toString());
                    return true;
                },
                preventDefault: true,
            },
            // Tab for indentation
            indentWithTab,
            // Enter: continue list items (bullet, ordered, task)
            { key: 'Enter', run: continueListCommand },
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
        ]),
    ];
}
