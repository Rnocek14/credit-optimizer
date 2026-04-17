/**
 * PlanPreviewCTA — End-of-guide call-to-action.
 *
 * The bridge from SEO surface → product. Every public guide ends with this card.
 * It connects: SEO page → /get-started → /compare → /plan/preview.
 *
 * Fires `public_guide_cta_click` analytics event with the source slug so we can
 * measure which guides actually convert traffic into product usage.
 */
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import { logEvent } from '@/lib/analytics';

interface PlanPreviewCTAProps {
  /** Slug of the guide this CTA appears on — used for attribution. */
  sourceSlug: string;
  /** Optional override for headline copy. */
  headline?: string;
  /** Optional override for sub-copy. */
  subline?: string;
}

export function PlanPreviewCTA({
  sourceSlug,
  headline = 'See your exact path based on your credits',
  subline = 'Tell us what you\'ve already done. We\'ll show you the cheapest, fastest accredited route to your degree — usually in under 90 seconds.',
}: PlanPreviewCTAProps) {
  return (
    <Card className="p-6 md:p-8 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 border-primary/20">
      <div className="flex flex-col gap-4 md:gap-5">
        <div className="inline-flex items-center gap-2 self-start text-xs uppercase tracking-wider text-primary font-semibold">
          <Sparkles className="h-3.5 w-3.5" />
          Personalized
        </div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
          {headline}
        </h2>
        <p className="text-muted-foreground max-w-2xl">{subline}</p>
        <div>
          <Button
            asChild
            size="lg"
            className="gap-2"
            onClick={() =>
              logEvent('public_guide_cta_click', {
                slug: sourceSlug,
                destination: '/get-started',
              })
            }
          >
            <Link to={`/get-started?ref=guide&slug=${encodeURIComponent(sourceSlug)}`}>
              See your path
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
