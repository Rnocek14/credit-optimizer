/**
 * Transfer-rule freshness.
 *
 * Institutional transfer policies are republished with the academic catalog,
 * so a rule captured more than a catalog cycle ago is not evidence of today's
 * policy — it is evidence of last year's. Before this module, nothing in any
 * user-facing read path aged a rule out: `credit_transfer_rules` rows were
 * filtered on `is_active` alone, so a rule last verified in January 2026 still
 * rendered with a green "Verified" badge indefinitely.
 *
 * The rule we apply, deliberately, is DOWNGRADE rather than HIDE:
 *
 *   - Hiding stale rules would silently shrink results, and a user cannot act
 *     on information they never see.
 *   - Trusting them silently is what created the problem.
 *
 * So a stale rule is still shown, still counted as "a rule exists", but is
 * never presented as verified. It reads as "needs rechecking", with its date.
 *
 * NOTE ON THRESHOLD: 180 days is deliberately shorter than a year. An annual
 * catalog rollover means a 365-day window would let a rule go a full cycle out
 * of date before anything flagged it. Existing TTLs in the schema (e.g. 365d
 * for `institution_pdf`) have exactly that defect.
 */

/** Days after which a rule stops counting as currently verified. */
export const RULE_FRESHNESS_DAYS = 180;

export type RuleFreshness =
  /** Verified inside the window — safe to present as current. */
  | 'fresh'
  /** Verified, but too long ago to stand behind without rechecking. */
  | 'stale'
  /** Never stamped. Cannot be aged, so cannot be trusted as current. */
  | 'unverified';

/**
 * Classify a rule's `last_verified_at`.
 *
 * `now` is injectable so callers can test boundaries without freezing clocks.
 * An unparseable or absent timestamp is 'unverified', never 'fresh' — the
 * failure mode of a bad date must not be a green badge.
 */
export function classifyRuleFreshness(
  lastVerifiedAt: string | null | undefined,
  now: Date = new Date()
): RuleFreshness {
  if (!lastVerifiedAt) return 'unverified';

  const verified = new Date(lastVerifiedAt);
  if (Number.isNaN(verified.getTime())) return 'unverified';

  const ageDays = (now.getTime() - verified.getTime()) / 86_400_000;

  // A future timestamp is corrupt data, not fresh data.
  if (ageDays < 0) return 'unverified';

  return ageDays <= RULE_FRESHNESS_DAYS ? 'fresh' : 'stale';
}

/** True when a rule must not be presented to a user as currently verified. */
export function isRuleStale(
  lastVerifiedAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  return classifyRuleFreshness(lastVerifiedAt, now) !== 'fresh';
}

/** Whole months since verification, for display. Null when never verified. */
export function monthsSinceVerified(
  lastVerifiedAt: string | null | undefined,
  now: Date = new Date()
): number | null {
  if (!lastVerifiedAt) return null;
  const verified = new Date(lastVerifiedAt);
  if (Number.isNaN(verified.getTime())) return null;
  const months = (now.getTime() - verified.getTime()) / (86_400_000 * 30.44);
  return months < 0 ? null : Math.floor(months);
}

/**
 * Short human label for a rule's verification age, e.g.
 * "Verified Jan 2026 · 8 months ago" or "Never verified".
 */
export function formatVerifiedLabel(
  lastVerifiedAt: string | null | undefined,
  now: Date = new Date()
): string {
  const freshness = classifyRuleFreshness(lastVerifiedAt, now);
  if (freshness === 'unverified') return 'Never verified';

  const when = new Date(lastVerifiedAt as string).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  });
  const months = monthsSinceVerified(lastVerifiedAt, now);

  if (months === null) return `Verified ${when}`;
  if (months < 1) return `Verified ${when} · this month`;
  return `Verified ${when} · ${months} month${months === 1 ? '' : 's'} ago`;
}

/** ISO cutoff for "still fresh", for use as a Supabase `.gte()` bound. */
export function freshnessCutoffIso(now: Date = new Date()): string {
  return new Date(now.getTime() - RULE_FRESHNESS_DAYS * 86_400_000).toISOString();
}
