/**
 * Provider registry + outbound (affiliate-ready) link builder.
 *
 * This is the monetization surface: when a plan tells a user "take these
 * Sophia/Study.com/CLEP courses", the outbound click is the revenue event.
 *
 * Affiliate configuration is env-driven so links work before the programs are
 * approved and upgrade in place afterwards:
 *   VITE_AFF_STUDYCOM_URL  — full tracking deep link from FlexOffers (Study.com)
 *   VITE_AFF_SOPHIA_CODE   — Sophia referral code (appended as ?ref=)
 * Unset vars fall back to the provider's plain URL — never a broken link.
 */

export type ProviderKey = 'SOPHIA' | 'STUDYCOM' | 'CLEP' | 'DSST' | 'STRAIGHTERLINE';

export interface ProviderInfo {
  key: ProviderKey;
  name: string;
  baseUrl: string;
  blurb: string;
  pricing: string;
  sponsored: boolean;
}

const AFF_STUDYCOM_URL = import.meta.env.VITE_AFF_STUDYCOM_URL as string | undefined;
const AFF_SOPHIA_CODE = import.meta.env.VITE_AFF_SOPHIA_CODE as string | undefined;

export const PROVIDERS: Record<ProviderKey, ProviderInfo> = {
  SOPHIA: {
    key: 'SOPHIA',
    name: 'Sophia Learning',
    baseUrl: 'https://www.sophia.org/',
    blurb: 'Unlimited self-paced gen-ed courses, ACE-recommended.',
    pricing: '$99/month, unlimited courses (2 at a time)',
    sponsored: Boolean(AFF_SOPHIA_CODE),
  },
  STUDYCOM: {
    key: 'STUDYCOM',
    name: 'Study.com',
    baseUrl: 'https://study.com/',
    blurb: 'Largest catalog including upper-division courses.',
    pricing: 'from $95/month',
    sponsored: Boolean(AFF_STUDYCOM_URL),
  },
  CLEP: {
    key: 'CLEP',
    name: 'CLEP (College Board)',
    baseUrl: 'https://clep.collegeboard.org/',
    blurb: 'One proctored exam = a whole course. Cheapest per credit.',
    pricing: '~$95 per exam',
    sponsored: false,
  },
  DSST: {
    key: 'DSST',
    name: 'DSST',
    baseUrl: 'https://dsst.getcollegecredit.com/',
    blurb: 'Exam credit for subjects CLEP does not cover.',
    pricing: '~$100 per exam',
    sponsored: false,
  },
  STRAIGHTERLINE: {
    key: 'STRAIGHTERLINE',
    name: 'StraighterLine',
    baseUrl: 'https://www.straighterline.com/',
    blurb: 'Self-paced courses with wide partner-school acceptance.',
    pricing: '$99/month + per-course fees',
    sponsored: false,
  },
};

/** Resolve the outbound URL, applying affiliate config when present. */
export function getOutboundUrl(key: ProviderKey): string {
  if (key === 'STUDYCOM' && AFF_STUDYCOM_URL) return AFF_STUDYCOM_URL;
  if (key === 'SOPHIA' && AFF_SOPHIA_CODE) {
    const u = new URL(PROVIDERS.SOPHIA.baseUrl);
    u.searchParams.set('ref', AFF_SOPHIA_CODE);
    return u.toString();
  }
  return PROVIDERS[key].baseUrl;
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
