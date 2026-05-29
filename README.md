# Idaztian Editor Framework

> **_When you write_**, ideas flow faster, notes stay organized, and your mind stays clear.

An open-source JavaScript framework that provides an Obsidian-style **live-preview markdown editor** for the web. Renders markdown formatting inline as you type — hiding raw syntax unless your cursor is on the formatted element.

Integrate it in your note taking app, blog, documentation site, or any web application that needs a markdown editor. You can also use it as a **read-only markdown viewer**.

## Features

- 🖊️ **Live preview** — inline rendering with context-aware syntax reveal
- 📝 **Full CommonMark** + GFM tables, task lists, alerts, math, footnotes
- 🔌 **Embeddable** — drop into any web application
- ⌨️ **Keyboard shortcuts** — Obsidian-compatible
- 🌙 **Themes** — themes support
- 🎨 **Customizable** — customize the editor to your needs
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

For more information, see [API Documentation](https://xezpeleta.github.io/Idaztian/docs/) and [Examples](https://xezpeleta.github.io/Idaztian/examples/).

## Idatzi Desktop App

**Idatzi** is a desktop markdown editor built with Electron and the Idaztian framework. It provides a full-featured editing experience with native file dialogs, local persistence, and a dark-themed UI.

### Run Idatzi

```bash
cd idatzi
npm install
npm run dev
```

## Examples

Explore our integration examples to see how effortlessly the framework drops into different environments:

- 🏎️ **[Simple Editor (Vite + TypeScript)](https://xezpeleta.github.io/Idaztian/examples/simple-editor/)**: A minimal, lightweight integration showing how to quickly load up Idaztian in modern toolchains. (Source: [`examples/simple-editor`](examples/simple-editor))
- 📄 **[Pure HTML Editor](https://xezpeleta.github.io/Idaztian/examples/html-editor/)**: Zero build tools required. Shows how to embed Idaztian using static files or a CDN. (Source: [`examples/html-editor`](examples/html-editor))

## API Documentation

See [API Documentation](https://xezpeleta.github.io/Idaztian/docs/) for detailed information about the API.

## License

[GPL-3.0](LICENSE) © Xabi Ezpeleta
