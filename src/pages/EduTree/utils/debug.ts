/**
 * Unified debug utilities for EduTree pill rendering pipeline
 */

// Internal dev flag for bootstrap - don't export to avoid duplicates
const _isDev =
  (typeof import.meta !== 'undefined' && !!(import.meta as any)?.env?.DEV) ||
  process.env.NODE_ENV === 'development';

// Use _isDev internally only

// Store logs in memory for UI display
const logBuffer: PillTrace[] = [];
const MAX_LOGS = 200;

// Log once to verify debug system is active
if (typeof window !== 'undefined' && _isDev) {
  console.log('[DEBUG SYSTEM] Initialized - isDev =', _isDev);
  (window as any).__debugLogs = logBuffer;
}

export type Stage =
  | 'MP_BATCH'          // batch returned rows
  | 'KEY_RESOLUTION'    // map key chosen for this block
  | 'ENRICH_BLOCK'      // built marketplace for block
  | 'SET_NODES'         // nodes handed to React Flow
  | 'RF_RENDER'         // just before RF render
  | 'PILL_RENDER';      // inside NodeOptionsPill

export type PillTrace = {
  stage: Stage;
  t: number;                // Date.now()
  dataVersion?: string;     // vsn64w5 etc.
  blockId?: string;
  slug?: string;
  uuid?: string;
  rfNodeId?: string;        // fallback id at node level
  pickedKey?: string;       // which key matched the map?
  via?: string;             // resolution method: uuid|slug|alias|normalized
  keysTried?: string[];     // keys attempted
  mapSize?: number;         // size of map we checked
  sampleMapKeys?: string[]; // sample keys for debugging
  note?: string;            // hit/MISS/etc.
  mp?: {                    // marketplace metrics
    count?: number | string | null;
    optionsLen?: number;
    show?: boolean;
    allow?: boolean;
    signature?: string;
  };
};

export function trace(rec: PillTrace) {
  if (!_isDev) return;
  
  // Store in buffer for UI display
  logBuffer.push(rec);
  if (logBuffer.length > MAX_LOGS) {
    logBuffer.shift(); // Keep only last 200 logs
  }
  
  // Always print if there's an anomaly; otherwise sample at 20% (increased from 5%)
  const countNum = typeof rec.mp?.count === 'number' ? rec.mp.count : Number(rec.mp?.count ?? 0);
  const anomaly =
    !rec.mp ||
    !Number.isFinite(countNum) ||
    (countNum <= 0 && rec.stage === 'PILL_RENDER');
  
  if (!anomaly && Math.random() > 0.2) return; // 20% sampling
  
  // Use simple console.log instead of styled output for better compatibility
  const shortSig = rec.mp?.signature?.slice(-20);
  console.log(`[TreeDbg:${rec.stage}]`, { ...rec, mp: { ...rec.mp, signature: shortSig } });
}

export function getDebugLogs(): PillTrace[] {
  return [...logBuffer];
}

export function clearDebugLogs() {
  logBuffer.length = 0;
}

export function assertDbg(ok: boolean, message: string, ctx: PillTrace) {
  if (!_isDev || ok) return;
  console.warn('[ASSERT]', message, ctx);
}

// Optional: perf marks
export const mark = (name: string) => _isDev && performance.mark(name);
export const measure = (name: string, start: string, end: string) =>
  _isDev && (performance.mark(end), performance.measure(name, start, end));
