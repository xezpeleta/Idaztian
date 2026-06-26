import { Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { isCursorInRange } from '../../utils/cursor';
import { hideRange } from '../../utils/decoration';

/**
 * Live-preview extension for links and images.
 *
 * Links [text](url):
 * - Cursor away: shows only styled link text, hides `[` and `](url)`
 * - Cursor on: shows full raw syntax
 *
 * Images ![alt](url):
 * - Cursor away: renders the image inline
 * - Cursor on: shows raw syntax + image preview
 */

class ImageWidget extends WidgetType {
    constructor(
        private readonly src: string,
        private readonly alt: string
    ) {
        super();
    }

    eq(other: WidgetType): boolean {
        return other instanceof ImageWidget &&
            other.src === this.src && other.alt === this.alt;
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

    coordsAt(dom: HTMLElement, _pos: number): { left: number; right: number; top: number; bottom: number } | null {
        const rect = dom.getBoundingClientRect();
        return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    }

    get estimatedHeight(): number {
        // Default estimate — the actual height is determined by the image.
        // coordsAt provides accurate rect during mouse click resolution.
        // A reasonable default prevents excessive height oracle drift.
        return 300;
    }

    ignoreEvent(): boolean {
        return false;
    }
}

/**
 * Given a Link or Image node, find the positions of:
 * - openBracket: position of `[`
 * - closeBracket: position of `]`  (right after the bracket)
 * - openParen: position of `(`  (right before paren)
 * - closeParen: position of `)`  (right after the paren)
 *
 * Uses the syntax tree's child nodes for precise parsing,
 * avoiding fragile string.indexOf() which breaks when link
 * text itself contains `]` or URL contains `)`.
 */
function findLinkPositions(
    state: { sliceDoc: (a: number, b: number) => string; doc: { length: number } },
    nodeFrom: number,
    nodeTo: number
): { openBracket: number; closeBracket: number; openParen: number; closeParen: number } | null {
    const raw = state.sliceDoc(nodeFrom, nodeTo);
    // We can't use child nodes from ViewPlugin syntaxTree directly for Link children,
    // but we know the structure: !?[...](...)
    const isImage = raw.startsWith('![');
    const startIdx = isImage ? 2 : 0;

    const openBracket = nodeFrom + startIdx; // position of [

    // Find the matching ] — count nesting of [ ] inside
    let bracketDepth = 0;
    let closeBracketOffset = -1;
    for (let i = startIdx; i < raw.length; i++) {
        if (raw[i] === '[') bracketDepth++;
        else if (raw[i] === ']') {
            bracketDepth--;
            if (bracketDepth === 0) {
                closeBracketOffset = i;
                break;
            }
        }
    }

    if (closeBracketOffset === -1) return null;
    const closeBracket = nodeFrom + closeBracketOffset;

    // After ], there must be (
    if (closeBracketOffset + 1 >= raw.length || raw[closeBracketOffset + 1] !== '(') return null;
    const openParen = nodeFrom + closeBracketOffset + 1;

    // Find the matching ) — count nesting of ( ) inside
    let parenDepth = 0;
    let closeParenOffset = -1;
    for (let i = closeBracketOffset + 1; i < raw.length; i++) {
        if (raw[i] === '(') parenDepth++;
        else if (raw[i] === ')') {
            parenDepth--;
            if (parenDepth === 0) {
                closeParenOffset = i;
                break;
            }
        }
    }

    if (closeParenOffset === -1) return null;
    const closeParen = nodeFrom + closeParenOffset;

    return { openBracket, closeBracket, openParen, closeParen };
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
                    const raw = state.sliceDoc(node.from, node.to);
                    const match = raw.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
                    if (!match) return false;

                    const [, alt, src] = match;
                    const cursorOn = isCursorInRange(state, node.from, node.to);

                    if (!cursorOn) {
                        // Replace entire image syntax with rendered image widget
                        decorations.push(
                            Decoration.replace({
                                widget: new ImageWidget(src, alt),
                                block: false,
                            }).range(node.from, node.to)
                        );
                    } else {
                        // Show raw syntax and keep the image visible below it
                        decorations.push(
                            Decoration.mark({ class: 'idz-image-syntax' }).range(node.from, node.to)
                        );
                        decorations.push(
                            Decoration.widget({
                                widget: new ImageWidget(src, alt),
                                side: 1,
                            }).range(node.to)
                        );
                    }
                    return false;
                }

                // Inline links: [text](url)
                if (node.name === 'Link') {
                    const cursorOn = isCursorInRange(state, node.from, node.to);

                    // Parse positions using nesting-aware algorithm
                    const positions = findLinkPositions(
                        { sliceDoc: state.sliceDoc.bind(state), doc: state.doc },
                        node.from,
                        node.to
                    );
                    if (!positions) return;

                    const { openBracket, closeBracket, openParen, closeParen } = positions;

                    if (!cursorOn) {
                        // Hide `[` — single char, space-preserving
                        decorations.push(hideRange(openBracket, openBracket + 1));

                        // Hide `](url)` — replace with empty (the URL should not be visible)
                        // closeBracket + 1 = position of `(`, closeParen is position of `)`
                        // We want to hide `]` through `)` inclusive
                        decorations.push(
                            Decoration.replace({}).range(closeBracket, closeParen + 1)
                        );

                        // Style the link text as an anchor
                        decorations.push(
                            Decoration.mark({
                                tagName: 'a',
                                class: 'idz-link',
                                attributes: {
                                    href: state.sliceDoc(openParen + 1, closeParen),
                                    target: '_blank',
                                    rel: 'noopener noreferrer'
                                }
                            }).range(openBracket + 1, closeBracket)
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
    return [
        linksPlugin,
        EditorView.domEventHandlers({
            mousedown(event) {
                // Only handle left clicks
                if (event.button === 0) {
                    const target = event.target as HTMLElement;
                    const link = target.closest('a.idz-link');
                    if (link) {
                        event.preventDefault(); // Prevent CM from moving cursor
                        const href = link.getAttribute('href');
                        if (href) {
                            window.open(href, link.getAttribute('target') || '_self');
                        }
                        return true;
                    }
                }
                return false;
            }
        })
    ];
}
