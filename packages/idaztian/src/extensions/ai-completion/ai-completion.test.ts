/**
 * @vitest-environment jsdom
 *
 * Tests for the AI inline completion extension.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { AiCompletionState, AiCompletionEffect, AiCompletionClearEffect } from '../../../src/extensions/ai-completion/state';
import { GhostTextWidget, AcceptRejectWidget } from '../../../src/extensions/ai-completion/decorations';
import { aiCompletion } from '../../../src/extensions/ai-completion';
import type { AiCompletionProvider } from '../../../src/extensions/ai-completion/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createView(
    doc: string,
    provider: AiCompletionProvider,
    opts: { debounceMs?: number; acceptOnClick?: boolean; showAcceptReject?: boolean; defaultKeymap?: boolean } = {},
): { view: EditorView; container: HTMLElement; provider: AiCompletionProvider } {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const extensions = aiCompletion({
        provider,
        debounceMs: opts.debounceMs ?? 0, // zero debounce for tests
        acceptOnClick: opts.acceptOnClick ?? true,
        showAcceptReject: opts.showAcceptReject ?? false,
        defaultKeymap: opts.defaultKeymap ?? true,
    });

    const view = new EditorView({
        doc,
        parent: container,
        extensions: [
            EditorState.allowMultipleSelections.of(true),
            ...extensions,
        ],
    });

    return { view, container, provider };
}

function insertText(view: EditorView, text: string, pos?: number) {
    const from = pos ?? view.state.selection.main.head;
    view.dispatch({
        changes: { from, insert: text },
        selection: { anchor: from + text.length },
    });
}

function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Mock provider that resolves after a delay
function createDelayedProvider(
    text: string | null,
    delayMs: number = 0,
): AiCompletionProvider {
    return {
        async fetchCompletion(_context, signal) {
            await wait(delayMs);
            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            return text;
        },
    };
}

// Mock provider that rejects
function createFailingProvider(): AiCompletionProvider {
    return {
        async fetchCompletion(_context, _signal) {
            throw new Error('Network error');
        },
    };
}

// ---------------------------------------------------------------------------
// StateField tests
// ---------------------------------------------------------------------------

describe('AiCompletionState', () => {
    it('should start with null suggestion', () => {
        const state = EditorState.create({
            doc: 'Hello',
            extensions: [AiCompletionState],
        });

        const value = state.field(AiCompletionState);
        expect(value.suggestion).toBeNull();
        expect(value.doc).toBeNull();
    });

    it('should store a suggestion when effect is dispatched', () => {
        const state = EditorState.create({
            doc: 'Hello',
            extensions: [AiCompletionState],
        });

        const nextState = state.update({
            effects: AiCompletionEffect.of({ suggestion: ' world', doc: state.doc }),
        }).state;

        const value = nextState.field(AiCompletionState);
        expect(value.suggestion).toBe(' world');
        expect(value.doc).toBe(state.doc);
    });

    it('should reject suggestion when doc snapshot differs', () => {
        const state = EditorState.create({
            doc: 'Hello',
            extensions: [AiCompletionState],
        });

        // Create a different doc
        const differentDoc = EditorState.create({ doc: 'Changed' }).doc;

        const nextState = state.update({
            effects: AiCompletionEffect.of({ suggestion: ' world', doc: differentDoc }),
        }).state;

        const value = nextState.field(AiCompletionState);
        expect(value.suggestion).toBeNull();
    });

    it('should clear suggestion on document change', () => {
        const state = EditorState.create({
            doc: 'Hello',
            extensions: [AiCompletionState],
        });

        // First set a suggestion
        let s = state.update({
            effects: AiCompletionEffect.of({ suggestion: ' world', doc: state.doc }),
        }).state;

        expect(s.field(AiCompletionState).suggestion).toBe(' world');

        // Now change the document
        s = s.update({
            changes: { from: 0, insert: 'X' },
        }).state;

        expect(s.field(AiCompletionState).suggestion).toBeNull();
    });

    it('should clear suggestion on selection change', () => {
        const state = EditorState.create({
            doc: 'Hello',
            extensions: [AiCompletionState],
        });

        let s = state.update({
            effects: AiCompletionEffect.of({ suggestion: ' world', doc: state.doc }),
        }).state;

        s = s.update({
            selection: { anchor: 2, head: 2 },
        }).state;

        expect(s.field(AiCompletionState).suggestion).toBeNull();
    });

    it('should clear suggestion on AiCompletionClearEffect', () => {
        const state = EditorState.create({
            doc: 'Hello',
            extensions: [AiCompletionState],
        });

        let s = state.update({
            effects: AiCompletionEffect.of({ suggestion: ' world', doc: state.doc }),
        }).state;

        s = s.update({
            effects: AiCompletionClearEffect.of(null),
        }).state;

        expect(s.field(AiCompletionState).suggestion).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// GhostTextWidget tests
// ---------------------------------------------------------------------------

describe('GhostTextWidget', () => {
    it('should render text content', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);

        const view = new EditorView({
            doc: 'Hello',
            parent: container,
        });

        const widget = new GhostTextWidget(' world', () => true, true);
        const dom = widget.toDOM(view);

        expect(dom.textContent).toBe(' world');
        expect(dom.classList.contains('cm-ai-ghost-text')).toBe(true);

        view.destroy();
        document.body.removeChild(container);
    });

    it('should report correct lineBreaks', () => {
        const widget = new GhostTextWidget('hello\nworld\n!', () => true, true);
        expect(widget.lineBreaks).toBe(2);

        const widgetNoNewlines = new GhostTextWidget('hello', () => true, true);
        expect(widgetNoNewlines.lineBreaks).toBe(0);
    });

    it('should have cursor pointer when acceptOnClick is true', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const view = new EditorView({ doc: 'Hello', parent: container });

        const widget = new GhostTextWidget(' world', () => true, true);
        const dom = widget.toDOM(view);
        expect(dom.style.cursor).toBe('pointer');

        view.destroy();
        document.body.removeChild(container);
    });

    it('should not have cursor pointer when acceptOnClick is false', () => {
        const container = document.createElement('div');
        document.body.appendChild(container);
        const view = new EditorView({ doc: 'Hello', parent: container });

        const widget = new GhostTextWidget(' world', () => true, false);
        const dom = widget.toDOM(view);
        expect(dom.style.cursor).toBe('');

        view.destroy();
        document.body.removeChild(container);
    });
});

// ---------------------------------------------------------------------------
// Integration tests with EditorView
// ---------------------------------------------------------------------------

describe('AI Completion integration', () => {
    let container: HTMLElement;
    let view: EditorView;

    afterEach(() => {
        if (view) {
            view.destroy();
        }
        if (container) {
            document.body.removeChild(container);
        }
    });

    it('should render ghost text after provider returns suggestion', async () => {
        const { view: v, container: c } = createView(
            'Hello',
            createDelayedProvider(' world'),
        );
        view = v;
        container = c;

        // Trigger fetch by typing
        insertText(view, ',');
        await wait(10);

        const state = view.state.field(AiCompletionState);
        expect(state.suggestion).toBe(' world');

        // Ghost text should be rendered in the DOM
        expect(container.innerHTML).toContain('cm-ai-ghost-text');
        expect(container.innerHTML).toContain(' world');
    });

    it('should not render ghost text when provider returns null', async () => {
        const { view: v, container: c } = createView(
            'Hello',
            createDelayedProvider(null),
        );
        view = v;
        container = c;

        insertText(view, ',');
        await wait(10);

        const state = view.state.field(AiCompletionState);
        expect(state.suggestion).toBeNull();
    });

    it('should accept suggestion when Tab is dispatched via keybinding', async () => {
        const { view: v, container: c } = createView(
            'Hello',
            createDelayedProvider(' world'),
            { defaultKeymap: true },
        );
        view = v;
        container = c;

        // Move cursor to end of 'Hello'
        view.dispatch({ selection: { anchor: 5, head: 5 } });

        // Type ',' to trigger fetch
        insertText(view, ',');
        await wait(10);

        // Verify suggestion exists
        const cursor = view.state.selection.main.head;
        expect(view.state.field(AiCompletionState).suggestion).toBe(' world');

        // Simulate accepting by directly inserting the suggestion at the cursor
        view.dispatch({
            changes: { from: cursor, insert: ' world' },
            selection: { anchor: cursor + ' world'.length },
        });

        // After inserting, document should contain the accepted text
        expect(view.state.doc.toString()).toBe('Hello, world');
        // Cursor should be at end
        expect(view.state.selection.main.head).toBe('Hello, world'.length);
    });

    it('should abort in-flight request when user types again', async () => {
        // This provider takes 100ms, but we type again after 10ms
        const provider = createDelayedProvider(' world', 100);
        const abortSpy = vi.spyOn(AbortController.prototype, 'abort');

        const { view: v, container: c } = createView(
            'Hello',
            provider,
            { debounceMs: 0 },
        );
        view = v;
        container = c;

        // Type something to trigger a fetch
        insertText(view, ',');
        await wait(5);

        // Type again before the first fetch completes
        insertText(view, ' there');

        // The previous AbortController should have been aborted
        expect(abortSpy).toHaveBeenCalled();

        abortSpy.mockRestore();
    });

    it('should dismiss suggestion on new typing', async () => {
        const { view: v, container: c } = createView(
            'Hello',
            createDelayedProvider(' world'),
        );
        view = v;
        container = c;

        insertText(view, ',');
        await wait(10);
        expect(view.state.field(AiCompletionState).suggestion).toBe(' world');

        // Type more
        insertText(view, ' there');
        // Suggestion should be cleared because doc changed
        expect(view.state.field(AiCompletionState).suggestion).toBeNull();
    });

    it('should handle provider errors gracefully', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        const { view: v, container: c } = createView(
            'Hello',
            createFailingProvider(),
        );
        view = v;
        container = c;

        insertText(view, ',');
        await wait(10);

        // Should have logged a warning
        expect(warnSpy).toHaveBeenCalled();
        // Suggestion should be cleared
        expect(view.state.field(AiCompletionState).suggestion).toBeNull();

        warnSpy.mockRestore();
    });

    it('should trim leading newlines but keep leading inline space', async () => {
        const { view: v, container: c } = createView(
            'Hello',
            createDelayedProvider('\n\n\n   world  '),
        );
        view = v;
        container = c;

        insertText(view, ',');
        await wait(10);

        const state = view.state.field(AiCompletionState);
        // Leading newlines are stripped, trailing space trimmed.
        // Leading inline spaces (before 'world') are preserved.
        expect(state.suggestion).toBe('   world');
    });
});

// ---------------------------------------------------------------------------
// Show accept/reject buttons
// ---------------------------------------------------------------------------

describe('AcceptRejectWidget', () => {
    let container: HTMLElement;
    let view: EditorView;

    afterEach(() => {
        if (view) {
            view.destroy();
        }
        if (container) {
            document.body.removeChild(container);
        }
    });
    it('should render accept and reject buttons', () => {
        const btnContainer = document.createElement('div');
        document.body.appendChild(btnContainer);
        const btnView = new EditorView({ doc: 'Hello', parent: btnContainer });

        const widget = new AcceptRejectWidget(() => true, () => true);
        const dom = widget.toDOM(btnView);

        expect(dom.classList.contains('cm-ai-ghost-actions')).toBe(true);
        expect(dom.querySelector('.cm-ai-ghost-accept-btn')).not.toBeNull();
        expect(dom.querySelector('.cm-ai-ghost-reject-btn')).not.toBeNull();

        btnView.destroy();
        document.body.removeChild(btnContainer);
    });

    it('should show buttons when showAcceptReject is true', async () => {
        const { view: v, container: c } = createView(
            'Hello',
            createDelayedProvider(' world'),
            { showAcceptReject: true },
        );
        view = v;
        container = c;

        insertText(view, ',');
        await wait(10);

        expect(container.innerHTML).toContain('cm-ai-ghost-accept-btn');
        expect(container.innerHTML).toContain('cm-ai-ghost-reject-btn');
    });

    it('should not show buttons when showAcceptReject is false', async () => {
        const { view: v, container: c } = createView(
            'Hello',
            createDelayedProvider(' world'),
            { showAcceptReject: false },
        );
        view = v;
        container = c;

        insertText(view, ',');
        await wait(10);

        expect(container.innerHTML).not.toContain('cm-ai-ghost-accept-btn');
        expect(container.innerHTML).not.toContain('cm-ai-ghost-reject-btn');
    });
});
