import { Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { isCursorInRange } from '../../utils/cursor';

/**
 * Live-preview extension for math / LaTeX.
 *
 * Inline math:  $...$
 * Block math:   $$...$$  (on its own line(s))
 *
 * Behavior:
 * - Cursor away: rendered KaTeX widget replaces the delimited content
 * - Cursor on element: raw LaTeX with delimiters shown
 *
 * KaTeX is lazy-loaded on first use to keep the initial bundle small.
 * This extension is disabled by default (config.extensions.math = false).
 */

// Lazy KaTeX loader — resolves once and caches
let katexPromise: Promise<typeof import('katex')> | null = null;
function loadKatex(): Promise<typeof import('katex')> {
    if (!katexPromise) {
        katexPromise = import('katex').then(async (mod) => {
            // Also inject KaTeX CSS if not already present
            if (!document.getElementById('idz-katex-css')) {
                const link = document.createElement('link');
                link.id = 'idz-katex-css';
                link.rel = 'stylesheet';
                link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css';
                document.head.appendChild(link);
            }
            return mod;
        });
    }
    return katexPromise;
}

class MathWidget extends WidgetType {
    private rendered: string = '';

    constructor(
        private readonly latex: string,
        private readonly displayMode: boolean,
    ) {
        super();
    }

    eq(other: MathWidget): boolean {
        return other.latex === this.latex && other.displayMode === this.displayMode;
    }

    toDOM(): HTMLElement {
        const el = this.displayMode
            ? document.createElement('div')
            : document.createElement('span');
        el.className = this.displayMode ? 'idz-math-block' : 'idz-math-inline';

        if (this.rendered) {
            el.innerHTML = this.rendered;
        } else {
            el.textContent = this.latex;
            el.classList.add('idz-math-loading');
            // Async render — update the DOM element once KaTeX loads
            loadKatex().then((katex) => {
                try {
                    el.innerHTML = katex.default.renderToString(this.latex, {
                        displayMode: this.displayMode,
                        throwOnError: false,
                    });
                    el.classList.remove('idz-math-loading');
                    this.rendered = el.innerHTML;
                } catch {
                    el.textContent = this.latex;
                    el.classList.add('idz-math-error');
                }
            });
        }

        return el;
    }

    ignoreEvent(): boolean { return true; }
}

// Regex patterns for math delimiters
// Block math: $$...$$ (greedy, multiline)
const BLOCK_MATH_RE = /\$\$([\s\S]+?)\$\$/g;
// Inline math: $...$ (non-greedy, single line, not preceded/followed by $)
const INLINE_MATH_RE = /(?<!\$)\$(?!\$)((?:[^$\n]|\\.)+?)\$(?!\$)/g;

function buildMathDecorations(view: EditorView): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    const state = view.state;
    const text = state.doc.toString();

    // ── Block math: $$...$$ ──────────────────────────────────────────────────
    BLOCK_MATH_RE.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = BLOCK_MATH_RE.exec(text)) !== null) {
        const from = match.index;
        const to = from + match[0].length;
        const latex = match[1].trim();

        const inVisible = view.visibleRanges.some(r => from >= r.from && to <= r.to);
        if (!inVisible) continue;

        const cursorOn = isCursorInRange(state, from, to);

        if (!cursorOn) {
            decorations.push(
                Decoration.replace({
                    widget: new MathWidget(latex, true),
                    block: false,
                }).range(from, to)
            );
        } else {
            decorations.push(
                Decoration.mark({ class: 'idz-math-syntax' }).range(from, to)
            );
        }
    }

    // ── Inline math: $...$ ───────────────────────────────────────────────────
    INLINE_MATH_RE.lastIndex = 0;

    while ((match = INLINE_MATH_RE.exec(text)) !== null) {
        const from = match.index;
        const to = from + match[0].length;
        const latex = match[1];

        const inVisible = view.visibleRanges.some(r => from >= r.from && to <= r.to);
        if (!inVisible) continue;

        const cursorOn = isCursorInRange(state, from, to);

        if (!cursorOn) {
            decorations.push(
                Decoration.replace({
                    widget: new MathWidget(latex, false),
                }).range(from, to)
            );
        } else {
            decorations.push(
                Decoration.mark({ class: 'idz-math-syntax' }).range(from, to)
            );
        }
    }

    decorations.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);
    return Decoration.set(decorations, true);
}

const mathPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildMathDecorations(view);
            // Pre-load KaTeX in the background
            loadKatex();
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.selectionSet || update.viewportChanged) {
                this.decorations = buildMathDecorations(update.view);
            }
        }
    },
    { decorations: (v) => v.decorations }
);

export function mathExtension() {
    return [mathPlugin];
}
