/**
 * Guide registry — single source of truth for public /guides/:slug pages.
 *
 * Every guide entry is:
 *   - rendered at /guides/:slug
 *   - listed at /guides
 *   - included in sitemap.xml (via scripts/build-sitemap.ts at build time)
 *
 * Keep this list curated — these are SEO surfaces, not blog posts. Each entry
 * should answer ONE high-intent search query backed by real platform data.
 */

import type { ProviderKey } from '@/lib/providers';

export interface GuideMeta {
  slug: string;
  title: string;          // <60 chars, keyword-first — used as <h1> AND <title>
  description: string;    // <160 chars — meta description + listing card copy
  category: 'compare' | 'pricing' | 'transfer' | 'speed';
  /** Date the guide content was last reviewed/updated (ISO yyyy-mm-dd). */
  updatedAt: string;
  /** Order on the /guides index — lower = earlier. */
  order: number;
  /**
   * Providers this guide should link out to, in display order.
   *
   * This is the guide's monetization surface. Order is editorial, not
   * commercial: lead with whatever genuinely fits the query, which is why
   * pricing guides lead with CLEP (which pays us nothing). A comparison
   * site that reorders for commission stops being worth linking to.
   */
  providers: readonly ProviderKey[];
}

export const GUIDES: readonly GuideMeta[] = [
  {
    slug: 'tesu-vs-cosc-bsba',
    title: 'TESU vs COSC BSBA: Cost, Time & Transfer Compared',
    description:
      'Side-by-side comparison of Thomas Edison State and Charter Oak\'s online BSBA programs — real tuition, transfer policy, and time-to-degree numbers.',
    category: 'compare',
    updatedAt: '2026-04-17',
    order: 1,
    providers: ['SOPHIA', 'STUDYCOM', 'CLEP', 'DSST'],
  },
  {
    slug: 'cheapest-online-bachelors-2025',
    title: 'Cheapest Accredited Online Bachelor\'s Degree (2025)',
    description:
      'The lowest-cost regionally accredited online bachelor\'s degrees in 2025, including alt-credit strategy. Real numbers, no affiliate fluff.',
    category: 'pricing',
    updatedAt: '2026-04-17',
    order: 2,
    providers: ['CLEP', 'SOPHIA', 'DSST', 'STUDYCOM'],
  },
  {
    slug: 'sophia-learning-transfer-guide',
    title: 'Sophia Learning Credit Transfer: Which Schools Accept It',
    description:
      'Definitive list of regionally accredited universities that accept Sophia Learning credit, with per-credit caps and acceptance details.',
    category: 'transfer',
    updatedAt: '2026-04-17',
    order: 3,
    providers: ['SOPHIA', 'STUDYCOM', 'STRAIGHTERLINE', 'CLEP'],
  },
  {
    slug: 'straighterline-vs-sophia-vs-studycom',
    title: 'StraighterLine vs Sophia vs Study.com: Real Cost & Transfer',
    description:
      'Side-by-side: per-credit cost, transfer acceptance, and which alt-credit provider actually fits your target school. Verified 2026 pricing.',
    category: 'compare',
    updatedAt: '2026-04-17',
    order: 4,
    providers: ['SOPHIA', 'STUDYCOM', 'STRAIGHTERLINE', 'CLEP'],
  },
  {
    slug: 'finish-bachelors-under-10k',
    title: 'How to Finish Your Bachelor\'s Degree Under $10,000',
    description:
      'The exact recipe for finishing an accredited online bachelor\'s degree for under $10k — schools, alt-credit sequence, and the math line by line.',
    category: 'pricing',
    updatedAt: '2026-04-17',
    order: 5,
    providers: ['CLEP', 'SOPHIA', 'DSST', 'STUDYCOM'],
  },
] as const;

export function findGuide(slug: string): GuideMeta | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
