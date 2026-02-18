/**
 * Configuration types for IdaztianEditor
 */

export interface IdaztianExtensionConfig {
    /** Enable GFM tables (default: true) */
    tables?: boolean;
    /** Enable task lists / checkboxes (default: true) */
    taskLists?: boolean;
    /** Enable math / LaTeX rendering (default: true) */
    math?: boolean;
    /** Enable alerts / callouts (default: true) */
    alerts?: boolean;
    /** Enable footnotes (default: true) */
    footnotes?: boolean;
    /** Enable syntax highlighting in code blocks (default: true) */
    syntaxHighlighting?: boolean;
    /** Enable strikethrough (default: true) */
    strikethrough?: boolean;
}

export interface IdaztianConfig {
    /** DOM element to mount the editor into (required) */
    parent: HTMLElement;

    /** Initial markdown content */
    initialContent?: string;

    /** Placeholder text shown when editor is empty */
    placeholder?: string;

    /** Make the editor read-only (default: false) */
    readOnly?: boolean;

    /** Show line numbers (default: false) */
    lineNumbers?: boolean;

    /** Show the toolbar (default: false) */
    toolbar?: boolean;

    /**
     * Toolbar items to display (in order). Use 'separator' for dividers.
     * Defaults to all items if not specified.
     */
    toolbarItems?: string[];

    /** Show the context menu on right-click (default: true) */
    contextMenu?: boolean;

    /** Extension feature toggles */
    extensions?: IdaztianExtensionConfig;

    /** Called whenever the document content changes */
    onChange?: (content: string) => void;

    /** Called when Ctrl+S is pressed */
    onSave?: (content: string) => void;

    /** Called when cursor or selection changes */
    onSelectionChange?: (selection: { from: number; to: number; text: string }) => void;
}

export const DEFAULT_CONFIG: Required<Omit<IdaztianConfig, 'parent' | 'onChange' | 'onSave' | 'onSelectionChange' | 'toolbarItems'>> = {
    initialContent: '',
    placeholder: 'Start writing...',
    readOnly: false,
    lineNumbers: false,
    toolbar: false,
    contextMenu: true,
    extensions: {
        tables: true,
        taskLists: true,
        math: false, // Phase 2
        alerts: true,
        footnotes: true,
        syntaxHighlighting: true,
        strikethrough: true,
    },
};
