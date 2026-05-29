# MVP Parity Slice: Idatz Editor Flow

## Selected Flow
**"App Boot → Editor Initialization → Live Preview Typing → Auto-Save"**

This is the single most representative flow in Idatz — it exercises the framework integration, editor rendering, user input, and persistence.

## Flow Steps
1. App boots (Electron window appears)
2. Previously saved content loads (from localStorage in Idatz → from backend in idatzi)
3. `IdaztianEditor` initializes with content and renders inline
4. User types markdown → live preview updates in real-time
5. `onChange` fires → content auto-saves (to backend)
6. Stats bar updates (word count, char count, line count)
7. User presses Ctrl+S → content downloads as `.md`

## Dependencies from Idatz
- `idaztian` package (the editor framework)
- `@fontsource/inter` (UI font)
- `idatz/src/style.css` (theme/styles)
- `idatz/src/file-handler.ts` (open/download logic)
- `idatz/src/local-storage.ts` (auto-save logic — but we'll adapt to backend)
- Sample content from `idatz/src/main.ts`

## Differences for Electron (idatzi)
| Idatz (Tauri/web) | Idatzi (Electron) |
|---|---|
| Browser localStorage for persistence | Backend service for persistence (+ localStorage fallback) |
| File open via browser `<input type="file">` | File open via Electron `dialog.showOpenDialog` |
| File download via Blob URL | File download via Electron `dialog.showSaveDialog` |
| No offline backend | Backend starts alongside app for future API features |

## MVP Scope
- [x] Load `idaztian` as dependency
- [x] Copy Idatz stylesheet
- [x] Create editor page with same layout (header, main editor area, footer stats)
- [x] Initialize `IdaztianEditor` with sample content
- [x] Auto-save content to backend (HTTP POST) + localStorage fallback
- [x] Stats bar (words, chars, lines)
- [x] File open (Electron native dialog)
- [x] File download (Electron native dialog)
- [x] Shortcuts modal
- [x] Toolbar toggle

## Expected Output
- Electron app launches → editor renders with sample markdown
- Typing updates stats bar and persists content
- Open/download buttons work via native dialogs
- Backend stores/retrieves the latest document

## Validation
1. Launch app → editor appears with sample content
2. Type text → stats update in real-time
3. Refresh app → content restored from backend/localStorage
4. Click Open → file picker appears → content loads
5. Click Download → save dialog appears → `.md` file saved
6. Press Escape → shortcuts modal closes
