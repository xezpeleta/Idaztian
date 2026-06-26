import { EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';

/**
 * Fixes mouse-click cursor positioning when the editor contains block widgets
 * whose rendered heights differ from the raw text they replace.
 *
 * CM6's posAtCoords uses the HeightOracle which accumulates errors across
 * block widgets. This plugin bypasses it entirely:
 *
 * 1. Let CM6 handle the click normally.
 * 2. Walk the DOM to find the .cm-line at the click coordinates.
 * 3. Use posAtDOM (always accurate) to get the line start.
 * 4. Walk the line's text nodes character-by-character to find the column
 *    closest to the click X position.
 * 5. If CM6 placed the cursor on the wrong line, correct it.
 */

module impl {
    const DEBUG = true;

    let downEvent: MouseEvent | null = null;
    let editorView: EditorView | null = null;

    export class ClickCorrection {
        constructor(readonly view: EditorView) {
            editorView = view;
            view.dom.addEventListener('mousedown', onMouseDown, true);
        }

        destroy() {
            editorView = null;
            this.view.dom.removeEventListener('mousedown', onMouseDown, true);
        }

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        update(_update: ViewUpdate) {}
    }

    function onMouseDown(e: MouseEvent) {
        downEvent = e;
        setTimeout(correctPosition, 0);
    }

    function debug(...args: any[]) {
        if (DEBUG) console.log('[click-correct]', ...args);
    }

    function correctPosition() {
        if (!downEvent || !editorView) return;
        const e = downEvent;
        downEvent = null;

        const view = editorView;
        const state = view.state;

        // Step 1 — find the .cm-line the user actually clicked on
        let el = document.elementFromPoint(e.clientX, e.clientY);
        const lineEl = el?.closest('.cm-line') as HTMLElement | null;
        if (!lineEl) {
            debug('no .cm-line found at click coordinates');
            return;
        }

        // Step 2 — get the line start via posAtDOM (always accurate)
        const lineStart = view.posAtDOM(lineEl, 0);
        if (lineStart === null) {
            debug('posAtDOM returned null');
            return;
        }
        const clickedLine = state.doc.lineAt(lineStart);

        // Step 3 — where did CM6 place the cursor?
        const cm6Pos = state.selection.main.head;
        const placedLine = state.doc.lineAt(cm6Pos);

        // Step 4 — if CM6 got it right, nothing to do
        if (clickedLine.number === placedLine.number) {
            debug(
                `correct — line ${clickedLine.number}:`,
                JSON.stringify(clickedLine.text.slice(0, 80))
            );
            return;
        }

        debug(
            `clicked line ${clickedLine.number}: ${JSON.stringify(clickedLine.text.slice(0, 60))}`
        );
        debug(
            `CM6 placed  line ${placedLine.number}: ${JSON.stringify(placedLine.text.slice(0, 60))}`,
            `(offset ${placedLine.number - clickedLine.number})`
        );

        // Step 5 — compute column from click X within the line's text nodes
        const clickX = Math.max(0, e.clientX - lineEl.getBoundingClientRect().left);
        const column = getColumnFromClickX(lineEl, clickX);

        const correctedPos = Math.min(
            lineStart + column,
            clickedLine.from + clickedLine.length
        );
        debug(
            `corrected to line ${state.doc.lineAt(correctedPos).number}` +
            ` col ${column}: ${JSON.stringify(state.doc.lineAt(correctedPos).text.slice(0, 60))}`
        );

        view.dispatch({
            selection: { anchor: correctedPos },
            scrollIntoView: false,
        });
    }

    /**
     * Walk text nodes inside a .cm-line, measuring each character's position,
     * to find the character column closest to the given click X offset.
     */
    function getColumnFromClickX(lineEl: HTMLElement, clickX: number): number {
        const walker = document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT, null);
        let totalChars = 0;
        const lineLeft = lineEl.getBoundingClientRect().left;

        while (walker.nextNode()) {
            const node = walker.currentNode as Text;
            const text = node.textContent ?? '';
            if (text.length === 0) continue;

            const range = document.createRange();
            for (let i = 0; i < text.length; i++) {
                range.setStart(node, i);
                range.setEnd(node, i + 1);
                const rect = range.getClientRects()[0];
                if (rect) {
                    const charMidX = rect.left + rect.width / 2 - lineLeft;
                    if (clickX <= charMidX) {
                        return totalChars;
                    }
                }
                totalChars++;
            }
        }

        return totalChars;
    }
}

function clickCorrectionPlugin() {
    return ViewPlugin.fromClass(impl.ClickCorrection);
}

export { clickCorrectionPlugin };
