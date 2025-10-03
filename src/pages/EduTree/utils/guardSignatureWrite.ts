/**
 * Dev guard: call at every assignment site that sets marketplace.signature.
 * If the value doesn't match SIG_RE, we log and break for a clean call stack.
 * No-op in production.
 */
export function guardSignatureWrite(candidate: unknown, stage?: string): void {
  if (process.env.NODE_ENV !== 'development') return;

  const s = String(candidate ?? '');
  // Same regex as signature.ts:
  const re = /^v1\|dv[a-z0-9]+\|[A-Za-z0-9_-]+\|\d+(?:\|[a-z0-9_-]+)?$/;

  if (!re.test(s)) {
    // eslint-disable-next-line no-console
    console.error('[BLOCKED_NONCANONICAL_WRITE]', {
      stage: stage || 'unknown',
      candidate: s,
      stack: new Error().stack,
    });
    // eslint-disable-next-line no-debugger
    debugger;
  }
}
