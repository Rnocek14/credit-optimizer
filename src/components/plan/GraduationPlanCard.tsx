/**
 * GraduationPlanCard — the "closer" for /plan and /plan/preview.
 *
 * Two modes:
 *   - **active mode** (default): renders the user's saved plan with progress,
 *     next-actions, and an "Open Planner" CTA.
 *   - **preview mode** (when `templateId` prop provided): renders the same
 *     story for a template the user is *considering* — no progress bar,
 *     no next-actions list, primary CTA becomes "Make this my plan".
 *
 * Answers 6 questions on one screen:
 *   1. What degree am I finishing?
 *   2. At which school?
 *   3. How much will it cost?
 *   4. How long will it take?
 *   5. What do I take next?              (active mode only)
 *   6. Why is this the best path?
 *
 * Composition-only: reuses existing DAL. No schema changes.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  GraduationCap,
  School,
  DollarSign,
  Clock,
  ArrowRight,
  CheckCircle2,
  Circle,
  PlayCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useActivePlan } from '@/hooks/useActivePlan';
import { useDegreeProgress } from '@/hooks/useDegreeProgress';
import { useTargetCareer } from '@/hooks/useTargetCareer';
import { fetchPlanCoursesWithProvider, createUserPlan } from '@/shared/lib/api/userPlans';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/auth';
import { toast } from 'sonner';

interface NextAction {
  id: string;
  title: string;
  provider: string | null;
  credits: number | null;
  status: string | null;
}

interface PlanContext {
  schoolName: string | null;
  programName: string | null;
  baselineCostUsd: number | null;
  baselineWeeks: number | null;
  savingsUsd: number | null;
  institutionCode: string | null;
}

interface GraduationPlanCardProps {
  /**
   * Preview mode — render this template instead of the active plan.
   * Adds a "Make this my plan" CTA that creates the plan and navigates to /plan.
   */
  templateId?: string;
  /** Optional career id to attach to the new plan when committing in preview mode. */
  previewCareerId?: string | null;
}

/**
 * Looks up institution + program context + cost baseline for either
 * an active plan's program_id OR an explicit templateId (preview mode).
 */
function usePlanContext(programId: string | null | undefined) {
  return useQuery({
    queryKey: ['plan-context', programId],
    queryFn: async (): Promise<PlanContext> => {
      const result: PlanContext = {
        schoolName: null,
        programName: null,
        baselineCostUsd: null,
        baselineWeeks: null,
        savingsUsd: null,
        institutionCode: null,
      };

      if (!programId || programId === 'default') return result;

      // 1. Try template_with_costs by template_id (UUID case)
      const isUuid = /^[0-9a-f-]{36}$/i.test(programId);
      if (isUuid) {
        const { data: tpl } = await supabase
          .from('template_with_costs')
          .select(
            'institution_code, program_code, plan_cost_usd, plan_weeks, savings_usd',
          )
          .eq('template_id', programId)
          .maybeSingle();
        if (tpl) {
          result.baselineCostUsd = (tpl as any).plan_cost_usd ?? null;
          result.baselineWeeks = (tpl as any).plan_weeks ?? null;
          result.savingsUsd = (tpl as any).savings_usd ?? null;
          result.programName = (tpl as any).program_code ?? null;
          result.institutionCode = (tpl as any).institution_code ?? null;

          const code = (tpl as any).institution_code as string | null;
          if (code) {
            const { data: inst } = await supabase
              .from('institutions')
              .select('name')
              .eq('code', code)
              .maybeSingle();
            result.schoolName = (inst as any)?.name ?? code;
          }
          return result;
        }
      }

      // 2. Fallback: program_id may itself be an institution code (e.g. "TESU")
      const { data: inst } = await supabase
        .from('institutions')
        .select('name, code')
        .eq('code', programId.toUpperCase())
        .maybeSingle();
      if (inst) {
        result.schoolName = (inst as any).name ?? (inst as any).code;
        result.institutionCode = (inst as any).code ?? null;
      }

      return result;
    },
    enabled: !!programId,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Fetches up to 3 next-action courses from the plan: planned/enrolled, ordered.
 */
function useNextActions(planId: string | null | undefined) {
  return useQuery({
    queryKey: ['plan-next-actions', planId],
    queryFn: async (): Promise<NextAction[]> => {
      const rows = await fetchPlanCoursesWithProvider(planId!);
      const enrolled = rows.filter((r) => r.status === 'enrolled');
      const planned = rows.filter((r) => r.status === 'planned' || r.status === null);
      return [...enrolled, ...planned].slice(0, 3).map((r) => ({
        id: r.id,
        title: r.course_title ?? 'Untitled course',
        provider: r.provider_code,
        credits: r.course_credits,
        status: r.status,
      }));
    },
    enabled: !!planId,
    staleTime: 2 * 60 * 1000,
  });
}

function pickSavings(verifiedSavings: number | null): number | null {
  if (verifiedSavings != null && verifiedSavings > 0) return verifiedSavings;
  return null;
}

export function GraduationPlanCard({ templateId, previewCareerId }: GraduationPlanCardProps = {}) {
  const isPreview = !!templateId;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: activePlan } = useActivePlan();
  const { data: targetCareer } = useTargetCareer(
    isPreview ? previewCareerId ?? null : activePlan?.target_career_id,
  );

  // In preview mode, drive everything off the templateId.
  // In active mode, drive off the active plan's program_id.
  const programId = isPreview ? templateId : activePlan?.program_id;
  const { data: ctx } = usePlanContext(programId);

  const { data: progress, isLoading: progressLoading } = useDegreeProgress();
  const { data: nextActions = [] } = useNextActions(isPreview ? null : activePlan?.id);

  // Commit mutation (preview mode only)
  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!templateId) throw new Error('No template selected');
      const user = await getCurrentUser();
      if (!user?.id) throw new Error('Not authenticated');
      const planName =
        ctx?.programName && ctx?.schoolName
          ? `${ctx.schoolName} — ${ctx.programName}`
          : ctx?.schoolName ?? 'My Degree Plan';
      return createUserPlan(user.id, planName, templateId, previewCareerId ?? null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edutree', 'active-plan'] });
      toast.success('Your plan is locked in.');
      navigate('/plan');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Could not save plan');
    },
  });

  // Active mode requires an active plan; preview mode requires templateId only.
  if (!isPreview && !activePlan) return null;
  if (isPreview && !templateId) return null;

  const percent = isPreview ? null : progress?.percent ?? 0;
  const creditsEarned = isPreview ? null : progress?.creditsEarned ?? 0;
  const creditsRequired = isPreview ? null : progress?.creditsRequired ?? null;
  const creditsRemaining =
    !isPreview && creditsRequired != null
      ? Math.max(0, creditsRequired - (progress?.creditsEarned ?? 0))
      : null;

  const projectedCost = ctx?.baselineCostUsd ?? null;
  const projectedWeeks = ctx?.baselineWeeks ?? null;
  const savings = pickSavings(ctx?.savingsUsd ?? null);

  const schoolName = ctx?.schoolName ?? 'Your school';
  const degreeName = ctx?.programName ?? activePlan?.name ?? 'Degree Plan';

  return (
    <Card className="border-primary/30 shadow-elevation overflow-hidden">
      {/* Header — what + where */}
      <CardHeader className="bg-gradient-to-br from-primary/10 to-primary/5 border-b">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-primary/15 shrink-0">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-medium mb-1">
                {isPreview ? 'You selected' : 'Your graduation plan'}
              </p>
              <h2 className="text-xl font-bold truncate">{degreeName}</h2>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <School className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{schoolName}</span>
                {targetCareer && (
                  <>
                    <span className="mx-1">·</span>
                    <span className="truncate">→ {targetCareer.title}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Badge variant={isPreview ? 'secondary' : 'default'} className="shrink-0">
            {isPreview ? 'Preview' : 'Active'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Progress bar — active mode only */}
        {!isPreview && (
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-sm font-medium">
                {progressLoading ? (
                  <span className="text-muted-foreground">Loading progress…</span>
                ) : creditsRequired ? (
                  <>
                    <span className="text-2xl font-bold">{creditsEarned}</span>
                    <span className="text-muted-foreground"> / {creditsRequired} credits</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    {creditsEarned} credits earned
                  </span>
                )}
              </p>
              <p className="text-sm font-semibold text-primary">{percent}%</p>
            </div>
            <Progress value={percent ?? 0} className="h-2" />
            {creditsRemaining != null && creditsRemaining > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {creditsRemaining} credits remaining to graduation
              </p>
            )}
          </div>
        )}

        {/* Cost + Time strip */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              {isPreview ? 'Total projected cost' : 'Projected total cost'}
            </div>
            {projectedCost != null ? (
              <>
                <p className="text-2xl font-bold">
                  ${projectedCost.toLocaleString()}
                </p>
                {savings && (
                  <p className="text-xs text-success-foreground mt-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Saves ~${savings.toLocaleString()} vs sticker
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">Not yet computed</p>
            )}
          </div>

          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Clock className="h-3.5 w-3.5" />
              Time to finish
            </div>
            {projectedWeeks != null ? (
              <>
                <p className="text-2xl font-bold">
                  {Math.round(projectedWeeks / 4)} <span className="text-base font-normal text-muted-foreground">months</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ~{projectedWeeks} weeks at full pace
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">Not yet computed</p>
            )}
          </div>
        </div>

        {/* Next actions — active mode only */}
        {!isPreview && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <PlayCircle className="h-4 w-4 text-primary" />
              What to take next
            </h3>
            {nextActions.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  No upcoming courses planned yet.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link to={`/edu-tree-v6?planId=${activePlan!.id}`}>
                    Open Planner to add courses
                  </Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-2">
                {nextActions.map((action, idx) => (
                  <li
                    key={action.id}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="shrink-0">
                      {action.status === 'enrolled' ? (
                        <PlayCircle className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {idx + 1}. {action.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {action.provider ?? 'Provider TBD'}
                        {action.credits ? ` · ${action.credits} credits` : ''}
                        {action.status === 'enrolled' && ' · Enrolled'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Why this is the best path */}
        <div className="rounded-lg bg-muted/40 border p-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Why this is your best path
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            {projectedCost != null && (
              <li>
                ✓ Lowest verified cost path among comparable accredited programs
              </li>
            )}
            <li>
              ✓ Catalog-verified transfer rules — no surprise rejections
            </li>
            {targetCareer && (
              <li>
                ✓ Aligned with your career goal: {targetCareer.title}
              </li>
            )}
            <li>
              ✓ Built from your real credits, not a generic template
            </li>
          </ul>
        </div>

        {/* Primary CTA — differs by mode */}
        {isPreview ? (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              size="lg"
              className="flex-1"
              onClick={() => commitMutation.mutate()}
              disabled={commitMutation.isPending}
            >
              {commitMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving your plan…
                </>
              ) : (
                <>
                  Make this my plan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/compare">Compare other options</Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button asChild className="flex-1" size="lg">
              <Link to={`/edu-tree-v6?planId=${activePlan!.id}`}>
                Open Planner
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/compare">Compare alternatives</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
