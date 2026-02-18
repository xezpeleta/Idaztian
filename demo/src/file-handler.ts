/**
 * File open and download utilities for the Idaztian demo app.
 */

/**
 * Open a file picker and read the selected .md file as text.
 * Returns the file content and filename, or null if cancelled.
 */
export function openFile(): Promise<{ content: string; filename: string } | null> {
    return new Promise((resolve) => {
        const input = document.getElementById('file-input') as HTMLInputElement;

        const handler = () => {
            const file = input.files?.[0];
            if (!file) {
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                resolve({
                    content: (e.target?.result as string) ?? '',
                    filename: file.name,
                });
            };
            reader.onerror = () => resolve(null);
            reader.readAsText(file);
            // Reset so the same file can be re-opened
            input.value = '';
        };

        input.addEventListener('change', handler, { once: true });
        input.click();
    });
}

/**
 * Download the given content as a .md file.
 */
export function downloadFile(content: string, filename = 'document.md'): void {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
