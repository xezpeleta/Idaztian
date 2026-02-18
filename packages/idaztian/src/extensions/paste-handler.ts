import { EditorView } from '@codemirror/view';
import TurndownService from 'turndown';

/**
 * Paste handler extension — converts pasted HTML to Markdown.
 *
 * Primary use case: copy a fragment from a website, paste into Idaztian,
 * and have it automatically converted to clean markdown.
 *
 * Uses `turndown` for reliable HTML→Markdown conversion.
 */

// Singleton TurndownService instance, created lazily
let td: TurndownService | null = null;

function getTurndown(): TurndownService {
    if (!td) {
        td = new TurndownService({
            headingStyle: 'atx',
            hr: '---',
            bulletListMarker: '-',
            codeBlockStyle: 'fenced',
            fence: '```',
            emDelimiter: '*',
            strongDelimiter: '**',
            linkStyle: 'inlined',
        });

        // Add strikethrough support
        td.addRule('strikethrough', {
            filter: ['del', 's', 'strike'] as (keyof HTMLElementTagNameMap)[],
            replacement: (content: string) => `~~${content}~~`,
        });
    }
    return td;
}

export function pasteHandlerExtension() {
    return EditorView.domEventHandlers({
        paste(event, view) {
            const clipboardData = event.clipboardData;
            if (!clipboardData) return false;

            // Only intercept if HTML is available (plain text paste passes through)
            const html = clipboardData.getData('text/html');
            if (!html) return false;

            const plainText = clipboardData.getData('text/plain');

            event.preventDefault();

            let markdown: string;
            try {
                markdown = getTurndown().turndown(html).trim();
            } catch {
                // Fallback to plain text if conversion fails
                markdown = plainText;
            }

            // If the converted markdown is essentially the same as plain text,
            // just use plain text (avoids spurious conversions)
            if (!markdown || markdown === plainText) {
                markdown = plainText;
            }

            const { from, to } = view.state.selection.main;
            view.dispatch(view.state.update({
                changes: { from, to, insert: markdown },
                selection: { anchor: from + markdown.length },
                userEvent: 'input.paste',
            }));

            return true;
        },
    });
}
