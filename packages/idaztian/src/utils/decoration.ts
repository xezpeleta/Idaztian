import { Range } from '@codemirror/state';
import { Decoration } from '@codemirror/view';

/**
 * Shared decoration utilities for live-preview extensions.
 *
 * Key design decision: NEVER use Decoration.replace({}) (empty-spec) to
 * hide syntax markers. Empty replace decorations collapse the DOM node
 * to zero width, which causes the cursor column to shift visually when
 * the user moves between lines with different amounts of hidden content.
 *
 * Instead, we use Decoration.mark() with 'idz-hidden-marker' which uses
 * CSS to make the text invisible while preserving its horizontal space.
 * This keeps the cursor column stable during up/down navigation.
 */

/**
 * Create a decoration that hides the given range while preserving its
 * horizontal space. The content is invisible but still occupies its
 * natural width — cursor position is unaffected.
 */
export function hideRange(from: number, to: number): Range<Decoration> {
    return Decoration.mark({ class: 'idz-hidden-marker' }).range(from, to);
}

/**
 * Create a decoration that highlights the given range as a visible
 * syntax marker (cursor is "on" this content).
 */
export function showMarker(from: number, to: number): Range<Decoration> {
    return Decoration.mark({ class: 'idz-marker' }).range(from, to);
}
