import { Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { isCursorInRange, isCursorInNodeLines } from '../../utils/cursor';

/**
 * Live-preview extension for inline code and fenced code blocks.
 *
 * Inline code `code`:
 * - Cursor away: hides backticks, applies code styling
 * - Cursor on: shows backticks, keeps styling
 *
 * Fenced code blocks ```lang ... ```:
 * - Uses Decoration.line() on every line to avoid CM6's restriction that
 *   Decoration.replace() / Decoration.mark() must not span line breaks in plugins.
 * - CSS classes (first/middle/last) stitch lines into a unified visual block.
 * - Injects a copy-to-clipboard button on the top-right of closed blocks.
 */

// ── Global toast CSS (injected once) ─────────────────────────────────────────
// CM6 EditorView.theme() is scoped to the editor DOM, so we inject toast styles
// globally via a <style> tag. This runs once when the module is first imported.
(function injectToastStyles() {
    if (document.getElementById('idz-toast-styles')) return;
    const style = document.createElement('style');
    style.id = 'idz-toast-styles';
    style.textContent = `
        .idz-toast {
            position: fixed;
            bottom: 1.5rem;
            right: 1.5rem;
            z-index: 9999;
            background: #2b2b2b;
            color: #dcddde;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            padding: 0.6em 1.1em;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 0.875rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.5);
            pointer-events: none;
            opacity: 0;
            transform: translateY(0.5rem);
            transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .idz-toast--visible {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    document.head.appendChild(style);
})();

let activeToast: HTMLElement | null = null;
let toastTimeout: ReturnType<typeof setTimeout> | null = null;

function showCopiedToast() {
    // Remove any existing toast immediately
    if (activeToast) {
        activeToast.remove();
        activeToast = null;
    }
    if (toastTimeout) {
        clearTimeout(toastTimeout);
        toastTimeout = null;
    }

    const toast = document.createElement('div');
    toast.className = 'idz-toast';
    toast.textContent = 'Copied to your clipboard';
    document.body.appendChild(toast);
    activeToast = toast;

    // Trigger enter animation
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add('idz-toast--visible');
        });
    });

    toastTimeout = setTimeout(() => {
        toast.classList.remove('idz-toast--visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        activeToast = null;
        toastTimeout = null;
    }, 2500);
}

// ── Copy button widget ────────────────────────────────────────────────────────

class CopyButtonWidget extends WidgetType {
    constructor(
        private readonly codeText: string,
        private readonly lang: string
    ) {
        super();
    }

    eq(other: CopyButtonWidget): boolean {
        return other.codeText === this.codeText && other.lang === this.lang;
    }

    toDOM(): HTMLElement {
        const btn = document.createElement('button');
        btn.className = 'idz-copy-btn';
        btn.setAttribute('aria-label', 'Copy code to clipboard');
        btn.setAttribute('type', 'button');

        // Label: language name or clipboard SVG icon
        const labelSpan = document.createElement('span');
        labelSpan.className = 'idz-copy-btn__label';
        if (this.lang) {
            labelSpan.textContent = this.lang;
        } else {
            // Clipboard icon (SVG)
            labelSpan.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
        }

        // "Copy" hint that appears on hover
        const copyHint = document.createElement('span');
        copyHint.className = 'idz-copy-btn__hint';
        copyHint.textContent = 'Copy';

        btn.appendChild(labelSpan);
        btn.appendChild(copyHint);

        btn.addEventListener('mousedown', (e) => {
            // Prevent editor from losing focus / cursor jumping
            e.preventDefault();
        });

        btn.addEventListener('click', () => {
            navigator.clipboard.writeText(this.codeText).then(() => {
                showCopiedToast();
            }).catch(() => {
                // Fallback for older browsers
                const ta = document.createElement('textarea');
                ta.value = this.codeText;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
                showCopiedToast();
            });
        });

        return btn;
    }

    ignoreEvent(): boolean {
        return false;
    }
}

// ── Decoration builder ────────────────────────────────────────────────────────

function buildCodeDecorations(view: EditorView): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    const state = view.state;

    for (const { from, to } of view.visibleRanges) {
        syntaxTree(state).iterate({
            from,
            to,
            enter(node) {
                // ── Inline code: `code` ──────────────────────────────────────────
                if (node.name === 'InlineCode') {
                    const cursorOn = isCursorInRange(state, node.from, node.to);
                    const text = state.sliceDoc(node.from, node.to);

                    const backtickMatch = text.match(/^(`+)/);
                    if (!backtickMatch) return;
                    const delimLen = backtickMatch[1].length;

                    const openFrom = node.from;
                    const openTo = node.from + delimLen;
                    const closeFrom = node.to - delimLen;
                    const closeTo = node.to;

                    decorations.push(
                        Decoration.mark({ class: 'idz-inline-code' }).range(node.from, node.to)
                    );

                    if (!cursorOn) {
                        decorations.push(Decoration.replace({}).range(openFrom, openTo));
                        if (closeFrom > openTo) {
                            decorations.push(Decoration.replace({}).range(closeFrom, closeTo));
                        }
                    } else {
                        decorations.push(Decoration.mark({ class: 'idz-marker' }).range(openFrom, openTo));
                        if (closeFrom > openTo) {
                            decorations.push(Decoration.mark({ class: 'idz-marker' }).range(closeFrom, closeTo));
                        }
                    }
                    return false;
                }

                // ── Fenced code block: ```lang\n...\n``` ─────────────────────────
                if (node.name === 'FencedCode') {
                    const openLine = state.doc.lineAt(node.from);
                    const openLineNum = openLine.number;

                    // Detect whether the block is closed: the last line of the node
                    // must contain a fence marker (``` or ~~~). If not, the parser
                    // has extended the node to the end of the document because the
                    // closing fence hasn't been typed yet.
                    const closeLineRaw = state.doc.lineAt(node.to);
                    const closeLineText = closeLineRaw.text.trim();
                    const isClosed = /^(`{3,}|~{3,})\s*$/.test(closeLineText);

                    // For unclosed blocks, only render lines up to the cursor so
                    // that content below the cursor is not affected while typing.
                    const cursorLine = state.doc.lineAt(state.selection.main.head).number;
                    const effectiveCloseLineNum = isClosed
                        ? closeLineRaw.number
                        : cursorLine;

                    const cursorOnBlock = isCursorInNodeLines(state, node.from, node.to);

                    // ── Extract language identifier ──────────────────────────────
                    // The CodeInfo child node holds the language string (e.g. "typescript")
                    let lang = '';
                    node.node.getChildren('CodeInfo').forEach((infoNode) => {
                        lang = state.sliceDoc(infoNode.from, infoNode.to).trim();
                    });

                    // ── Extract code content (lines between fences) ──────────────
                    // Used by the copy button. Only meaningful for closed blocks.
                    let codeContent = '';
                    if (isClosed && closeLineRaw.number > openLineNum + 1) {
                        const firstContentLine = state.doc.line(openLineNum + 1);
                        const lastContentLine = state.doc.line(closeLineRaw.number - 1);
                        codeContent = state.sliceDoc(firstContentLine.from, lastContentLine.to);
                    }

                    // Apply a Decoration.line() to every line in the (effective) block.
                    // This avoids the multi-line mark box-per-line problem.
                    for (let lineNum = openLineNum; lineNum <= effectiveCloseLineNum; lineNum++) {
                        const line = state.doc.line(lineNum);

                        // Skip lines outside the visible range
                        if (line.to < from || line.from > to) continue;

                        // For unclosed blocks the "close fence" line doesn't exist yet,
                        // so only the open line is a fence line.
                        const isFenceLine = lineNum === openLineNum || (isClosed && lineNum === effectiveCloseLineNum);
                        const isFirst = lineNum === openLineNum;
                        const isOnly = effectiveCloseLineNum === openLineNum;

                        if (isFenceLine) {
                            if (!cursorOnBlock) {
                                // Hide the fence line
                                decorations.push(
                                    Decoration.line({ class: 'idz-fence-hidden' }).range(line.from, line.from)
                                );
                            } else {
                                // Show fence line styled
                                const fenceClass = isFirst
                                    ? (isOnly ? 'idz-fence-marker-line idz-code-first idz-code-last' : 'idz-fence-marker-line idz-code-first')
                                    : 'idz-fence-marker-line idz-code-last';
                                decorations.push(
                                    Decoration.line({ class: fenceClass }).range(line.from, line.from)
                                );
                            }
                        } else {
                            // Content line inside the block
                            let lineClass = 'idz-code-line';
                            if (!cursorOnBlock) {
                                // When fence is hidden, first content line is visually first
                                const isFirstContent = lineNum === openLineNum + 1;
                                const isLastContent = lineNum === effectiveCloseLineNum - (isClosed ? 1 : 0);
                                if (isFirstContent && isLastContent) lineClass += ' idz-code-first idz-code-last';
                                else if (isFirstContent) lineClass += ' idz-code-first';
                                else if (isLastContent) lineClass += ' idz-code-last';
                                else lineClass += ' idz-code-middle';

                                // Inject copy button at the start of the first content line.
                                // The line has position:relative (via .idz-code-first), so the
                                // button's position:absolute anchors correctly to the block's top-right.
                                if (isFirstContent && isClosed) {
                                    decorations.push(
                                        Decoration.widget({
                                            widget: new CopyButtonWidget(codeContent, lang),
                                            side: -1,
                                        }).range(line.from)
                                    );
                                }
                            } else {
                                // Fence lines visible — content lines are always middle
                                lineClass += ' idz-code-middle';
                            }
                            decorations.push(
                                Decoration.line({ class: lineClass }).range(line.from, line.from)
                            );
                        }

                    }
                    return false;
                }
            },
        });
    }

    decorations.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);
    return Decoration.set(decorations, true);
}

const codePlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildCodeDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.selectionSet || update.viewportChanged) {
                this.decorations = buildCodeDecorations(update.view);
            }
        }
    },
    { decorations: (v) => v.decorations }
);

export function codeExtension() {
    return [codePlugin];
}
