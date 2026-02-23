# Idatz Editor

Idatz is a desktop-first markdown editor built on top of the Idaztian framework. It provides the same live-preview editing experience as the web demo, with native file dialogs, autosave to disk, and file watching on desktop (Tauri).

## Idatz Desktop

Idatz Desktop is the Tauri-based app bundled for Linux packages. It supports:

- native file open/save dialogs
- continuous autosave to disk
- file watching so external edits show up in the editor

## Development

Idatz uses Docker for all Node-related tasks because the host machine does not have an up-to-date Node.js installation.

### Web editor (dev)

```bash
cd idatz
docker compose up -d idatz-dev
```

The dev server runs at `http://localhost:5174`.

## Build packages (Tauri Desktop)

The packaging flow uses the `tauri-dev` container and includes a frontend build.

```bash
cd idatz
docker compose up -d tauri-dev
docker compose exec tauri-dev sh -lc "cd /workspace/idatz/src-tauri && cargo tauri build"
```

The built packages are generated under:

- `idatz/src-tauri/target/release/bundle/appimage/Idatz_0.1.0_amd64.AppImage`
- `idatz/src-tauri/target/release/bundle/deb/Idatz_0.1.0_amd64.deb`
- `idatz/src-tauri/target/release/bundle/rpm/Idatz-0.1.0-1.x86_64.rpm`
