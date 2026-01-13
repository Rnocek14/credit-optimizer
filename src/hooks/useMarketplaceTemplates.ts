import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MarketplaceDegreeTemplate, MarketplaceFilters, YearTemplate } from '@/pages/EduTree/v5/types/templates';
import marketplaceFixtures from '@/fixtures/templates/marketplace-v2-templates.json';

interface DegreeTemplateRow {
  id: string;
  institution_code: string;
  program_code: string;
  track_type: string;
  total_credits: number;
  estimated_cost: number | null;
  estimated_duration_months: number | null;
  template_data: Record<string, unknown> | null;
}

/**
 * Transform a database row to MarketplaceDegreeTemplate format
 */
function transformToMarketplaceTemplate(row: DegreeTemplateRow): MarketplaceDegreeTemplate {
  const templateData = (row.template_data || {}) as Record<string, unknown>;
  const optimization = row.track_type === 'alt_max' ? 'alt-credit' : 'standard';
  const now = new Date().toISOString();
  
  // Try to extract yearTemplates from template_data
  const yearTemplates = (templateData.yearTemplates as YearTemplate[]) || [];
  
  return {
    id: row.id,
    kind: 'degree',
    programId: row.program_code,
    anchorSchool: row.institution_code,
    optimization,
    label: `${row.program_code} @ ${row.institution_code} • ${row.track_type === 'alt_max' ? 'Alt-Credit Max' : 'Standard'}`,
    summary: (templateData.summary as string) || `${row.program_code} degree at ${row.institution_code}`,
    badge: row.track_type === 'alt_max' ? 'Cheapest' : undefined,
    catalogYear: (templateData.catalogYear as string) || '2025',
    policyVersion: (templateData.policyVersion as string) || `${row.institution_code}-2025-v1`,
    generatedAt: (templateData.generatedAt as string) || now,
    lastVerified: (templateData.lastVerified as string) || now,
    marketplace: {
      title: row.track_type === 'alt_max' 
        ? `Budget ${row.program_code} Degree` 
        : `${row.program_code} Degree`,
      tagline: `${row.program_code} at ${row.institution_code}`,
      badge: row.track_type === 'alt_max' ? 'Cheapest' : undefined,
      isPremium: false,
    },
    lifestyle: (templateData.lifestyle as MarketplaceDegreeTemplate['lifestyle']) || {
      avgWeeklyHours: 15,
      paceType: 'flexible',
      workCompatible: true,
    },
    primaryCareerIds: (templateData.primaryCareerIds as string[]) || ['business-analyst', 'manager'],
    deliveryMode: 'fully_online',
    inPersonWeeks: 0,
    socialProof: {
      popularityScore: 4.0,
      dataSource: 'simulated',
    },
    totals: {
      credits: row.total_credits,
      costUsd: row.estimated_cost || 0,
      weeks: (row.estimated_duration_months || 24) * 4.33,
    },
    yearTemplates,
    targetSchool: row.institution_code,
    transferVerified: true,
    est: {
      costUsd: row.estimated_cost || 0,
      weeks: (row.estimated_duration_months || 24) * 4.33,
      credits: row.total_credits,
      cri: 75,
      workloadHours: 15,
    },
    singleSchoolBaseline: (templateData.singleSchoolBaseline as MarketplaceDegreeTemplate['singleSchoolBaseline']) || {
      costUsd: row.estimated_cost ? row.estimated_cost * 1.5 : 15000,
      weeks: (row.estimated_duration_months || 24) * 4.33 * 1.2,
      source: `${row.institution_code} Direct`,
    },
  };
}

/**
 * Hook to fetch and filter marketplace templates
 * Fetches from database, merges with fixtures for rich data
 */
export function useMarketplaceTemplates(filters?: Partial<MarketplaceFilters>) {
  return useQuery({
    queryKey: ['marketplace-templates', filters],
    queryFn: async () => {
      // Fetch templates from database
      const { data: dbRows, error } = await supabase
        .from('degree_templates')
        .select('id, institution_code, program_code, track_type, total_credits, estimated_cost, estimated_duration_months, template_data')
        .eq('program_code', 'BSBA');
      
      if (error) {
        console.error('[useMarketplaceTemplates] DB error:', error);
        throw error;
      }
      
      // Create a map of fixtures by anchorSchool + optimization for rich data lookup
      const fixtureMap = new Map<string, MarketplaceDegreeTemplate>();
      (marketplaceFixtures as unknown as MarketplaceDegreeTemplate[]).forEach(t => {
        const key = `${t.anchorSchool}-${t.optimization}`;
        fixtureMap.set(key, t);
      });
      
      // Transform DB rows, using fixture data when available for rich content
      let templates: MarketplaceDegreeTemplate[] = (dbRows || []).map((row) => {
        const typedRow = row as unknown as DegreeTemplateRow;
        const optimization = typedRow.track_type === 'alt_max' ? 'alt-credit' : 'standard';
        const fixtureKey = `${typedRow.institution_code}-${optimization}`;
        const fixture = fixtureMap.get(fixtureKey);
        
        if (fixture) {
          // Use rich fixture data but update with DB values for cost/credits
          return {
            ...fixture,
            id: typedRow.id, // Use DB id for consistency
            totals: {
              ...fixture.totals,
              credits: typedRow.total_credits,
              costUsd: typedRow.estimated_cost || fixture.totals.costUsd,
            },
          };
        }
        
        // No fixture - transform DB row directly
        return transformToMarketplaceTemplate(typedRow);
      });
      
      console.log('[useMarketplaceTemplates] Loaded', templates.length, 'templates from DB');

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
      // First try to fetch from database
      const { data: dbRow, error } = await supabase
        .from('degree_templates')
        .select('id, institution_code, program_code, track_type, total_credits, estimated_cost, estimated_duration_months, template_data')
        .eq('id', templateId)
        .maybeSingle();
      
      if (error) {
        console.error('[useMarketplaceTemplate] DB error:', error);
      }
      
      if (dbRow) {
        const typedRow = dbRow as unknown as DegreeTemplateRow;
        const optimization = typedRow.track_type === 'alt_max' ? 'alt-credit' : 'standard';
        const fixtureKey = `${typedRow.institution_code}-${optimization}`;
        
        // Check if we have rich fixture data
        const fixtures = marketplaceFixtures as unknown as MarketplaceDegreeTemplate[];
        const fixture = fixtures.find(t => 
          t.anchorSchool === typedRow.institution_code && t.optimization === optimization
        );
        
        if (fixture) {
          return {
            ...fixture,
            id: typedRow.id,
            totals: {
              ...fixture.totals,
              credits: typedRow.total_credits,
              costUsd: typedRow.estimated_cost || fixture.totals.costUsd,
            },
          };
        }
        
        return transformToMarketplaceTemplate(typedRow);
      }
      
      // Fallback to fixtures for backwards compatibility
      const fixtures = marketplaceFixtures as unknown as MarketplaceDegreeTemplate[];
      const template = fixtures.find(t => t.id === templateId);
      
      if (!template) {
        console.warn(`[useMarketplaceTemplate] Template not found: ${templateId}`);
        return null;
      }
      
      return template;
    },
    enabled: !!templateId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
