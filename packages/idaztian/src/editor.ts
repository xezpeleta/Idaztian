import { EditorState, Extension, Compartment } from '@codemirror/state';
import { EditorView, placeholder, lineNumbers } from '@codemirror/view';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { search } from '@codemirror/search';
import { IdaztianConfig, DEFAULT_CONFIG } from './config';
import { EventEmitter, IdaztianEventMap } from './events';
import { buildExtensions } from './extensions';
import { shortcutsExtension } from './extensions/shortcuts';
import { selectionWrapExtension } from './extensions/selection-wrap';
import { ilunabarDark } from './theme/ilunabar-dark';
import { wordCount, charCount } from './utils/markdown';

/**
 * IdaztianEditor — the main editor class.
 *
 * Usage:
 * ```ts
 * const editor = new IdaztianEditor({
 *   parent: document.getElementById('editor'),
 *   initialContent: '# Hello',
 *   onChange: (content) => console.log(content),
 * });
 * ```
 */
export class IdaztianEditor {
    private view: EditorView;
    private emitter: EventEmitter;
    private config: IdaztianConfig;
    private readOnlyCompartment = new Compartment();

    constructor(config: IdaztianConfig) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.emitter = new EventEmitter();

        // Wire config callbacks to event emitter
        if (config.onChange) this.emitter.on('change', config.onChange);
        if (config.onSave) this.emitter.on('save', config.onSave);
        if (config.onSelectionChange) this.emitter.on('selectionChange', config.onSelectionChange);

        const extensions = this.buildAllExtensions();

        const state = EditorState.create({
            doc: this.config.initialContent ?? '',
            extensions,
        });

        this.view = new EditorView({
            state,
            parent: config.parent,
            dispatch: (tr) => {
                this.view.update([tr]);
                if (tr.docChanged) {
                    this.emitter.emit('change', this.view.state.doc.toString());
                }
                if (tr.selection) {
                    const { from, to } = this.view.state.selection.main;
                    this.emitter.emit('selectionChange', {
                        from,
                        to,
                        text: this.view.state.sliceDoc(from, to),
                    });
                }
            },
        });

        // Focus/blur events
        this.view.dom.addEventListener('focus', () => this.emitter.emit('focus'));
        this.view.dom.addEventListener('blur', () => this.emitter.emit('blur'));

        // Add editor class for styling
        this.view.dom.classList.add('idz-editor');

        this.emitter.emit('ready');
    }

    private buildAllExtensions(): Extension[] {
        const cfg = this.config;
        const extConfig = { ...DEFAULT_CONFIG.extensions, ...cfg.extensions };

        return [
            // Core markdown language support
            markdown({
                base: markdownLanguage,
                codeLanguages: languages,
                addKeymap: false,
            }),

            // Search
            search({ top: true }),

            // Read-only compartment
            this.readOnlyCompartment.of(
                EditorState.readOnly.of(cfg.readOnly ?? false)
            ),

            // Line numbers (optional)
            ...(cfg.lineNumbers ? [lineNumbers()] : []),

            // Placeholder
            placeholder(cfg.placeholder ?? DEFAULT_CONFIG.placeholder),

            // Live-preview extensions
            ...buildExtensions(extConfig),

            // Selection wrap: typing format chars wraps selected text
            selectionWrapExtension(),

            // Keyboard shortcuts
            ...shortcutsExtension(cfg.onSave),

            // Theme
            ...ilunabarDark(),

            // Base editor styling
            EditorView.lineWrapping,
        ];
    }

    // ── Content ──────────────────────────────────────────────────────────

    getContent(): string {
        return this.view.state.doc.toString();
    }

    setContent(markdown: string): void {
        this.view.dispatch({
            changes: {
                from: 0,
                to: this.view.state.doc.length,
                insert: markdown,
            },
        });
    }

    insertAt(position: number, text: string): void {
        this.view.dispatch({
            changes: { from: position, insert: text },
        });
    }

    replaceSelection(text: string): void {
        const { from, to } = this.view.state.selection.main;
        this.view.dispatch({
            changes: { from, to, insert: text },
        });
    }

    // ── State ────────────────────────────────────────────────────────────

    getSelection(): { from: number; to: number; text: string } {
        const { from, to } = this.view.state.selection.main;
        return { from, to, text: this.view.state.sliceDoc(from, to) };
    }

    getCursorPosition(): { line: number; ch: number } {
        const head = this.view.state.selection.main.head;
        const line = this.view.state.doc.lineAt(head);
        return { line: line.number, ch: head - line.from };
    }

    focus(): void {
        this.view.focus();
    }

    blur(): void {
        this.view.dom.blur();
    }

    // ── Configuration ────────────────────────────────────────────────────

    setReadOnly(readOnly: boolean): void {
        this.view.dispatch({
            effects: this.readOnlyCompartment.reconfigure(
                EditorState.readOnly.of(readOnly)
            ),
        });
    }

    // ── History ──────────────────────────────────────────────────────────

    undo(): void {
        import('@codemirror/commands').then(({ undo }) => undo(this.view));
    }

    redo(): void {
        import('@codemirror/commands').then(({ redo }) => redo(this.view));
    }

    // ── Utilities ────────────────────────────────────────────────────────

    getWordCount(): number {
        return wordCount(this.getContent());
    }

    getCharacterCount(): number {
        return charCount(this.getContent());
    }

    // ── Events ───────────────────────────────────────────────────────────

    on<K extends keyof IdaztianEventMap>(
        event: K,
        handler: (...args: IdaztianEventMap[K]) => void
    ): this {
        this.emitter.on(event, handler);
        return this;
    }

    off<K extends keyof IdaztianEventMap>(
        event: K,
        handler: (...args: IdaztianEventMap[K]) => void
    ): this {
        this.emitter.off(event, handler);
        return this;
    }

    // ── Lifecycle ────────────────────────────────────────────────────────

    destroy(): void {
        this.emitter.removeAllListeners();
        this.view.destroy();
    }
}
