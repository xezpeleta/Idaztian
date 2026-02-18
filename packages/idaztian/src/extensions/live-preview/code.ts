import { Range } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate } from '@codemirror/view';
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
 */

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
                    const cursorOnBlock = isCursorInNodeLines(state, node.from, node.to);

                    const openLine = state.doc.lineAt(node.from);
                    const closeLine = state.doc.lineAt(node.to);
                    const openLineNum = openLine.number;
                    const closeLineNum = closeLine.number;
                    const totalLines = closeLineNum - openLineNum + 1;

                    // Apply a Decoration.line() to every line in the block.
                    // This avoids the multi-line mark box-per-line problem.
                    for (let lineNum = openLineNum; lineNum <= closeLineNum; lineNum++) {
                        const line = state.doc.line(lineNum);

                        // Skip lines outside the visible range
                        if (line.to < from || line.from > to) continue;

                        const isFenceLine = lineNum === openLineNum || lineNum === closeLineNum;
                        const isFirst = lineNum === openLineNum;
                        const isOnly = totalLines === 1;

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
                                const isLastContent = lineNum === closeLineNum - 1;
                                if (isFirstContent && isLastContent) lineClass += ' idz-code-first idz-code-last';
                                else if (isFirstContent) lineClass += ' idz-code-first';
                                else if (isLastContent) lineClass += ' idz-code-last';
                                else lineClass += ' idz-code-middle';
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
