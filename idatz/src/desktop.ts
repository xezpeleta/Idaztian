import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

// Quick check to see if we're running inside the Tauri window
export const isTauriEnvironment = () => {
    return '__TAURI_INTERNALS__' in window;
};

/**
 * Triggers the Rust backend to read a file and start the watcher on it.
 */
export async function desktopOpenFile(path: string): Promise<string> {
    try {
        return await invoke<string>('open_file', { path });
    } catch (error) {
        console.error('Failed to open file via Tauri:', error);
        throw error;
    }
}

/**
 * Commands the Rust backend to write content.
 */
export async function desktopSaveFile(path: string, content: string): Promise<void> {
    try {
        await invoke('save_file', { path, content });
    } catch (error) {
        console.error('Failed to save file via Tauri:', error);
        throw error;
    }
}

export async function desktopRenameFile(oldPath: string, newPath: string): Promise<void> {
    try {
        await invoke('rename_file', { oldPath, newPath });
    } catch (error) {
        console.error('Failed to rename file via Tauri:', error);
        throw error;
    }
}

/**
 * Open a native file picker and return the selected markdown path.
 */
export async function desktopPickFile(): Promise<string | null> {
    try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const result = await open({
            multiple: false,
            directory: false,
            filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }],
        });

        if (Array.isArray(result)) {
            const first = result[0];
            if (!first) return null;
            if (typeof first === 'string') return first;
            if (typeof first === 'object' && 'path' in first) {
                return String((first as { path?: string }).path ?? '');
            }
            return null;
        }

        if (typeof result === 'string') return result;
        if (result && typeof result === 'object' && 'path' in result) {
            return String((result as { path?: string }).path ?? '');
        }
        return null;
    } catch (error) {
        console.error('Failed to open file dialog via Tauri:', error);
        throw error;
    }
}

/**
 * Open a native directory picker and return the selected directory path.
 */
export async function desktopPickDirectory(): Promise<string | null> {
    try {
        const { open } = await import('@tauri-apps/plugin-dialog');
        const result = await open({
            multiple: false,
            directory: true,
        });

        if (Array.isArray(result)) {
            const first = result[0];
            if (!first) return null;
            if (typeof first === 'string') return first;
            if (typeof first === 'object' && 'path' in first) {
                return String((first as { path?: string }).path ?? '');
            }
            return null;
        }

        if (typeof result === 'string') return result;
        if (result && typeof result === 'object' && 'path' in result) {
            return String((result as { path?: string }).path ?? '');
        }
        return null;
    } catch (error) {
        console.error('Failed to open directory dialog via Tauri:', error);
        throw error;
    }
}

interface FileChangedPayload {
    content: string;
}

/**
 * Subscribe to the generic file-changed event pushed by the Rust notify watcher.
 */
export async function subscribeToFileChanges(callback: (newContent: string) => void): Promise<UnlistenFn> {
    return await listen<FileChangedPayload>('file-changed', (event) => {
        // Debounce or filter as necessary if we see bursty writes
        callback(event.payload.content);
    });
}
