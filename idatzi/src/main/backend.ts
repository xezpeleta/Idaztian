/**
 * Backend lifecycle manager.
 * Spawns a backend service as a child process and manages its health.
 */
import { ChildProcess, spawn } from 'child_process';
import http from 'http';
import path from 'path';
import { app } from 'electron';

export type BackendStatus = 'starting' | 'connected' | 'disconnected';

const HEALTH_URL = 'http://localhost:3099/health';
const HEALTH_POLL_INTERVAL_MS = 500;
const HEALTH_STARTUP_TIMEOUT_MS = 15_000;
const HEALTH_MAX_RETRIES = 3;

let backendProcess: ChildProcess | null = null;
let healthPollTimer: ReturnType<typeof setInterval> | null = null;
let currentStatus: BackendStatus = 'disconnected';
let onStatusChange: ((status: BackendStatus) => void) | null = null;

function setStatus(status: BackendStatus): void {
  if (currentStatus !== status) {
    currentStatus = status;
    console.log(`[backend] status → ${status}`);
    onStatusChange?.(status);
  }
}

function healthCheck(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(HEALTH_URL, { timeout: 1000 }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function startHealthPolling(): void {
  if (healthPollTimer) return;
  healthPollTimer = setInterval(async () => {
    const healthy = await healthCheck();
    setStatus(healthy ? 'connected' : 'disconnected');
    if (!healthy && currentStatus !== 'starting') {
      // If we were connected and now aren't, mark disconnected
      // Don't restart automatically for MVP — just report
    }
  }, HEALTH_POLL_INTERVAL_MS);
}

function stopHealthPolling(): void {
  if (healthPollTimer) {
    clearInterval(healthPollTimer);
    healthPollTimer = null;
  }
}

export function startBackend(): Promise<BackendStatus> {
  return new Promise((resolve) => {
    const backendScript = path.join(__dirname, '../../scripts/test-backend.cjs');
    setStatus('starting');

    console.log(`[backend] Starting child process: ${backendScript}`);
    backendProcess = spawn(process.execPath, [backendScript], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PORT: '3099' },
    });

    backendProcess.stdout?.on('data', (data: Buffer) => {
      console.log(`[backend:stdout] ${data.toString().trim()}`);
    });

    backendProcess.stderr?.on('data', (data: Buffer) => {
      console.log(`[backend:stderr] ${data.toString().trim()}`);
    });

    backendProcess.on('error', (err) => {
      console.error(`[backend] Failed to start: ${err.message}`);
      setStatus('disconnected');
      resolve('disconnected');
    });

    backendProcess.on('exit', (code, signal) => {
      console.log(`[backend] Process exited (code=${code}, signal=${signal})`);
      backendProcess = null;
      stopHealthPolling();
      setStatus('disconnected');
    });

    // Poll for backend readiness with timeout
    const startTime = Date.now();
    const poll = setInterval(async () => {
      const healthy = await healthCheck();
      if (healthy) {
        clearInterval(poll);
        setStatus('connected');
        startHealthPolling();
        resolve('connected');
      } else if (Date.now() - startTime > HEALTH_STARTUP_TIMEOUT_MS) {
        clearInterval(poll);
        console.error('[backend] Startup timed out');
        setStatus('disconnected');
        resolve('disconnected');
      }
    }, 300);
  });
}

export function stopBackend(): void {
  stopHealthPolling();
  if (backendProcess) {
    console.log('[backend] Stopping child process');
    backendProcess.kill('SIGTERM');

    // Force kill after 3s if still running
    const forceKill = setTimeout(() => {
      if (backendProcess) {
        console.log('[backend] Force killing');
        backendProcess.kill('SIGKILL');
      }
    }, 3000);

    backendProcess.on('exit', () => {
      clearTimeout(forceKill);
      backendProcess = null;
      setStatus('disconnected');
    });
  }
}

export function getStatus(): BackendStatus {
  return currentStatus;
}

export function registerStatusListener(callback: (status: BackendStatus) => void): void {
  onStatusChange = callback;
}
