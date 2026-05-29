import { contextBridge, ipcRenderer } from 'electron';

export interface IdatziAPI {
  getBackendStatus: () => Promise<'connected' | 'disconnected' | 'starting'>;
  startBackend: () => Promise<string>;
  stopBackend: () => Promise<string>;
  onBackendStatusChange: (callback: (status: string) => void) => () => void;
  // Directory listing
  getHomeDir: () => string;
  selectDir: () => Promise<string | null>;
  listDir: (dirPath: string) => Promise<{ name: string; path: string; type: 'file' | 'dir' }[]>;
  // File operations (Electron native dialogs)
  readFile: (filePath: string) => Promise<string | null>;
  openFile: () => Promise<{ content: string; filename: string } | null>;
  saveFile: (content: string, defaultName: string) => Promise<string | null>;
  // Content persistence via backend
  saveToBackend: (content: string) => Promise<boolean>;
  loadFromBackend: () => Promise<string | null>;
  // Metrics
  getStartupMetrics: () => Promise<StartupMetrics | null>;
  recordEditorInit: () => Promise<void>;
  // Theme
  isDark: () => Promise<boolean>;
  onThemeChange: (callback: (isDark: boolean) => void) => () => void;
  // Window controls
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
}

export interface StartupMetrics {
  appColdStartMs: number;
  backendReadyMs: number;
  editorInitMs: number;
  totalStartupMs: number;
  ts: number;
}

const api: IdatziAPI = {
  getBackendStatus: () => ipcRenderer.invoke('backend:status'),
  startBackend: () => ipcRenderer.invoke('backend:start'),
  stopBackend: () => ipcRenderer.invoke('backend:stop'),
  onBackendStatusChange: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, status: string) => callback(status);
    ipcRenderer.on('backend:status-change', listener);
    return () => ipcRenderer.removeListener('backend:status-change', listener);
  },
  getHomeDir: () => ipcRenderer.sendSync('dir:home'),
  selectDir: () => ipcRenderer.invoke('dir:select'),
  listDir: (dirPath: string) => ipcRenderer.invoke('dir:list', dirPath),
  readFile: (filePath: string) => ipcRenderer.invoke('file:read', filePath),
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (content: string, defaultName: string) => ipcRenderer.invoke('file:save', content, defaultName),
  saveToBackend: (content: string) => ipcRenderer.invoke('backend:save-content', content),
  loadFromBackend: () => ipcRenderer.invoke('backend:load-content'),
  getStartupMetrics: () => ipcRenderer.invoke('metrics:startup'),
  recordEditorInit: () => ipcRenderer.invoke('metrics:editor-init'),
  isDark: () => ipcRenderer.invoke('theme:isDark'),
  onThemeChange: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, isDark: boolean) => callback(isDark);
    ipcRenderer.on('theme:change', listener);
    return () => ipcRenderer.removeListener('theme:change', listener);
  },
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
};

contextBridge.exposeInMainWorld('idatzi', api);
