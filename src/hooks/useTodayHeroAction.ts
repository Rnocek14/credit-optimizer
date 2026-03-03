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

export interface HeroAction {
  title: string;
  subtitle: string;
  ctaLabel: string;
  to: string;
  reasonCode: 'has-plan' | 'no-plan';
}

export function useTodayHeroAction(): { hero: HeroAction; isLoading: boolean } {
  const { data: activePlan, isLoading } = useActivePlan();

  let hero: HeroAction;

  if (activePlan) {
    hero = {
      title: 'Continue your degree plan',
      subtitle: activePlan.name
        ? `Pick up where you left off on "${activePlan.name}".`
        : 'Pick up where you left off.',
      ctaLabel: 'Open Plan',
      to: '/plan',
      reasonCode: 'has-plan',
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

  return { hero, isLoading };
}
