import { IdaztianEditor } from 'idaztian';
import { openFile, downloadFile } from './file-handler';
import { saveContent, loadContent } from './local-storage';

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

Click the **⌨** button in the header to see all shortcuts.

---

*Start writing your own content — or click **Open** to load a markdown file.*
*You can also **drag & drop** a \`.md\` file onto the editor, or **paste HTML** from any webpage to auto-convert it to markdown.*
`;

// ── Editor setup ─────────────────────────────────────────────────────────────


let currentFilename = 'document.md';

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
        saveContent(content);
    },
    onSave(content: string) {
        downloadFile(content, currentFilename);
    },
});

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
    const result = await openFile();
    if (result) {
        editor.setContent(result.content);
        currentFilename = result.filename;
        document.title = `${result.filename} — Idaztian`;
        updateStats(result.content);
    }
});

document.getElementById('btn-download')!.addEventListener('click', () => {
    downloadFile(editor.getContent(), currentFilename);
});

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
