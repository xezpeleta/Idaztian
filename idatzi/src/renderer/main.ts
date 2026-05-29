import { IdaztianEditor } from 'idaztian';
import 'idaztian/style.css';

// ──────────────────────────────────────────────────────────────────
// Sample markdown content (from Idatz original)
// ──────────────────────────────────────────────────────────────────
const SAMPLE_CONTENT = `# Welcome to Idaztian

**Idaztian** is a live-preview markdown editor framework. Move your cursor onto any formatted element to reveal its syntax — move away to see the rendered result.

## Live Preview Features

### Emphasis
This text has **bold**, *italic*, and ***bold italic*** formatting. You can also use ~~strikethrough~~ text.

### Links and Images
Here is a [link to the repository](https://github.com/xezpeleta/idaztian).

### Lists
- First item
- Second item
  - Nested item
- Third item

### Task list
- [x] Create the PRD
- [x] Plan Phase 1
- [ ] Publish to npm

### Code
Inline code: \`const editor = new IdaztianEditor(config)\`

\`\`\`typescript
import { IdaztianEditor } from 'idaztian';
const editor = new IdaztianEditor({
  parent: document.getElementById('editor'),
  initialContent: '# Hello World',
});
\`\`\`

> This is a blockquote.

> [!NOTE]
> This is a note callout.

### Math
Inline: $E = mc^2$

Block:
$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

### Table
| Feature | Phase | Status |
|---|---|---|
| Headings, bold, italic | Phase 1 | Done |
| Tables | Phase 2 | Done |

---

*Start writing your own content — or click Open to load a markdown file.*
`;

// ──────────────────────────────────────────────────────────────────
// Sidebar — directory file listing
// ──────────────────────────────────────────────────────────────────
let currentDir = '';
let currentFilePath = '';

const LS_DIR_KEY = 'idatzi:last-dir';

function getParentDir(dirPath: string): string | null {
  // Strip trailing slash
  const clean = dirPath.replace(/[/\\]+$/, '');
  const sep = clean.lastIndexOf('/');
  const altSep = clean.lastIndexOf('\\');
  const lastSep = Math.max(sep, altSep);
  if (lastSep <= 0) return null; // root or empty
  return clean.substring(0, lastSep) || (clean.startsWith('/') ? '/' : null);
}

function getDefaultDir(): string {
  // 1. Check localStorage for last-used directory
  try {
    const stored = localStorage.getItem(LS_DIR_KEY);
    if (stored) return stored;
  } catch {}
  // 2. Fall back to home directory
  return window.idatzi.getHomeDir();
}

async function refreshDir() {
  const list = document.getElementById('file-list')!;
  const pathEl = document.getElementById('sidebar-dir-path')!;

  pathEl.textContent = currentDir || '—';
  pathEl.setAttribute('title', currentDir);

  if (!currentDir) {
    list.innerHTML = '<li class="file-empty">No directory selected</li>';
    return;
  }

  // Persist
  try { localStorage.setItem(LS_DIR_KEY, currentDir); } catch {}

  const items = await window.idatzi.listDir(currentDir);

  let html = '';

  // Up directory (..)
  const parentDir = getParentDir(currentDir);
  if (parentDir !== null) {
    html += `<li class="file-item file-item--up" data-path="${escapeAttr(parentDir)}" data-type="up">
      <svg class="file-item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      ..
    </li>`;
  }

  // Directories and files
  html += items
    .map(item => {
      const isDir = item.type === 'dir';
      const active = !isDir && item.path === currentFilePath ? ' active' : '';
      const cls = isDir ? ' file-item--dir' : '';
      const icon = isDir
        ? '<svg class="file-item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>'
        : '<svg class="file-item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
      return `<li class="file-item${active}${cls}" data-path="${escapeAttr(item.path)}" data-type="${item.type}" title="${escapeAttr(item.name)}">
        ${icon}
        ${escapeHtml(item.name)}
      </li>`;
    })
    .join('');

  list.innerHTML = html || '<li class="file-empty">Empty directory</li>';

  // Click handlers
  list.querySelectorAll('.file-item').forEach(el => {
    el.addEventListener('click', () => {
      const p = el.getAttribute('data-path')!;
      const t = el.getAttribute('data-type')!;
      if (t === 'dir' || t === 'up') {
        // Navigate into directory
        currentDir = p;
        currentFilePath = '';
        refreshDir();
      } else {
        // Open file
        openSidebarFile(p);
      }
    });
  });
}

function escapeHtml(s: string) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function escapeAttr(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function openSidebarFile(filePath: string) {
  const content = await window.idatzi.readFile(filePath);
  if (content === null) {
    console.error('Failed to read file:', filePath);
    return;
  }
  editor.setContent(content);
  const name = filePath.split('/').pop() || filePath.split('\\').pop() || 'untitled.md';
  currentFilePath = filePath;
  currentFilename = name;
  document.title = `${name} — Idatzi`;
  updateStats(content);
  refreshDir();
}

// Change directory button → native open-dir dialog
async function handleChangeDir() {
  const newDir = await window.idatzi.selectDir();
  if (newDir) {
    currentDir = newDir;
    currentFilePath = '';
    refreshDir();
  }
}

document.getElementById('btn-new-file')!.addEventListener('click', handleNew);
document.getElementById('btn-change-dir')!.addEventListener('click', handleChangeDir);
document.getElementById('btn-refresh-dir')!.addEventListener('click', refreshDir);

// Sidebar resize
const sidebarResize = document.getElementById('sidebar-resize')!;
const sidebar = document.getElementById('sidebar')!;

sidebarResize.addEventListener('mousedown', (e) => {
  e.preventDefault();
  const startX = e.clientX;
  const startWidth = sidebar.getBoundingClientRect().width;

  const onMove = (ev: MouseEvent) => {
    const delta = ev.clientX - startX;
    const newWidth = Math.max(160, Math.min(400, startWidth + delta));
    sidebar.style.width = `${newWidth}px`;
  };

  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
});

// ──────────────────────────────────────────────────────────────────
// Editor setup
// ──────────────────────────────────────────────────────────────────
let currentFilename = 'document.md';
let editor: IdaztianEditor;

function updateStats(content: string) {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = content.replace(/\n/g, '').length;
  const lines = content.split('\n').length;
  document.getElementById('stat-words')!.textContent = `Words: ${words.toLocaleString()}`;
  document.getElementById('stat-chars')!.textContent = `Characters: ${chars.toLocaleString()}`;
  document.getElementById('stat-lines')!.textContent = `Lines: ${lines.toLocaleString()}`;
}

async function handleDownload(content?: string) {
  const text = content ?? editor.getContent();
  await window.idatzi.saveFile(text, currentFilename);
}

async function initEditor(initialContent: string) {
  editor = new IdaztianEditor({
    parent: document.getElementById('editor')!,
    initialContent,
    toolbar: true,
    contextMenu: true,
    extensions: { math: true },
    onChange(content: string) {
      updateStats(content);
      // Auto-save to backend + localStorage fallback
      saveToBackend(content);
      try { localStorage.setItem('idatzi:doc', content); } catch {}
    },
    onSave(content: string) {
      // Ctrl+S →Electron save dialog
      handleDownload(content);
    },
  });
}

// ──────────────────────────────────────────────────────────────────
// Content persistence
// ──────────────────────────────────────────────────────────────────
async function saveToBackend(content: string) {
  const ok = await window.idatzi.saveToBackend(content);
  if (!ok) {
    // Backend unreachable — localStorage is the fallback
    try { localStorage.setItem('idatzi:doc', content); } catch {}
  }
}

async function loadContent(): Promise<string | null> {
  // Try backend first
  try {
    const backendContent = await window.idatzi.loadFromBackend();
    if (backendContent) return backendContent;
  } catch {
    // Backend not ready — fall through to localStorage
  }
  // Fall back to localStorage
  try { return localStorage.getItem('idatzi:doc'); } catch { return null; }
}

// ──────────────────────────────────────────────────────────────────
// File operations (via Electron native dialogs)
// ──────────────────────────────────────────────────────────────────

/**
 * Handle a path received from CLI or macOS open-file.
 * If it's a directory, browse it. If it's a file, open it.
 */
async function handleOpenPath(rawPath: string) {
  const stat = await window.idatzi.statPath(rawPath);
  if (!stat) {
    console.error('Cannot access path:', rawPath);
    return;
  }
  if (stat.type === 'dir') {
    currentDir = rawPath;
    currentFilePath = '';
    await refreshDir();
  } else {
    // Set sidebar to the file's parent directory
    const parent = getParentDir(rawPath);
    if (parent) {
      currentDir = parent;
    }
    await openSidebarFile(rawPath);
  }
}

async function handleNew() {
  if (!currentDir) return;
  startInlineRename();
}

async function handleNewDir() {
  if (!currentDir) return;
  startInlineRenameDir();
}

function startInlineRenameDir() {
  const list = document.getElementById('file-list')!;
  const existing = list.querySelector('.file-item--new');
  if (existing) existing.remove();

  const li = document.createElement('li');
  li.className = 'file-item file-item--new file-item--dir';
  li.innerHTML = `
    <svg class="file-item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
    <input class="file-rename-input" type="text" value="new-folder" spellcheck="false" />
  `;

  list.appendChild(li);

  const input = li.querySelector('input')!;
  input.focus();
  input.select();

  let committed = false;

  const commit = async () => {
    if (committed) return;
    committed = true;
    const name = input.value.trim();
    li.remove();
    if (!name) {
      editor.focus();
      return;
    }
    const result = await window.idatzi.createDir(currentDir, name);
    if (!result.ok) {
      alert(result.error || 'Failed to create directory');
      return;
    }
    await refreshDir();
    editor.focus();
  };

  const cancel = () => {
    committed = true;
    li.remove();
    editor.focus();
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
  input.addEventListener('blur', () => {
    setTimeout(() => { if (!committed) commit(); }, 150);
  });
}

function startInlineRename() {
  const list = document.getElementById('file-list')!;
  // Remove any existing inline input
  const existing = list.querySelector('.file-item--new');
  if (existing) existing.remove();

  const li = document.createElement('li');
  li.className = 'file-item file-item--new';
  li.innerHTML = `
    <svg class="file-item-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    <input class="file-rename-input" type="text" value="untitled.md" spellcheck="false" />
  `;

  // Insert at bottom of list
  list.appendChild(li);

  const input = li.querySelector('input')!;
  input.focus();
  // Select the name part (before .md)
  const dot = input.value.lastIndexOf('.');
  input.setSelectionRange(0, dot >= 0 ? dot : input.value.length);

  let committed = false;

  const commit = async () => {
    if (committed) return;
    committed = true;
    const name = input.value.trim();
    li.remove();
    if (!name) {
      editor.focus();
      return;
    }
    const safeName = name.endsWith('.md') ? name : name + '.md';
    const result = await window.idatzi.createFile(currentDir, safeName);
    if (!result.ok) {
      alert(result.error || 'Failed to create file');
      return;
    }
    currentFilePath = result.path!;
    currentFilename = safeName;
    editor.setContent('');
    document.title = `${safeName} — Idatzi`;
    updateStats('');
    await refreshDir();
    editor.focus();
  };

  const cancel = () => {
    committed = true;
    li.remove();
    editor.focus();
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); commit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
  input.addEventListener('blur', () => {
    // Small delay so Enter keydown can fire first
    setTimeout(() => { if (!committed) commit(); }, 150);
  });
}

// Sidebar context menu
const contextMenu = document.getElementById('sidebar-context-menu')!;
let contextTargetPath = '';
let contextTargetType = '';

function showContextMenu(e: MouseEvent) {
  e.preventDefault();
  const el = (e.target as HTMLElement).closest('.file-item') as HTMLElement | null;

  // Determine if we're on a file, directory, or empty space
  if (el) {
    contextTargetPath = el.getAttribute('data-path')!;
    contextTargetType = el.getAttribute('data-type')!;
  } else {
    contextTargetPath = '';
    contextTargetType = '';
  }

  // Show/hide items based on context
  const newFileItem = contextMenu.querySelector('[data-action="new-file"]') as HTMLElement;
  const newDirItem = contextMenu.querySelector('[data-action="new-dir"]') as HTMLElement;
  const saveItem = contextMenu.querySelector('[data-action="save"]') as HTMLElement;
  const deleteItem = contextMenu.querySelector('[data-action="delete"]') as HTMLElement;

  const isEmptySpace = !el;
  const isFile = contextTargetType === 'file';

  // Empty space: only New File + New Directory
  newFileItem.style.display = isEmptySpace ? '' : 'none';
  newDirItem.style.display = isEmptySpace ? '' : 'none';
  // File: only Save As + Delete
  saveItem.style.display = isFile ? '' : 'none';
  deleteItem.style.display = isFile ? '' : 'none';

  contextMenu.style.left = `${e.clientX}px`;
  contextMenu.style.top = `${e.clientY}px`;
  contextMenu.hidden = false;
}

function hideContextMenu() {
  contextMenu.hidden = true;
  contextTargetPath = '';
  contextTargetType = '';
}

contextMenu.addEventListener('click', async (e) => {
  const action = (e.target as HTMLElement).closest('.context-menu-item')?.getAttribute('data-action');
  if (!action) return;

  // Capture before hiding (hideContextMenu clears them)
  const targetPath = contextTargetPath;
  hideContextMenu();

  if (action === 'new-file') {
    await handleNew();
  } else if (action === 'new-dir') {
    await handleNewDir();
  } else if (action === 'save') {
    await handleDownload(editor.getContent());
  } else if (action === 'delete') {
    if (!confirm(`Delete "${targetPath.split('/').pop()}"?`)) return;
    const result = await window.idatzi.deleteFile(targetPath);
    if (!result.ok) {
      alert(result.error || 'Failed to delete file');
      return;
    }
    // If we deleted the currently open file, clear editor
    if (currentFilePath === targetPath) {
      currentFilePath = '';
      currentFilename = 'document.md';
      editor.setContent('');
      document.title = 'Idatzi';
      updateStats('');
    }
    await refreshDir();
  }
});

// Add context menu listener to file list
document.getElementById('file-list')!.addEventListener('contextmenu', showContextMenu);
document.addEventListener('click', (e) => {
  if (!contextMenu.hidden && !contextMenu.contains(e.target as Node)) {
    hideContextMenu();
  }
});

// ──────────────────────────────────────────────────────────────────
// Shortcuts modal
// ──────────────────────────────────────────────────────────────────
const modal = document.getElementById('shortcuts-modal')!;
function closeModal() { modal.hidden = true; editor.focus(); }
document.getElementById('btn-shortcuts')!.addEventListener('click', () => { modal.hidden = false; });
document.getElementById('btn-close-modal')!.addEventListener('click', closeModal);
document.getElementById('modal-backdrop')!.addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.hidden) closeModal();
});

// ──────────────────────────────────────────────────────────────────
// Custom title bar window controls
// ──────────────────────────────────────────────────────────────────
document.getElementById('btn-minimize')!.addEventListener('click', () => window.idatzi.minimizeWindow());
document.getElementById('btn-maximize')!.addEventListener('click', () => window.idatzi.maximizeWindow());
document.getElementById('btn-close')!.addEventListener('click', () => window.idatzi.closeWindow());

// ──────────────────────────────────────────────────────────────────
// Header buttons
// ──────────────────────────────────────────────────────────────────
document.getElementById('btn-toolbar')!.addEventListener('click', () => {
  // The IdaztianEditor exposes toggleToolbar if available
  (editor as any).toggleToolbar?.();
});

// ──────────────────────────────────────────────────────────────────
// Theme
// ──────────────────────────────────────────────────────────────────
window.idatzi.onThemeChange((isDark: boolean) => {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
});

// ──────────────────────────────────────────────────────────────────
// Bootstrap
// ──────────────────────────────────────────────────────────────────
(async () => {
  const storedContent = await loadContent();
  const initialContent = storedContent || SAMPLE_CONTENT;
  await initEditor(initialContent);
  updateStats(initialContent);

  // Store reference for sidebar use
  (window as any).__editor = editor;

  // Handle open-path (CLI argument / macOS open-file)
  const openPath = await window.idatzi.getOpenPath();
  if (openPath) {
    await handleOpenPath(openPath);
  } else {
    // Initialize sidebar directory only if no path was provided
    currentDir = getDefaultDir();
    await refreshDir();
  }

  // Listen for subsequent open-file events (macOS: open while running)
  window.idatzi.onOpenPath((filePath: string) => {
    handleOpenPath(filePath);
  });

  // Record editor-init milestone for startup metrics
  await window.idatzi.recordEditorInit();

  // Log startup metrics to console
  const metrics = await window.idatzi.getStartupMetrics();
  if (metrics) {
    console.log(
      `[metrics] Startup: cold=${metrics.appColdStartMs}ms ` +
      `backend=${metrics.backendReadyMs}ms ` +
      `editor=${metrics.editorInitMs}ms ` +
      `total=${metrics.totalStartupMs}ms`,
    );
  }
})();
