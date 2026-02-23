import { IdaztianEditor } from 'idaztian';
import { openFile, downloadFile } from './file-handler';
import { saveContent, loadContent } from './local-storage';
import {
    isTauriEnvironment,
    desktopOpenFile,
    desktopSaveFile,
    desktopPickFile,
    desktopPickDirectory,
    desktopRenameFile,
    subscribeToFileChanges,
} from './desktop';

// ── Sample content ──────────────────────────────────────────────────────────

const SAMPLE_CONTENT = `# Welcome to Idaztian

**Idaztian** is a live-preview markdown editor framework. Move your cursor onto any formatted element to reveal its syntax — move away to see the rendered result.

## Live Preview Features

### Emphasis

This text has **bold**, *italic*, and ***bold italic*** formatting. Try clicking on each word to reveal the syntax.

You can also use ~~strikethrough~~ text.

### Links and Images

Here is a [link to the Idaztian repository](https://github.com/xezpeleta/idaztian). Click on it to see the full syntax.

Image with alt text (move cursor away to see it rendered):

![A scenic mountain landscape](/sample.jpg)

Broken images show the alt text and an error indicator:

![This image does not exist](/nonexistent.png)

### Lists

Bullet list:
- First item
- Second item
  - Nested item
  - Another nested item
- Third item

Ordered list:
1. First step
2. Second step
3. Third step

Task list:
- [x] Create the PRD
- [x] Plan Phase 1
- [x] Implement the framework
- [ ] Write tests
- [ ] Publish to npm

### Code

Inline code: \`const editor = new IdaztianEditor(config)\`

Fenced code block:

\`\`\`typescript
import { IdaztianEditor } from 'idaztian';

const editor = new IdaztianEditor({
  parent: document.getElementById('editor'),
  initialContent: '# Hello World',
  onChange: (content) => console.log(content),
});
\`\`\`

### Blockquotes

> This is a blockquote. Move your cursor here to see the \`>\` marker.
>
> It can span multiple lines.

### Alerts / Callouts

> [!NOTE]
> This is a note callout. Move your cursor here to reveal the raw syntax.

> [!TIP]
> Use **Ctrl+B** for bold, **Ctrl+I** for italic, and **Ctrl+K** for links.

> [!WARNING]
> Unsaved changes will be lost if you close the tab without downloading.

> [!IMPORTANT]
> Idaztian auto-saves your work to browser localStorage on every keystroke.

> [!CAUTION]
> Large documents with many images may affect performance.

### Footnotes

Footnotes let you add references[^1] without cluttering the text[^2].

[^1]: This is the first footnote definition.
[^2]: And this is the second one.

### Math (LaTeX)

Inline math renders inside a sentence: the famous mass-energy equivalence $E = mc^2$ by Einstein.

Another inline example: Euler's identity $e^{i\\pi} + 1 = 0$ is considered the most beautiful equation.

Block math is centred on its own line:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2}\\, dx = \\sqrt{\\pi}
$$

The quadratic formula:

$$
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
$$

### Horizontal Rule

---

### Tables

Tables are **always rendered** as styled HTML. Click any cell to enter editing mode, then **Tab** / **Shift+Tab** to navigate between cells. Hover the edges to reveal **+** buttons for adding rows and columns.

| Feature | Phase | Status |
|---|---|---|
| Headings, bold, italic | Phase 1 | Done |
| Links, images, code | Phase 1 | Done |
| Alerts, footnotes, math | Phase 2A | Done |
| Smart pairs, paste, drag & drop | Phase 2A | Done |
| Tables | Phase 2B | Done |
| Context menu | Phase 2B | Done |
| Toolbar | Phase 2B | Done |

Right-click anywhere in the editor to open the **context menu** with Format, Paragraph, and Insert submenus.

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+B | Bold |
| Ctrl+I | Italic |
| Ctrl+K | Insert link |
| Ctrl+E | Inline code |
| Ctrl+S | Save/Download |
| Ctrl+F | Find |
| Ctrl+H | Find & Replace |
| Tab (in table) | Move to next cell |
| Shift+Tab (in table) | Move to previous cell |

  Click the **⌨** button in the footer to see all shortcuts.

---

*Start writing your own content — or click **Open** to load a markdown file.*
*You can also **drag & drop** a \`.md\` file onto the editor, or **paste HTML** from any webpage to auto-convert it to markdown.*
`;

// ── Editor setup ─────────────────────────────────────────────────────────────


let currentFilename = 'document.md';
let desktopFilePath: string | null = null;
let desktopAutosaveDir: string | null = null;
let pendingAutosaveName: string | null = null;
let autosaveTimer: number | null = null;
let desktopSaveTimer: number | null = null;
let lastLocalEditAt = 0;
let lastSavedContent: string | null = null;
let pendingExternalContent: string | null = null;
let pendingExternalTimer: number | null = null;
let externalChangePending = false;

const storedContent = loadContent();

const editor = new IdaztianEditor({
    parent: document.getElementById('editor')!,
    initialContent: storedContent ?? SAMPLE_CONTENT,
    toolbar: true,
    contextMenu: true,
    extensions: {
        math: true,
    },
    onChange(content: string) {
        updateStats(content);

        if (isTauriEnvironment()) {
            lastLocalEditAt = Date.now();
            if (externalChangePending && pendingExternalContent) {
                if (pendingExternalTimer) window.clearTimeout(pendingExternalTimer);
                pendingExternalTimer = window.setTimeout(() => {
                    const toApply = pendingExternalContent;
                    pendingExternalContent = null;
                    externalChangePending = false;
                    if (toApply) void applyExternalContent(toApply);
                }, 1200);
            }
            if (!desktopFilePath) {
                scheduleDesktopAutosave();
                return;
            }
            scheduleDesktopSave();
            return;
        } else {
            // In Browser we save to localStorage
            saveContent(content);
        }
    },
    onSave(content: string) {
        if (isTauriEnvironment()) {
            if (!desktopFilePath) {
                scheduleDesktopAutosave();
                return;
            }
            void performDesktopSave();
        } else {
            downloadFile(content, currentFilename);
        }
    },
});

if (isTauriEnvironment()) {
    // If we're inside Tauri, subscribe to the rust file-changed events
    subscribeToFileChanges((newContent) => {
        const now = Date.now();
        if (lastSavedContent && newContent === lastSavedContent) return;
        if (editor.getContent() === newContent) return;

        if (now - lastLocalEditAt < 1200) {
            pendingExternalContent = newContent;
            externalChangePending = true;
            if (pendingExternalTimer) window.clearTimeout(pendingExternalTimer);
            const delay = Math.max(200, 1200 - (now - lastLocalEditAt));
            pendingExternalTimer = window.setTimeout(() => {
                const toApply = pendingExternalContent;
                pendingExternalContent = null;
                externalChangePending = false;
                if (toApply) void applyExternalContent(toApply);
            }, delay);
            return;
        }

        void applyExternalContent(newContent);
    }).catch(console.error);
}

// ── Stats bar ────────────────────────────────────────────────────────────────

function updateStats(content: string) {
    const words = content.trim() ? content.trim().split(/\s+/).length : 0;
    const chars = content.replace(/\n/g, '').length;
    const lines = content.split('\n').length;

    document.getElementById('stat-words')!.textContent = `Words: ${words.toLocaleString()}`;
    document.getElementById('stat-chars')!.textContent = `Characters: ${chars.toLocaleString()}`;
    document.getElementById('stat-lines')!.textContent = `Lines: ${lines.toLocaleString()}`;
}

// Initialize stats
updateStats(storedContent ?? SAMPLE_CONTENT);

// ── Header buttons ───────────────────────────────────────────────────────────

document.getElementById('btn-open')!.addEventListener('click', async () => {
    if (isTauriEnvironment()) {
        try {
            const absolutePath = await desktopPickFile();
            if (absolutePath) {
                const content = await desktopOpenFile(absolutePath);
                editor.setContent(content);
                desktopFilePath = absolutePath;
                desktopAutosaveDir = null;
                pendingAutosaveName = null;
                lastSavedContent = content;
                currentFilename = absolutePath.split('/').pop() ?? absolutePath;
                document.title = `${currentFilename} — Tauri`;
                updateStats(content);
            }
        } catch (e) {
            console.error(e);
        }
    } else {
        const result = await openFile();
        if (result) {
            editor.setContent(result.content);
            currentFilename = result.filename;
            document.title = `${result.filename} — Idaztian`;
            updateStats(result.content);
        }
    }
});

document.getElementById('btn-new')!.addEventListener('click', () => {
    if (isTauriEnvironment()) {
        prepareDesktopNewFile().catch(console.error);
        return;
    }

    editor.setContent('');
    currentFilename = 'untitled.md';
    document.title = 'Untitled — Idaztian';
    updateStats('');
    saveContent('');
    editor.focus();
});

const downloadButton = document.getElementById('btn-download');
if (downloadButton) {
    downloadButton.addEventListener('click', () => {
        downloadFile(editor.getContent(), currentFilename);
    });
}

document.getElementById('btn-toolbar')!.addEventListener('click', () => {
    editor.toggleToolbar();
});

// ── Shortcuts modal ──────────────────────────────────────────────────────────

const modal = document.getElementById('shortcuts-modal')!;
const backdrop = document.getElementById('modal-backdrop')!;

function openModal() {
    modal.hidden = false;
    document.getElementById('btn-close-modal')!.focus();
}

function closeModal() {
    modal.hidden = true;
    editor.focus();
}

document.getElementById('btn-shortcuts')!.addEventListener('click', openModal);
document.getElementById('btn-close-modal')!.addEventListener('click', closeModal);
backdrop.addEventListener('click', closeModal);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeModal();
});

// ── Desktop autosave naming ──────────────────────────────────────────────────

function normalizeFilename(value: string): string {
    const ascii = value
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .toLowerCase();

    return ascii || 'untitled';
}

function getFirstHeading(content: string): string | null {
    const lines = content.split('\n');
    for (const line of lines) {
        const match = line.match(/^#\s+(\S.+?)\s*$/);
        if (match?.[1]) return match[1].trim();
    }
    return null;
}

function getTimestampFilename(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    return `${yyyy}-${mm}-${dd}-${hh}-${min}.md`;
}

function getTimestampStamp(): string {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');
    const yyyy = now.getFullYear();
    const mm = pad(now.getMonth() + 1);
    const dd = pad(now.getDate());
    const hh = pad(now.getHours());
    const min = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    return `${yyyy}-${mm}-${dd}-${hh}-${min}-${ss}`;
}

function getConflictPath(path: string): string | null {
    const lastSlash = path.lastIndexOf('/');
    const dir = lastSlash >= 0 ? path.slice(0, lastSlash) : '';
    const base = lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
    if (!base) return null;
    const dot = base.lastIndexOf('.');
    const stem = dot > 0 ? base.slice(0, dot) : base;
    const ext = dot > 0 ? base.slice(dot) : '.md';
    const stamp = getTimestampStamp();
    const conflictName = `${stem}.idatz-local-${stamp}${ext}`;
    return dir ? `${dir}/${conflictName}` : conflictName;
}

function getDesiredDesktopFilename(content: string): string {
    const heading = getFirstHeading(content);
    if (heading) {
        return `${normalizeFilename(heading)}.md`;
    }
    return getTimestampFilename();
}

async function prepareDesktopNewFile(): Promise<void> {
    const directory = await desktopPickDirectory();
    if (!directory) return;

    desktopAutosaveDir = directory;
    desktopFilePath = null;
    pendingAutosaveName = null;
    currentFilename = 'untitled.md';
    editor.setContent('');
    document.title = 'Untitled — Tauri';
    updateStats('');
    editor.focus();

    scheduleDesktopAutosave();
}

async function applyExternalContent(newContent: string): Promise<void> {
    if (!isTauriEnvironment()) return;
    if (editor.getContent() === newContent) return;

    if (pendingExternalTimer) {
        window.clearTimeout(pendingExternalTimer);
        pendingExternalTimer = null;
    }
    pendingExternalContent = null;
    externalChangePending = false;

    const currentContent = editor.getContent();
    const isDirty = lastSavedContent !== null && currentContent !== lastSavedContent;

    if (isDirty && desktopFilePath) {
        const conflictPath = getConflictPath(desktopFilePath);
        if (conflictPath) {
            try {
                await desktopSaveFile(conflictPath, currentContent);
                console.warn(`Saved local edits to ${conflictPath}`);
            } catch (error) {
                console.error('Failed to save local conflict copy:', error);
            }
        }
    }

    const selection = editor.getSelection();
    editor.setContent(newContent);
    editor.setSelectionRange(selection.from, selection.to);
    updateStats(newContent);
    lastSavedContent = newContent;
}

function scheduleDesktopSave(): void {
    if (!isTauriEnvironment() || !desktopFilePath) return;
    if (externalChangePending) return;
    if (desktopSaveTimer) window.clearTimeout(desktopSaveTimer);
    desktopSaveTimer = window.setTimeout(() => {
        void performDesktopSave();
    }, 600);
}

async function performDesktopSave(): Promise<void> {
    if (!isTauriEnvironment() || !desktopFilePath) return;
    if (externalChangePending) return;
    const content = editor.getContent();
    if (lastSavedContent === content) return;
    await desktopSaveFile(desktopFilePath, content);
    lastSavedContent = content;
}

function scheduleDesktopAutosave(): void {
    if (!isTauriEnvironment() || !desktopAutosaveDir) return;
    if (externalChangePending) return;
    if (autosaveTimer) window.clearTimeout(autosaveTimer);

    autosaveTimer = window.setTimeout(() => {
        persistDesktopAutosave().catch(console.error);
    }, 600);
}

async function persistDesktopAutosave(): Promise<void> {
    if (!isTauriEnvironment() || !desktopAutosaveDir) return;
    if (externalChangePending) return;
    const content = editor.getContent();
    if (lastSavedContent === content) return;
    const desiredName = getDesiredDesktopFilename(content);
    const desiredPath = `${desktopAutosaveDir}/${desiredName}`;

    if (!desktopFilePath) {
        desktopFilePath = desiredPath;
        pendingAutosaveName = desiredName;
        currentFilename = desiredName;
        document.title = `${desiredName} — Tauri`;
        await desktopSaveFile(desktopFilePath, content);
        lastSavedContent = content;
        return;
    }

    await desktopSaveFile(desktopFilePath, content);
    lastSavedContent = content;

    if (pendingAutosaveName !== desiredName) {
        const oldPath = desktopFilePath;
        await desktopRenameFile(oldPath, desiredPath);
        desktopFilePath = desiredPath;
        pendingAutosaveName = desiredName;
        currentFilename = desiredName;
        document.title = `${desiredName} — Tauri`;
    }
}

if (isTauriEnvironment() && downloadButton) {
    downloadButton.style.display = 'none';
}
