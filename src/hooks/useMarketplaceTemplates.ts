import { useQuery } from '@tanstack/react-query';
import type { MarketplaceDegreeTemplate, MarketplaceFilters } from '@/pages/EduTree/v5/types/templates';
import type { MarketplaceOption } from '@/pages/EduTree/v5/types/v5';
import marketplaceTemplates from '@/fixtures/templates/marketplace-v1-templates.json';

/**
 * Normalize MarketplaceOption to ensure all required fields exist
 * Prevents "Cannot read properties of undefined" errors
 */
function normalizeOption(option: any): MarketplaceOption {
  return {
    ...option,
    credits: option.credits ?? 0,
    cost_usd: option.cost_usd ?? null,
    duration_weeks: option.duration_weeks ?? null,
    level: option.level ?? 0,
  };
}

/**
 * Normalize template to ensure all nested options are valid
 */
function normalizeTemplate(template: any): MarketplaceDegreeTemplate {
  try {
    return {
      ...template,
      yearTemplates: (template.yearTemplates || []).map((year: any) => ({
        ...year,
        moduleTemplates: (year.moduleTemplates || []).map((module: any) => ({
          ...module,
          options: (module.options || []).map(normalizeOption),
        })),
      })),
    };
  } catch (error) {
    console.error(`Failed to normalize template ${template.id}:`, error);
    return template;
  }
}

/**
 * Hook to fetch and filter marketplace templates
 * V1: Uses static fixtures, V2+ will query database
 */
export function useMarketplaceTemplates(filters?: Partial<MarketplaceFilters>) {
  return useQuery({
    queryKey: ['marketplace-templates', filters],
    queryFn: async () => {
      // Load and normalize templates from fixtures
      let templates = (marketplaceTemplates as unknown as any[]).map(normalizeTemplate);

      // Apply filters
      if (filters) {
        templates = templates.filter(template => {
          // Filter by career IDs
          if (filters.careerIds && filters.careerIds.length > 0) {
            const hasMatchingCareer = template.primaryCareerIds.some(careerId =>
              filters.careerIds!.includes(careerId)
            );
            if (!hasMatchingCareer) return false;
          }

          // Filter by budget range
          if (filters.budgetRange) {
            const [min, max] = filters.budgetRange;
            if (template.totals.costUsd < min || template.totals.costUsd > max) {
              return false;
            }
          }

          // Filter by time range (convert weeks to months)
          if (filters.timeRange) {
            const [minMonths, maxMonths] = filters.timeRange;
            const templateMonths = Math.round(template.totals.weeks / 4.33);
            if (templateMonths < minMonths || templateMonths > maxMonths) {
              return false;
            }
          }

          // Filter by weekly hours
          if (filters.weeklyHoursRange) {
            const [min, max] = filters.weeklyHoursRange;
            if (template.lifestyle.avgWeeklyHours < min || template.lifestyle.avgWeeklyHours > max) {
              return false;
            }
          }

          // Filter by delivery mode
          if (filters.deliveryMode && filters.deliveryMode !== 'all') {
            if (filters.deliveryMode === 'fully_online' && template.deliveryMode !== 'fully_online') {
              return false;
            }
            if (filters.deliveryMode === 'hybrid' && template.deliveryMode !== 'hybrid') {
              return false;
            }
          }

          // Filter by anchor schools
          if (filters.anchorSchools && filters.anchorSchools.length > 0) {
            if (!filters.anchorSchools.includes(template.anchorSchool)) {
              return false;
            }
          }

          return true;
        });

        // Sort templates
        if (filters.sortBy) {
          templates = [...templates].sort((a, b) => {
            switch (filters.sortBy) {
              case 'cost':
                return a.totals.costUsd - b.totals.costUsd;
              case 'time':
                return a.totals.weeks - b.totals.weeks;
              case 'popularity':
                return b.socialProof.popularityScore - a.socialProof.popularityScore;
              case 'roi':
                // Simple ROI: lower cost + faster time = better ROI
                const roiA = a.totals.costUsd / a.totals.weeks;
                const roiB = b.totals.costUsd / b.totals.weeks;
                return roiA - roiB;
              default:
                return 0;
            }
          });
        }
      }

      return templates;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get a single template by ID
 */
export function useMarketplaceTemplate(templateId: string) {
  return useQuery({
    queryKey: ['marketplace-template', templateId],
    queryFn: async () => {
      const templates = (marketplaceTemplates as unknown as any[]).map(normalizeTemplate);
      const template = templates.find(t => t.id === templateId);
      
      if (!template) {
        throw new Error(`Template not found: ${templateId}`);
      }
      
      return template;
    },
    enabled: !!templateId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
