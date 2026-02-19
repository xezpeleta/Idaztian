import { Range, StateField } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType } from '@codemirror/view';
import { isCursorInRange } from '../../utils/cursor';
import 'katex/dist/katex.min.css';

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
 *
 * Architecture note:
 * Block decorations (block: true) may NOT come from a ViewPlugin — CodeMirror
 * enforces this at runtime.  Block math therefore uses a StateField, while
 * inline math uses a ViewPlugin (which benefits from the visible-range filter).
 */

// Lazy KaTeX loader — resolves once and caches
let katexPromise: Promise<typeof import('katex')> | null = null;
function loadKatex(): Promise<typeof import('katex')> {
    if (!katexPromise) {
        katexPromise = import('katex').then((mod) => {
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

    toDOM(view: EditorView): HTMLElement {
        const el = this.displayMode
            ? document.createElement('div')
            : document.createElement('span');
        el.className = this.displayMode ? 'idz-math-block' : 'idz-math-inline';

        el.addEventListener('mousedown', (e) => {
            if (e.button === 0) {
                const pos = view.posAtDOM(el);
                if (pos !== null) {
                    e.preventDefault();
                    view.dispatch({ selection: { anchor: pos } });
                    view.focus();
                }
            }
        });

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

    ignoreEvent(event: Event): boolean {
        // Let CodeMirror handle mouse/pointer events so it can set the cursor,
        // which toggles the live-preview off.
        if (event.type.startsWith('mouse') || event.type.startsWith('touch') || event.type.startsWith('pointer')) {
            return false;
        }
        return true;
    }
}

// Regex patterns for math delimiters
// Block math: $$...$$ (non-greedy, multiline)
const BLOCK_MATH_RE = /\$\$([\s\S]+?)\$\$/g;
// Inline math: $...$ (non-greedy, single line, not preceded/followed by $)
const INLINE_MATH_RE = /(?<!\$)\$(?!\$)((?:[^$\n]|\\.)+?)\$(?!\$)/g;

/** Returns all block-math ranges in the document (used by both field and plugin). */
function getBlockRanges(text: string): Array<{ from: number; to: number }> {
    const ranges: Array<{ from: number; to: number }> = [];
    BLOCK_MATH_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = BLOCK_MATH_RE.exec(text)) !== null) {
        ranges.push({ from: m.index, to: m.index + m[0].length });
    }
    return ranges;
}

// ── Block math: StateField ───────────────────────────────────────────────────
// Block decorations (block: true) must come from a StateField, not a ViewPlugin.

function buildBlockDecorations(state: EditorView['state']): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    const text = state.doc.toString();

    BLOCK_MATH_RE.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = BLOCK_MATH_RE.exec(text)) !== null) {
        const from = match.index;
        const to = from + match[0].length;
        const latex = match[1].trim();

        const cursorOn = isCursorInRange(state, from, to);

        if (!cursorOn) {
            decorations.push(
                Decoration.replace({
                    widget: new MathWidget(latex, true),
                    block: true,
                }).range(from, to)
            );
        } else {
            decorations.push(
                Decoration.mark({ class: 'idz-math-syntax' }).range(from, to)
            );
            const innerStart = from + 2;
            const innerEnd = to - 2;
            if (innerEnd > innerStart) {
                decorations.push(
                    Decoration.mark({ class: 'idz-math-active' }).range(innerStart, innerEnd)
                );
            }
        }
    }

    return Decoration.set(decorations, true);
}

const blockMathField = StateField.define<DecorationSet>({
    create(state) {
        loadKatex(); // pre-warm
        return buildBlockDecorations(state);
    },
    update(deco, tr) {
        if (tr.docChanged || tr.selection) {
            return buildBlockDecorations(tr.state);
        }
        return deco.map(tr.changes);
    },
    provide(field) {
        return EditorView.decorations.from(field);
    },
});

// ── Inline math: ViewPlugin ──────────────────────────────────────────────────
// Inline replacements (no block: true) can safely live in a ViewPlugin,
// which lets us limit work to the visible viewport.

function buildInlineDecorations(view: EditorView): DecorationSet {
    const decorations: Range<Decoration>[] = [];
    const state = view.state;
    const text = state.doc.toString();

    // Collect block ranges so we can skip inline matches that overlap them
    const blockRanges = getBlockRanges(text);

    INLINE_MATH_RE.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = INLINE_MATH_RE.exec(text)) !== null) {
        const from = match.index;
        const to = from + match[0].length;
        const latex = match[1];

        // Skip matches inside a block math region
        if (blockRanges.some(r => from >= r.from && to <= r.to)) continue;

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
                Decoration.mark({ class: 'idz-math-syntax idz-math-active' }).range(from, to)
            );
        }
    }

    decorations.sort((a, b) => a.from - b.from || a.value.startSide - b.value.startSide);
    return Decoration.set(decorations, true);
}

const inlineMathPlugin = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
            this.decorations = buildInlineDecorations(view);
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.selectionSet || update.viewportChanged) {
                this.decorations = buildInlineDecorations(update.view);
            }
        }
    },
    { decorations: (v) => v.decorations }
);

export function mathExtension() {
    return [blockMathField, inlineMathPlugin];
}
