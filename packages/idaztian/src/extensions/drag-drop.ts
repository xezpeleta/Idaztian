import { EditorView } from '@codemirror/view';

/**
 * Drag & drop extension.
 *
 * Supported drop types:
 * - `.md` / `.markdown` files → read and insert content at cursor
 * - Image files → insert as `![filename](data:...)` at cursor
 *
 * Other file types are ignored (browser default behavior).
 */
export function dragDropExtension() {
    return EditorView.domEventHandlers({
        dragover(event) {
            const items = event.dataTransfer?.items;
            if (!items) return false;

            // Check if any item is a file we can handle
            for (const item of Array.from(items)) {
                if (item.kind === 'file') {
                    event.preventDefault();
                    if (event.dataTransfer) {
                        event.dataTransfer.dropEffect = 'copy';
                    }
                    return true;
                }
            }
            return false;
        },

        drop(event, view) {
            const files = event.dataTransfer?.files;
            if (!files || files.length === 0) return false;

            event.preventDefault();

            const { from } = view.state.selection.main;

            Array.from(files).forEach((file) => {
                const isMarkdown = /\.(md|markdown|txt)$/i.test(file.name);
                const isImage = file.type.startsWith('image/');

                if (isMarkdown) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const content = e.target?.result as string;
                        if (!content) return;
                        view.dispatch(view.state.update({
                            changes: { from, insert: content },
                            selection: { anchor: from + content.length },
                            userEvent: 'input.drop',
                        }));
                    };
                    reader.readAsText(file);
                } else if (isImage) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const dataUri = e.target?.result as string;
                        if (!dataUri) return;
                        // Use the filename without extension as alt text
                        const altText = file.name.replace(/\.[^.]+$/, '');
                        const insert = `![${altText}](${dataUri})`;
                        view.dispatch(view.state.update({
                            changes: { from, insert },
                            selection: { anchor: from + insert.length },
                            userEvent: 'input.drop',
                        }));
                    };
                    reader.readAsDataURL(file);
                }
            });

            return true;
        },
    });
}
