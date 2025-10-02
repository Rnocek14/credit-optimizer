/**
 * Canonical marketplace signature builder
 * Ensures uniform signature format across all emitters
 */

import { mkSig, nk } from './keys';

export const SIG_VERSION = 'v1' as const;

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
  
  // Enhanced validity check: MUST have v1 + dv-prefix + numeric count
  const looksValid = 
    tokens.length >= 4 && 
    tokens[0] === 'v1' &&
    /^dv/.test(tokens[1] || '') &&
    Number.isFinite(Number(tokens[3]));

  if (looksValid) return s;

  // Rebuild from truthy fields; prefer merged options count
  const rebuilt = buildMarketplaceSig({
    dataVersion: ctx.dataVersion,
    blockId: ctx.blockId,
    count: mp?.count ?? 0,
    selectedCode: mp?.selectedCourse?.code ?? undefined,
  });

  if (process.env.NODE_ENV === 'development') {
    __sigRepairCount++;
    console.warn('[SIG_REPAIR]', { had: s, rebuilt, ctx, totalRepairs: __sigRepairCount });
  }
  
  return rebuilt;
}

/**
 * Assert signature shape in development (full validation with regex)
 */
export function assertSigShape(sig: string, stage?: string): void {
  if (process.env.NODE_ENV !== 'development') return;
  
  const t = (sig ?? '').split('|').filter(Boolean);
  
  // Strict validation for each token
  const hasV1 = t[0] === 'v1';
  const dvValid = /^dv[a-z0-9]+$/.test(t[1] || '');           // lowercase dv + hash
  const blockIdValid = /^[A-Za-z0-9_-]+$/.test(t[2] || '');   // allow mixed-case blockId
  const countValid = Number.isFinite(Number(t[3]));
  const codeValid = !t[4] || /^[a-z0-9_-]+$/.test(t[4]);      // optional selectedCode lowercase
  
  const ok = t.length >= 4 && hasV1 && dvValid && blockIdValid && countValid && codeValid;

  if (!ok) {
    console.error('[SIG_INVARIANT_FAILED]', {
      stage: stage || 'unknown',
      sig,
      tokens: t,
      checks: {
        hasV1,
        dvValid,
        blockIdValid,
        countValid,
        codeValid,
        tokenCount: t.length
      }
    });
  }
}
