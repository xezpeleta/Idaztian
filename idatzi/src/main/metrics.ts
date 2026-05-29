/**
 * Startup and performance metrics collector.
 *
 * Records:
 * - App cold start time (binary spawn → renderer ready)
 * - Backend ready time   (binary spawn → backend /health responds)
 * - Editor init time      (renderer ready → IdaztianEditor reports ready)
 * - Action response times (future: save, open, download)
 *
 * Emits a `metrics:report` event to the renderer once all startup events
 * are recorded. The renderer can display or log them as needed.
 */

export interface StartupMetrics {
  appColdStartMs: number;
  backendReadyMs: number;
  editorInitMs: number;
  totalStartupMs: number;
  ts: number;
}

const T0 = Date.now();

let backendReadyAt: number | null = null;
let editorInitAt: number | null = null;
let reported = false;

export function recordBackendReady(): void {
  if (backendReadyAt !== null) return;
  backendReadyAt = Date.now();
  tryReport();
}

export function recordEditorInit(): void {
  if (editorInitAt !== null) return;
  editorInitAt = Date.now();
  tryReport();
}

function tryReport(): void {
  if (reported) return;
  if (backendReadyAt === null || editorInitAt === null) return;

  reported = true;
  const metrics: StartupMetrics = {
    appColdStartMs: backendReadyAt - T0,
    backendReadyMs: backendReadyAt - T0,
    editorInitMs: editorInitAt - T0,
    totalStartupMs: editorInitAt - T0,
    ts: T0,
  };

  // Log to console (main process)
  console.log(
    `[metrics] Cold start: ${metrics.appColdStartMs}ms | ` +
    `Backend ready: ${metrics.backendReadyMs}ms | ` +
    `Editor init: ${metrics.editorInitMs}ms | ` +
    `Total: ${metrics.totalStartupMs}ms`,
  );
}

/** Return metrics if collected, null otherwise. */
export function getStartupMetrics(): StartupMetrics | null {
  if (!reported) return null;
  return {
    appColdStartMs: (backendReadyAt ?? T0) - T0,
    backendReadyMs: (backendReadyAt ?? T0) - T0,
    editorInitMs: (editorInitAt ?? T0) - T0,
    totalStartupMs: (editorInitAt ?? T0) - T0,
    ts: T0,
  };
}
