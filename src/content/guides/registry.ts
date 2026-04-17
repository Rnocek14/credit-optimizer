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

export interface GuideMeta {
  slug: string;
  title: string;          // <60 chars, keyword-first — used as <h1> AND <title>
  description: string;    // <160 chars — meta description + listing card copy
  category: 'compare' | 'pricing' | 'transfer' | 'speed';
  /** Date the guide content was last reviewed/updated (ISO yyyy-mm-dd). */
  updatedAt: string;
  /** Order on the /guides index — lower = earlier. */
  order: number;
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
  },
  {
    slug: 'cheapest-online-bachelors-2025',
    title: 'Cheapest Accredited Online Bachelor\'s Degree (2025)',
    description:
      'The lowest-cost regionally accredited online bachelor\'s degrees in 2025, including alt-credit strategy. Real numbers, no affiliate fluff.',
    category: 'pricing',
    updatedAt: '2026-04-17',
    order: 2,
  },
  {
    slug: 'sophia-learning-transfer-guide',
    title: 'Sophia Learning Credit Transfer: Which Schools Accept It',
    description:
      'Definitive list of regionally accredited universities that accept Sophia Learning credit, with per-credit caps and acceptance details.',
    category: 'transfer',
    updatedAt: '2026-04-17',
    order: 3,
  },
] as const;

export function findGuide(slug: string): GuideMeta | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
