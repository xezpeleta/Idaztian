# Idaztian Framework — Product Requirements Document 2.0 (Collaborative Edition)

> **Version**: 2.0  
> **Date**: 2026-02-19  
> **License**: GPL-3.0  
> **Status**: Draft — Pending Review

---

## 1. Executive Summary

**Idaztian** is an open-source JavaScript framework that provides an Obsidian-style live-preview markdown editor for the web. Version 2.0 introduces **Real-Time Collaborative Editing** and generalized **backend agnostic persistence**, enabling multi-user live document editing with conflict resolution while maintaining its inline formatting and rich editing experience.

The framework is designed to be **embedded by developers** into any web application and is entirely client-side, enabling full integration with modern backend stacks (specifically robust Python backends like FastAPI, Django, or Flask) via standardized CRDT synchronization and API interactions.

### Core Value Proposition (v2.0 Additions)

| Feature | Traditional Editors | Idaztian 2.0 |
|---|---|---|
| Collaboration | Locked/Turn-based | Real-time multi-cursor via CRDTs (Yjs) |
| Backend Lock-in | Tied to specific BaaS | Backend-agnostic (Python, Node, Go, etc.) |
| Integration | Heavy SDK requirements | Lightweight sync APIs & WebSockets/WebRTC |

---

## 2. Goals & Non-Goals

### Goals

1. **Backend-Agnostic File Management**: Allow documents to be dynamically loaded from and saved to any backend through standard REST/GraphQL APIs.
2. **Real-Time Collaboration**: Support simultaneous multi-user document editing with live cursors and selection rendering.
3. **CRDT-Based Synchronization**: Adopt Yjs as the foundational data structure for conflict-free resolution.
4. **Python Backend Synergy**: Officially document and support server-side synchronization via Python bindings (`y-py`) over WebSockets.
5. **Maintain v1.0 Features**: Retain all existing live-preview behavior, markdown syntax support, context-aware reveals, and codeblock highlight functionality.

### Non-Goals (v2.0)

- Self-hosted "Backend-as-a-Service" (Idaztian remains a frontend library; the backend logic is left to the implementer).
- Offline-first distributed peer-to-peer editing without central authority (a central sync server or signaling server is expected).
- Audio/Video communication channels associated with collaborate editing.

---

## 3. Architecture Overview

### 3.1 Custom Backend Integration (Saving & Loading)

Idaztian is client-side only. It does not dictate storage.

- **Initialization**: The host application fetches markdown from a custom backend (e.g., a Python FastAPI endpoint mapping to a database like PostgreSQL or a filesystem) and passes it to the generic `initialContent` API.
- **Persistence**: Using the `onChange(content)` hook or the existing Save trigger (`Ctrl+S`), the host application handles sending changes to the backend (e.g., `POST` or `PUT` requests back to the REST API). Debouncing is recommended to limit request frequency.

### 3.2 Collaborative Architecture (Yjs Integration)

To handle complex syncing from multiple clients, Idaztian relies on **CodeMirror 6 + Yjs**.

```
┌──────────────────────────────────────────────────┐
│               Frontend (Browser)                 │
│  ┌────────────────────────────────────────────┐  │
│  │ Idaztian Editor (CodeMirror 6)             │  │
│  │  - y-codemirror.next plugin                │  │
│  │  - Local Y.Doc state                       │  │
│  └──────┬───────────────────────────────┬─────┘  │
│         │ Local edits & Cursor updates  │        │
│  ┌──────▼───────────────────────────────▼─────┐  │
│  │ Network Provider (y-websocket/y-webrtc)    │  │
│  └──────────────────┬─────────────────────────┘  │
│                     │ WebSockets                 │
└─────────────────────┼────────────────────────────┘
                      │
┌─────────────────────┼────────────────────────────┐
│               Backend (Python)                   │
│  ┌──────────────────▼─────────────────────────┐  │
│  │ WebSocket Server (FastAPI / Channels)      │  │
│  │  - Uses `y-py` for CRDT resolution         │  │
│  │  - Broadcasts awareness (cursors)          │  │
│  │  - Flushes state to Database/Disk periodically│  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

#### Technology Setup for Collaboration:
- **Core Sync Logic**: `Yjs` runs in the browser, representing the document state as a Conflict-Free Replicated Data Type.
- **Editor Binding**: `y-codemirror.next` provides the two-way binding between the `Y.Doc` and the CodeMirror 6 internal state, natively supporting remote cursor presence and highlighting.
- **Networking**: `y-websocket` connects the client to a WebSocket server.
- **Server Implementation**: Developers can build the real-time server using Python (`y-py`), taking advantage of robust Python ecosystems while efficiently handling the CRDT sync logic.

---

## 4. Public API Additions (v2.0)

### 4.1 Collaborative Initialization

The developer can instantiate the editor with a Yjs provider instead of static text.

```typescript
import { IdaztianEditor } from 'idaztian';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

// 1. Initialize Yjs document and WebSocket network provider
const ydoc = new Y.Doc();
const provider = new WebsocketProvider(
  'ws://localhost:8000/sync/doc-id', 
  'doc-id', 
  ydoc
);
const ytext = ydoc.getText('codemirror');

// 2. Instantiate Idaztian referencing the Yjs text
const editor = new IdaztianEditor({
  parent: document.getElementById('editor'),
  collaboration: {
    ytext: ytext,
    provider: provider, // Handled automatically for cursor awareness
    userColor: '#ffb6c1',
    userName: 'Alice',
  },
  // Other standard configuration options...
});
```

### 4.2 Handling Save to Backend

For asynchronous REST setups:

```typescript
const editor = new IdaztianEditor({
  parent: document.getElementById('editor'),
  initialContent: await fetchDocument('doc123'),
  onChange: debounce(async (content) => {
    // Custom backend save logic via Python API
    await fetch('https://api.mybackend.com/docs/doc123', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown: content })
    });
  }, 1500)
});
```

---

## 5. UI/UX Considerations

### 5.1 Remote Cursors
When rendering remote cursors:
- Each user is assigned a color.
- A small carete of that color is drawn at their cursor position.
- The user's name (e.g., "Alice") appears in a tooltip briefly upon cursor movement or hover.
- Remote selections are painted lightly with the remote user's color.

### 5.2 Offline & Reconnection UI
- The status bar must reflect the sync state: `Connected`, `Syncing...`, `Offline`.
- The editor should remain fully responsive even while offline. Local changes queue within the CRDT structure and merge painlessly once the WebSocket connection is restored.

---

## 6. Implementation Strategy Checklist

### Phase 2.1 — Backend Save API (Standard REST)
- [ ] Ensure `onChange` triggers with exact document content.
- [ ] Add example React/Vanilla snippets showing debounced pushes to a Python backend.
- [ ] Add loading/saving state indicators in the demo application.

### Phase 2.2 — Core Collaboration Integration
- [ ] Introduce optional peer dependency on `yjs` and `y-codemirror.next`.
- [ ] Map Idaztian's CodeMirror configuration to dynamically mount the `y-codemirror` extension if a `collaboration.ytext` object is passed on init.
- [ ] Style the generic remote cursors to visually align with the custom `Ilunabar dark` theme.

### Phase 2.3 — Awareness & Signaling
- [ ] Integrate Yjs awareness protocol for transmitting cursor/selection positions.
- [ ] Expose an intuitive user configuration API (`userName`, `userColor`).

### Phase 2.4 — Documentation & Python Examples
- [ ] Provide comprehensive `y-py` (Python) server implementation examples.
- [ ] Detail FastAPI Websocket integration patterns.

---

*Idaztian v2.0 empowers developer teams to marry state-of-the-art markdown editing with robust collaborative architectures of their choosing.*
