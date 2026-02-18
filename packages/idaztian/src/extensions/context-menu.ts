import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';

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
.idz-context-menu-label {
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
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

function injectGlobalStyles(): void {
    if (globalStylesInjected || typeof document === 'undefined') return;
    globalStylesInjected = true;
    const style = document.createElement('style');
    style.setAttribute('data-idz', 'context-menu');
    style.textContent = CONTEXT_MENU_CSS;
    document.head.appendChild(style);
}

import {
    cmdBold, cmdItalic, cmdCode, cmdStrikethrough, cmdLink,
    cmdHeading, cmdBulletList, cmdOrderedList, cmdTaskList, cmdBlockquote,
    cmdInsertTable, cmdInsertCodeBlock, cmdInsertHorizontalRule,
    cmdInsertCallout, cmdInsertFootnote,
    isBold, isItalic, isCodeActive, isStrikethroughActive,
    getHeadingLevel, isBulletListActive, isOrderedListActive, isTaskListActive, isBlockquoteActive,
} from './commands';

/**
 * Custom context menu (right-click) with Format / Paragraph / Insert submenus.
 * Gated by config.contextMenu (default: true).
 */

interface MenuItem {
    label: string;
    shortcut?: string;
    action?: (view: EditorView) => void;
    isActive?: (view: EditorView) => boolean;
    submenu?: MenuItem[];
    separator?: boolean;
}

function buildMenuItems(): MenuItem[] {
    return [
        {
            label: 'Format',
            submenu: [
                {
                    label: 'Bold',
                    shortcut: 'Ctrl+B',
                    action: cmdBold,
                    isActive: (v) => isBold(v.state),
                },
                {
                    label: 'Italic',
                    shortcut: 'Ctrl+I',
                    action: cmdItalic,
                    isActive: (v) => isItalic(v.state),
                },
                {
                    label: 'Strikethrough',
                    shortcut: 'Ctrl+Shift+K',
                    action: cmdStrikethrough,
                    isActive: (v) => isStrikethroughActive(v.state),
                },
                {
                    label: 'Code',
                    shortcut: 'Ctrl+E',
                    action: cmdCode,
                    isActive: (v) => isCodeActive(v.state),
                },
                {
                    label: 'Link',
                    shortcut: 'Ctrl+K',
                    action: cmdLink,
                },
            ],
        },
        {
            label: 'Paragraph',
            submenu: [
                {
                    label: 'Bullet list',
                    shortcut: 'Ctrl+Shift+8',
                    action: cmdBulletList,
                    isActive: (v) => isBulletListActive(v.state),
                },
                {
                    label: 'Numbered list',
                    shortcut: 'Ctrl+Shift+7',
                    action: cmdOrderedList,
                    isActive: (v) => isOrderedListActive(v.state),
                },
                {
                    label: 'Task list',
                    shortcut: 'Ctrl+Shift+9',
                    action: cmdTaskList,
                    isActive: (v) => isTaskListActive(v.state),
                },
                {
                    label: 'Blockquote',
                    action: cmdBlockquote,
                    isActive: (v) => isBlockquoteActive(v.state),
                },
                { separator: true, label: '' },
                {
                    label: 'Heading 1',
                    shortcut: 'Ctrl+1',
                    action: (v) => cmdHeading(v, 1),
                    isActive: (v) => getHeadingLevel(v.state) === 1,
                },
                {
                    label: 'Heading 2',
                    shortcut: 'Ctrl+2',
                    action: (v) => cmdHeading(v, 2),
                    isActive: (v) => getHeadingLevel(v.state) === 2,
                },
                {
                    label: 'Heading 3',
                    shortcut: 'Ctrl+3',
                    action: (v) => cmdHeading(v, 3),
                    isActive: (v) => getHeadingLevel(v.state) === 3,
                },
                {
                    label: 'Heading 4',
                    shortcut: 'Ctrl+4',
                    action: (v) => cmdHeading(v, 4),
                    isActive: (v) => getHeadingLevel(v.state) === 4,
                },
                {
                    label: 'Heading 5',
                    shortcut: 'Ctrl+5',
                    action: (v) => cmdHeading(v, 5),
                    isActive: (v) => getHeadingLevel(v.state) === 5,
                },
                {
                    label: 'Heading 6',
                    shortcut: 'Ctrl+6',
                    action: (v) => cmdHeading(v, 6),
                    isActive: (v) => getHeadingLevel(v.state) === 6,
                },
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
            action: () => document.execCommand('cut'),
        },
        {
            label: 'Copy',
            shortcut: 'Ctrl+C',
            action: () => document.execCommand('copy'),
        },
        {
            label: 'Paste',
            shortcut: 'Ctrl+V',
            action: () => document.execCommand('paste'),
        },
        {
            label: 'Select all',
            shortcut: 'Ctrl+A',
            action: (v) => {
                v.dispatch({ selection: { anchor: 0, head: v.state.doc.length } });
            },
        },
    ];
}

// ── DOM builders ───────────────────────────────────────────────────────────

function createMenuDom(
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

        const isActive = item.isActive?.(view) ?? false;
        if (isActive) li.classList.add('idz-context-menu-item--active');

        const labelSpan = document.createElement('span');
        labelSpan.className = 'idz-context-menu-label';
        if (isActive) {
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

        if (item.submenu) {
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
        } else if (item.action) {
            const action = item.action;
            li.addEventListener('click', () => {
                closeAll();
                // Small delay so the menu is gone before command runs
                requestAnimationFrame(() => {
                    action(view);
                    view.focus();
                });
            });
        }

        menu.appendChild(li);
    }

    return menu;
}

function positionMenu(menu: HTMLElement, x: number, y: number): void {
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    document.body.appendChild(menu);

    // Clamp to viewport
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        menu.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > window.innerHeight) {
        menu.style.top = `${y - rect.height}px`;
    }
}

// ── Extension ──────────────────────────────────────────────────────────────

export function contextMenuExtension(): Extension {
    injectGlobalStyles();
    let activeMenu: HTMLElement | null = null;

    const closeMenu = () => {
        if (activeMenu) {
            activeMenu.remove();
            activeMenu = null;
        }
    };

    const handleOutsideClick = (e: MouseEvent) => {
        if (activeMenu && !activeMenu.contains(e.target as Node)) {
            closeMenu();
        }
    };

    const handleKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && activeMenu) {
            closeMenu();
        }
    };

    return EditorView.domEventHandlers({
        contextmenu(event, view) {
            event.preventDefault();
            closeMenu();

            const items = buildMenuItems();
            activeMenu = createMenuDom(items, view, closeMenu);
            positionMenu(activeMenu, event.clientX, event.clientY);

            // Register global close listeners
            setTimeout(() => {
                document.addEventListener('click', handleOutsideClick, { once: false });
                document.addEventListener('keydown', handleKeydown);
            }, 0);

            // Clean up listeners when menu closes
            const observer = new MutationObserver(() => {
                if (activeMenu && !document.body.contains(activeMenu)) {
                    document.removeEventListener('click', handleOutsideClick);
                    document.removeEventListener('keydown', handleKeydown);
                    observer.disconnect();
                }
            });
            observer.observe(document.body, { childList: true });

            return true;
        },
    });
}
