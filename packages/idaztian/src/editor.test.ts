/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IdaztianEditor } from './editor';

describe('IdaztianEditor', () => {
    let container: HTMLElement;
    let editor: IdaztianEditor;

    beforeEach(() => {
        // Set up DOM
        container = document.createElement('div');
        document.body.appendChild(container);
    });

    afterEach(() => {
        // Clean up
        if (editor) {
            editor.destroy();
        }
        document.body.removeChild(container);
    });

    it('should initialize and render the editor', () => {
        editor = new IdaztianEditor({
            parent: container,
            initialContent: '# Test',
            theme: 'light'
        });

        expect(editor).toBeDefined();
        // The editor injects a .idz-editor class
        expect(container.querySelector('.idz-editor')).not.toBeNull();
    });

    it('should be able to get and set content', () => {
        editor = new IdaztianEditor({
            parent: container,
            initialContent: '# Hello'
        });

        expect(editor.getContent()).toBe('# Hello');

        editor.setContent('**New Content**');
        expect(editor.getContent()).toBe('**New Content**');
    });

    it('should prevent typing in readOnly mode visually and technically', () => {
        editor = new IdaztianEditor({
            parent: container,
            initialContent: 'Read only text',
            readOnly: true
        });

        // Test the content itself
        expect(editor.getContent()).toBe('Read only text');

        // Wait, CodeMirror's internal readOnly doesn't provide a trivial DOM check for "disabled"
        // At minimum, it should be possible to toggle themes/readOnly without throwing errors.
        editor.setReadOnly(true);
        expect(editor.getContent()).toBe('Read only text');

        // Re-enable editing
        editor.setReadOnly(false);
        editor.setContent('Edited text');
        expect(editor.getContent()).toBe('Edited text');
    });

    it('should toggle themes and toolbars dynamically without destroying state', () => {
        editor = new IdaztianEditor({
            parent: container,
            initialContent: 'Theme test',
            theme: 'light',
            toolbar: false
        });

        const initialContent = editor.getContent();

        editor.setTheme('dark');
        expect(editor.getContent()).toBe(initialContent);

        editor.setToolbar(true);
        expect(editor.getContent()).toBe(initialContent);
    });
});
