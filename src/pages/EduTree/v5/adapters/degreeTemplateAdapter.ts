import type { DegreeTemplate as DBDegreeTemplate } from '@/types/degreeTemplates';
import type { 
  MarketplaceDegreeTemplate, 
  YearTemplate,
  CanonicalId 
} from '../types/templates';
import type { MarketplaceOption } from '../types/v5';

/**
 * Converts database DegreeTemplate format to MarketplaceDegreeTemplate format
 * used by the v5 page for rendering and optimization
 */
export function adaptDegreeTemplate(
  dbTemplate: DBDegreeTemplate,
  equivalencies?: Array<{
    alt_credit_id: string;
    alt_source_code: string;
    alt_identifier: string;
    institutional_course_code: string;
    institutional_course_name: string;
    credits_awarded: number;
    level: number;
    confidence: number;
  }>
): MarketplaceDegreeTemplate {
  const { template_data } = dbTemplate;
  
  // Group terms by year (terms are labeled like 'y1-t1', 'y1-t2', etc.)
  const termsByYear = new Map<number, typeof template_data.terms>();
  
  template_data.terms.forEach(term => {
    // Extract year from term id (e.g., 'y1-t1' -> 1)
    const yearMatch = term.id.match(/y(\d+)/);
    const year = yearMatch ? parseInt(yearMatch[1]) : 1;
    
    if (!termsByYear.has(year)) {
      termsByYear.set(year, []);
    }
    termsByYear.get(year)!.push(term);
  });
  
  // Convert to YearTemplates
  const yearTemplates: YearTemplate[] = Array.from(termsByYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, terms]) => {
      // Aggregate module templates from all terms in this year
      const moduleTemplates = terms.flatMap(term => 
        term.slots.map(slot => {
          // Convert slot to MarketplaceOption format
          const preferredOption = convertSlotOptionToMarketplaceOption(
            slot.preferred,
            slot,
            equivalencies
          );
          
          const alternativeOptions = (slot.alternatives || []).map(alt =>
            convertSlotOptionToMarketplaceOption(alt, slot, equivalencies)
          );
          
          return {
            moduleId: slot.slotId,
            options: [preferredOption, ...alternativeOptions],
            recommendedCourseId: preferredOption.courseId,
            targetCanonicalIds: [slot.requirementArea] as CanonicalId[],
          };
        })
      );
      
      // Calculate year totals
      const yearCost = moduleTemplates.reduce((sum, mod) => 
        sum + (mod.options[0]?.cost_usd || 0), 0
      );
      const yearCredits = moduleTemplates.reduce((sum, mod) => 
        sum + (mod.options[0]?.credits || 0), 0
      );
      const yearWeeks = Math.max(...moduleTemplates.map(mod => 
        mod.options[0]?.duration_weeks || 0
      ));
      const yearCri = moduleTemplates.length > 0
        ? moduleTemplates.reduce((sum, mod) => sum + (mod.options[0]?.cri_score || 0), 0) / moduleTemplates.length
        : 0;
      
      return {
        id: `${dbTemplate.id}-y${year}`,
        kind: 'year' as const,
        year,
        label: `Year ${year}`,
        summary: `${terms.length} terms, ${moduleTemplates.length} courses`,
        badge: dbTemplate.track_type === 'cheapest' ? 'Cheapest' : 
               dbTemplate.track_type === 'fastest' ? 'Fastest' : undefined,
        moduleTemplates,
        targetSchool: dbTemplate.institution_code,
        transferVerified: true,
        est: {
          costUsd: yearCost,
          weeks: yearWeeks,
          credits: yearCredits,
          cri: yearCri,
          workloadHours: moduleTemplates.length * 10, // Estimate 10 hrs/week per course
        },
      };
    });
  
  // Calculate degree totals
  const totalCost = yearTemplates.reduce((sum, year) => sum + year.est.costUsd, 0);
  const totalCredits = yearTemplates.reduce((sum, year) => sum + year.est.credits, 0);
  const totalWeeks = yearTemplates.reduce((sum, year) => sum + year.est.weeks, 0);
  const avgCri = yearTemplates.length > 0
    ? yearTemplates.reduce((sum, year) => sum + year.est.cri, 0) / yearTemplates.length
    : null;
  
  // Build marketplace template
  return {
    id: dbTemplate.id,
    kind: 'degree' as const,
    label: `${dbTemplate.institution_code} ${dbTemplate.program_code} - ${formatTrackType(dbTemplate.track_type)}`,
    summary: `${totalCredits} credits, ${yearTemplates.length} years, ${dbTemplate.track_type} optimization`,
    badge: formatBadge(dbTemplate.track_type),
    
    programId: dbTemplate.program_code,
    anchorSchool: dbTemplate.institution_code,
    optimization: dbTemplate.track_type,
    
    // Provenance
    catalogYear: new Date().getFullYear().toString(),
    policyVersion: `${dbTemplate.institution_code}-${new Date().getFullYear()}-v1`,
    generatedAt: new Date().toISOString(),
    lastVerified: new Date().toISOString(),
    
    yearTemplates,
    targetSchool: dbTemplate.institution_code,
    transferVerified: true,
    
    // Marketplace metadata
    marketplace: {
      title: `${formatTrackType(dbTemplate.track_type)} ${dbTemplate.program_code}`,
      tagline: generateTagline(dbTemplate.track_type, totalWeeks, totalCost),
      badge: formatBadge(dbTemplate.track_type),
      isPremium: false,
    },
    
    // Lifestyle fit
    lifestyle: {
      avgWeeklyHours: dbTemplate.track_type === 'fastest' ? 20 : 12,
      paceType: dbTemplate.track_type === 'fastest' ? 'accelerated' : 'standard',
      workCompatible: dbTemplate.track_type !== 'fastest',
    },
    
    primaryCareerIds: getPrimaryCareerIds(dbTemplate.program_code),
    
    deliveryMode: 'fully_online' as const,
    inPersonWeeks: 0,
    
    socialProof: {
      popularityScore: 4,
      dataSource: 'simulated' as const,
    },
    
    totals: {
      credits: totalCredits,
      costUsd: totalCost,
      weeks: totalWeeks,
      avgCri,
    },
    
    est: {
      costUsd: totalCost,
      weeks: totalWeeks,
      credits: totalCredits,
      cri: avgCri || 0,
      workloadHours: yearTemplates.reduce((sum, y) => sum + y.est.workloadHours, 0),
    },
  };
}

/**
 * Convert a template slot option to MarketplaceOption format
 */
function convertSlotOptionToMarketplaceOption(
  option: any,
  slot: any,
  equivalencies?: Array<any>
): MarketplaceOption {
  if (option.type === 'institutional_course') {
    // Institutional course
    return {
      id: `${option.courseCode}-institutional`,
      courseId: `${option.courseCode}-institutional`,
      title: `${option.courseCode} Course`,
      credits: slot.minCredits,
      subject: slot.requirementArea,
      provider: 'TESU',
      providerType: 'university' as const,
      cost_usd: slot.minCredits * 400, // TESU ~$400/credit (2025)
      duration_weeks: 16,
      workload_weekly_hours: 10,
      cri_score: 3.0,
      level: slot.kind === 'major' ? 300 : 100,
      start_windows: ['2025-01-15', '2025-05-15', '2025-09-01'],
      providerCode: 'TESU',
    };
  } else {
    // Alt credit option (CLEP, DSST, Sophia, Study.com)
    const equiv = equivalencies?.find(
      e => e.alt_source_code === option.sourceCode && e.alt_identifier === option.identifier
    );
    
    return {
      id: `${option.sourceCode}-${option.identifier}`,
      courseId: `${option.sourceCode}-${option.identifier}`,
      title: equiv?.institutional_course_name || formatAltCreditTitle(option.identifier),
      credits: equiv?.credits_awarded || slot.minCredits,
      subject: slot.requirementArea,
      provider: formatProviderName(option.sourceCode),
      providerType: getProviderType(option.sourceCode),
      cost_usd: getAltCreditCost(option.sourceCode),
      duration_weeks: getAltCreditDuration(option.sourceCode),
      workload_weekly_hours: getAltCreditWorkload(option.sourceCode),
      cri_score: equiv?.confidence ? equiv.confidence * 5 : 3.5,
      level: equiv?.level || 100,
      start_windows: ['2025-01-01'], // Alt credits typically available anytime
      providerCode: option.sourceCode,
    };
  }
}

// Helper functions
function formatTrackType(trackType: string): string {
  return trackType.charAt(0).toUpperCase() + trackType.slice(1).replace('_', ' ');
}

function formatBadge(trackType: string): 'Fastest' | 'Cheapest' | 'Balanced' | undefined {
  if (trackType === 'cheapest') return 'Cheapest';
  if (trackType === 'fastest') return 'Fastest';
  if (trackType === 'hybrid') return 'Balanced';
  return undefined;
}

function generateTagline(trackType: string, weeks: number, cost: number): string {
  const months = Math.round(weeks / 4);
  if (trackType === 'cheapest') {
    return `Complete for under $${Math.round(cost / 100) * 100} with flexible pacing`;
  }
  if (trackType === 'fastest') {
    return `Complete in ${months} months with accelerated schedule`;
  }
  return `Balanced approach: ${months} months at $${Math.round(cost / 100) * 100}`;
}

function getPrimaryCareerIds(programCode: string): string[] {
  const careerMap: Record<string, string[]> = {
    'BSBA': ['business-analyst', 'operations-manager', 'marketing-manager'],
    'BSCS': ['software-engineer', 'web-developer', 'data-scientist'],
    'BSIT': ['it-specialist', 'systems-administrator', 'cybersecurity-analyst'],
  };
  return careerMap[programCode] || [];
}

function formatAltCreditTitle(identifier: string): string {
  return identifier
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function getAltCreditCost(sourceCode: string): number {
  const costs: Record<string, number> = {
    'SOPHIA': 99, // Monthly subscription
    'CLEP': 95,   // Per exam
    'DSST': 85,   // Per exam
    'STUDY_COM': 199, // Monthly subscription
  };
  return costs[sourceCode] || 100;
}

function getAltCreditDuration(sourceCode: string): number {
  const durations: Record<string, number> = {
    'SOPHIA': 4,  // 1 month per course
    'CLEP': 2,    // 2 weeks prep
    'DSST': 2,    // 2 weeks prep
    'STUDY_COM': 4, // 1 month per course
  };
  return durations[sourceCode] || 4;
}

function getAltCreditWorkload(sourceCode: string): number {
  const workloads: Record<string, number> = {
    'SOPHIA': 8,
    'CLEP': 10,
    'DSST': 10,
    'STUDY_COM': 12,
  };
  return workloads[sourceCode] || 10;
}

function getProviderType(sourceCode: string): 'university' | 'mooc' | 'bootcamp' | 'testing_center' {
  if (['CLEP', 'DSST'].includes(sourceCode)) return 'testing_center';
  return 'mooc';
}

function formatProviderName(sourceCode: string): string {
  const names: Record<string, string> = {
    'SOPHIA': 'Sophia Learning',
    'CLEP': 'CLEP',
    'DSST': 'DSST',
    'STUDY_COM': 'Study.com',
  };
  return names[sourceCode] || sourceCode;
}
