# Product Requirements Document: Idatz Desktop (Tauri)

## 1. Overview
The objective is to create a lightweight, high-performance desktop version of the **Idatz** Markdown editor using **Tauri**. This application will wrap the existing browser-based Idatz web application and provide native operating system capabilities, primarily focusing on seamless local file synchronization and instant reflection of external file changes.

## 2. Architecture
*   **Frontend (UI):** The existing Idatz web application (HTML/CSS/JS/TS). It will be served inside Tauri's native webview.
*   **Backend (Core):** A lightweight Rust-based backend powered by Tauri.
*   **Communication:** Inter-Process Communication (IPC) via Tauri's asynchronous commands and event system.

## 3. Core Features & Requirements

### 3.1. Native File System Access & File Watching
*   **Direct File I/O:** The app must be able to read and write markdown files directly to the local filesystem without browser security prompts.
*   **Live External Synchronization (File Watching):**
    *   The Rust backend will utilize native OS file-watching APIs (e.g., `inotify` on Linux, `FSEvents` on macOS) via crates like `notify`.
    *   When an external editor (e.g., Vim) modifies the currently open markdown file, the Rust backend must detect the change instantly.
    *   The backend will push an event to the frontend containing the updated file contents.
    *   The frontend must seamlessly reload the content in the editor without losing the cursor position or requiring a manual refresh.

### 3.2. Integration of the Current Idatz Web App
*   **Zero Rewrite UI:** The desktop app will utilize the existing Idatz frontend build. The UI components, markdown rendering, and themes remain identical.
*   **Environment Detection:** The web app must detect if it is running within the Tauri environment (`window.__TAURI__`).
    *   *If in browser:* Use the standard File System Access API (or fallback mechanisms).
    *   *If in Tauri:* Bypass browser storage APIs and use Tauri IPC commands for load/save operations.
*   **Docker Development Workflow:** The existing Docker-based Node.js workflow will continue to be used to build the frontend assets. The Tauri build process will ingest these assets to compile the final desktop binary.

### 3.3. Performance & Resource Usage
*   **Lightweight:** The compiled binary should be significantly smaller than an equivalent Electron app (targeting < 15MB).
*   **Low Memory Footprint:** By utilizing the OS-native webview instead of bundling Chromium, RAM usage should be kept completely minimal.

## 4. Technical Implementation Steps
1.  **Initialize Tauri:** Add Tauri to the project workspace (`npm create tauri-app` or manually integrate the `src-tauri` directory).
2.  **Configure Build Paths:** Update `tauri.conf.json` to point the `beforeBuildCommand` to the Docker frontend build script, and `distDir` to the Idatz output folder.
3.  **Rust File Watcher:** Implement a Rust command to open a file and a background thread using the `notify` crate to watch that file's path for write events.
4.  **IPC Bridge:** 
    *   *Rust -> JS:* Push `file-changed` events with new contents.
    *   *JS -> Rust:* Send `save-file` commands when the user edits within Idatz.
5.  **Frontend Adaptation:** Add a Tauri API wrapper in the Idatz frontend to handle the IPC events seamlessly.

## 5. Development Dependencies
*   **Host System:** Rust toolchain (`rustup`, `cargo`) required for compiling the desktop binary.
*   **Docker:** Existing Node.js container for building the frontend.
