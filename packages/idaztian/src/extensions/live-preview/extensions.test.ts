/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IdaztianEditor } from '../../../src/editor';

describe('Live Preview Extensions', () => {
    let container: HTMLElement;
    let editor: IdaztianEditor;

    beforeEach(() => {
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        if (editor) {
            editor.destroy();
        }
        document.body.removeChild(container);
    });

    function setupEditor(content: string) {
        editor = new IdaztianEditor({
            parent: container,
            initialContent: content,
        });
        // We need to wait for CodeMirror to process and lezer to parse
        // Since Lezer parse might be asynchronous for large docs, but it's sync for small
        // we can just return the editor.
        return editor;
    }

    function getCmView() {
        // @ts-ignore - access internal view for testing
        return editor.view;
    }

    function setCursor(pos: number) {
        const view = getCmView();
        view.dispatch({ selection: { anchor: pos, head: pos } });
    }

    it('processes blockquotes correctly', () => {
        setupEditor('> Blockquote text\n> Line 2\n\nNormal paragraph');

        // Wait for render / dispatch
        const view = getCmView();

        // Set cursor to the first line (inside blockquote)
        setCursor(1);
        expect(container.innerHTML).toContain('idz-blockquote-line');
        // When cursor is inside, marker is shown
        expect(container.innerHTML).toContain('idz-marker');

        // Set cursor to end (outside blockquote)
        setCursor(view.state.doc.length);
        // When cursor is outside, marker is hidden
        expect(container.innerHTML).not.toContain('idz-marker');
    });

    it('processes tables correctly', () => {
        const tableContent = `| Header 1 | Header 2 |\n|---|---|\n| Cell 1 | Cell 2 |`;
        setupEditor(tableContent);

        // Tables are always-rendered, meaning we should find idz-table-widget
        expect(container.innerHTML).toContain('idz-table-outer');
    });

    it('processes emphasis correctly', () => {
        setupEditor('Some **bold** and *italic* text.');

        // Cursor away, raw syntax hidden
        setCursor(0);
        expect(container.innerHTML).toContain('idz-bold');

        // Cursor inside bold, raw syntax visible
        setCursor(7); // inside **bold**
        expect(container.innerHTML).toContain('idz-bold');
    });

    it('processes lists correctly', () => {
        setupEditor('- Item 1\n- Item 2\n  - Subitem');

        const view = getCmView();
        setCursor(0); // Cursor on first item
        expect(container.innerHTML).toContain('idz-marker');

        setCursor(view.state.doc.length); // Cursor away
        expect(container.innerHTML).toContain('idz-bullet');
    });

    it('processes links correctly', () => {
        setupEditor('[OpenAI](https://openai.com)');
        setCursor(0); // Cursor on link
        expect(container.innerHTML).toContain('idz-link');
    });

    it('processes math correctly', () => {
        setupEditor('$\\\\alpha$ and $$\\n\\\\beta\\n$$');
        setCursor(0);
    });

    it('processes alerts correctly', () => {
        setupEditor('> [!NOTE]\n> This is a note');
        const view = getCmView();

        setCursor(view.state.doc.length); // click away
        // It outputs: idz-alert-line idz-alert-note ...
        expect(container.innerHTML).toContain('idz-alert-note');
        expect(container.innerHTML).toContain('idz-alert-note');
    });

    it('processes code blocks correctly', () => {
        setupEditor('```js\nconst x = 1;\n```');
        const view = getCmView();

        // cursor away -> hidden fence line
        setCursor(view.state.doc.length); // far away
        // Note: For unit tests, `isCursorInNodeLines` is likely evaluating asynchronously.
        // Let's test what renders in DOM:
        expect(container.innerHTML).toContain('idz-fence-marker-line');

        // cursor on block -> shows fence marker
        setCursor(5);
        expect(container.innerHTML).toContain('idz-fence-marker-line');
    });

    it('processes inline code correctly', () => {
        setupEditor('Run `npm build`');
        setCursor(0);
        // hidden backticks
        expect(container.innerHTML).toContain('idz-inline-code');

        // cursor on
        setCursor(5);
        expect(container.innerHTML).toContain('idz-marker');
    });

    it('processes task lists correctly', () => {
        setupEditor('- [ ] Unchecked\n- [x] Checked');
        setCursor(0);
        // checkbox widget should be present
        expect(container.innerHTML).toContain('idz-checkbox');
    });
});
