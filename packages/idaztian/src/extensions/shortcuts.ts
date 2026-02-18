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
            ...defaultKeymap,
            ...historyKeymap,
            ...searchKeymap,
        ]),
    ];
}
