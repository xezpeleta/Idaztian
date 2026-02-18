# Idaztian Framework

> **Idaztian** — *"writing"* in Basque

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
import { IdaztianEditor } from 'idaztian';

const editor = new IdaztianEditor({
  parent: document.getElementById('editor'),
  initialContent: '# Hello World\n\nStart writing...',
  onChange: (content) => console.log(content),
});
```

## Demo

```bash
git clone https://github.com/xezpeleta/idaztian
cd idaztian
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Documentation

See [`docs/PRD.md`](docs/PRD.md) for the full Product Requirements Document.

## License

[GPL-3.0](LICENSE) © Idaztian Contributors
