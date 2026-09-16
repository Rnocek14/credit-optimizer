/**
 * Outbound affiliate link tests.
 *
 * This module decides whether a click earns a commission, so the failure modes
 * are silent and expensive: a dropped tracking param means the sale is credited
 * to nobody, and a malformed link means no sale at all. Both look fine in the UI.
 *
 * `providers.ts` reads `import.meta.env` at module load, so every case stubs the
 * env and re-imports the module fresh.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';

type ProvidersModule = typeof import('@/lib/providers');

/** Load a fresh copy of the module under a given env. */
async function loadProviders(env: Record<string, string> = {}): Promise<ProvidersModule> {
  vi.resetModules();
  vi.unstubAllEnvs();
  for (const [k, v] of Object.entries(env)) {
    vi.stubEnv(k, v);
  }
  return import('@/lib/providers');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('getOutboundUrl — no affiliate config', () => {
  it('falls back to the plain provider URL', async () => {
    const { getOutboundUrl } = await loadProviders();
    expect(getOutboundUrl('SOPHIA')).toBe('https://www.sophia.org/');
  });

  it('marks the provider unsponsored', async () => {
    const { PROVIDERS } = await loadProviders();
    expect(PROVIDERS.SOPHIA.sponsored).toBe(false);
  });

  it('adds no tracking params when there is nothing to track', async () => {
    const { getOutboundUrl } = await loadProviders();
    const url = getOutboundUrl('SOPHIA', { source: 'guide:x', sessionId: 'abc' });
    expect(url).toBe('https://www.sophia.org/');
  });

  it('treats a whitespace-only env value as unset', async () => {
    const { PROVIDERS, getOutboundUrl } = await loadProviders({
      VITE_AFF_SOPHIA_CODE: '   ',
    });
    expect(PROVIDERS.SOPHIA.sponsored).toBe(false);
    expect(getOutboundUrl('SOPHIA')).toBe('https://www.sophia.org/');
  });
});

describe('getOutboundUrl — bare referral code', () => {
  it('appends the code as the provider ref param', async () => {
    const { getOutboundUrl } = await loadProviders({
      VITE_AFF_SOPHIA_CODE: 'pivot123',
    });
    expect(getOutboundUrl('SOPHIA')).toContain('ref=pivot123');
  });

  it('flips the provider to sponsored', async () => {
    const { PROVIDERS } = await loadProviders({ VITE_AFF_SOPHIA_CODE: 'pivot123' });
    expect(PROVIDERS.SOPHIA.sponsored).toBe(true);
  });
});

describe('getOutboundUrl — full network tracking link', () => {
  const TRACKING = 'https://track.flexlinks.com/a.ashx?foid=1&fot=9999&url=https%3A%2F%2Fstudy.com';

  it('replaces the base URL entirely', async () => {
    const { getOutboundUrl } = await loadProviders({ VITE_AFF_STUDYCOM_URL: TRACKING });
    expect(getOutboundUrl('STUDYCOM')).toContain('track.flexlinks.com');
  });

  it('preserves the network\'s own query params', async () => {
    const { getOutboundUrl } = await loadProviders({ VITE_AFF_STUDYCOM_URL: TRACKING });
    const url = getOutboundUrl('STUDYCOM');
    expect(url).toContain('foid=1');
    expect(url).toContain('fot=9999');
  });

  it('does not second-guess the tracking link with a bare ref code', async () => {
    const { getOutboundUrl } = await loadProviders({
      VITE_AFF_STUDYCOM_URL: TRACKING,
      VITE_AFF_STUDYCOM_CODE: 'shouldNotAppear',
    });
    expect(getOutboundUrl('STUDYCOM')).not.toContain('shouldNotAppear');
  });

  it('falls back to the base URL rather than emitting a broken link', async () => {
    const { getOutboundUrl } = await loadProviders({
      VITE_AFF_STUDYCOM_URL: 'not-a-valid-url',
    });
    expect(getOutboundUrl('STUDYCOM')).toBe('https://study.com/');
  });
});

describe('sub-ID attribution', () => {
  it('carries source and session so a commission traces back to a page', async () => {
    const { getOutboundUrl } = await loadProviders({ VITE_AFF_SOPHIA_CODE: 'x' });
    const url = getOutboundUrl('SOPHIA', {
      source: 'guide:sophia-learning-transfer-guide',
      sessionId: 'sess-42',
    });
    const subId = new URL(url).searchParams.get('subId');
    expect(subId).toBe('guide-sophia-learning-transfer-guide__sess-42');
  });

  it('uses the network-specific sub-ID param', async () => {
    const { getOutboundUrl } = await loadProviders({ VITE_AFF_STUDYCOM_CODE: 'x' });
    const url = getOutboundUrl('STUDYCOM', { source: 'compare', sessionId: 's1' });
    // Study.com routes through FlexOffers, which reads sub1 — not subId.
    expect(new URL(url).searchParams.get('sub1')).toBe('compare__s1');
  });

  it('strips characters networks reject', async () => {
    const { getOutboundUrl } = await loadProviders({ VITE_AFF_SOPHIA_CODE: 'x' });
    const url = getOutboundUrl('SOPHIA', { source: 'a b/c?d=e&f', sessionId: 'g#h' });
    const subId = new URL(url).searchParams.get('subId') ?? '';
    expect(subId).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('caps sub-ID length so networks do not truncate or drop it', async () => {
    const { getOutboundUrl } = await loadProviders({ VITE_AFF_SOPHIA_CODE: 'x' });
    const url = getOutboundUrl('SOPHIA', { source: 'z'.repeat(200), sessionId: 'y'.repeat(200) });
    expect((new URL(url).searchParams.get('subId') ?? '').length).toBeLessThanOrEqual(64);
  });

  it('omits the sub-ID for providers that pay nothing', async () => {
    const { getOutboundUrl } = await loadProviders({ VITE_AFF_SOPHIA_CODE: 'x' });
    // CLEP has no affiliate program; no reason to tag the user's exit link.
    expect(getOutboundUrl('CLEP', { source: 'guide:x', sessionId: 's' }))
      .toBe('https://clep.collegeboard.org/');
  });
});

describe('getOutboundRel — SEO safety', () => {
  it('marks affiliate links as sponsored', async () => {
    const { getOutboundRel } = await loadProviders({ VITE_AFF_SOPHIA_CODE: 'x' });
    expect(getOutboundRel('SOPHIA')).toContain('sponsored');
    expect(getOutboundRel('SOPHIA')).toContain('nofollow');
  });

  it('leaves unpaid links followable', async () => {
    const { getOutboundRel } = await loadProviders({ VITE_AFF_SOPHIA_CODE: 'x' });
    expect(getOutboundRel('CLEP')).not.toContain('sponsored');
  });

  it('always sets noopener for target=_blank safety', async () => {
    const { getOutboundRel } = await loadProviders();
    expect(getOutboundRel('SOPHIA')).toContain('noopener');
  });
});

describe('hasAnySponsored — gates the FTC disclosure', () => {
  it('is false before any program is approved', async () => {
    const { hasAnySponsored } = await loadProviders();
    expect(hasAnySponsored(['SOPHIA', 'STUDYCOM'])).toBe(false);
  });

  it('is true as soon as one provider is configured', async () => {
    const { hasAnySponsored } = await loadProviders({ VITE_AFF_SOPHIA_CODE: 'x' });
    expect(hasAnySponsored(['SOPHIA', 'CLEP'])).toBe(true);
  });

  it('stays false for a page that only links unpaid providers', async () => {
    const { hasAnySponsored } = await loadProviders({ VITE_AFF_SOPHIA_CODE: 'x' });
    expect(hasAnySponsored(['CLEP', 'DSST'])).toBe(false);
  });
});
