import { EditorView, showPanel } from '@codemirror/view';
import { EditorState, Extension } from '@codemirror/state';
import {
    cmdBold, cmdItalic, cmdCode, cmdStrikethrough, cmdLink,
    cmdHeading, cmdBulletList, cmdOrderedList, cmdTaskList, cmdBlockquote,
    cmdInsertTable, cmdInsertCodeBlock, cmdInsertHorizontalRule, cmdInsertCallout,
    isBold, isItalic, isCodeActive, isStrikethroughActive,
    getHeadingLevel, isBulletListActive, isOrderedListActive, isTaskListActive, isBlockquoteActive,
} from './commands';

/**
 * Configurable formatting toolbar, rendered as a CM6 top panel.
 * Activated when config.toolbar === true.
 */

type ToolbarItemId =
    | 'bold' | 'italic' | 'strikethrough' | 'code' | 'link'
    | 'heading' | 'h1' | 'h2' | 'h3'
    | 'bullet-list' | 'ordered-list' | 'task-list'
    | 'blockquote'
    | 'callout'
    | 'table' | 'code-block' | 'horizontal-rule'
    | 'separator';

export type { ToolbarItemId };

interface ToolbarItemDef {
    id: ToolbarItemId;
    title: string;
    icon: string;
    action: (view: EditorView) => void;
    isActive?: (state: EditorState) => boolean;
}

const TOOLBAR_ITEM_DEFS: Record<string, ToolbarItemDef> = {
    bold: {
        id: 'bold',
        title: 'Bold (Ctrl+B)',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>',
        action: cmdBold,
        isActive: isBold,
    },
    italic: {
        id: 'italic',
        title: 'Italic (Ctrl+I)',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>',
        action: cmdItalic,
        isActive: isItalic,
    },
    strikethrough: {
        id: 'strikethrough',
        title: 'Strikethrough (Ctrl+Shift+K)',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4H9a3 3 0 0 0-2.83 4"/><path d="M14 12a4 4 0 0 1 0 8H6"/><line x1="4" y1="12" x2="20" y2="12"/></svg>',
        action: cmdStrikethrough,
        isActive: isStrikethroughActive,
    },
    code: {
        id: 'code',
        title: 'Inline code (Ctrl+E)',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>',
        action: cmdCode,
        isActive: isCodeActive,
    },
    link: {
        id: 'link',
        title: 'Insert link (Ctrl+K)',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
        action: cmdLink,
    },
    h1: {
        id: 'h1',
        title: 'Heading 1 (Ctrl+1)',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="m17 12 3-2v8"/></svg>',
        action: (v) => cmdHeading(v, 1),
        isActive: (s) => getHeadingLevel(s) === 1,
    },
    h2: {
        id: 'h2',
        title: 'Heading 2 (Ctrl+2)',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1"/></svg>',
        action: (v) => cmdHeading(v, 2),
        isActive: (s) => getHeadingLevel(s) === 2,
    },
    h3: {
        id: 'h3',
        title: 'Heading 3 (Ctrl+3)',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12h8"/><path d="M4 18V6"/><path d="M12 18V6"/><path d="M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2"/><path d="M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2"/></svg>',
        action: (v) => cmdHeading(v, 3),
        isActive: (s) => getHeadingLevel(s) === 3,
    },
    'bullet-list': {
        id: 'bullet-list',
        title: 'Bullet list (Ctrl+Shift+8)',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
        action: cmdBulletList,
        isActive: isBulletListActive,
    },
    'ordered-list': {
        id: 'ordered-list',
        title: 'Numbered list (Ctrl+Shift+7)',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>',
        action: cmdOrderedList,
        isActive: isOrderedListActive,
    },
    'task-list': {
        id: 'task-list',
        title: 'Task list (Ctrl+Shift+9)',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="6" height="6" rx="1"/><path d="m3 17 2 2 4-4"/><line x1="13" y1="8" x2="21" y2="8"/><line x1="13" y1="18" x2="21" y2="18"/></svg>',
        action: cmdTaskList,
        isActive: isTaskListActive,
    },
    blockquote: {
        id: 'blockquote',
        title: 'Blockquote',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>',
        action: cmdBlockquote,
        isActive: isBlockquoteActive,
    },
    callout: {
        id: 'callout',
        title: 'Insert callout',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v2"/><path d="M12 15h.01"/><path d="M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0z"/></svg>',
        action: (v) => cmdInsertCallout(v, 'NOTE'),
    },
    table: {
        id: 'table',
        title: 'Insert table',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
        action: cmdInsertTable,
    },
    'code-block': {
        id: 'code-block',
        title: 'Insert code block',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/><line x1="12" y1="2" x2="12" y2="22" stroke-dasharray="3 3"/></svg>',
        action: cmdInsertCodeBlock,
    },
    'horizontal-rule': {
        id: 'horizontal-rule',
        title: 'Insert horizontal rule',
        icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/></svg>',
        action: cmdInsertHorizontalRule,
    },
};

/** Default toolbar items when config.toolbarItems is not specified. */
export const DEFAULT_TOOLBAR_ITEMS: ToolbarItemId[] = [
    'bold', 'italic', 'strikethrough', 'code', 'separator',
    'h1', 'h2', 'h3', 'separator',
    'bullet-list', 'ordered-list', 'task-list', 'separator',
    'blockquote', 'separator',
    'callout', 'link', 'table', 'code-block', 'horizontal-rule',
];

// ── DOM ────────────────────────────────────────────────────────────────────

function createToolbarButton(def: ToolbarItemDef, view: EditorView): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.className = 'idz-toolbar-btn';
    btn.title = def.title;
    btn.setAttribute('type', 'button');
    btn.innerHTML = def.icon;

    btn.addEventListener('mousedown', (e) => {
        e.preventDefault(); // prevent focus loss
    });
    btn.addEventListener('click', () => {
        def.action(view);
        view.focus();
    });

    return btn;
}

function updateToolbarButton(btn: HTMLButtonElement, def: ToolbarItemDef, state: EditorState): void {
    const active = def.isActive?.(state) ?? false;
    btn.classList.toggle('idz-toolbar-btn--active', active);
    btn.setAttribute('aria-pressed', String(active));
}

function createToolbarDom(
    view: EditorView,
    items: ToolbarItemId[]
): { dom: HTMLElement; buttons: Map<string, HTMLButtonElement> } {
    const dom = document.createElement('div');
    dom.className = 'idz-toolbar';
    dom.setAttribute('role', 'toolbar');
    dom.setAttribute('aria-label', 'Formatting toolbar');

    const buttons = new Map<string, HTMLButtonElement>();

    for (const itemId of items) {
        if (itemId === 'separator') {
            const sep = document.createElement('div');
            sep.className = 'idz-toolbar-sep';
            sep.setAttribute('role', 'separator');
            dom.appendChild(sep);
            continue;
        }

        const def = TOOLBAR_ITEM_DEFS[itemId];
        if (!def) continue;

        const btn = createToolbarButton(def, view);
        updateToolbarButton(btn, def, view.state);
        buttons.set(itemId, btn);
        dom.appendChild(btn);
    }

    return { dom, buttons };
}

// ── Extension ──────────────────────────────────────────────────────────────

export function toolbarExtension(items: ToolbarItemId[] = DEFAULT_TOOLBAR_ITEMS): Extension {
    return showPanel.of((view) => {
        const { dom, buttons } = createToolbarDom(view, items);

        return {
            dom,
            top: true,
            update(update) {
                if (update.selectionSet || update.docChanged) {
                    for (const [itemId, btn] of buttons) {
                        const def = TOOLBAR_ITEM_DEFS[itemId];
                        if (def) updateToolbarButton(btn, def, update.state);
                    }
                }
            },
        };
    });
}
