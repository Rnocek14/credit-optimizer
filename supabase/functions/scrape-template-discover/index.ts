// -----------------------------------------------------------------------------
// scrape-template-discover
// -----------------------------------------------------------------------------
// Generic, school-agnostic URL discovery for the transfer-scraper pipeline.
//
// Problem this solves:
//   Onboarding a new institution today requires a human to hand-curate URLs
//   into `scrape_url_templates`. The extraction engine itself is generic, but
//   URL discovery is manual — and that's the bottleneck.
//
// What it does:
//   1. Accept { institution_code, domain, dry_run? }.
//   2. Firecrawl-Map the root domain with policy-relevant search terms.
//   3. Score each candidate URL based on:
//        - keyword density in path (transfer, residency, policy, catalog…)
//        - path-depth + structural signals (/policies/, /academic-catalog/…)
//        - exclusion of low-authority paths (/news/, /blog/, /press/…)
//        - file-type bonuses (.pdf catalog/policy docs)
//   4. Bucket URLs by inferred page_type (transfer_policy, residency,
//      catalog, alt_credit) so the merge layer's source-type authority
//      weighting can do its job.
//   5. Insert top-N per bucket into scrape_url_templates (or return them
//      if dry_run=true).
//
// Trust model:
//   - Templates are inserted with priority 5–9 (below hand-curated 1–4).
//   - notes column records "auto_discovered_v1 score=… signals=…".
//   - This NEVER deletes existing templates; it only ADDS candidates.
// -----------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// -----------------------------------------------------------------------------
// Scoring rubric
// -----------------------------------------------------------------------------

type PageType = 'transfer_policy' | 'residency' | 'catalog' | 'alt_credit';

interface ScoredUrl {
  url: string;
  score: number;
  pageType: PageType;
  signals: string[];
}

const HIGH_VALUE_PATH_FRAGMENTS: Record<PageType, string[]> = {
  transfer_policy: [
    '/transfer-credit', '/transferring-credit', '/transfer-policy',
    '/admissions/transfer', '/admission/transfer', '/transfer/',
    '/credit-transfer', '/transfer-credits', '/transferability',
  ],
  residency: [
    // Use specific academic-residency phrases only. Bare "/residence" or
    // "/residency" matches housing pages (residence halls, residency life).
    '/credit-in-residence', '/credits-in-residence',
    '/residency-requirement', '/residency-requirements',
    '/institutional-credit', '/institutional-credits',
    '/graduation-requirements', '/degree-requirements',
  ],
  catalog: [
    '/academic-catalog', '/academic-catalogs', '/catalog/',
    '/catalogs/', '/policy-library', '/student-handbook',
    // NOTE: '/academic-policies' removed — it's too broad and also matches
    // title-ix / misconduct pages. Per-page keyword scoring still picks up
    // legitimate academic-policy URLs via 'policy' + 'academic' keywords.
  ],
  alt_credit: [
    '/credit-by-exam', '/clep', '/dsst', '/ace-credit',
    '/prior-learning', '/pla', '/portfolio-credit',
    '/military-credit', '/cpl/',
  ],
};

// Anti-signals — if a path contains any of these, it is NOT what its
// keywords suggest. Examples:
//   /residence-halls/acacia → looks like residency, is housing
//   /title-ix, /misconduct → looks like academic policy, is legal compliance
//   /transfer-guides/<degree-name>.pdf → looks like transfer policy, is a
//     per-program articulation worksheet (not institution-wide policy).
const ANTI_SIGNAL_FRAGMENTS = [
  // Housing
  'residence-hall', 'residence-halls', 'housing', 'student-affairs',
  'residence-life', 'residential-life',
  // Legal/compliance pages that live under /academic-policies/
  'title-ix', 'title-9', 'misconduct', 'harassment', 'discrimination',
  'clery', 'ferpa-notice',
  // Per-program articulation worksheets (NOT institution-wide policy)
  '/transfer-guides/', '/transfer-guide/', '/articulation-guide',
  '/program-articulation/',
];

// Paths that should NEVER be considered policy sources, even if keywords match.
const LOW_AUTHORITY_FRAGMENTS = [
  '/news/', '/newsroom/', '/blog/', '/press/', '/stories/',
  '/article/', '/articles/', '/insights/', '/events/',
  '/about/', '/contact/', '/staff/', '/directory/',
  '/library/', '/calendar/', '/give/', '/donate/',
  '/athletics/', '/sports/', '/alumni/', '/jobs/', '/careers/',
];

// Keywords that boost a URL's score when present in path or query.
const KEYWORD_WEIGHTS: Array<{ kw: string; weight: number }> = [
  { kw: 'transfer', weight: 25 },
  { kw: 'residency', weight: 25 },
  { kw: 'in-residence', weight: 25 },
  { kw: 'credit', weight: 12 },
  { kw: 'policy', weight: 18 },
  { kw: 'policies', weight: 18 },
  { kw: 'catalog', weight: 15 },
  { kw: 'graduation', weight: 10 },
  { kw: 'degree', weight: 6 },
  { kw: 'requirement', weight: 8 },
  { kw: 'admission', weight: 8 },
  { kw: 'undergraduate', weight: 5 },
  { kw: 'clep', weight: 12 },
  { kw: 'dsst', weight: 12 },
  { kw: 'ace', weight: 8 },
  { kw: 'prior-learning', weight: 15 },
];

function scoreUrl(rawUrl: string): ScoredUrl | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return null;
  }

  const path = parsed.pathname.toLowerCase();
  const fullPath = (parsed.pathname + parsed.search).toLowerCase();

  // Hard exclude low-authority paths first.
  for (const frag of LOW_AUTHORITY_FRAGMENTS) {
    if (path.includes(frag)) return null;
  }

  // Hard exclude anti-signal paths (housing, legal compliance, per-program
  // articulation worksheets) — these LOOK like policy pages by keyword but
  // are not institution-wide policy.
  for (const frag of ANTI_SIGNAL_FRAGMENTS) {
    if (path.includes(frag)) return null;
  }

  // Skip pure root + obvious non-content endpoints.
  if (path === '/' || path === '') return null;
  if (path.endsWith('.jpg') || path.endsWith('.png') || path.endsWith('.gif') || path.endsWith('.css') || path.endsWith('.js')) return null;

  const signals: string[] = [];
  let score = 0;

  // --- 1. Page-type detection via high-value path fragments ---
  // Order matters: residency > transfer_policy > alt_credit > catalog
  // because residency is the rarest signal and gets buried otherwise.
  let pageType: PageType = 'transfer_policy';
  let pageTypeMatched = false;

  const tryBuckets: PageType[] = ['residency', 'alt_credit', 'transfer_policy', 'catalog'];
  for (const bucket of tryBuckets) {
    for (const frag of HIGH_VALUE_PATH_FRAGMENTS[bucket]) {
      if (path.includes(frag)) {
        pageType = bucket;
        pageTypeMatched = true;
        score += 40;
        signals.push(`path_match:${bucket}:${frag}`);
        break;
      }
    }
    if (pageTypeMatched) break;
  }

  // --- 2. Keyword weighting on path ---
  for (const { kw, weight } of KEYWORD_WEIGHTS) {
    if (fullPath.includes(kw)) {
      score += weight;
      signals.push(`kw:${kw}+${weight}`);
    }
  }

  // --- 3. PDF bonus when it sits inside a policy/catalog directory ---
  if (path.endsWith('.pdf')) {
    if (path.includes('/policies/') || path.includes('/catalog') || path.includes('/policy')) {
      score += 20;
      signals.push('pdf_policy_doc');
    } else {
      // Generic PDFs are not necessarily policy — neutral, no boost.
      signals.push('pdf_generic');
    }
  }

  // --- 4. Path-depth heuristic ---
  // Very deep paths (5+ segments) are usually navigational dead-ends.
  // Very shallow (1 segment) is often a landing page — fine, no penalty.
  const depth = path.split('/').filter(Boolean).length;
  if (depth >= 6) {
    score -= 8;
    signals.push(`depth_penalty:${depth}`);
  }

  // --- 5. Subdomain handling ---
  // Subdomains like online.school.edu, catalog.school.edu, policies.school.edu
  // are typically MORE authoritative for policy than the marketing root.
  const host = parsed.hostname.toLowerCase();
  if (host.startsWith('catalog.') || host.startsWith('policies.') || host.startsWith('policy.')) {
    score += 15;
    signals.push('authoritative_subdomain');
  }

  // Threshold: we want signal-heavy URLs only.
  if (score < 30) return null;

  return { url: parsed.toString(), score, pageType, signals };
}

// -----------------------------------------------------------------------------
// Firecrawl Map call
// -----------------------------------------------------------------------------

async function firecrawlMap(domain: string, search?: string): Promise<string[]> {
  const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
  if (!apiKey) throw new Error('FIRECRAWL_API_KEY not configured');

  const normalizedDomain = domain.startsWith('http') ? domain : `https://${domain}`;

  const response = await fetch('https://api.firecrawl.dev/v1/map', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: normalizedDomain,
      search,
      limit: 1500,
      includeSubdomains: true,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Firecrawl Map failed: ${response.status}`);
  }
  // v1 Map returns { success: true, links: [...] }
  return Array.isArray(data.links) ? data.links : [];
}

// -----------------------------------------------------------------------------
// Per-bucket cap so we don't seed 50 transfer URLs and 0 residency URLs.
// -----------------------------------------------------------------------------
const MAX_PER_BUCKET: Record<PageType, number> = {
  transfer_policy: 5,
  residency: 3,
  catalog: 3,
  alt_credit: 3,
};

function bucketAndCap(scored: ScoredUrl[]): ScoredUrl[] {
  const buckets: Record<PageType, ScoredUrl[]> = {
    transfer_policy: [],
    residency: [],
    catalog: [],
    alt_credit: [],
  };

  // Highest score first.
  scored.sort((a, b) => b.score - a.score);

  // Dedup by URL.
  const seen = new Set<string>();
  for (const s of scored) {
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    if (buckets[s.pageType].length < MAX_PER_BUCKET[s.pageType]) {
      buckets[s.pageType].push(s);
    }
  }

  return [
    ...buckets.transfer_policy,
    ...buckets.residency,
    ...buckets.catalog,
    ...buckets.alt_credit,
  ];
}

// -----------------------------------------------------------------------------
// Handler
// -----------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const institutionCode: string | undefined = body.institution_code;
    const domain: string | undefined = body.domain;
    const dryRun: boolean = body.dry_run === true;

    if (!institutionCode || !domain) {
      return new Response(
        JSON.stringify({ success: false, error: 'institution_code and domain are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`[discover] Starting auto-discovery for ${institutionCode} on ${domain} (dry_run=${dryRun})`);

    // Run a few targeted Firecrawl searches in parallel — each one biases the
    // map toward a different policy facet. We then dedupe.
    const queries = [
      'transfer credit policy',
      'residency requirement institutional credit',
      'academic catalog policies',
      'credit by examination prior learning',
    ];

    const linkSets = await Promise.all(
      queries.map(async (q) => {
        try {
          const links = await firecrawlMap(domain, q);
          console.log(`[discover] map "${q}" → ${links.length} links`);
          return links;
        } catch (err) {
          console.error(`[discover] map "${q}" failed:`, err);
          return [];
        }
      }),
    );

    const allLinks = Array.from(new Set(linkSets.flat()));
    console.log(`[discover] Combined unique links: ${allLinks.length}`);

    // Score every candidate.
    const scored: ScoredUrl[] = [];
    for (const link of allLinks) {
      const s = scoreUrl(link);
      if (s) scored.push(s);
    }

    const top = bucketAndCap(scored);
    console.log(`[discover] After bucketing: ${top.length} candidates`);

    // Map score → priority. Hand-curated templates use priority 1–4; we stay 5–9.
    function scoreToPriority(score: number): number {
      if (score >= 90) return 5;
      if (score >= 70) return 6;
      if (score >= 55) return 7;
      if (score >= 40) return 8;
      return 9;
    }

    const candidates = top.map((s) => ({
      institution_code: institutionCode,
      url: s.url,
      page_type: s.pageType,
      source_type: s.pageType, // align with merge-layer source-type authority
      priority: scoreToPriority(s.score),
      status: 'active',
      notes: `auto_discovered_v1 score=${s.score} signals=[${s.signals.join(', ')}]`,
    }));

    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          dry_run: true,
          institution_code: institutionCode,
          discovered: candidates.length,
          candidates,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ----- Persist (with conflict skip) -----
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const c of candidates) {
      // Skip if a template for the same (institution_code, url) already exists.
      const { data: existing } = await supabase
        .from('scrape_url_templates')
        .select('id')
        .eq('institution_code', c.institution_code)
        .eq('url', c.url)
        .maybeSingle();

      if (existing) {
        skipped++;
        continue;
      }

      const { error } = await supabase.from('scrape_url_templates').insert(c);
      if (error) {
        errors.push(`${c.url}: ${error.message}`);
      } else {
        inserted++;
      }
    }

    console.log(`[discover] Done — inserted=${inserted} skipped=${skipped} errors=${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        institution_code: institutionCode,
        domain,
        discovered: candidates.length,
        inserted,
        skipped_existing: skipped,
        errors,
        candidates,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[discover] Fatal error:', err);
    const message = err instanceof Error ? err.message : 'discovery failed';
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
