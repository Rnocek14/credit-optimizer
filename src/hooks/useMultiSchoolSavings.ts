import { useMemo } from 'react';
import { useMarketplaceTemplates } from '@/hooks/useMarketplaceTemplates';
import type { MarketplaceDegreeTemplate } from '@/pages/EduTree/v5/types/templates';

export interface SchoolCostComparison {
  school: string;
  cost: number;
  weeks: number;
  savingsVsCheapest: number;
  percentMoreExpensive: number;
  timeDiffVsFastest: number; // weeks
  isCheapest: boolean;
  isFastest: boolean;
}

export interface MultiSchoolSavingsData {
  cheapestSchool: string;
  cheapestCost: number;
  fastestSchool: string;
  fastestWeeks: number;
  maxSavings: number; // Max savings available by choosing cheapest
  maxTimeSaved: number; // Max weeks saved by choosing fastest
  comparisons: SchoolCostComparison[];
  byProgram: Record<string, {
    cheapestSchool: string;
    cheapestCost: number;
    savings: number; // vs most expensive option
    templates: MarketplaceDegreeTemplate[];
  }>;
}

/**
 * Hook to calculate multi-school cost savings
 * Compares costs across all available templates and returns savings data
 */
export function useMultiSchoolSavings() {
  const { data: templates, isLoading } = useMarketplaceTemplates();

  const savingsData = useMemo<MultiSchoolSavingsData | null>(() => {
    if (!templates || templates.length === 0) return null;

    // Group templates by anchor school
    const bySchool = templates.reduce((acc, t) => {
      const school = t.anchorSchool;
      if (!acc[school]) acc[school] = [];
      acc[school].push(t);
      return acc;
    }, {} as Record<string, MarketplaceDegreeTemplate[]>);

    // Get the cheapest template per school (for overall comparison)
    const schoolCosts = Object.entries(bySchool).map(([school, schoolTemplates]) => {
      const cheapest = schoolTemplates.reduce((min, t) => 
        t.totals.costUsd < min.totals.costUsd ? t : min
      );
      const fastest = schoolTemplates.reduce((min, t) => 
        t.totals.weeks < min.totals.weeks ? t : min
      );
      return {
        school,
        cheapestCost: cheapest.totals.costUsd,
        fastestWeeks: fastest.totals.weeks,
      };
    });

    if (schoolCosts.length === 0) return null;

    // Find overall cheapest and fastest
    const overallCheapest = schoolCosts.reduce((min, s) => 
      s.cheapestCost < min.cheapestCost ? s : min
    );
    const overallFastest = schoolCosts.reduce((min, s) => 
      s.fastestWeeks < min.fastestWeeks ? s : min
    );

    // Calculate comparisons
    const comparisons: SchoolCostComparison[] = schoolCosts.map(s => ({
      school: s.school,
      cost: s.cheapestCost,
      weeks: s.fastestWeeks,
      savingsVsCheapest: s.cheapestCost - overallCheapest.cheapestCost,
      percentMoreExpensive: overallCheapest.cheapestCost > 0 
        ? Math.round(((s.cheapestCost - overallCheapest.cheapestCost) / overallCheapest.cheapestCost) * 100)
        : 0,
      timeDiffVsFastest: s.fastestWeeks - overallFastest.fastestWeeks,
      isCheapest: s.school === overallCheapest.school,
      isFastest: s.school === overallFastest.school,
    }));

    // Calculate max savings (difference between cheapest and most expensive)
    const maxCost = Math.max(...schoolCosts.map(s => s.cheapestCost));
    const maxSavings = maxCost - overallCheapest.cheapestCost;

    // Calculate max time saved
    const maxWeeks = Math.max(...schoolCosts.map(s => s.fastestWeeks));
    const maxTimeSaved = maxWeeks - overallFastest.fastestWeeks;

    // Group by program for program-specific comparisons
    const byProgram = templates.reduce((acc, t) => {
      const programId = t.programId;
      if (!acc[programId]) {
        acc[programId] = { templates: [] };
      }
      acc[programId].templates.push(t);
      return acc;
    }, {} as Record<string, { templates: MarketplaceDegreeTemplate[] }>);

    // Calculate cheapest per program
    const programComparisons = Object.entries(byProgram).reduce((acc, [programId, data]) => {
      const cheapest = data.templates.reduce((min, t) => 
        t.totals.costUsd < min.totals.costUsd ? t : min
      );
      const mostExpensive = data.templates.reduce((max, t) => 
        t.totals.costUsd > max.totals.costUsd ? t : max
      );
      
      acc[programId] = {
        cheapestSchool: cheapest.anchorSchool,
        cheapestCost: cheapest.totals.costUsd,
        savings: mostExpensive.totals.costUsd - cheapest.totals.costUsd,
        templates: data.templates,
      };
      return acc;
    }, {} as Record<string, { cheapestSchool: string; cheapestCost: number; savings: number; templates: MarketplaceDegreeTemplate[] }>);

    return {
      cheapestSchool: overallCheapest.school,
      cheapestCost: overallCheapest.cheapestCost,
      fastestSchool: overallFastest.school,
      fastestWeeks: overallFastest.fastestWeeks,
      maxSavings,
      maxTimeSaved,
      comparisons,
      byProgram: programComparisons,
    };
  }, [templates]);

  return { savingsData, isLoading };
}

/**
 * Format currency for display
 */
export function formatSavings(amount: number): string {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

/**
 * Format weeks as months for display
 */
export function formatWeeksAsMonths(weeks: number): string {
  const months = Math.round(weeks / 4.33);
  return `${months}mo`;
}
