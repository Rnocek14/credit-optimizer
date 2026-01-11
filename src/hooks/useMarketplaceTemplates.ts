import { useQuery } from '@tanstack/react-query';
import type { MarketplaceDegreeTemplate, MarketplaceFilters } from '@/pages/EduTree/v5/types/templates';
import marketplaceTemplates from '@/fixtures/templates/marketplace-v2-templates.json';

/**
 * Hook to fetch and filter marketplace templates
 * V1: Uses static fixtures, V2+ will query database
 */
export function useMarketplaceTemplates(filters?: Partial<MarketplaceFilters>) {
  return useQuery({
    queryKey: ['marketplace-templates', filters],
    queryFn: async () => {
      // Load templates from fixtures
      let templates = marketplaceTemplates as unknown as MarketplaceDegreeTemplate[];

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
 * Returns null if template not found (doesn't throw)
 */
export function useMarketplaceTemplate(templateId: string) {
  return useQuery({
    queryKey: ['marketplace-template', templateId],
    queryFn: async () => {
      const templates = marketplaceTemplates as unknown as MarketplaceDegreeTemplate[];
      const template = templates.find(t => t.id === templateId);
      
      if (!template) {
        console.warn(`[useMarketplaceTemplate] Template not found: ${templateId}`);
        console.log('[useMarketplaceTemplate] Available templates:', templates.map(t => t.id));
        return null;
      }
      
      return template;
    },
    enabled: !!templateId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
