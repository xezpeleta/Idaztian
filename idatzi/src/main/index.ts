import { app, BrowserWindow, ipcMain, dialog, nativeTheme } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { startBackend, stopBackend, getStatus, registerStatusListener, BackendStatus } from './backend';
import { recordBackendReady, recordEditorInit, getStartupMetrics, StartupMetrics } from './metrics';

const VITE_DEV_URL = 'http://localhost:5173';
const IS_DEV = process.env.NODE_ENV !== 'production';

// ---- Open-path: capture CLI argument / macOS open-file event ----
let openPath: string | null = null;

function resolveOpenPath(rawPath: string): string {
  return path.resolve(rawPath);
}

// macOS: app is already running and user opens a file from Finder
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  openPath = resolveOpenPath(filePath);
  // If the window is already loaded, push the path to the renderer
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('open-path', openPath);
  }
});

// ---- IPC handlers: Open path ----
ipcMain.handle('app:get-open-path', () => openPath);

// ---- IPC handlers: Backend ----
ipcMain.handle('backend:status', () => {
  return getStatus();
});

ipcMain.handle('backend:start', async () => {
  return await startBackend();
});

ipcMain.handle('backend:stop', () => {
  stopBackend();
  return getStatus();
});

// ---- IPC handlers: Content persistence ----
ipcMain.handle('backend:save-content', async (_event, content: string) => {
  const status = getStatus();
  if (status !== 'connected') return false;
  try {
    const resp = await fetch('http://localhost:3099/api/content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    return resp.ok;
  } catch {
    return false;
  }
});

ipcMain.handle('backend:load-content', async () => {
  const status = getStatus();
  if (status !== 'connected') return null;
  try {
    const resp = await fetch('http://localhost:3099/api/content');
    if (!resp.ok) return null;
    const data = await resp.json() as { content?: string };
    return data.content ?? null;
  } catch {
    return null;
  }
});

// ---- IPC handlers: Directory listing ----
ipcMain.on('dir:home', (event) => {
  event.returnValue = os.homedir();
});

ipcMain.handle('dir:select', async () => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    title: 'Select Directory',
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('dir:list', async (_event, dirPath: string) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const items: { name: string; path: string; type: 'file' | 'dir' }[] = [];

    // Directories first, then files (each group sorted alphabetically)
    const dirs = entries
      .filter(e => e.isDirectory() && !e.name.startsWith('.'))
      .map(e => ({ name: e.name, path: path.join(dirPath, e.name), type: 'dir' as const }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const files = entries
      .filter(e => e.isFile() && /\.(?:md|markdown|txt)$/i.test(e.name))
      .map(e => ({ name: e.name, path: path.join(dirPath, e.name), type: 'file' as const }))
      .sort((a, b) => a.name.localeCompare(b.name));

    items.push(...dirs, ...files);
    return items;
  } catch {
    return [];
  }
});

ipcMain.handle('file:read', async (_event, filePath: string) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content;
  } catch {
    return null;
  }
});

ipcMain.handle('file:stat', async (_event, filePath: string) => {
  try {
    const stat = fs.statSync(filePath);
    return { type: stat.isDirectory() ? 'dir' : 'file' as 'dir' | 'file' };
  } catch {
    return null;
  }
});

ipcMain.handle('file:create', async (_event, dirPath: string, name: string) => {
  try {
    const filePath = path.join(dirPath, name);
    if (fs.existsSync(filePath)) return { ok: false, error: 'File already exists' };
    fs.writeFileSync(filePath, '', 'utf-8');
    return { ok: true, path: filePath };
  } catch {
    return { ok: false, error: 'Failed to create file' };
  }
});

ipcMain.handle('file:delete', async (_event, filePath: string) => {
  try {
    fs.unlinkSync(filePath);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Failed to delete file' };
  }
});

ipcMain.handle('dir:create', async (_event, parentPath: string, name: string) => {
  try {
    const dirPath = path.join(parentPath, name);
    if (fs.existsSync(dirPath)) return { ok: false, error: 'Directory already exists' };
    fs.mkdirSync(dirPath);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Failed to create directory' };
  }
});

// ---- IPC handlers: File dialogs ----
ipcMain.handle('file:open', async () => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return null;
  const result = await dialog.showOpenDialog(win, {
    title: 'Open Markdown File',
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, 'utf-8');
  return { content, filename: path.basename(filePath) };
});

ipcMain.handle('file:save', async (_event, content: string, defaultName: string) => {
  const win = BrowserWindow.getFocusedWindow();
  if (!win) return null;
  const result = await dialog.showSaveDialog(win, {
    title: 'Save Markdown File',
    defaultPath: defaultName,
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled || !result.filePath) return null;
  fs.writeFileSync(result.filePath, content, 'utf-8');
  return result.filePath;
});

// ---- IPC handlers: Metrics ----
ipcMain.handle('metrics:startup', () => {
  return getStartupMetrics();
});

ipcMain.handle('metrics:editor-init', () => {
  recordEditorInit();
});

// IPC: Theme
ipcMain.handle('theme:isDark', () => nativeTheme.shouldUseDarkColors);

// IPC: Window controls
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window:close', () => mainWindow?.close());

// ---- Broadcast status changes to renderer ----
let mainWindow: BrowserWindow | null = null;

registerStatusListener((status: BackendStatus) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('backend:status-change', status);
  }
  if (status === 'connected') {
    recordBackendReady();
  }
});

// ---- Window lifecycle ----

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    frame: false,
    backgroundColor: '#1e1e2e',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Listen for system theme changes
  nativeTheme.on('updated', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const isDark = nativeTheme.shouldUseDarkColors;
      mainWindow.setBackgroundColor(isDark ? '#1e1e2e' : '#ffffff');
      mainWindow.webContents.send('theme:change', isDark);
    }
  });

  // Send initial theme to renderer
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('theme:change', nativeTheme.shouldUseDarkColors);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (IS_DEV) {
    mainWindow.loadURL(VITE_DEV_URL);
  } else {
    const rendererPath = path.join(__dirname, '../renderer/index.html');
    mainWindow.loadFile(rendererPath);
  }

  if (IS_DEV) {
    mainWindow.webContents.openDevTools({ mode: 'bottom' });
  }
}

app.whenReady().then(async () => {
  createWindow();

  // Parse CLI argument: skip electron binary, script path, and electron flags
  const args = process.argv.slice(1).filter(a => !a.startsWith('-'));
  // args[0] is the main script, args[1] would be the user-provided path
  const userArg = args[1];
  if (userArg && !openPath) {
    openPath = resolveOpenPath(userArg);
  }

  // Dev convenience: allow IDATZI_OPEN env var to simulate CLI arg
  if (!openPath && process.env.IDATZI_OPEN) {
    openPath = resolveOpenPath(process.env.IDATZI_OPEN);
  }

  // Start backend automatically on app launch
  await startBackend();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  stopBackend();
});
