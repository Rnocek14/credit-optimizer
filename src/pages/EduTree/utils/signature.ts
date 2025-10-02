/**
 * Canonical marketplace signature builder
 * Ensures uniform signature format across all emitters
 */

import { mkSig, nk } from './keys';

export const SIG_VERSION = 'v1' as const;

// Canonical signature regex - single source of truth for validation
export const SIG_RE = /^v1\|dv[a-z0-9]+\|[A-Za-z0-9_-]+\|\d+(?:\|[a-z0-9_-]+)?$/;

// Runtime guard: ensure SIG_VERSION matches expected format
if (process.env.NODE_ENV === 'development' && !/^v\d+$/.test(SIG_VERSION)) {
  console.error('[SIG_CONFIG_BAD] SIG_VERSION must match /^v\\d+$/', { actual: SIG_VERSION });
}

// Track repair count for dev diagnostics
let __sigRepairCount = 0;

export function getSigRepairCount() {
  return __sigRepairCount;
}

/**
 * Build a canonical marketplace signature
 * Format: v1|<dataVersion>|<blockId>|<count>|<selectedCode?>
 */
export function buildMarketplaceSig(params: {
  dataVersion: string | null | undefined;
  blockId: string | null | undefined;
  count: number | null | undefined;
  selectedCode?: string | null | undefined;
}): string {
  // CRITICAL FIX: Normalize dataVersion to dv*, idempotent if already dv-prefixed
  // This fixes malformed sigs like "1|v181nfqo|..." or "|v181nfqo|..."
  const rawDv = nk(params.dataVersion) || 'dv0';
  // Replace ANY leading 'v' with 'dv', but keep if already starts with 'dv'
  const dv = rawDv.startsWith('dv') ? rawDv : rawDv.replace(/^v/, 'dv');
  
  // PRESERVE blockId case (no lowercasing!)
  const id = (params.blockId ?? '').trim();
  const cnt = Number.isFinite(params.count as number) ? String(params.count) : '0';
  const code = params.selectedCode ? nk(params.selectedCode) : undefined;
  
  // Manual construction to avoid mkSig lowercasing SIG_VERSION and blockId
  const parts = [SIG_VERSION, dv, id, cnt, code].filter(p => p !== undefined && p !== '');
  return parts.join('|');
}

type MpLike = {
  signature?: string | null;
  count?: number | null | undefined;
  selectedCourse?: { code?: string | null } | null;
};

type CtxLike = {
  dataVersion?: string | null;
  blockId?: string | null;
  selectedCode?: string | null;
};

/**
 * Normalize or rebuild a signature at runtime.
 * If it isn't EXACTLY canonical, rebuild from context.
 */
export function normalizeOrRebuildSig(mp: MpLike, ctx: CtxLike): string {
  const s = (mp?.signature ?? '').trim();

  // Fast-path only if fully canonical
  if (SIG_RE.test(s)) return s;

  // Always rebuild anything non-canonical
  const rebuilt = buildMarketplaceSig({
    dataVersion: ctx?.dataVersion ?? null,
    blockId: ctx?.blockId ?? null,
    count: Number.isFinite(Number(mp?.count)) ? Number(mp?.count) : 0,
    selectedCode: ctx?.selectedCode ?? mp?.selectedCourse?.code ?? null,
  });

  if (process.env.NODE_ENV === 'development') {
    __sigRepairCount++;
    // eslint-disable-next-line no-console
    console.warn('[SIG_AUTOREPAIR]', { from: s, to: rebuilt, ctx, totalRepairs: __sigRepairCount });
  }
  
  return rebuilt;
}

/**
 * Dev-only invariant: signature must match canonical regex.
 */
export function assertSigShape(sig: string, stage?: string): void {
  if (process.env.NODE_ENV !== 'development') return;

  const ok = SIG_RE.test(sig || '');
  if (!ok) {
    // eslint-disable-next-line no-console
    console.error('[SIG_INVARIANT_FAILED]', {
      stage: stage || 'unknown',
      sig,
      expected: 'v1|dv<hash>|<BlockId>|<count>[|<selectedCode>]',
    });
  }
}
