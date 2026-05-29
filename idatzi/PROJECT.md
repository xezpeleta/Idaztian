# Idatzi — Electron Desktop Markdown Editor

## Summary

Idatzi is an Electron-based desktop markdown editor powered by the Idaztian live-preview framework. It provides a native desktop editing experience with file dialogs, local content persistence, and a dark-themed UI.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Electron v33 |
| Language | TypeScript |
| Renderer | Vite + vanilla TS |
| Editor | Idaztian (CodeMirror 6-based) |
| Backend | Node.js HTTP server (child process) |
| File ops | Electron `dialog` API via IPC |

## Architecture

```
Electron Main Process
├── Window lifecycle (frameless, dark theme)
├── Backend child process (HTTP on :3099)
├── IPC handlers (backend, files, theme, metrics)
└── Startup metrics collection

Renderer (Vite-served)
├── IdaztianEditor (live-preview markdown)
├── Custom title bar (frameless window)
├── Stats bar (words/chars/lines)
├── Shortcuts modal
└── Content persistence (backend + localStorage)
```

## Quick Start

```bash
cd idatzi
npm install
npm run dev
```

This starts Vite dev server (:5173) and Electron simultaneously with hot-reload.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Vite + Electron in dev mode |
| `npm run build` | Compile TypeScript + Vite production build |
| `npm run typecheck` | TypeScript check only (no emit) |
| `npm run test` | Run Vitest tests |

## Project Structure

```
idatzi/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # Window lifecycle, IPC handlers
│   │   ├── backend.ts  # Backend child process management
│   │   └── metrics.ts  # Startup timing instrumentation
│   ├── preload/
│   │   └── index.ts    # contextBridge API
│   └── renderer/
│       ├── index.html  # App shell + custom title bar
│       ├── main.ts     # Editor init, event wiring
│       ├── style.css   # App styles + Idatz theme
│       └── types.ts    # Type declarations
├── scripts/
│   ├── test-backend.cjs  # Dev backend (HTTP server)
│   └── wait-for-vite.js  # Vite readiness poller
├── docs/
│   └── mvp-flow.md       # Core editor flow spec
├── tests/
├── package.json
├── tsconfig.main.json
├── tsconfig.preload.json
└── vite.config.ts
```

## IPC Contract

| Channel | Direction | Description |
|---|---|---|
| `backend:status` | renderer→main | Get current backend status |
| `backend:start` | renderer→main | Start backend process |
| `backend:stop` | renderer→main | Stop backend process |
| `backend:status-change` | main→renderer | Backend status broadcast |
| `backend:save-content` | renderer→main | Persist document to backend |
| `backend:load-content` | renderer→main | Load document from backend |
| `file:open` | renderer→main | Native open file dialog |
| `file:save` | renderer→main | Native save file dialog |
| `metrics:startup` | renderer→main | Get startup metrics |
| `metrics:editor-init` | renderer→main | Record editor init milestone |
| `theme:isDark` | renderer→main | Check system dark mode |
| `theme:change` | main→renderer | System theme changed |
| `window:minimize` | renderer→main | Minimize window |
| `window:maximize` | renderer→main | Toggle maximize |
| `window:close` | renderer→main | Close window |

## Measured Performance

| Metric | Value |
|---|---|
| Backend ready time | ~675 ms |
| Full startup (editor init) | ~900 ms |
| Production bundle | ~1.5 MB (~500 KB gzipped) |

## License

GPL-3.0
