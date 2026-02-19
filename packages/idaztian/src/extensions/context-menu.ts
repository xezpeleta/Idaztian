import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import {
    cmdBold, cmdItalic, cmdCode, cmdStrikethrough, cmdLink,
    cmdHeading, cmdBulletList, cmdOrderedList, cmdTaskList, cmdBlockquote,
    cmdInsertTable, cmdInsertCodeBlock, cmdInsertHorizontalRule,
    cmdInsertCallout, cmdInsertFootnote,
    isBold, isItalic, isCodeActive, isStrikethroughActive,
    getHeadingLevel, isBulletListActive, isOrderedListActive, isTaskListActive, isBlockquoteActive,
    tableAddRowAbove, tableAddRowBelow, tableMoveRowUp, tableMoveRowDown,
    tableDuplicateRow, tableDeleteRow,
    tableAddColumnLeft, tableAddColumnRight, tableMoveColumnLeft, tableMoveColumnRight,
    tableDeleteColumn, tableSortByColumn,
} from './commands';
import { TableData } from '../utils/table';
import { showToast } from '../utils/toast';

let canCopyClipboard = true;
let canPasteClipboard = false; // Require explicit grant for read (Paste) without native prompt

if (typeof navigator !== 'undefined' && navigator.permissions) {
    try {
        navigator.permissions.query({ name: 'clipboard-write' as PermissionName }).then(s => {
            canCopyClipboard = s.state === 'granted' || s.state === 'prompt';
            s.addEventListener('change', () => canCopyClipboard = s.state === 'granted' || s.state === 'prompt');
        }).catch(() => { });
    } catch (e) { }

    try {
        navigator.permissions.query({ name: 'clipboard-read' as PermissionName }).then(s => {
            canPasteClipboard = s.state === 'granted';
            s.addEventListener('change', () => canPasteClipboard = s.state === 'granted');
        }).catch(() => { });
    } catch (e) { }
}

/**
 * Custom context menu (right-click) with Format / Paragraph / Insert submenus.
 * Also exposes showTableContextMenu() for use by the table widget.
 */

// ── Global CSS injection ───────────────────────────────────────────────────
// EditorView.theme() scopes styles to inside the .cm-editor element.
// The context menu is appended to document.body, so we inject global styles.

const CONTEXT_MENU_CSS = `
.idz-context-menu {
    position: fixed;
    z-index: 9999;
    min-width: 200px;
    padding: 4px 0;
    margin: 0;
    list-style: none;
    background-color: #181818;
    border: 1px solid #333;
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    color: #dcddde;
    user-select: none;
    pointer-events: auto;
}
.idz-context-submenu {
    position: absolute;
    left: 100%;
    top: -4px;
    min-width: 200px;
    padding: 4px 0;
    background-color: #181818;
    border: 1px solid #333;
    border-radius: 6px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5);
    list-style: none;
    margin: 0;
}
.idz-context-menu-item {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 12px;
    cursor: pointer;
    color: #dcddde;
    gap: 12px;
    transition: background 0.08s ease;
    white-space: nowrap;
}
.idz-context-menu-item:hover {
    background-color: rgba(127, 109, 242, 0.18);
}
.idz-context-menu-item--active {
    color: #7f6df2;
}
.idz-context-menu-item--disabled {
    opacity: 0.35;
    cursor: default;
    pointer-events: none;
}
.idz-context-menu-label {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
}
.idz-context-menu-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    opacity: 0.7;
}
.idz-context-menu-icon svg {
    width: 14px;
    height: 14px;
}
.idz-context-menu-check {
    color: #7f6df2;
    font-weight: 700;
    width: 14px;
    flex-shrink: 0;
}
.idz-context-menu-shortcut {
    color: #888;
    font-size: 11px;
    flex-shrink: 0;
}
.idz-context-menu-arrow {
    color: #888;
    font-size: 10px;
    margin-left: 4px;
    flex-shrink: 0;
}
.idz-context-menu-sep {
    height: 1px;
    background-color: #333;
    margin: 4px 0;
}
`;

let globalStylesInjected = false;

export function injectGlobalStyles(): void {
    if (globalStylesInjected || typeof document === 'undefined') return;
    globalStylesInjected = true;
    const style = document.createElement('style');
    style.setAttribute('data-idz', 'context-menu');
    style.textContent = CONTEXT_MENU_CSS;
    document.head.appendChild(style);
}

// ── Module-level active menu (shared between regular and table menus) ───────

let activeMenu: HTMLElement | null = null;
let outsideClickListener: ((e: MouseEvent) => void) | null = null;
let keydownListener: ((e: KeyboardEvent) => void) | null = null;

export function closeActiveMenu(): void {
    if (activeMenu) {
        activeMenu.remove();
        activeMenu = null;
    }
    if (outsideClickListener) {
        document.removeEventListener('click', outsideClickListener);
        outsideClickListener = null;
    }
    if (keydownListener) {
        document.removeEventListener('keydown', keydownListener);
        keydownListener = null;
    }
}

function registerGlobalCloseListeners(): void {
    outsideClickListener = (e: MouseEvent) => {
        if (activeMenu && !activeMenu.contains(e.target as Node)) {
            closeActiveMenu();
        }
    };
    keydownListener = (e: KeyboardEvent) => {
        if (e.key === 'Escape') closeActiveMenu();
    };
    setTimeout(() => {
        document.addEventListener('click', outsideClickListener!);
        document.addEventListener('keydown', keydownListener!);
    }, 0);
}

// ── SVG icons ──────────────────────────────────────────────────────────────

const ICONS = {
    rowAbove: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    rowBelow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>',
    moveUp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    moveDown: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12l7 7 7-7"/></svg>',
    duplicate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
    colLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>',
    colRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
    sortAZ: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="9" y2="18"/><polyline points="15 15 18 21 21 15"/></svg>',
    sortZA: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="9" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/><polyline points="15 9 18 3 21 9"/></svg>',
    rows: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/></svg>',
    cols: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>',
};

// ── MenuItem interface (exported for external use) ─────────────────────────

export interface MenuItem {
    label: string;
    shortcut?: string;
    icon?: string;
    action?: (view: EditorView) => void;
    isActive?: (view: EditorView) => boolean;
    disabled?: boolean;
    submenu?: MenuItem[];
    separator?: boolean;
}

// ── DOM builders ───────────────────────────────────────────────────────────

export function createMenuDom(
    items: MenuItem[],
    view: EditorView,
    closeAll: () => void
): HTMLElement {
    const menu = document.createElement('ul');
    menu.className = 'idz-context-menu';
    menu.setAttribute('role', 'menu');

    for (const item of items) {
        if (item.separator) {
            const sep = document.createElement('li');
            sep.className = 'idz-context-menu-sep';
            sep.setAttribute('role', 'separator');
            menu.appendChild(sep);
            continue;
        }

        const li = document.createElement('li');
        li.className = 'idz-context-menu-item';
        li.setAttribute('role', 'menuitem');

        if (item.disabled) {
            li.classList.add('idz-context-menu-item--disabled');
        }

        const isActive = !item.disabled && (item.isActive?.(view) ?? false);
        if (isActive) li.classList.add('idz-context-menu-item--active');

        const labelSpan = document.createElement('span');
        labelSpan.className = 'idz-context-menu-label';

        if (item.icon) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'idz-context-menu-icon';
            iconSpan.innerHTML = item.icon;
            labelSpan.appendChild(iconSpan);
        } else if (isActive) {
            const check = document.createElement('span');
            check.className = 'idz-context-menu-check';
            check.textContent = '✓';
            labelSpan.appendChild(check);
        }

        labelSpan.append(item.label);
        li.appendChild(labelSpan);

        if (item.shortcut) {
            const shortcutSpan = document.createElement('span');
            shortcutSpan.className = 'idz-context-menu-shortcut';
            shortcutSpan.textContent = item.shortcut;
            li.appendChild(shortcutSpan);
        }

        if (item.submenu && !item.disabled) {
            const arrow = document.createElement('span');
            arrow.className = 'idz-context-menu-arrow';
            arrow.textContent = '▸';
            li.appendChild(arrow);

            let subMenu: HTMLElement | null = null;

            li.addEventListener('mouseenter', () => {
                if (subMenu) return;
                subMenu = createMenuDom(item.submenu!, view, closeAll);
                subMenu.classList.add('idz-context-submenu');
                li.appendChild(subMenu);
            });

            li.addEventListener('mouseleave', (e) => {
                const related = e.relatedTarget as Node | null;
                if (subMenu && !li.contains(related)) {
                    subMenu.remove();
                    subMenu = null;
                }
            });
        } else if (item.action && !item.disabled) {
            const action = item.action;
            li.addEventListener('click', () => {
                closeAll();
                // Run synchronously so document.execCommand can utilize the user gesture token
                action(view);
            });
        }

        menu.appendChild(li);
    }

    return menu;
}

export function positionMenu(menu: HTMLElement, x: number, y: number): void {
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    document.body.appendChild(menu);

    // Clamp to viewport
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        menu.style.left = `${Math.max(0, x - rect.width)}px`;
    }
    if (rect.bottom > window.innerHeight) {
        menu.style.top = `${Math.max(0, y - rect.height)}px`;
    }
}

// ── Regular editor context menu items ──────────────────────────────────────

function buildEditorMenuItems(): MenuItem[] {
    return [
        {
            label: 'Format',
            submenu: [
                { label: 'Bold', shortcut: 'Ctrl+B', action: cmdBold, isActive: (v) => isBold(v.state) },
                { label: 'Italic', shortcut: 'Ctrl+I', action: cmdItalic, isActive: (v) => isItalic(v.state) },
                { label: 'Strikethrough', shortcut: 'Ctrl+Shift+K', action: cmdStrikethrough, isActive: (v) => isStrikethroughActive(v.state) },
                { label: 'Code', shortcut: 'Ctrl+E', action: cmdCode, isActive: (v) => isCodeActive(v.state) },
                { label: 'Link', shortcut: 'Ctrl+K', action: cmdLink },
            ],
        },
        {
            label: 'Paragraph',
            submenu: [
                { label: 'Bullet list', shortcut: 'Ctrl+Shift+8', action: cmdBulletList, isActive: (v) => isBulletListActive(v.state) },
                { label: 'Numbered list', shortcut: 'Ctrl+Shift+7', action: cmdOrderedList, isActive: (v) => isOrderedListActive(v.state) },
                { label: 'Task list', shortcut: 'Ctrl+Shift+9', action: cmdTaskList, isActive: (v) => isTaskListActive(v.state) },
                { label: 'Blockquote', action: cmdBlockquote, isActive: (v) => isBlockquoteActive(v.state) },
                { separator: true, label: '' },
                { label: 'Heading 1', shortcut: 'Ctrl+1', action: (v) => cmdHeading(v, 1), isActive: (v) => getHeadingLevel(v.state) === 1 },
                { label: 'Heading 2', shortcut: 'Ctrl+2', action: (v) => cmdHeading(v, 2), isActive: (v) => getHeadingLevel(v.state) === 2 },
                { label: 'Heading 3', shortcut: 'Ctrl+3', action: (v) => cmdHeading(v, 3), isActive: (v) => getHeadingLevel(v.state) === 3 },
                { label: 'Heading 4', shortcut: 'Ctrl+4', action: (v) => cmdHeading(v, 4), isActive: (v) => getHeadingLevel(v.state) === 4 },
                { label: 'Heading 5', shortcut: 'Ctrl+5', action: (v) => cmdHeading(v, 5), isActive: (v) => getHeadingLevel(v.state) === 5 },
                { label: 'Heading 6', shortcut: 'Ctrl+6', action: (v) => cmdHeading(v, 6), isActive: (v) => getHeadingLevel(v.state) === 6 },
            ],
        },
        {
            label: 'Insert',
            submenu: [
                { label: 'Table', action: cmdInsertTable },
                { label: 'Code block', action: cmdInsertCodeBlock },
                {
                    label: 'Callout',
                    submenu: [
                        { label: 'Note', action: (v) => cmdInsertCallout(v, 'NOTE') },
                        { label: 'Tip', action: (v) => cmdInsertCallout(v, 'TIP') },
                        { label: 'Important', action: (v) => cmdInsertCallout(v, 'IMPORTANT') },
                        { label: 'Warning', action: (v) => cmdInsertCallout(v, 'WARNING') },
                        { label: 'Caution', action: (v) => cmdInsertCallout(v, 'CAUTION') },
                    ],
                },
                { label: 'Footnote', action: cmdInsertFootnote },
                { label: 'Horizontal rule', action: cmdInsertHorizontalRule },
            ],
        },
        { separator: true, label: '' },
        {
            label: 'Cut',
            shortcut: 'Ctrl+X',
            disabled: !canCopyClipboard,
            action: (v) => {
                v.focus();
                if (!document.execCommand('cut')) {
                    const text = v.state.sliceDoc(v.state.selection.main.from, v.state.selection.main.to);
                    if (text && navigator.clipboard) {
                        navigator.clipboard.writeText(text).then(() => {
                            v.dispatch(v.state.replaceSelection(''));
                        }).catch(() => {
                            showToast('Clipboard access denied. Please use Ctrl+X or Cmd+X.', true);
                        });
                    } else {
                        showToast('Clipboard access denied. Please use Ctrl+X or Cmd+X.', true);
                    }
                }
            }
        },
        {
            label: 'Copy',
            shortcut: 'Ctrl+C',
            disabled: !canCopyClipboard,
            action: (v) => {
                v.focus();
                if (!document.execCommand('copy')) {
                    const text = v.state.sliceDoc(v.state.selection.main.from, v.state.selection.main.to);
                    if (text && navigator.clipboard) {
                        navigator.clipboard.writeText(text).catch(() => {
                            showToast('Clipboard access denied. Please use Ctrl+C or Cmd+C.', true);
                        });
                    } else {
                        showToast('Clipboard access denied. Please use Ctrl+C or Cmd+C.', true);
                    }
                }
            }
        },
        {
            label: 'Paste',
            shortcut: 'Ctrl+V',
            disabled: !canPasteClipboard,
            action: async (v) => {
                v.focus();
                if (document.execCommand('paste')) return;

                try {
                    let html = '', plain = '';
                    if (navigator.clipboard && navigator.clipboard.read) {
                        try {
                            const items = await navigator.clipboard.read();
                            for (const item of items) {
                                if (item.types.includes('text/html')) {
                                    const blob = await item.getType('text/html');
                                    html = await blob.text();
                                }
                                if (item.types.includes('text/plain')) {
                                    const blob = await item.getType('text/plain');
                                    plain = await blob.text();
                                }
                            }
                        } catch (e) {
                            if (navigator.clipboard.readText) {
                                plain = await navigator.clipboard.readText();
                            } else {
                                throw e;
                            }
                        }
                    } else if (navigator.clipboard && navigator.clipboard.readText) {
                        plain = await navigator.clipboard.readText();
                    }

                    if (html || plain) {
                        const dt = new DataTransfer();
                        if (html) dt.setData('text/html', html);
                        if (plain) dt.setData('text/plain', plain);
                        const pasteEvent = new ClipboardEvent('paste', {
                            clipboardData: dt,
                            bubbles: true,
                            cancelable: true
                        });
                        v.contentDOM.dispatchEvent(pasteEvent);

                        // If no custom paste handler intercepted it, we manually insert the plain text.
                        // Native paste won't do anything because the event is synthetic.
                        if (!pasteEvent.defaultPrevented && plain) {
                            v.dispatch(v.state.replaceSelection(plain), { userEvent: 'input.paste' });
                        }
                    }
                } catch (err) {
                    console.error('Failed to paste from clipboard via API:', err);
                    showToast('Clipboard access denied. Please use Ctrl+V or Cmd+V to paste.', true);
                }
            }
        },
        {
            label: 'Select all',
            shortcut: 'Ctrl+A',
            action: (v) => { v.dispatch({ selection: { anchor: 0, head: v.state.doc.length } }); },
        },
    ];
}

// ── Table context menu ──────────────────────────────────────────────────────

function buildTableMenuItems(
    view: EditorView,
    data: TableData,
    rowIdx: number,  // -1 = header, 0+ = data rows
    colIdx: number,
): MenuItem[] {
    const isHeader = rowIdx < 0;
    const isFirstRow = rowIdx === 0;
    const isLastRow = rowIdx === data.rows.length - 1;
    const isFirstCol = colIdx === 0;
    const isLastCol = colIdx === data.headers.length - 1;
    const singleRow = data.rows.length <= 1;
    const singleCol = data.headers.length <= 1;

    return [
        {
            label: 'Row',
            icon: ICONS.rows,
            submenu: [
                {
                    label: 'Add row above',
                    icon: ICONS.rowAbove,
                    disabled: isHeader,
                    action: isHeader ? undefined : (_v) => tableAddRowAbove(view, data, rowIdx),
                },
                {
                    label: 'Add row below',
                    icon: ICONS.rowBelow,
                    action: isHeader
                        ? (_v) => tableAddRowAbove(view, data, 0)
                        : (_v) => tableAddRowBelow(view, data, rowIdx),
                },
                { separator: true, label: '' },
                {
                    label: 'Move row up',
                    icon: ICONS.moveUp,
                    disabled: isHeader || isFirstRow,
                    action: (!isHeader && !isFirstRow)
                        ? (_v) => tableMoveRowUp(view, data, rowIdx)
                        : undefined,
                },
                {
                    label: 'Move row down',
                    icon: ICONS.moveDown,
                    disabled: isHeader || isLastRow,
                    action: (!isHeader && !isLastRow)
                        ? (_v) => tableMoveRowDown(view, data, rowIdx)
                        : undefined,
                },
                { separator: true, label: '' },
                {
                    label: 'Duplicate row',
                    icon: ICONS.duplicate,
                    disabled: isHeader,
                    action: !isHeader ? (_v) => tableDuplicateRow(view, data, rowIdx) : undefined,
                },
                {
                    label: 'Delete row',
                    icon: ICONS.trash,
                    disabled: isHeader || singleRow,
                    action: (!isHeader && !singleRow)
                        ? (_v) => tableDeleteRow(view, data, rowIdx)
                        : undefined,
                },
            ],
        },
        {
            label: 'Column',
            icon: ICONS.cols,
            submenu: [
                {
                    label: 'Add column left',
                    icon: ICONS.colLeft,
                    action: (_v) => tableAddColumnLeft(view, data, colIdx),
                },
                {
                    label: 'Add column right',
                    icon: ICONS.colRight,
                    action: (_v) => tableAddColumnRight(view, data, colIdx),
                },
                { separator: true, label: '' },
                {
                    label: 'Move column left',
                    icon: ICONS.colLeft,
                    disabled: isFirstCol,
                    action: !isFirstCol ? (_v) => tableMoveColumnLeft(view, data, colIdx) : undefined,
                },
                {
                    label: 'Move column right',
                    icon: ICONS.colRight,
                    disabled: isLastCol,
                    action: !isLastCol ? (_v) => tableMoveColumnRight(view, data, colIdx) : undefined,
                },
                { separator: true, label: '' },
                {
                    label: 'Delete column',
                    icon: ICONS.trash,
                    disabled: singleCol,
                    action: !singleCol ? (_v) => tableDeleteColumn(view, data, colIdx) : undefined,
                },
            ],
        },
        { separator: true, label: '' },
        {
            label: 'Sort by column (A → Z)',
            icon: ICONS.sortAZ,
            action: (_v) => tableSortByColumn(view, data, colIdx, 'asc'),
        },
        {
            label: 'Sort by column (Z → A)',
            icon: ICONS.sortZA,
            action: (_v) => tableSortByColumn(view, data, colIdx, 'desc'),
        },
    ];
}

/**
 * Show a table-specific context menu at the given screen coordinates.
 * Called from the table widget's contextmenu listener.
 */
export function showTableContextMenu(
    x: number,
    y: number,
    view: EditorView,
    data: TableData,
    rowIdx: number,
    colIdx: number,
): void {
    injectGlobalStyles();
    closeActiveMenu();

    const items = buildTableMenuItems(view, data, rowIdx, colIdx);
    activeMenu = createMenuDom(items, view, closeActiveMenu);
    positionMenu(activeMenu, x, y);
    registerGlobalCloseListeners();
}

// ── Extension ──────────────────────────────────────────────────────────────

export function contextMenuExtension(): Extension {
    injectGlobalStyles();

    return EditorView.domEventHandlers({
        contextmenu(event, view) {
            event.preventDefault();
            closeActiveMenu();

            const items = buildEditorMenuItems();
            activeMenu = createMenuDom(items, view, closeActiveMenu);
            positionMenu(activeMenu, event.clientX, event.clientY);
            registerGlobalCloseListeners();

            return true;
        },
    });
}
