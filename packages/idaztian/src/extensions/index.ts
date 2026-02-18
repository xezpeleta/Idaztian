import { Extension } from '@codemirror/state';
import { IdaztianConfig, IdaztianExtensionConfig } from '../config';
import { headingsExtension } from './live-preview/headings';
import { emphasisExtension } from './live-preview/emphasis';
import { linksExtension } from './live-preview/links';
import { listsExtension } from './live-preview/lists';
import { codeExtension } from './live-preview/code';
import { blockquotesExtension } from './live-preview/blockquotes';
import { horizontalRulesExtension } from './live-preview/horizontal-rules';
import { alertsExtension } from './live-preview/alerts';
import { footnotesExtension } from './live-preview/footnotes';
import { mathExtension } from './live-preview/math';
import { tablesExtension } from './live-preview/tables';
import { smartPairsExtension } from './smart-pairs';
import { pasteHandlerExtension } from './paste-handler';
import { dragDropExtension } from './drag-drop';
import { contextMenuExtension } from './context-menu';
import { toolbarExtension, DEFAULT_TOOLBAR_ITEMS, ToolbarItemId } from './toolbar';

/**
 * Assembles all live-preview extensions based on the config.
 */
export function buildExtensions(config: IdaztianExtensionConfig): Extension[] {
    const extensions: Extension[] = [
        // ── Phase 1: Core live-preview ───────────────────────────────────────
        headingsExtension(),
        emphasisExtension(),
        linksExtension(),       // includes images
        listsExtension(),       // includes task lists / checkboxes
        codeExtension(),
        blockquotesExtension(),
        horizontalRulesExtension(),

        // ── Phase 2A: Additional live-preview ────────────────────────────────
        alertsExtension(),
        footnotesExtension(),

        // ── Phase 2B: Tables ─────────────────────────────────────────────────
        tablesExtension(),

        // ── Phase 2A: Editor features ─────────────────────────────────────────
        smartPairsExtension(),
        pasteHandlerExtension(),
        dragDropExtension(),
    ];

    // Math is disabled by default (large KaTeX dependency, lazy-loaded)
    if (config.math) {
        extensions.push(mathExtension());
    }

    return extensions;
}

/**
 * Assembles interactive UI extensions (context menu, toolbar) from full config.
 */
export function buildUIExtensions(config: IdaztianConfig): Extension[] {
    const extensions: Extension[] = [];

    if (config.contextMenu !== false) {
        extensions.push(contextMenuExtension());
    }

    if (config.toolbar) {
        const items = (config.toolbarItems as ToolbarItemId[] | undefined) ?? DEFAULT_TOOLBAR_ITEMS;
        extensions.push(toolbarExtension(items));
    }

    return extensions;
}
