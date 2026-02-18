import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { keymap } from '@codemirror/view';

/**
 * Smart pairs extension — auto-closes brackets, quotes, and backticks.
 *
 * Uses CodeMirror's built-in closeBrackets() with an extended set of pairs
 * that includes markdown-relevant characters.
 */
export function smartPairsExtension() {
    return [
        closeBrackets(),
        keymap.of(closeBracketsKeymap),
    ];
}
