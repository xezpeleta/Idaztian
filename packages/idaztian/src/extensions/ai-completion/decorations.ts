/**
 * AI Inline Completion — Decorations
 *
 * Widget classes for rendering ghost text inline and
 * optional accept/reject indicator buttons.
 */

import { WidgetType } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';

/**
 * Inline ghost text widget.
 *
 * Renders the suggested completion as dimmed, italic text
 * after the cursor. Clicking it accepts the suggestion.
 */
export class GhostTextWidget extends WidgetType {
    private readonly text: string;
    private readonly onAccept: (view: EditorView) => boolean;
    private readonly acceptOnClick: boolean;

    constructor(
        text: string,
        onAccept: (view: EditorView) => boolean,
        acceptOnClick: boolean,
    ) {
        super();
        this.text = text;
        this.onAccept = onAccept;
        this.acceptOnClick = acceptOnClick;
    }

    toDOM(view: EditorView): HTMLElement {
        const span = document.createElement('span');
        span.className = 'cm-ai-ghost-text';
        span.textContent = this.text;

        if (this.acceptOnClick) {
            span.style.cursor = 'pointer';
            span.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.onAccept(view);
            });
        }

        return span;
    }

    /**
     * Tell CodeMirror how many line breaks this widget spans.
     * Required for correct cursor positioning when the ghost
     * text contains newlines.
     */
    get lineBreaks(): number {
        return (this.text.match(/\n/g) || []).length;
    }

    eq(other: GhostTextWidget): boolean {
        return other.text === this.text;
    }

    ignoreEvent(): boolean {
        // Don't intercept events, let them pass through
        return false;
    }
}

/**
 * Small accept/reject indicator widget shown after the ghost text.
 * Provides clickable Tab/Escape hints.
 */
export class AcceptRejectWidget extends WidgetType {
    private readonly onAccept: (view: EditorView) => boolean;
    private readonly onReject: (view: EditorView) => boolean;

    constructor(
        onAccept: (view: EditorView) => boolean,
        onReject: (view: EditorView) => boolean,
    ) {
        super();
        this.onAccept = onAccept;
        this.onReject = onReject;
    }

    toDOM(view: EditorView): HTMLElement {
        const container = document.createElement('span');
        container.className = 'cm-ai-ghost-actions';

        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'cm-ai-ghost-accept-btn';
        acceptBtn.textContent = 'Tab';
        acceptBtn.title = 'Accept suggestion (Tab)';
        acceptBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.onAccept(view);
        });

        const rejectBtn = document.createElement('button');
        rejectBtn.className = 'cm-ai-ghost-reject-btn';
        rejectBtn.textContent = '✕';
        rejectBtn.title = 'Dismiss suggestion (Escape)';
        rejectBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.onReject(view);
        });

        container.appendChild(acceptBtn);
        container.appendChild(rejectBtn);

        return container;
    }

    eq(other: AcceptRejectWidget): boolean {
        // Always re-render since callbacks may differ
        return other === this;
    }

    ignoreEvent(): boolean {
        return false;
    }
}
