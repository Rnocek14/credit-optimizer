import type { DegreeTemplate as DBDegreeTemplate } from '@/types/degreeTemplates';
import type { 
  MarketplaceDegreeTemplate, 
  YearTemplate,
  CanonicalId 
} from '../types/templates';
import type { MarketplaceOption } from '../types/v5';
import { normalizeOptimization } from '@/types/optimizationTypes';
import { normalizeProviderCode } from '@/lib/providerNormalization';

/**
 * ACE/NCCRS evaluated providers - centralized for maintainability
 * These providers have nationally recognized credit recommendations
 */
const ACE_NCCRS_PROVIDERS = new Set([
  'SOPHIA',
  'STUDYCOM', 
  'STRAIGHTERLINE',
  'SAYLOR',
  'DSST',
  'CLEP',
]);

/**
 * Provider pricing data from alt_provider_pricing_packs table
 * This is the SINGLE SOURCE OF TRUTH for provider costs
 */
export interface ProviderPricingData {
  providerCode: string;
  model: 'subscription' | 'per_course' | 'per_exam' | 'per_credit';
  perCourseCost?: number;
  perExamCost?: number;
  perCreditCost?: number;
  monthlySubscription?: number;
  avgCreditsPerMonth?: number;
  effectiveCostPerCredit?: number;
  notes?: string;
}

/**
 * Institutional pricing data derived from policy packs
 */
export interface InstitutionalPricingData {
  institutionCode: string;
  perCreditCost: number;
  avgCourseDurationWeeks: number;
  notes?: string;
}

// Default fallbacks if data is missing (should rarely be used with complete data)
const DEFAULT_PROVIDER_PRICING: Record<string, ProviderPricingData> = {
  'SOPHIA': { providerCode: 'SOPHIA', model: 'subscription', monthlySubscription: 99, avgCreditsPerMonth: 3, effectiveCostPerCredit: 33 },
  'CLEP': { providerCode: 'CLEP', model: 'per_exam', perExamCost: 90, effectiveCostPerCredit: 30 },
  'DSST': { providerCode: 'DSST', model: 'per_exam', perExamCost: 85, effectiveCostPerCredit: 28 },
  'STUDYCOM': { providerCode: 'STUDYCOM', model: 'per_course', perCourseCost: 199, effectiveCostPerCredit: 66 },
  'STUDY_COM': { providerCode: 'STUDY_COM', model: 'per_course', perCourseCost: 199, effectiveCostPerCredit: 66 },
  'STRAIGHTERLINE': { providerCode: 'STRAIGHTERLINE', model: 'subscription', monthlySubscription: 99, perCourseCost: 59, effectiveCostPerCredit: 50 },
  'SAYLOR': { providerCode: 'SAYLOR', model: 'per_exam', perExamCost: 25, effectiveCostPerCredit: 8 },
};

const DEFAULT_INSTITUTIONAL_PRICING: Record<string, InstitutionalPricingData> = {
  'TESU': { institutionCode: 'TESU', perCreditCost: 172, avgCourseDurationWeeks: 12 },
  'WGU': { institutionCode: 'WGU', perCreditCost: 121, avgCourseDurationWeeks: 6 }, // ~$3,625/term ÷ 30 credits
  'COSC': { institutionCode: 'COSC', perCreditCost: 330, avgCourseDurationWeeks: 12 },
  'EMPIRE': { institutionCode: 'EMPIRE', perCreditCost: 280, avgCourseDurationWeeks: 15 },
  'EXCELSIOR': { institutionCode: 'EXCELSIOR', perCreditCost: 535, avgCourseDurationWeeks: 15 },
};

// Duration estimates by provider type (in weeks per 3-credit course)
const PROVIDER_DURATION_WEEKS: Record<string, number> = {
  'SOPHIA': 4,
  'CLEP': 2,
  'DSST': 2,
  'STUDYCOM': 6,
  'STUDY_COM': 6,
  'STRAIGHTERLINE': 6,
  'SAYLOR': 4,
};
/**
 * Converts database DegreeTemplate format to MarketplaceDegreeTemplate format
 * used by the v5 page for rendering and optimization
 * 
 * @param dbTemplate - The database template to convert
 * @param equivalencies - Course equivalency mappings for alt credits
 * @param providerPricing - Real-time pricing data from alt_provider_pricing_packs
 * @param institutionalPricing - Institutional pricing from policy packs
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
  }>,
  providerPricing?: Map<string, ProviderPricingData>,
  institutionalPricing?: Map<string, InstitutionalPricingData>
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
          // Convert slot to MarketplaceOption format with real pricing
          const preferredOption = convertSlotOptionToMarketplaceOption(
            slot.preferred,
            slot,
            equivalencies,
            dbTemplate.institution_code,
            providerPricing,
            institutionalPricing
          );
          
          const alternativeOptions = (slot.alternatives || []).map(alt =>
            convertSlotOptionToMarketplaceOption(
              alt, 
              slot, 
              equivalencies,
              dbTemplate.institution_code,
              providerPricing,
              institutionalPricing
            )
          );
          
          // Detect cap-limited slots: institutional preferred but first alternative is alt_credit
          // This happens when enforceAltCap() flipped the preferred option due to cap limits
          const isCapLimited = 
            slot.preferred.type === 'institutional_course' &&
            !!slot.alternatives?.length &&
            slot.alternatives[0]?.type === 'alt_credit';
          
          return {
            moduleId: slot.slotId,
            options: [preferredOption, ...alternativeOptions],
            recommendedCourseId: preferredOption.courseId,
            targetCanonicalIds: [slot.requirementArea] as CanonicalId[],
            isCapLimited, // Flag for UI to show cap-limited badge
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
    optimization: normalizeOptimization(dbTemplate.track_type),
    
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
 * Uses real pricing data from database when available, falls back to defaults
 */
function convertSlotOptionToMarketplaceOption(
  option: any,
  slot: any,
  equivalencies: Array<any> | undefined,
  institutionCode: string,
  providerPricing?: Map<string, ProviderPricingData>,
  institutionalPricing?: Map<string, InstitutionalPricingData>
): MarketplaceOption {
  // Use option credits if explicit, otherwise fall back to slot requirement, then default
  const credits = option.credits ?? slot.minCredits ?? 3;
  
  if (option.type === 'institutional_course') {
    // Get institutional pricing from database or fallback
    const instPricing = institutionalPricing?.get(institutionCode) 
      || DEFAULT_INSTITUTIONAL_PRICING[institutionCode]
      || DEFAULT_INSTITUTIONAL_PRICING['TESU'];
    
    const costPerCredit = instPricing.perCreditCost;
    const durationWeeks = instPricing.avgCourseDurationWeeks;
    
    return {
      id: `${option.courseCode}-institutional`,
      courseId: `${option.courseCode}-institutional`,
      title: `${option.courseCode} Course`,
      credits,
      subject: slot.requirementArea,
      provider: institutionCode,
      providerType: 'university' as const,
      cost_usd: credits * costPerCredit,
      duration_weeks: durationWeeks,
      workload_weekly_hours: 10,
      cri_score: 3.0,
      level: slot.kind === 'major' ? 300 : 100,
      start_windows: ['2025-01-15', '2025-05-15', '2025-09-01'],
      providerCode: institutionCode,
      isAltCredit: false,
    };
  } else {
    // Alt credit option (CLEP, DSST, Sophia, Study.com)
    // Normalize provider code consistently using shared utility
    const providerCode = normalizeProviderCode(option.sourceCode ?? option.providerCode ?? '');
    
    // Find matching equivalency - normalize both sides to prevent STUDY_COM vs STUDYCOM mismatches
    const equiv = equivalencies?.find(
      e => normalizeProviderCode(e.alt_source_code) === providerCode && 
           e.alt_identifier === option.identifier
    );
    
    // Get provider pricing from database or fallback - use normalized code everywhere
    const pricing = providerPricing?.get(providerCode) 
      || DEFAULT_PROVIDER_PRICING[providerCode];
    
    // Calculate cost based on pricing model
    let costUsd: number;
    let usedFallback = false;
    
    if (pricing) {
      if (pricing.model === 'per_exam') {
        costUsd = pricing.perExamCost || 90;
      } else if (pricing.model === 'per_course') {
        costUsd = pricing.perCourseCost || 199;
      } else if (pricing.model === 'subscription') {
        // Subscription: monthly fee / typical courses per month
        // Guard: ensure coursesPerMonth >= 1 to prevent crazy prices when avgCreditsPerMonth < credits
        const avgCreditsPerMonth = pricing.avgCreditsPerMonth || 3;
        const coursesPerMonth = Math.max(1, avgCreditsPerMonth / credits);
        costUsd = Math.round((pricing.monthlySubscription || 99) / coursesPerMonth);
      } else if (pricing.effectiveCostPerCredit) {
        costUsd = credits * pricing.effectiveCostPerCredit;
      } else {
        costUsd = 99; // Fallback
        usedFallback = true;
      }
    } else {
      // Legacy hardcoded fallback (should rarely hit with complete data)
      costUsd = getAltCreditCostLegacy(option.sourceCode);
      usedFallback = true;
    }
    
    // Log fallback usage once per session for debugging data gaps
    if (usedFallback && typeof window !== 'undefined') {
      const fallbackKey = `pricing-fallback-logged-${providerCode}`;
      if (!sessionStorage.getItem(fallbackKey)) {
        console.warn(`[degreeTemplateAdapter] Pricing fallback used for provider: ${providerCode}`, {
          originalCode: option.sourceCode,
          normalizedCode: providerCode,
          hasPricingMap: !!providerPricing,
          mapSize: providerPricing?.size ?? 0,
        });
        sessionStorage.setItem(fallbackKey, 'true');
      }
    }
    
    const durationWeeks = PROVIDER_DURATION_WEEKS[providerCode] 
      || PROVIDER_DURATION_WEEKS[option.sourceCode]
      || 4;
    
    return {
      id: `${providerCode}-${option.identifier}`,
      courseId: `${providerCode}-${option.identifier}`,
      title: equiv?.institutional_course_name || formatAltCreditTitle(option.identifier),
      credits: equiv?.credits_awarded || credits,
      subject: slot.requirementArea,
      provider: formatProviderName(providerCode),
      providerType: getProviderType(providerCode),
      cost_usd: costUsd,
      duration_weeks: durationWeeks,
      workload_weekly_hours: getAltCreditWorkload(providerCode),
      cri_score: equiv?.confidence ? equiv.confidence * 5 : 3.5,
      level: equiv?.level || 100,
      start_windows: ['2025-01-01'], // Alt credits typically available anytime
      providerCode, // Use normalized code everywhere
      aceNccrs: ACE_NCCRS_PROVIDERS.has(providerCode),
      isAltCredit: true,
      // Stable matching fields for plan rehydration and linking
      equivalency_key: option.identifier,
      alt_identifier: option.identifier,
      alt_source_code: providerCode,
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
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** Legacy cost lookup - used only when database pricing is unavailable */
function getAltCreditCostLegacy(sourceCode: string): number {
  const costs: Record<string, number> = {
    'SOPHIA': 99,
    'CLEP': 90,
    'DSST': 85,
    'STUDY_COM': 199,
    'STUDYCOM': 199,
    'STRAIGHTERLINE': 159,
    'SAYLOR': 25,
  };
  return costs[sourceCode?.toUpperCase()] || 100;
}

function getAltCreditWorkload(sourceCode: string): number {
  const workloads: Record<string, number> = {
    'SOPHIA': 8,
    'CLEP': 10,
    'DSST': 10,
    'STUDY_COM': 12,
    'STUDYCOM': 12,
    'STRAIGHTERLINE': 10,
    'SAYLOR': 8,
  };
  return workloads[sourceCode?.toUpperCase()] || 10;
}

function getProviderType(sourceCode: string): 'university' | 'mooc' | 'bootcamp' | 'testing_center' {
  const code = sourceCode?.toUpperCase();
  if (['CLEP', 'DSST'].includes(code)) return 'testing_center';
  return 'mooc';
}

function formatProviderName(sourceCode: string): string {
  const names: Record<string, string> = {
    'SOPHIA': 'Sophia Learning',
    'CLEP': 'CLEP',
    'DSST': 'DSST',
    'STUDY_COM': 'Study.com',
    'STUDYCOM': 'Study.com',
    'STRAIGHTERLINE': 'StraighterLine',
    'SAYLOR': 'Saylor Academy',
  };
  return names[sourceCode?.toUpperCase()] || sourceCode;
}

/**
 * Helper to build provider pricing map from alt_provider_pricing_packs rows
 */
export function buildProviderPricingMap(
  pricingPacks: Array<{
    provider_code: string;
    pricing_data: Record<string, any>;
  }>
): Map<string, ProviderPricingData> {
  const map = new Map<string, ProviderPricingData>();
  
  for (const pack of pricingPacks) {
    const code = pack.provider_code?.toUpperCase().replace('.', '');
    const data = pack.pricing_data || {};
    
    map.set(code, {
      providerCode: code,
      model: data.model || 'per_course',
      perCourseCost: data.per_course_usd,
      perExamCost: data.per_exam_usd,
      perCreditCost: data.per_credit_usd,
      monthlySubscription: data.monthly_usd,
      avgCreditsPerMonth: data.avg_credits_per_month,
      effectiveCostPerCredit: data.effective_cost_per_credit_usd,
      notes: data.notes,
    });
  }
  
  return map;
}

/**
 * Helper to build institutional pricing map from policy packs
 */
export function buildInstitutionalPricingMap(
  policies: Array<{
    institution: string;
    policy_data?: Record<string, any>;
  }>
): Map<string, InstitutionalPricingData> {
  const map = new Map<string, InstitutionalPricingData>();
  
  for (const policy of policies) {
    const code = policy.institution?.toUpperCase();
    const data = policy.policy_data || {};
    
    // Try to extract per-credit cost from various policy fields
    const perCreditCost = data.per_credit_cost 
      || data.tuition_per_credit 
      || DEFAULT_INSTITUTIONAL_PRICING[code]?.perCreditCost
      || 300; // Generic fallback
    
    map.set(code, {
      institutionCode: code,
      perCreditCost,
      avgCourseDurationWeeks: data.avg_course_duration_weeks || 12,
      notes: data.notes,
    });
  }
  
  return map;
}
