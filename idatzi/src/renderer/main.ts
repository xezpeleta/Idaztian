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
async function handleOpen() {
  const result = await window.idatzi.openFile();
  if (result) {
    editor.setContent(result.content);
    currentFilename = result.filename;
    document.title = `${result.filename} — Idatzi`;
    updateStats(result.content);
  }
}

async function handleNew() {
  editor.setContent('');
  currentFilename = 'untitled.md';
  document.title = 'Untitled — Idatzi';
  updateStats('');
  try { localStorage.setItem('idatzi:doc', ''); } catch {}
  editor.focus();
}

async function handleDownload(content?: string) {
  const text = content ?? editor.getContent();
  await window.idatzi.saveFile(text, currentFilename);
}

// ──────────────────────────────────────────────────────────────────
// Stats bar
// ──────────────────────────────────────────────────────────────────
function updateStats(content: string) {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const chars = content.replace(/\n/g, '').length;
  const lines = content.split('\n').length;
  document.getElementById('stat-words')!.textContent = `Words: ${words.toLocaleString()}`;
  document.getElementById('stat-chars')!.textContent = `Characters: ${chars.toLocaleString()}`;
  document.getElementById('stat-lines')!.textContent = `Lines: ${lines.toLocaleString()}`;
}

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
document.getElementById('btn-open')!.addEventListener('click', handleOpen);
document.getElementById('btn-new')!.addEventListener('click', handleNew);
document.getElementById('btn-download')!.addEventListener('click', () => handleDownload());
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

  // Initialize sidebar directory
  currentDir = getDefaultDir();
  await refreshDir();

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
