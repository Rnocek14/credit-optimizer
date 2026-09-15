/**
 * AffiliateDisclosure — FTC-compliant disclosure for pages carrying
 * affiliate links.
 *
 * Two reasons this is not optional:
 *  1. The FTC requires disclosure to be "clear and conspicuous" and placed
 *     BEFORE the links it covers — a footer mention does not satisfy it.
 *  2. Affiliate networks (Impact, FlexOffers, CJ) check for a visible
 *     disclosure during application review. Missing it is a common rejection
 *     reason, which blocks revenue before it ever starts.
 *
 * Renders nothing when no affiliate program is configured, so the site never
 * claims a commercial relationship it does not actually have.
 */
import { hasAnySponsored, type ProviderKey } from '@/lib/providers';

interface AffiliateDisclosureProps {
  /** Which providers this page links to. Defaults to the whole registry. */
  providerKeys?: ProviderKey[];
  /** `inline` for in-article use, `card` for a bordered standalone block. */
  variant?: 'inline' | 'card';
}

export function AffiliateDisclosure({
  providerKeys,
  variant = 'inline',
}: AffiliateDisclosureProps) {
  if (!hasAnySponsored(providerKeys)) return null;

  const body = (
    <>
      <strong className="font-semibold text-foreground">Disclosure:</strong> some
      links on this page are affiliate links. If you sign up through one, we may
      earn a commission at no extra cost to you. It never changes your price, and
      it never changes our rankings — our recommendations come from verified
      transfer data, and we link to CLEP and DSST, which pay us nothing.
    </>
  );

  if (variant === 'card') {
    return (
      <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground leading-relaxed">{body}</p>
      </div>
    );
  }

  return (
    <p className="not-prose text-xs text-muted-foreground leading-relaxed border-l-2 border-border pl-3">
      {body}
    </p>
  );
}
