/**
 * Provider registry + outbound (affiliate-ready) link builder.
 *
 * This is the monetization surface: when a plan or guide tells a user "take
 * these Sophia/Study.com/StraighterLine courses", the outbound click is the
 * revenue event.
 *
 * Affiliate configuration is env-driven so links work before the programs are
 * approved and upgrade in place afterwards. Two shapes are supported per
 * provider, checked in this order:
 *
 *   1. `*_URL`  — a full tracking deep link issued by the network
 *                 (Impact / FlexOffers / CJ). Replaces the base URL entirely.
 *   2. `*_CODE` — a bare referral code, appended as the provider's own
 *                 referral query param (see `refParam` below).
 *
 * Unset vars fall back to the provider's plain URL — never a broken link.
 *
 * Every generated URL also carries a sub-ID (`subIdParam`) built from the page
 * that produced the click. That is what lets a commission that lands in the
 * network dashboard weeks later be traced back to the guide that earned it.
 * Without it you get paid but never learn which content works.
 *
 * NOTE: `import.meta.env.X` must be referenced statically — Vite substitutes
 * these at build time and dynamic lookup (`import.meta.env[key]`) silently
 * yields undefined in production. Hence the explicit constants below.
 */

export type ProviderKey = 'SOPHIA' | 'STUDYCOM' | 'CLEP' | 'DSST' | 'STRAIGHTERLINE';

export interface ProviderInfo {
  key: ProviderKey;
  name: string;
  baseUrl: string;
  blurb: string;
  pricing: string;
  /** True once affiliate config is present — drives disclosure + rel="sponsored". */
  sponsored: boolean;
  /** Query param this provider uses for a bare referral code. */
  refParam: string;
  /** Query param the network uses for click attribution (sub-ID / sub1). */
  subIdParam: string;
  /** Full tracking deep link, when configured. */
  affiliateUrl?: string;
  /** Bare referral code, when configured. */
  refCode?: string;
}

/* ── Env-driven affiliate config ─────────────────────────────────
 * Referenced statically so Vite can inline them. Add the matching
 * keys to .env (see .env.example) as each program is approved.
 * ---------------------------------------------------------------- */
const AFF_SOPHIA_URL = import.meta.env.VITE_AFF_SOPHIA_URL as string | undefined;
const AFF_SOPHIA_CODE = import.meta.env.VITE_AFF_SOPHIA_CODE as string | undefined;
const AFF_STUDYCOM_URL = import.meta.env.VITE_AFF_STUDYCOM_URL as string | undefined;
const AFF_STUDYCOM_CODE = import.meta.env.VITE_AFF_STUDYCOM_CODE as string | undefined;
const AFF_STRAIGHTERLINE_URL = import.meta.env.VITE_AFF_STRAIGHTERLINE_URL as string | undefined;
const AFF_STRAIGHTERLINE_CODE = import.meta.env.VITE_AFF_STRAIGHTERLINE_CODE as string | undefined;

/** Treat whitespace-only env values as unset — a blank line in .env is not config. */
const clean = (v: string | undefined): string | undefined => {
  const t = v?.trim();
  return t ? t : undefined;
};

export const PROVIDERS: Record<ProviderKey, ProviderInfo> = {
  SOPHIA: {
    key: 'SOPHIA',
    name: 'Sophia Learning',
    baseUrl: 'https://www.sophia.org/',
    blurb: 'Unlimited self-paced gen-ed courses, ACE-recommended.',
    pricing: '$99/month, unlimited courses (2 at a time)',
    refParam: 'ref',
    subIdParam: 'subId',
    affiliateUrl: clean(AFF_SOPHIA_URL),
    refCode: clean(AFF_SOPHIA_CODE),
    sponsored: Boolean(clean(AFF_SOPHIA_URL) || clean(AFF_SOPHIA_CODE)),
  },
  STUDYCOM: {
    key: 'STUDYCOM',
    name: 'Study.com',
    baseUrl: 'https://study.com/',
    blurb: 'Largest catalog including upper-division courses.',
    pricing: 'from $95/month',
    refParam: 'ref',
    subIdParam: 'sub1',
    affiliateUrl: clean(AFF_STUDYCOM_URL),
    refCode: clean(AFF_STUDYCOM_CODE),
    sponsored: Boolean(clean(AFF_STUDYCOM_URL) || clean(AFF_STUDYCOM_CODE)),
  },
  STRAIGHTERLINE: {
    key: 'STRAIGHTERLINE',
    name: 'StraighterLine',
    baseUrl: 'https://www.straighterline.com/',
    blurb: 'Self-paced courses with wide partner-school acceptance.',
    pricing: '$99/month + per-course fees',
    refParam: 'ref',
    subIdParam: 'subId',
    affiliateUrl: clean(AFF_STRAIGHTERLINE_URL),
    refCode: clean(AFF_STRAIGHTERLINE_CODE),
    sponsored: Boolean(clean(AFF_STRAIGHTERLINE_URL) || clean(AFF_STRAIGHTERLINE_CODE)),
  },
  CLEP: {
    key: 'CLEP',
    name: 'CLEP (College Board)',
    baseUrl: 'https://clep.collegeboard.org/',
    blurb: 'One proctored exam = a whole course. Cheapest per credit.',
    pricing: '~$95 per exam',
    refParam: 'ref',
    subIdParam: 'subId',
    // College Board runs no affiliate program — this stays unsponsored by
    // design. It is here because leaving out the cheapest option to chase a
    // commission is how a comparison site loses the trust that earns clicks.
    sponsored: false,
  },
  DSST: {
    key: 'DSST',
    name: 'DSST',
    baseUrl: 'https://dsst.getcollegecredit.com/',
    blurb: 'Exam credit for subjects CLEP does not cover.',
    pricing: '~$100 per exam',
    refParam: 'ref',
    subIdParam: 'subId',
    sponsored: false,
  },
};

/** Context describing where a click came from, used to build the sub-ID. */
export interface OutboundContext {
  /** Analytics surface, e.g. 'plan_preview' | 'guide:sophia-learning-transfer-guide'. */
  source?: string;
  /** Anonymous session id, so a paid conversion can be joined to a funnel. */
  sessionId?: string;
}

/**
 * Build a network-safe sub-ID. Most networks cap sub-IDs around 50-64 chars
 * and reject anything outside [A-Za-z0-9_-], so normalize hard rather than
 * trusting callers.
 */
function buildSubId(ctx: OutboundContext): string | null {
  const parts = [ctx.source, ctx.sessionId].filter(Boolean) as string[];
  if (parts.length === 0) return null;
  const raw = parts.join('__').replace(/[^A-Za-z0-9_-]/g, '-');
  return raw.slice(0, 64);
}

/**
 * Resolve the outbound URL, applying affiliate config and click attribution.
 *
 * Falls back to the provider's plain URL if anything is unset or malformed —
 * a broken link earns nothing, so this never throws.
 */
export function getOutboundUrl(key: ProviderKey, ctx: OutboundContext = {}): string {
  const p = PROVIDERS[key];
  const target = p.affiliateUrl ?? p.baseUrl;

  try {
    const u = new URL(target);

    // A bare referral code only applies when we're pointing at the provider's
    // own domain. If a full network tracking link is configured, that link
    // already carries the attribution and must not be second-guessed.
    if (!p.affiliateUrl && p.refCode) {
      u.searchParams.set(p.refParam, p.refCode);
    }

    const subId = buildSubId(ctx);
    if (subId && p.sponsored) {
      u.searchParams.set(p.subIdParam, subId);
    }

    return u.toString();
  } catch {
    return p.baseUrl;
  }
}

/**
 * Correct `rel` for an outbound provider link.
 *
 * Google requires paid/affiliate links be marked `sponsored` (or `nofollow`).
 * This site's whole acquisition model is organic search, so an unmarked
 * affiliate link is an existential risk, not a nitpick.
 */
export function getOutboundRel(key: ProviderKey): string {
  return PROVIDERS[key].sponsored
    ? 'sponsored nofollow noopener noreferrer'
    : 'noopener noreferrer';
}

/** True when any provider has affiliate config — gates the disclosure copy. */
export function hasAnySponsored(keys: ProviderKey[] = Object.keys(PROVIDERS) as ProviderKey[]): boolean {
  return keys.some((k) => PROVIDERS[k].sponsored);
}

/** Map loose provider codes from plan data onto registry keys. */
export function normalizeProviderKey(code: string | null | undefined): ProviderKey | null {
  if (!code) return null;
  const c = code.toUpperCase().replace(/[^A-Z]/g, '');
  if (c.includes('SOPHIA')) return 'SOPHIA';
  if (c.includes('STUDY')) return 'STUDYCOM';
  if (c === 'CLEP') return 'CLEP';
  if (c === 'DSST') return 'DSST';
  if (c.includes('STRAIGHTER')) return 'STRAIGHTERLINE';
  return null;
}
