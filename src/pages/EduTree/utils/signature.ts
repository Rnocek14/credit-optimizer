/**
 * Canonical marketplace signature builder
 * Ensures uniform signature format across all emitters
 */

import { mkSig, nk } from './keys';

// --- DEV DIAGNOSTICS (no-op in prod) ---------------------------------------
// Unique module fingerprint to detect duplicate bundling / path alias issues
// Logs once in development; harmless in prod.
(globalThis as any).__SIG_IMPL_ID__ ??= `sig-impl-${Math.random()
  .toString(36)
  .slice(2, 10)}`;

if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line no-console
  console.log('[SIG_IMPL]', (globalThis as any).__SIG_IMPL_ID__);
}
// ---------------------------------------------------------------------------

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

// Hardened helpers used ONLY by the builder
const stripPipes = (s?: string | null) => (s ?? '').replace(/\|+/g, '').trim();

const normalizeDv = (dataVersion?: string | null) => {
  const raw = stripPipes(dataVersion).toLowerCase();
  if (!raw) return 'dv0';                      // default for empty
  const dv = raw.replace(/^v/, 'dv');          // v123 -> dv123
  return dv.startsWith('dv') ? dv : `dv${dv}`; // ensure dv prefix
};

const normalizeBlockId = (blockId?: string | null) => {
  // preserve case, just remove pipes/whitespace
  return stripPipes(blockId);
};

const normalizeSelectedCode = (code?: string | null) => {
  // selected code is lowercase, no pipes
  return stripPipes(code).toLowerCase();
};

const normalizeCount = (n: unknown) => {
  const num = Number.isFinite(Number(n)) ? Math.max(0, Number(n)) : 0;
  return String(num);
};

/**
 * Build a canonical marketplace signature
 * Format: v1|<dataVersion>|<blockId>|<count>|<selectedCode?>
 * Assembles via token array to prevent pipe leaks
 */
function _buildMarketplaceSigInternal(opts: {
  dataVersion?: string | null;
  blockId?: string | null;
  count?: number | null | undefined;
  selectedCode?: string | null | undefined;
}): string {
  const dv = normalizeDv(opts.dataVersion);
  const bid = normalizeBlockId(opts.blockId);
  const cnt = normalizeCount(opts.count);
  const sc = normalizeSelectedCode(opts.selectedCode);

  // Compose via array join — never via string concat/template
  const tokens = [SIG_VERSION, dv, bid, cnt];
  if (sc) tokens.push(sc);

  return tokens.join('|');
}

/**
 * Dev-only wrapper that logs every build and validates output
 * Production builds will strip this completely
 */
export function buildMarketplaceSig(opts: {
  dataVersion?: string | null;
  blockId?: string | null;
  count?: number | null | undefined;
  selectedCode?: string | null | undefined;
}): string {
  const out = _buildMarketplaceSigInternal(opts);

  if (process.env.NODE_ENV === 'development') {
    const caller = new Error().stack?.split('\n')[2]?.trim() ?? 'unknown';
    // eslint-disable-next-line no-console
    console.debug('[BUILD_SIG]', {
      out,
      opts,
      caller: caller.substring(0, 80),
    });

    if (!SIG_RE.test(out)) {
      // eslint-disable-next-line no-console
      console.error('[BUILD_SIG_MALFORMED]', { out, opts });
      // eslint-disable-next-line no-debugger
      debugger;
    }
  }

  return out;
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
