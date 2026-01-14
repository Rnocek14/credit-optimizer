import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MarketplaceDegreeTemplate, MarketplaceFilters, YearTemplate, ModuleTemplate } from '@/pages/EduTree/v5/types/templates';
import type { MarketplaceOption } from '@/pages/EduTree/v5/types/v5';
import type { TemplateTerm, TemplateSlot, TemplateCourseOption } from '@/types/degreeTemplates';
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

interface BaselineSnapshot {
  template_id: string;
  institution_code: string;
  baseline_cost_usd: number;
  baseline_weeks: number;
  baseline_status: 'verified' | 'estimated' | 'missing';
  source_description: string;
  inputs: Record<string, unknown>;
  computed_at: string;
}

/**
 * Convert a template slot option to a MarketplaceOption
 */
function slotOptionToMarketplaceOption(
  opt: TemplateCourseOption, 
  slotId: string, 
  requirementArea: string,
  minCredits: number,
  index: number
): MarketplaceOption {
  if (opt.type === 'alt_credit') {
    const altOpt = opt as { sourceCode?: string; identifier?: string };
    const identifier = altOpt.identifier || '';
    const sourceCode = altOpt.sourceCode || 'SOPHIA';
    return {
      id: `${slotId}-alt-${index}`,
      courseId: identifier,
      title: identifier.replace(/_/g, ' '),
      credits: minCredits,
      subject: requirementArea,
      provider: sourceCode,
      providerCode: sourceCode,
      providerType: 'testing_center',
      cost_usd: sourceCode === 'SOPHIA' ? 99 : sourceCode === 'CLEP' ? 90 : 150,
      duration_weeks: 4,
      pace_type: 'self_paced',
      satisfies_requirements: [requirementArea],
      cri_score: 75,
      aceNccrs: true,
      proctored: sourceCode === 'CLEP' || sourceCode === 'DSST',
    };
  }
  
  // Institutional course
  const instOpt = opt as { courseCode?: string };
  const courseCode = instOpt.courseCode || '';
  return {
    id: `${slotId}-inst-${index}`,
    courseId: courseCode,
    title: courseCode.replace(/-/g, ' '),
    credits: minCredits,
    subject: requirementArea,
    provider: 'Institution',
    providerCode: null,
    providerType: 'university',
    cost_usd: 300 * minCredits, // Estimated per-credit cost
    duration_weeks: 8,
    pace_type: 'cohort',
    satisfies_requirements: [requirementArea],
    cri_score: 85,
  };
}

/**
 * Convert database terms (from seed-bsba-templates) to YearTemplate format for UI
 * Groups terms by year and converts slots to modules
 */
function termsToYearTemplates(terms: TemplateTerm[]): YearTemplate[] {
  if (!terms || terms.length === 0) return [];
  
  // Group terms by year (y1-t1, y1-t2 → Year 1, etc.)
  const yearMap = new Map<string, { 
    year: number; 
    label: string; 
    moduleTemplates: YearTemplate['moduleTemplates'][number][];
  }>();
  
  for (const term of terms) {
    // Extract year number from term id (e.g., 'y1-t1' → 1)
    const yearMatch = term.id.match(/y(\d+)/);
    const yearNum = yearMatch ? parseInt(yearMatch[1], 10) : 1;
    const yearKey = `year-${yearNum}`;
    
    if (!yearMap.has(yearKey)) {
      yearMap.set(yearKey, { 
        year: yearNum, 
        label: `Year ${yearNum}`, 
        moduleTemplates: [] 
      });
    }
    
    // Convert each slot to a module template entry
    for (const slot of term.slots) {
      const allOptions = [slot.preferred, ...(slot.alternatives || [])];
      const options: MarketplaceOption[] = allOptions.map((opt, idx) => 
        slotOptionToMarketplaceOption(opt, slot.slotId, slot.requirementArea, slot.minCredits, idx)
      );
      
      yearMap.get(yearKey)!.moduleTemplates.push({
        moduleId: slot.slotId,
        options,
        recommendedCourseId: options[0]?.courseId,
        targetCanonicalIds: [slot.requirementArea],
      });
    }
  }
  
  // Convert map to sorted array
  return Array.from(yearMap.entries())
    .sort((a, b) => a[1].year - b[1].year)
    .map(([id, data]) => ({
      id,
      kind: 'year' as const,
      year: data.year,
      label: data.label,
      summary: `${data.moduleTemplates.length} courses`,
      targetSchool: '',
      transferVerified: true,
      moduleTemplates: data.moduleTemplates,
      est: {
        costUsd: data.moduleTemplates.reduce((sum, m) => 
          sum + (m.options[0]?.cost_usd || 0), 0),
        weeks: 26,
        credits: data.moduleTemplates.reduce((sum, m) => 
          sum + (m.options[0]?.credits || 3), 0),
        cri: 75,
        workloadHours: 15,
      },
    }));
}

/**
 * Transform a database row to MarketplaceDegreeTemplate format
 */
function transformToMarketplaceTemplate(row: DegreeTemplateRow): MarketplaceDegreeTemplate {
  const templateData = (row.template_data || {}) as Record<string, unknown>;
  const optimization = row.track_type === 'alt_max' ? 'alt-credit' : 'standard';
  const now = new Date().toISOString();
  
  // First try yearTemplates directly, then convert from terms
  let yearTemplates = (templateData.yearTemplates as YearTemplate[]) || [];
  
  if (yearTemplates.length === 0 && templateData.terms) {
    yearTemplates = termsToYearTemplates(templateData.terms as TemplateTerm[]);
    // Set targetSchool on each year/module
    yearTemplates = yearTemplates.map(yt => ({
      ...yt,
      targetSchool: row.institution_code,
      moduleTemplates: yt.moduleTemplates.map(mt => ({
        ...mt,
        targetSchool: row.institution_code,
      })),
    }));
  }
  
  // Duration: prefer plan_weeks from template_data if available (computed from pricing model)
  // Otherwise derive from estimated_duration_months (database fallback)
  const computedWeeks = (templateData.planWeeks as number) || (row.estimated_duration_months || 24) * 4.33;
  
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
      weeks: computedWeeks,
    },
    yearTemplates,
    targetSchool: row.institution_code,
    transferVerified: true,
    est: {
      costUsd: row.estimated_cost || 0,
      weeks: computedWeeks,
      credits: row.total_credits,
      cri: 75,
      workloadHours: 15,
    },
    // IMPORTANT: Only use real baseline data - never fabricate savings
    // If singleSchoolBaseline is missing, leave it null so UI hides savings display
    singleSchoolBaseline: (templateData.singleSchoolBaseline as MarketplaceDegreeTemplate['singleSchoolBaseline']) || null,
    // Set baseline status to prevent future regressions - only 'verified' shows savings
    baselineStatus: templateData.singleSchoolBaseline ? 'verified' : 'missing',
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
      
      // Fetch baseline snapshots (latest per template)
      // We use a subquery pattern via RPC or just get all and dedupe client-side
      const { data: snapshotRows, error: snapshotError } = await supabase
        .from('template_baseline_snapshots')
        .select('template_id, institution_code, baseline_cost_usd, baseline_weeks, baseline_status, source_description, inputs, computed_at')
        .order('computed_at', { ascending: false });
      
      if (snapshotError) {
        console.warn('[useMarketplaceTemplates] Snapshot fetch error (non-fatal):', snapshotError);
      }
      
      // Build map of latest snapshot per template_id
      const snapshotMap = new Map<string, BaselineSnapshot>();
      (snapshotRows || []).forEach((row) => {
        const snapshot = row as unknown as BaselineSnapshot;
        // Only keep the first (latest) snapshot per template
        if (!snapshotMap.has(snapshot.template_id)) {
          snapshotMap.set(snapshot.template_id, snapshot);
        }
      });
      
      console.log('[useMarketplaceTemplates] Loaded', snapshotMap.size, 'baseline snapshots');
      
      // Create a map of fixtures by anchorSchool + optimization for rich data lookup
      const fixtureMap = new Map<string, MarketplaceDegreeTemplate>();
      (marketplaceFixtures as unknown as MarketplaceDegreeTemplate[]).forEach(t => {
        const key = `${t.anchorSchool}-${t.optimization}`;
        fixtureMap.set(key, t);
      });
      
      // Helper to merge baseline snapshot into template
      const mergeBaseline = (template: MarketplaceDegreeTemplate, templateId: string): MarketplaceDegreeTemplate => {
        const snapshot = snapshotMap.get(templateId);
        
        if (snapshot && snapshot.baseline_status === 'verified' && snapshot.baseline_cost_usd > 0) {
          return {
            ...template,
            singleSchoolBaseline: {
              costUsd: snapshot.baseline_cost_usd,
              weeks: snapshot.baseline_weeks,
              source: snapshot.source_description,
              notes: (snapshot.inputs as Record<string, unknown>)?.assumptions as string,
            },
            baselineStatus: 'verified',
          };
        }
        
        // No valid snapshot - keep template as-is (baseline will be null/missing)
        return {
          ...template,
          singleSchoolBaseline: null,
          baselineStatus: 'missing',
        };
      };
      
      // Transform DB rows, using fixture data when available for rich content
      let templates: MarketplaceDegreeTemplate[] = (dbRows || []).map((row) => {
        const typedRow = row as unknown as DegreeTemplateRow;
        const optimization = typedRow.track_type === 'alt_max' ? 'alt-credit' : 'standard';
        const fixtureKey = `${typedRow.institution_code}-${optimization}`;
        const fixture = fixtureMap.get(fixtureKey);
        
        let template: MarketplaceDegreeTemplate;
        
        if (fixture) {
          // Use rich fixture data but update with DB values for cost/credits/weeks
          // Compute weeks from template_data.planWeeks (pricing-model-aware) or fall back to estimated_duration_months
          const templateData = typedRow.template_data || {};
          const computedWeeks = (templateData.planWeeks as number) || (typedRow.estimated_duration_months || 24) * 4.33;
          
          template = {
            ...fixture,
            id: typedRow.id, // Use DB id for consistency
            totals: {
              ...fixture.totals,
              credits: typedRow.total_credits,
              costUsd: typedRow.estimated_cost || fixture.totals.costUsd,
              weeks: computedWeeks, // CRITICAL: Use computed weeks, not fixture hardcoded value
            },
          };
        } else {
          // No fixture - transform DB row directly
          template = transformToMarketplaceTemplate(typedRow);
        }
        
        // Merge baseline from snapshot (not from template_data)
        return mergeBaseline(template, typedRow.id);
      });
      
      console.log('[useMarketplaceTemplates] Loaded', templates.length, 'templates with baselines');

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
      // Fetch template and baseline snapshot in parallel
      const [templateResult, snapshotResult] = await Promise.all([
        supabase
          .from('degree_templates')
          .select('id, institution_code, program_code, track_type, total_credits, estimated_cost, estimated_duration_months, template_data')
          .eq('id', templateId)
          .maybeSingle(),
        supabase
          .from('template_baseline_snapshots')
          .select('template_id, institution_code, baseline_cost_usd, baseline_weeks, baseline_status, source_description, inputs, computed_at')
          .eq('template_id', templateId)
          .order('computed_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);
      
      const { data: dbRow, error } = templateResult;
      const { data: snapshotRow } = snapshotResult;
      
      if (error) {
        console.error('[useMarketplaceTemplate] DB error:', error);
      }
      
      // Helper to merge baseline
      const mergeBaseline = (template: MarketplaceDegreeTemplate): MarketplaceDegreeTemplate => {
        const snapshot = snapshotRow as BaselineSnapshot | null;
        
        if (snapshot && snapshot.baseline_status === 'verified' && snapshot.baseline_cost_usd > 0) {
          return {
            ...template,
            singleSchoolBaseline: {
              costUsd: snapshot.baseline_cost_usd,
              weeks: snapshot.baseline_weeks,
              source: snapshot.source_description,
              notes: (snapshot.inputs as Record<string, unknown>)?.assumptions as string,
            },
            baselineStatus: 'verified',
          };
        }
        
        return {
          ...template,
          singleSchoolBaseline: null,
          baselineStatus: 'missing',
        };
      };
      
      if (dbRow) {
        const typedRow = dbRow as unknown as DegreeTemplateRow;
        const optimization = typedRow.track_type === 'alt_max' ? 'alt-credit' : 'standard';
        const fixtureKey = `${typedRow.institution_code}-${optimization}`;
        
        // Check if we have rich fixture data
        const fixtures = marketplaceFixtures as unknown as MarketplaceDegreeTemplate[];
        const fixture = fixtures.find(t => 
          t.anchorSchool === typedRow.institution_code && t.optimization === optimization
        );
        
        let template: MarketplaceDegreeTemplate;
        
        if (fixture) {
          template = {
            ...fixture,
            id: typedRow.id,
            totals: {
              ...fixture.totals,
              credits: typedRow.total_credits,
              costUsd: typedRow.estimated_cost || fixture.totals.costUsd,
            },
          };
        } else {
          template = transformToMarketplaceTemplate(typedRow);
        }
        
        return mergeBaseline(template);
      }
      
      // Fallback to fixtures for backwards compatibility
      const fixtures = marketplaceFixtures as unknown as MarketplaceDegreeTemplate[];
      const template = fixtures.find(t => t.id === templateId);
      
      if (!template) {
        console.warn(`[useMarketplaceTemplate] Template not found: ${templateId}`);
        return null;
      }
      
      return mergeBaseline(template);
    },
    enabled: !!templateId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
