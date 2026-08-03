/**
 * PlanPreviewPage — `/plan/preview/:templateId`
 *
 * The decisive moment between /compare and /plan.
 *
 * User journey:
 *   /compare → click "See my full plan" on a row →
 *   /plan/preview/:templateId  ← THIS PAGE: "This is YOUR path"
 *   → click "Make this my plan" → /plan (active plan rendered)
 *
 * Preserves career intent (?career=…) so the plan is tied to the user's goal.
 * Provides a clear "Back to compare" escape hatch.
 */
import { useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { GraduationPlanCard } from '@/components/plan/GraduationPlanCard';
import { SavePlanCTA } from '@/components/plan/SavePlanCTA';
import { logEvent } from '@/lib/analytics';

export default function PlanPreviewPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const [searchParams] = useSearchParams();
  const careerId = searchParams.get('career');

  // Preserve compare state (goal, picker, career) on the back link so the
  // user lands back on the exact same comparison they were exploring.
  const compareQs = new URLSearchParams();
  ['goal', 'picker', 'career'].forEach((k) => {
    const v = searchParams.get(k);
    if (v) compareQs.set(k, v);
  });
  const compareHref = compareQs.toString() ? `/compare?${compareQs.toString()}` : '/compare';

  useEffect(() => {
    if (!templateId) return;
    logEvent('plan_preview_viewed', {
      template_id: templateId,
      career_id: careerId,
      ref: searchParams.get('ref'),
    });
  }, [templateId, careerId, searchParams]);

  if (!templateId) {
    return <Navigate to="/compare" replace />;
  }

  return (
    <>
      <Helmet>
        <title>Your Path Preview | Pivot</title>
        <meta
          name="description"
          content="Preview your full graduation plan before committing. See cost, time to degree, and what to take next."
        />
      </Helmet>

      <div className="container mx-auto px-4 py-8 lg:py-10 max-w-4xl space-y-6">
        {/* Back to compare */}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="gap-1.5 -ml-2 text-muted-foreground"
        >
          <Link to={compareHref}>
            <ArrowLeft className="h-4 w-4" />
            Back to compare
          </Link>
        </Button>

        {/* Decisive header */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wider text-primary font-semibold">
            Your selection
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            This could be your path.
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Here's exactly what completing this degree looks like. When you're ready,
            lock it in and we'll start tracking your progress.
          </p>
        </div>

        {/* The closer card in preview mode */}
        <GraduationPlanCard templateId={templateId} previewCareerId={careerId} />

        {/* Day-2 funnel closer: capture email + magic-link back to this URL */}
        <SavePlanCTA templateId={templateId} careerId={careerId} />

        <p className="text-xs text-muted-foreground leading-relaxed pt-2">
          Costs, timelines, and transfer estimates are based on published institutional
          policies and provider pricing at the time we last verified them. Policies
          change and final credit decisions are always made by the institution —
          confirm with an admissions advisor before purchasing courses or enrolling.
        </p>
      </div>
    </>
  );
}
