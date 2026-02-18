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

### Horizontal Rule

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
    onChange(content) {
        updateStats(content);
        saveContent(content);
    },
    onSave(content) {
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
