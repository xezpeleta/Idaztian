# Idaztian Framework

> **_When you write_**, ideas flow faster, notes stay organized, and your mind stays clear.

An open-source JavaScript framework that provides an Obsidian-style **live-preview markdown editor** for the web. Renders markdown formatting inline as you type — hiding raw syntax unless your cursor is on the formatted element.

## Features

- 🖊️ **Live preview** — inline rendering with context-aware syntax reveal
- 📝 **Full CommonMark** + GFM tables, task lists, alerts, math, footnotes
- 🔌 **Embeddable** — drop into any web application
- ⌨️ **Keyboard shortcuts** — Obsidian-compatible
- 🌙 **Ilunabar dark theme** — Obsidian-inspired aesthetics
- 🔓 **GPL-3.0** — free and open source

## Quick Start

```bash
npm install idaztian
```

```typescript
import 'idaztian/style.css'; // Make sure to import the CSS!
import { IdaztianEditor } from 'idaztian';

const editor = new IdaztianEditor({
  parent: document.getElementById('editor'),
  initialContent: '# Hello World\n\nStart writing...',
  theme: 'system', // 'light' | 'dark' | 'system'
  toolbar: true, // show formatting toolbar
  readOnly: false, // toggle disable editing
  onChange: (content) => console.log(content),
});
```

## Demo

The **Idatz App** showcases the full power of the Idaztian Framework in a comprehensive editor.

🌍 **[Launch Live Demo](https://xezpeleta.github.io/Idaztian/)**

### Run locally

```bash
git clone https://github.com/xezpeleta/idaztian
cd idaztian
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Using Docker

```bash
# Install dependencies (via Docker per agents.md)
docker run --rm -v "$(pwd)":/app -w /app node:lts npm install

# Start idatz app dev server
docker run --rm -v "$(pwd)":/app -w /app/idatz -p 5174:5174 node:lts npx vite --host 0.0.0.0 --port 5174
```

## Examples

Explore our integration examples to see how effortlessly the framework drops into different environments:

- 🏎️ **[Simple Editor (Vite + TypeScript)](https://xezpeleta.github.io/Idaztian/examples/simple-editor/)**: A minimal, lightweight integration showing how to quickly load up Idaztian in modern toolchains. (Source: [`examples/simple-editor`](examples/simple-editor))
- 📄 **[Pure HTML Editor](https://xezpeleta.github.io/Idaztian/examples/html-editor/)**: Zero build tools required. Shows how to embed Idaztian using static files or a CDN. (Source: [`examples/html-editor`](examples/html-editor))

## Documentation

See [`docs/PRD.md`](docs/PRD.md) for the full Product Requirements Document.

## License

[GPL-3.0](LICENSE) © Idaztian Contributors
