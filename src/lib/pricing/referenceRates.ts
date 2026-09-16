/**
 * Reference rates — the single source of truth for prices quoted in editorial
 * content (the public /guides pages, disclaimer banners, provider strips).
 *
 * WHY THIS EXISTS
 * ---------------
 * The 2026-09-15 audit found TESU's per-credit rate shipping as four different
 * numbers in four places — $519 (tesu-vs-cosc guide), $419
 * (finish-bachelors-under-10k), ~$400 (TESUDisclaimerBanner) and $564 (the
 * seeded institution_pricing_packs row the planner actually computes with) —
 * with nothing reconciling them. A reader comparing two of our own pages sees
 * the contradiction immediately, and that is the cheapest possible way to lose
 * someone's trust.
 *
 * WHAT IS AUTHORITATIVE
 * ---------------------
 * The planner computes from `institution_pricing_packs` /
 * `alt_provider_pricing_packs` in the database. This module mirrors the
 * committed seed values for those tables so prose and computation cannot
 * drift apart silently; `__tests__/referenceRates.test.ts` fails the build if
 * they do.
 *
 * READ THE `asOf` DATE BEFORE QUOTING ANYTHING.
 * Institution rates below carry effective_date 2024-09-01 from the seed. As of
 * 2026-09-15 that is roughly two years old, across two tuition cycles. These
 * are the best-sourced figures in the repository, which is not the same as
 * being current. Anything user-facing must show the date and say "verify
 * before you pay" — see `formatRateCaveat`.
 *
 * IN-STATE vs OUT-OF-STATE
 * ------------------------
 * Every guide quoted a single per-credit number as though residency did not
 * matter. For TESU the spread is $353 vs $564 — a 60% difference on the single
 * largest line item in the plan. Both are carried here, and prose should name
 * which it is using.
 */

export interface InstitutionRate {
  code: string;
  name: string;
  /** Standard / out-of-state undergraduate per-credit rate, USD. */
  perCreditUsd: number;
  /** In-state or resident rate where the institution publishes one. */
  perCreditInStateUsd?: number;
  /** Required enrollment + graduation fees, USD. */
  requiredFeesUsd: number;
  /** Date the rate took effect, per the source. */
  effectiveDate: string;
  sourceUrl: string;
  /** Migration that seeded the matching institution_pricing_packs row. */
  seedMigration: string;
  notes?: string;
}

/**
 * Mirrors the `institution_pricing_packs` rows seeded by migration
 * 20260113052238. Changing a number here without changing that migration (or
 * vice versa) fails referenceRates.test.ts.
 */
export const INSTITUTION_RATES: Record<string, InstitutionRate> = {
  TESU: {
    code: 'TESU',
    name: 'Thomas Edison State University',
    perCreditUsd: 564,
    perCreditInStateUsd: 353,
    requiredFeesUsd: 250,
    effectiveDate: '2024-09-01',
    sourceUrl: 'https://www.tesu.edu/tuition',
    seedMigration: '20260113052238',
    notes: 'Out-of-state undergraduate rate. NJ residents pay $353/credit.',
  },
  COSC: {
    code: 'COSC',
    name: 'Charter Oak State College',
    perCreditUsd: 328,
    requiredFeesUsd: 200,
    effectiveDate: '2024-09-01',
    sourceUrl: 'https://www.charteroak.edu/tuition/',
    seedMigration: '20260113052238',
    notes: 'Standard undergraduate rate. Connecticut residents pay less.',
  },
  EXCELSIOR: {
    code: 'EXCELSIOR',
    name: 'Excelsior University',
    perCreditUsd: 535,
    requiredFeesUsd: 300,
    effectiveDate: '2024-09-01',
    sourceUrl: 'https://www.excelsior.edu/tuition/',
    seedMigration: '20260113052238',
  },
  EMPIRE: {
    code: 'EMPIRE',
    name: 'SUNY Empire State University',
    perCreditUsd: 295,
    requiredFeesUsd: 200,
    effectiveDate: '2024-09-01',
    sourceUrl: 'https://www.suny.edu/empire/tuition/',
    seedMigration: '20260113052238',
    notes: 'NY resident rate. Out-of-state students pay more.',
  },
};

export type ProviderPricingModel =
  | 'subscription'            // flat monthly, unlimited or capped concurrency
  | 'subscription_plus_course' // monthly membership AND a per-course fee
  | 'per_exam';

export interface ProviderRate {
  code: string;
  name: string;
  model: ProviderPricingModel;
  monthlyUsd?: number;
  /** Per COURSE, not per credit. The distinction has cost us a guide before. */
  perCourseUsd?: number;
  perExamUsd?: number;
  /** Typical credits per course, for worked examples. */
  creditsPerCourse?: number;
  asOf: string;
  sourceUrl: string;
  /** Short human summary, reused by the provider strip. */
  summary: string;
}

export const PROVIDER_RATES: Record<string, ProviderRate> = {
  SOPHIA: {
    code: 'SOPHIA',
    name: 'Sophia Learning',
    model: 'subscription',
    monthlyUsd: 99,
    creditsPerCourse: 3,
    asOf: '2026-04-17',
    sourceUrl: 'https://www.sophia.org/pricing',
    summary: '$99/month, unlimited courses (2 at a time)',
  },
  STUDYCOM: {
    code: 'STUDYCOM',
    name: 'Study.com',
    model: 'subscription',
    monthlyUsd: 199,
    creditsPerCourse: 3,
    asOf: '2026-04-17',
    sourceUrl: 'https://study.com/college-saver.html',
    // providers.ts previously said "from $95/month", which is a lower tier
    // that does NOT include college-credit courses. Quoting it beside a
    // transfer-credit recommendation implied you could earn credit at $95.
    summary: '$199/month (College Plus — the tier that earns transferable credit)',
  },
  STRAIGHTERLINE: {
    code: 'STRAIGHTERLINE',
    name: 'StraighterLine',
    model: 'subscription_plus_course',
    monthlyUsd: 99,
    perCourseUsd: 79,
    creditsPerCourse: 3,
    asOf: '2026-04-17',
    sourceUrl: 'https://www.straighterline.com/pricing/',
    summary: '$99/month membership + $79 per course',
  },
  CLEP: {
    code: 'CLEP',
    name: 'CLEP (College Board)',
    model: 'per_exam',
    perExamUsd: 95,
    creditsPerCourse: 3,
    asOf: '2026-04-17',
    sourceUrl: 'https://clep.collegeboard.org/',
    summary: '~$95 per exam (plus a test-centre fee)',
  },
  DSST: {
    code: 'DSST',
    name: 'DSST',
    model: 'per_exam',
    perExamUsd: 100,
    creditsPerCourse: 3,
    asOf: '2026-04-17',
    sourceUrl: 'https://dsst.getcollegecredit.com/',
    summary: '~$100 per exam',
  },
};

/**
 * Cost of N credits from a provider, respecting its pricing model.
 *
 * Exists because `finish-bachelors-under-10k` computed StraighterLine's
 * $79-per-COURSE fee as $79 per CREDIT: 60 credits × $79 = $4,740 rather than
 * 20 courses × $79 = $1,580, overstating that line by $3,160 and the guide's
 * headline total with it.
 */
export function providerCostForCredits(
  code: string,
  credits: number,
  months: number
): number | null {
  const rate = PROVIDER_RATES[code.toUpperCase()];
  if (!rate || credits <= 0) return null;

  const creditsPerCourse = rate.creditsPerCourse ?? 3;
  const courses = Math.ceil(credits / creditsPerCourse);

  switch (rate.model) {
    case 'subscription':
      return (rate.monthlyUsd ?? 0) * Math.max(1, months);
    case 'subscription_plus_course':
      return (rate.monthlyUsd ?? 0) * Math.max(1, months) + (rate.perCourseUsd ?? 0) * courses;
    case 'per_exam':
      return (rate.perExamUsd ?? 0) * courses;
    default:
      return null;
  }
}

/** Whole months between a date and now, for staleness copy. */
export function monthsSince(dateIso: string, now: Date = new Date()): number {
  const then = new Date(dateIso);
  if (Number.isNaN(then.getTime())) return 0;
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / (86_400_000 * 30.44)));
}

/**
 * The caveat line that must accompany any quoted institutional rate.
 * Never render a price from this module without it.
 */
export function formatRateCaveat(code: string, now: Date = new Date()): string {
  const rate = INSTITUTION_RATES[code.toUpperCase()];
  if (!rate) return 'Rate unverified — confirm with the institution before enrolling.';
  const age = monthsSince(rate.effectiveDate, now);
  return (
    `Rate effective ${rate.effectiveDate} (${age} months ago). ` +
    `Tuition changes each academic year — confirm current rates with the school before enrolling.`
  );
}

export function getInstitutionRate(code: string): InstitutionRate | undefined {
  return INSTITUTION_RATES[code.toUpperCase()];
}

export function getProviderRate(code: string): ProviderRate | undefined {
  return PROVIDER_RATES[code.toUpperCase()];
}
