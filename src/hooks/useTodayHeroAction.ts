/**
 * useTodayHeroAction — deterministic "what should I do next?" decision tree.
 *
 * Priority order:
 *   A. activePlan exists → "Continue your plan"
 *   B. No plan → "Start your degree plan" (marketplace)
 *
 * Note: Onboarding gating is handled by ProtectedRoute (requireOnboarding).
 * We still include a defensive branch in case route guards change.
 */
import { useActivePlan } from '@/hooks/useActivePlan';
import { usePlanProgress } from '@/hooks/usePlanProgress';

export interface HeroAction {
  title: string;
  subtitle: string;
  ctaLabel: string;
  to: string;
  reasonCode: 'has-plan' | 'no-plan';
  /** Optional progress string, e.g. "42% complete" */
  progressLabel?: string;
}

export function useTodayHeroAction(): { hero: HeroAction; isLoading: boolean } {
  const { data: activePlan, isLoading: planLoading } = useActivePlan();
  const { data: progress } = usePlanProgress(activePlan?.id);

  let hero: HeroAction;

  if (activePlan) {
    const planName = activePlan.name || 'your degree plan';
    let progressLabel: string | undefined;
    if (progress && progress.total > 0) {
      if (progress.completed === 0 && progress.enrolled > 0) {
        progressLabel = `In progress · 0/${progress.total} complete`;
      } else {
        progressLabel = `${progress.percent}% complete · ${progress.completed}/${progress.total} courses`;
      }
    }

    hero = {
      title: `Continue ${planName}`,
      subtitle: 'Pick up where you left off.',
      ctaLabel: 'Open Plan',
      to: '/plan',
      reasonCode: 'has-plan',
      progressLabel,
    };
  } else {
    hero = {
      title: 'Start your degree plan',
      subtitle: 'Browse optimized templates and build your path to graduation.',
      ctaLabel: 'Browse Plans',
      to: '/edu-tree-v5/marketplace',
      reasonCode: 'no-plan',
    };
  }

  return { hero, isLoading: planLoading };
}
