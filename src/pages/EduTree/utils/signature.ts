/**
 * Canonical marketplace signature builder
 * Ensures uniform signature format across all emitters
 */

import { mkSig, nk } from './keys';

export const SIG_VERSION = 'v1' as const;

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
  const dv = nk(params.dataVersion) || 'dv0';
  const id = nk(params.blockId);
  const cnt = Number.isFinite(params.count as number) ? String(params.count) : '0';
  const code = params.selectedCode ? nk(params.selectedCode) : undefined;
  
  // Order is fixed: version | dataVersion | blockId | count | selectedCode?
  return mkSig([SIG_VERSION, dv, id, cnt, code]);
}

/**
 * Normalize or rebuild a signature at runtime
 * Heals old/bad signatures by rebuilding them if they don't match expected format
 */
export function normalizeOrRebuildSig(
  mp: {
    signature?: string | null;
    count?: number;
    selectedCourse?: { code?: string | null } | null;
  },
  ctx: { dataVersion: string; blockId: string }
): string {
  const s = mp?.signature ?? '';
  const tokens = s.split('|').filter(Boolean);
  const looksValid = tokens.length >= 4 && tokens[0] === 'v1';

  if (looksValid) return s;

  // Rebuild from truthy fields; prefer merged options count
  const rebuilt = buildMarketplaceSig({
    dataVersion: ctx.dataVersion,
    blockId: ctx.blockId,
    count: mp?.count ?? 0,
    selectedCode: mp?.selectedCourse?.code ?? undefined,
  });

  if (process.env.NODE_ENV === 'development') {
    console.warn('[SIG_REPAIR]', { had: s, rebuilt, ctx });
  }
  
  return rebuilt;
}

/**
 * Assert signature shape in development (optional invariant check)
 */
export function assertSigShape(sig: string): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  const t = sig.split('|').filter(Boolean);
  if (t.length < 4 || t[0] !== 'v1') {
    console.error('[SIG_INVARIANT_FAILED]', { sig, tokens: t });
  }
}
