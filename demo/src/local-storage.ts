/**
 * Local persistence utilities for the Idaztian demo app.
 *
 * Saves the current editor document to browser localStorage so it
 * survives page reloads and browser restarts.
 */

const STORAGE_KEY = 'idaztian:doc';
const DEBOUNCE_MS = 300;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Save editor content to localStorage (debounced — 300 ms).
 * Rapid successive calls are collapsed into one write.
 */
export function saveContent(content: string): void {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        try {
            localStorage.setItem(STORAGE_KEY, content);
        } catch {
            // localStorage full or unavailable — silently ignore
        }
    }, DEBOUNCE_MS);
}

/**
 * Load the previously saved document from localStorage.
 * Returns `null` if nothing was stored.
 */
export function loadContent(): string | null {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null;
    }
}

/**
 * Remove the stored document from localStorage.
 */
export function clearContent(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        // ignore
    }
}
