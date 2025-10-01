/**
 * Unified debug utilities for EduTree pill rendering pipeline
 */

export const isDev =
  (typeof import.meta !== 'undefined' && !!(import.meta as any)?.env?.DEV) ||
  process.env.NODE_ENV === 'development';

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
  keysTried?: string[];
  mapSize?: number;
  sampleMapKeys?: string[];
  mp?: {
    count?: number;
    optionsLen?: number;
    show?: boolean;
    allow?: boolean;
    signature?: string;
  };
  note?: string;
};

const TAG = '%c[TreeDbg]';
const STYLE = 'color:#7b5cff;font-weight:600';

export function trace(rec: PillTrace) {
  if (!isDev) return;
  // Always print if there's an anomaly; otherwise sample lightly.
  const anomaly =
    !rec.mp ||
    !Number.isFinite(rec.mp?.count as any) ||
    ((rec.mp?.count ?? 0) <= 0 && rec.stage === 'PILL_RENDER');
  if (!anomaly && Math.random() > 0.05) return; // 5% sampling

  // Short node sig for readability
  const shortSig = rec.mp?.signature?.slice(-20);
  console.log(TAG, STYLE, { ...rec, mp: { ...rec.mp, signature: shortSig } });
}

export function assertDbg(ok: boolean, message: string, ctx: PillTrace) {
  if (!isDev || ok) return;
  console.warn('[ASSERT]', message, ctx);
}

// Optional: perf marks
export const mark = (name: string) => isDev && performance.mark(name);
export const measure = (name: string, start: string, end: string) =>
  isDev && (performance.mark(end), performance.measure(name, start, end));
