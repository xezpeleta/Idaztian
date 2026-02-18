import { Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { isCursorInRange } from '../../utils/cursor';

/**
 * Live-preview extension for links and images.
 *
 * Links [text](url):
 * - Cursor away: shows only styled link text, hides `[`, `](url)`
 * - Cursor on: shows full raw syntax
 *
 * Images ![alt](url):
 * - Cursor away: renders the image inline
 * - Cursor on: shows raw syntax
 */

class ImageWidget extends WidgetType {
    constructor(
        private readonly src: string,
        private readonly alt: string
    ) {
        super();
    }

    eq(other: ImageWidget): boolean {
        return other.src === this.src && other.alt === this.alt;
    }

    toDOM(): HTMLElement {
        const img = document.createElement('img');
        img.src = this.src;
        img.alt = this.alt;
        img.className = 'idz-image';
        img.style.maxWidth = '100%';
        img.style.display = 'block';
        img.style.margin = '0.5em 0';
        return img;
    }

    ignoreEvent(): boolean {
        return false;
    }
}

function buildLinkDecorations(view: EditorView): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    const state = view.state;

    for (const { from, to } of view.visibleRanges) {
        syntaxTree(state).iterate({
            from,
            to,
            enter(node) {
                // Inline images: ![alt](url)
                if (node.name === 'Image') {
                    const cursorOn = isCursorInRange(state, node.from, node.to);
                    if (!cursorOn) {
                        const raw = state.sliceDoc(node.from, node.to);
                        const match = raw.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
                        if (match) {
                            const [, alt, src] = match;
                            // Replace entire image syntax with rendered image widget
                            decorations.push(
                                Decoration.replace({
                                    widget: new ImageWidget(src, alt),
                                    block: false,
                                }).range(node.from, node.to)
                            );
                        }
                    } else {
                        decorations.push(
                            Decoration.mark({ class: 'idz-image-syntax' }).range(node.from, node.to)
                        );
                    }
                    return false; // Don't descend into image children
                }

                // Inline links: [text](url)
                if (node.name === 'Link') {
                    const cursorOn = isCursorInRange(state, node.from, node.to);
                    const raw = state.sliceDoc(node.from, node.to);
                    const match = raw.match(/^\[([^\]]*)\]\(([^)]+)\)$/);
                    if (!match) return;

                    const [, ,] = match;
                    // Find positions of [ ] ( )
                    const openBracket = node.from; // [
                    const closeBracket = raw.indexOf(']');
                    const openParen = closeBracket + 1; // (
                    const closeParen = raw.length - 1; // )

                    if (!cursorOn) {
                        // Hide [ and ](url)
                        decorations.push(
                            Decoration.replace({}).range(openBracket, openBracket + 1)
                        );
                        decorations.push(
                            Decoration.replace({}).range(node.from + openParen, node.from + closeParen + 1)
                        );
                        // Style the link text
                        decorations.push(
                            Decoration.mark({ class: 'idz-link' }).range(
                                openBracket + 1,
                                node.from + closeBracket
                            )
                        );
                    } else {
                        // Show full syntax, styled
                        decorations.push(
                            Decoration.mark({ class: 'idz-link-syntax' }).range(node.from, node.to)
                        );
                    }
                    return false;
                }
            },
        });
    }

    decorations.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);
    return Decoration.set(decorations, true);
}

const linksPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildLinkDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.selectionSet || update.viewportChanged) {
                this.decorations = buildLinkDecorations(update.view);
            }
        }
    },
    { decorations: (v) => v.decorations }
);

export function linksExtension() {
    return [linksPlugin];
}
