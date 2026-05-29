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
