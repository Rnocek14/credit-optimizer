/**
 * useTodayHeroAction — deterministic "what should I do next?" decision tree.
 *
 * Priority order:
 *   A. No active plan → "Start your degree plan"
 *   B. Active plan exists → "Continue your plan"
 *   C. Fallback → "Explore careers"
 *
 * Returns a single hero action object for rendering.
 */
import { useQuery } from '@tanstack/react-query';
import { fetchHasActivePlan } from '@/shared/lib/api/userPlans';
import { useActivePlan } from '@/hooks/useActivePlan';
import { useSecureAuth } from '@/hooks/useSecureAuth';

export interface HeroAction {
  title: string;
  subtitle: string;
  ctaLabel: string;
  to: string;
  reasonCode: 'no-plan' | 'has-plan' | 'fallback';
}

export function useTodayHeroAction(): { hero: HeroAction; isLoading: boolean } {
  const { user } = useSecureAuth();
  const { data: activePlan, isLoading: planLoading } = useActivePlan();

  const { data: hasActivePlan = false, isLoading: checkLoading } = useQuery({
    queryKey: ['has-active-plan', user?.id],
    queryFn: () => fetchHasActivePlan(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const isLoading = planLoading || checkLoading;

  let hero: HeroAction;

  if (!hasActivePlan) {
    hero = {
      title: 'Start your degree plan',
      subtitle: 'Browse optimized templates and build your path to graduation.',
      ctaLabel: 'Browse Plans',
      to: '/edu-tree-v5/marketplace',
      reasonCode: 'no-plan',
    };
  } else if (activePlan) {
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
      title: 'Explore careers',
      subtitle: 'Discover career paths and find the right fit for you.',
      ctaLabel: 'Explore',
      to: '/discover',
      reasonCode: 'fallback',
    };
  }

  return { hero, isLoading };
}
