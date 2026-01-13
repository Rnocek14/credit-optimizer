// BSBA Template Seeder v3 - Real cost computation from pricing packs
// Computes plan costs from slot composition + provider/institution pricing
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface SeedRequest {
  institution_code?: string;  // If provided, only seed this school
  program_code?: string;      // Default: 'BSBA'
  force_refresh?: boolean;    // Re-generate even if templates exist
}

interface PolicyData {
  residency_credits?: number;
  max_transfer_credits?: number;
  max_alt_credit?: number;
  max_ace_nccrs_credits?: number;
  total_credits?: number;
  [key: string]: unknown;
}

interface PricingPackData {
  model?: 'per_credit' | 'flat_term';
  per_credit_usd?: number;
  term_cost_usd?: number;
  typical_terms_to_complete?: number;
  term_weeks?: number;
  required_fees_usd?: number;
  fee_schedule?: Record<string, number>;
}

interface ProviderPricingData {
  effective_cost_per_credit_usd: number;
  model: string;
  provenance_verified_at?: string; // For determining verified vs estimated status
}

// Proper typed institution pricing - separate per-credit vs flat-term
interface InstitutionPricing {
  model: 'per_credit' | 'flat_term';
  pricingPackId?: string;
  provenanceVerified: boolean;
  // Per-credit model fields
  perCreditUsd?: number;
  feesUsd: number;
  // Flat-term model fields (WGU)
  termCostUsd?: number;
  typicalTerms?: number;
  termWeeks?: number;
}

interface TemplateSlot {
  slotId: string;
  kind: 'gened' | 'major' | 'elective' | 'capstone';
  requirementArea: string;
  minCredits: number;
  preferred: { type: string; sourceCode?: string; identifier?: string; courseCode?: string };
  alternatives?: { type: string; sourceCode?: string; identifier?: string; courseCode?: string }[];
}

interface TemplateTerm {
  id: string;
  label: string;
  slots: TemplateSlot[];
}

interface TemplateData {
  version: string;
  programCode: string;
  trackType: string;
  totalCredits: number;
  terms: TemplateTerm[];
  policies: {
    totalCredits: number;
    genedCredits: number;
    majorCredits: number;
    electiveCredits: number;
    upperDivisionTotal: number;
    residencyCredits: number;
    maxTransferCredits: number;
    maxAltCredits: number;
  };
  sourcePolicyPackId?: string;
}

interface CostBreakdown {
  totalCostUsd: number;
  altCredits: number;
  institutionalCredits: number;
  altCostUsd: number;
  institutionalCostUsd: number;
  feesUsd: number;
  altCreditsByProvider: Record<string, number>;
  providerRatesUsed: Record<string, number>;
}

// Default policy values (fallback if pack doesn't have specific fields)
const DEFAULT_POLICIES = {
  residency_credits: 30,
  max_transfer_credits: 90,
  max_alt_credit: 60,
  total_credits: 120,
};

// Fallback per-credit rate if no pricing pack (conservative estimate)
const FALLBACK_PER_CREDIT_USD = 400;
const FALLBACK_ALT_CREDIT_RATE = 50; // Conservative average for alt providers

// Duration estimates by track type
const TRACK_DURATION = {
  standard: 24, // months
  alt_max: 15,  // months
};

// BSBA Term structure (shared across schools, adapted per track)
function createBsbaTerms(trackType: 'standard' | 'alt_max'): TemplateTerm[] {
  const isAltMax = trackType === 'alt_max';
  
  return [
    {
      id: 'y1-t1',
      label: 'Year 1 - Fall',
      slots: [
        {
          slotId: 'gened-written-1',
          kind: 'gened',
          requirementArea: 'WRITTEN_COMM',
          minCredits: 3,
          preferred: isAltMax 
            ? { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'college-composition' }
            : { type: 'institutional_course', courseCode: 'ENG-101' },
          alternatives: isAltMax 
            ? [{ type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'ENG101' }]
            : [{ type: 'alt_credit', sourceCode: 'CLEP', identifier: 'college-composition' }],
        },
        {
          slotId: 'gened-math-1',
          kind: 'gened',
          requirementArea: 'QUANTITATIVE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'college-algebra' }
            : { type: 'institutional_course', courseCode: 'MAT-101' },
          alternatives: isAltMax
            ? [{ type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'MAT101' }]
            : [{ type: 'alt_credit', sourceCode: 'CLEP', identifier: 'college-algebra' }],
        },
        {
          slotId: 'bus-intro-1',
          kind: 'major',
          requirementArea: 'BUS_CORE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'BUS100' }
            : { type: 'institutional_course', courseCode: 'BUS-101' },
        },
        {
          slotId: 'gened-psych-1',
          kind: 'gened',
          requirementArea: 'SOCIAL_SCIENCE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'intro-psychology' }
            : { type: 'institutional_course', courseCode: 'PSY-101' },
        },
      ],
    },
    {
      id: 'y1-t2',
      label: 'Year 1 - Spring',
      slots: [
        {
          slotId: 'gened-written-2',
          kind: 'gened',
          requirementArea: 'WRITTEN_COMM',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'ENG102' }
            : { type: 'institutional_course', courseCode: 'ENG-102' },
        },
        {
          slotId: 'bus-acct-1',
          kind: 'major',
          requirementArea: 'BUS_CORE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'financial-accounting' }
            : { type: 'institutional_course', courseCode: 'ACC-201' },
        },
        {
          slotId: 'bus-econ-micro',
          kind: 'major',
          requirementArea: 'BUS_CORE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'microeconomics' }
            : { type: 'institutional_course', courseCode: 'ECO-201' },
        },
        {
          slotId: 'gened-humanities-1',
          kind: 'gened',
          requirementArea: 'HUMANITIES',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'HUM101' }
            : { type: 'institutional_course', courseCode: 'HUM-101' },
        },
      ],
    },
    {
      id: 'y2-t1',
      label: 'Year 2 - Fall',
      slots: [
        {
          slotId: 'bus-acct-2',
          kind: 'major',
          requirementArea: 'BUS_CORE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'ACC202' }
            : { type: 'institutional_course', courseCode: 'ACC-202' },
        },
        {
          slotId: 'bus-econ-macro',
          kind: 'major',
          requirementArea: 'BUS_CORE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'macroeconomics' }
            : { type: 'institutional_course', courseCode: 'ECO-202' },
        },
        {
          slotId: 'bus-stats',
          kind: 'major',
          requirementArea: 'BUS_CORE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'STAT101' }
            : { type: 'institutional_course', courseCode: 'STA-201' },
        },
        {
          slotId: 'gened-science-1',
          kind: 'gened',
          requirementArea: 'NATURAL_SCIENCE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'SCI101' }
            : { type: 'institutional_course', courseCode: 'SCI-101' },
        },
      ],
    },
    {
      id: 'y2-t2',
      label: 'Year 2 - Spring',
      slots: [
        {
          slotId: 'bus-law',
          kind: 'major',
          requirementArea: 'BUS_CORE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'business-law' }
            : { type: 'institutional_course', courseCode: 'LAW-201' },
        },
        {
          slotId: 'bus-mgmt',
          kind: 'major',
          requirementArea: 'BUS_CORE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'principles-management' }
            : { type: 'institutional_course', courseCode: 'MGT-301' },
        },
        {
          slotId: 'bus-mkt',
          kind: 'major',
          requirementArea: 'BUS_CORE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'principles-marketing' }
            : { type: 'institutional_course', courseCode: 'MKT-301' },
        },
        {
          slotId: 'elective-1',
          kind: 'elective',
          requirementArea: 'FREE_ELECTIVE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'ELEC100' }
            : { type: 'institutional_course', courseCode: 'ELEC-100' },
        },
      ],
    },
    {
      id: 'y3-t1',
      label: 'Year 3 - Fall',
      slots: [
        {
          slotId: 'bus-finance',
          kind: 'major',
          requirementArea: 'UPPER_BUSINESS',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'FIN-301' },
        },
        {
          slotId: 'bus-ops',
          kind: 'major',
          requirementArea: 'UPPER_BUSINESS',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'OPS-301' },
        },
        {
          slotId: 'bus-ethics',
          kind: 'major',
          requirementArea: 'UPPER_BUSINESS',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'ETH301' }
            : { type: 'institutional_course', courseCode: 'ETH-301' },
        },
        {
          slotId: 'elective-2',
          kind: 'elective',
          requirementArea: 'FREE_ELECTIVE',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'ELEC-200' },
        },
      ],
    },
    {
      id: 'y3-t2',
      label: 'Year 3 - Spring',
      slots: [
        {
          slotId: 'bus-hr',
          kind: 'major',
          requirementArea: 'UPPER_BUSINESS',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'HRM-301' },
        },
        {
          slotId: 'bus-info-sys',
          kind: 'major',
          requirementArea: 'UPPER_BUSINESS',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'MIS-301' },
        },
        {
          slotId: 'elective-3',
          kind: 'elective',
          requirementArea: 'FREE_ELECTIVE',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'ELEC-300' },
        },
        {
          slotId: 'elective-4',
          kind: 'elective',
          requirementArea: 'FREE_ELECTIVE',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'ELEC-301' },
        },
      ],
    },
    {
      id: 'y4-t1',
      label: 'Year 4 - Fall',
      slots: [
        {
          slotId: 'bus-strategy',
          kind: 'major',
          requirementArea: 'UPPER_BUSINESS',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'STR-401' },
        },
        {
          slotId: 'bus-intl',
          kind: 'major',
          requirementArea: 'UPPER_BUSINESS',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'IBS-401' },
        },
        {
          slotId: 'elective-5',
          kind: 'elective',
          requirementArea: 'FREE_ELECTIVE',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'ELEC-400' },
        },
        {
          slotId: 'elective-6',
          kind: 'elective',
          requirementArea: 'FREE_ELECTIVE',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'ELEC-401' },
        },
      ],
    },
    {
      id: 'y4-t2',
      label: 'Year 4 - Spring',
      slots: [
        {
          slotId: 'capstone',
          kind: 'capstone',
          requirementArea: 'CAPSTONE',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'CAP-499' },
        },
        {
          slotId: 'elective-7',
          kind: 'elective',
          requirementArea: 'FREE_ELECTIVE',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'ELEC-402' },
        },
        {
          slotId: 'elective-8',
          kind: 'elective',
          requirementArea: 'FREE_ELECTIVE',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'ELEC-403' },
        },
        {
          slotId: 'elective-9',
          kind: 'elective',
          requirementArea: 'FREE_ELECTIVE',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'ELEC-404' },
        },
      ],
    },
  ];
}

/**
 * Enforce alt-credit cap by flipping excess alt slots to institutional courses.
 * When cumulative alt credits would exceed maxAltCredits, convert the slot's
 * preferred option to institutional and move the alt option to alternatives.
 */
function enforceAltCap(terms: TemplateTerm[], maxAltCredits: number): TemplateTerm[] {
  let usedAltCredits = 0;
  
  return terms.map(term => ({
    ...term,
    slots: term.slots.map(slot => {
      // Skip if not an alt-credit slot
      if (slot.preferred.type !== 'alt_credit') {
        return slot;
      }
      
      const credits = slot.minCredits ?? 0;
      
      // Check if we can still fit this slot under the cap
      if (usedAltCredits + credits <= maxAltCredits) {
        usedAltCredits += credits;
        return slot; // Keep alt-credit as preferred
      }
      
      // Cap exceeded: flip to institutional course
      // Preserve the original alt option as an alternative for UI visibility
      const originalAltOption = slot.preferred;
      const fallbackCourseCode = slot.preferred.courseCode 
        || slot.preferred.identifier?.toUpperCase().replace(/-/g, '') 
        || `INST-${slot.slotId.toUpperCase()}`;
      
      return {
        ...slot,
        preferred: {
          type: 'institutional_course',
          courseCode: fallbackCourseCode,
        },
        alternatives: [
          originalAltOption, // Move original alt to alternatives
          ...(slot.alternatives || []),
        ],
      };
    }),
  }));
}

/**
 * Compute plan cost from slot composition using real pricing data
 */
function computePlanCostFromSlots(
  terms: TemplateTerm[],
  institutionPricing: { perCreditUsd: number; feesUsd: number; model: string },
  providerRates: Map<string, number>
): CostBreakdown {
  let altCredits = 0;
  let institutionalCredits = 0;
  let altCostUsd = 0;
  const altCreditsByProvider: Record<string, number> = {};
  const providerRatesUsed: Record<string, number> = {};
  
  for (const term of terms) {
    for (const slot of term.slots) {
      const credits = slot.minCredits;
      
      if (slot.preferred.type === 'alt_credit') {
        altCredits += credits;
        const sourceCode = slot.preferred.sourceCode || 'SOPHIA';
        const rate = providerRates.get(sourceCode) ?? FALLBACK_ALT_CREDIT_RATE;
        altCostUsd += credits * rate;
        
        // Track by provider
        altCreditsByProvider[sourceCode] = (altCreditsByProvider[sourceCode] || 0) + credits;
        providerRatesUsed[sourceCode] = rate;
      } else if (slot.preferred.type === 'institutional_course') {
        institutionalCredits += credits;
      }
    }
  }
  
  // Calculate institutional cost
  const institutionalCostUsd = institutionalCredits * institutionPricing.perCreditUsd;
  const feesUsd = institutionPricing.feesUsd;
  
  const totalCostUsd = Math.round(altCostUsd + institutionalCostUsd + feesUsd);
  
  return {
    totalCostUsd,
    altCredits,
    institutionalCredits,
    altCostUsd: Math.round(altCostUsd),
    institutionalCostUsd: Math.round(institutionalCostUsd),
    feesUsd: Math.round(feesUsd),
    altCreditsByProvider,
    providerRatesUsed,
  };
}

/**
 * Compute cost for WGU's flat-term model
 */
function computeWguCost(pricingData: PricingPackData): CostBreakdown {
  const termCost = pricingData.term_cost_usd ?? 3855;
  const terms = pricingData.typical_terms_to_complete ?? 4;
  const fees = pricingData.required_fees_usd ?? 65;
  
  const totalCostUsd = Math.round((termCost * terms) + fees);
  
  return {
    totalCostUsd,
    altCredits: 0,
    institutionalCredits: 120, // All credits from WGU
    altCostUsd: 0,
    institutionalCostUsd: totalCostUsd - fees,
    feesUsd: fees,
    altCreditsByProvider: {},
    providerRatesUsed: {},
  };
}

// Generate templates for a single institution using its policy pack
async function generateTemplatesFromPack(
  supabase: ReturnType<typeof createClient>,
  institutionCode: string,
  institutionId: string,
  policyData: PolicyData,
  packId: string,
  programCode: string,
  institutionPricing: InstitutionPricing,
  providerRates: Map<string, number>,
  providerProvenanceVerified: boolean
): Promise<{ standard?: string; altMax?: string; errors: string[] }> {
  const errors: string[] = [];
  const trackTypes: ('standard' | 'alt_max')[] = ['standard', 'alt_max'];
  const results: { standard?: string; altMax?: string } = {};

  // Extract policy limits with fallbacks
  const residencyCredits = policyData.residency_credits ?? DEFAULT_POLICIES.residency_credits;
  const maxTransferCredits = policyData.max_transfer_credits ?? DEFAULT_POLICIES.max_transfer_credits;
  const maxAltCredits = policyData.max_alt_credit ?? policyData.max_ace_nccrs_credits ?? DEFAULT_POLICIES.max_alt_credit;
  const totalCredits = policyData.total_credits ?? DEFAULT_POLICIES.total_credits;

  for (const trackType of trackTypes) {
    const templateId = `${institutionCode}-${programCode}-${trackType.toUpperCase()}-V2`;
    let terms = createBsbaTerms(trackType);
    const durationMonths = TRACK_DURATION[trackType];

    // CRITICAL: Enforce alt-credit cap for alt_max tracks
    // This prevents templates from exceeding institutional policy limits
    if (trackType === 'alt_max') {
      const altCreditsBeforeCap = terms.reduce((sum, term) => 
        sum + term.slots.filter(s => s.preferred.type === 'alt_credit')
          .reduce((slotSum, s) => slotSum + s.minCredits, 0), 0);
      
      terms = enforceAltCap(terms, maxAltCredits);
      
      const altCreditsAfterCap = terms.reduce((sum, term) => 
        sum + term.slots.filter(s => s.preferred.type === 'alt_credit')
          .reduce((slotSum, s) => slotSum + s.minCredits, 0), 0);
      
      console.log(`[seed-bsba-templates] ${institutionCode} alt_max cap enforcement: ${altCreditsBeforeCap} → ${altCreditsAfterCap} (max: ${maxAltCredits})`);
    }

    const templateData: TemplateData = {
      version: '3.0', // Upgraded version for real cost computation
      programCode,
      trackType,
      totalCredits,
      terms,
      policies: {
        totalCredits,
        genedCredits: 30,
        majorCredits: 54,
        electiveCredits: 36,
        upperDivisionTotal: 30,
        residencyCredits,
        maxTransferCredits,
        maxAltCredits,
      },
      sourcePolicyPackId: packId,
    };

    // Compute real plan cost from slot composition
    let costBreakdown: CostBreakdown;
    
    if (institutionPricing.model === 'flat_term') {
      // WGU uses flat-term model - use proper typed fields
      costBreakdown = computeWguCost({
        term_cost_usd: institutionPricing.termCostUsd ?? 3855,
        typical_terms_to_complete: institutionPricing.typicalTerms ?? 4,
        required_fees_usd: institutionPricing.feesUsd,
      });
    } else {
      // Standard per-credit model - pass proper typed pricing
      costBreakdown = computePlanCostFromSlots(terms, {
        perCreditUsd: institutionPricing.perCreditUsd ?? FALLBACK_PER_CREDIT_USD,
        feesUsd: institutionPricing.feesUsd,
        model: institutionPricing.model,
        pricingPackId: institutionPricing.pricingPackId,
      }, providerRates);
    }
    
    // Determine cost_status based on provenance verification
    const costStatus = (institutionPricing.provenanceVerified && providerProvenanceVerified) 
      ? 'verified' 
      : 'estimated';
    
    console.log(`[seed-bsba-templates] ${institutionCode}/${trackType} cost breakdown:`, {
      total: costBreakdown.totalCostUsd,
      altCredits: costBreakdown.altCredits,
      institutionalCredits: costBreakdown.institutionalCredits,
      altCost: costBreakdown.altCostUsd,
      institutionalCost: costBreakdown.institutionalCostUsd,
      fees: costBreakdown.feesUsd,
    });

    const template = {
      id: templateId,
      institution_id: institutionId,
      institution_code: institutionCode,
      program_code: programCode,
      program_name: `Bachelor of Science in Business Administration`,
      track_type: trackType,
      total_credits: totalCredits,
      estimated_cost: costBreakdown.totalCostUsd,
      estimated_duration_months: durationMonths,
      catalog_year: '2024-2025',
      template_data: templateData,
      notes: `${trackType === 'alt_max' ? 'Maximizes alt-credit usage' : 'Standard institutional path'} - Real cost from pricing packs v3`,
    };

    const { error: upsertError } = await supabase
      .from('degree_templates')
      .upsert(template, {
        onConflict: 'institution_code,program_code,track_type',
      });

    if (upsertError) {
      console.error(`[seed-bsba-templates] Error upserting ${templateId}:`, upsertError);
      errors.push(`${trackType}: ${upsertError.message}`);
      continue;
    }
    
    console.log(`[seed-bsba-templates] ✅ Upserted ${templateId} with cost $${costBreakdown.totalCostUsd}`);
    
    // Query back the real UUID from the database (critical for snapshot joins)
    const { data: dbRow, error: lookupError } = await supabase
      .from('degree_templates')
      .select('id')
      .eq('institution_code', institutionCode)
      .eq('program_code', programCode)
      .eq('track_type', trackType)
      .single();
    
    if (lookupError || !dbRow) {
      console.error(`[seed-bsba-templates] Failed to lookup template UUID for ${templateId}:`, lookupError?.message);
      errors.push(`${trackType}: Failed to lookup template UUID`);
      continue;
    }
    
    const realTemplateId = dbRow.id; // This is the actual UUID
    console.log(`[seed-bsba-templates] Template ${templateId} has UUID: ${realTemplateId}`);
    
    // Create cost snapshot for audit trail using real UUID
    const { error: snapshotError } = await supabase
      .from('template_cost_snapshots')
      .insert({
        template_id: realTemplateId, // Use real UUID, not human-readable ID
        institution_code: institutionCode,
        plan_cost_usd: costBreakdown.totalCostUsd,
        plan_weeks: Math.round(durationMonths * 4.33),
        alt_credits: costBreakdown.altCredits,
        institutional_credits: costBreakdown.institutionalCredits,
        total_credits: totalCredits,
        inputs: {
          institution_pricing_pack_id: institutionPricing.pricingPackId,
          per_credit_usd: institutionPricing.perCreditUsd,
          term_cost_usd: institutionPricing.termCostUsd,
          fees_usd: institutionPricing.feesUsd,
          pricing_model: institutionPricing.model,
          provider_rates_used: costBreakdown.providerRatesUsed,
          alt_credits_by_provider: costBreakdown.altCreditsByProvider,
          formula_version: '3.1', // Upgraded version for UUID fix
        },
        cost_status: costStatus, // Use computed status, not hardcoded 'verified'
        source_description: `Computed from pricing packs - ${institutionCode} ${institutionPricing.model} + provider rates (${costStatus})`,
      });
    
    if (snapshotError) {
      console.warn(`[seed-bsba-templates] Failed to create cost snapshot for ${realTemplateId}:`, snapshotError.message);
    } else {
      console.log(`[seed-bsba-templates] ✅ Created cost snapshot for ${realTemplateId} (status: ${costStatus})`);
    }
    
    if (trackType === 'standard') results.standard = templateId;
    else results.altMax = templateId;
  }

  return { ...results, errors };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const results: Record<string, { 
    inserted: number; 
    templates?: { standard?: string; altMax?: string };
    costBreakdown?: { standard?: number; altMax?: number };
    source: 'policy_pack' | 'fallback';
    error?: string 
  }> = {};

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    // Parse request body
    let body: SeedRequest = {};
    try {
      body = await req.json();
    } catch {
      // No body or invalid JSON - use defaults
    }

    const { institution_code, program_code = 'BSBA', force_refresh = false } = body;

    console.log(`[seed-bsba-templates] Starting v3 template generation with real costs...`);
    console.log(`[seed-bsba-templates] Params: institution_code=${institution_code || 'all'}, program_code=${program_code}, force_refresh=${force_refresh}`);

    // Fetch all provider pricing packs (with provenance for status determination)
    const { data: providerPacks, error: providerError } = await supabase
      .from('alt_provider_pricing_packs')
      .select('provider_code, pricing_data, provenance_verified_at')
      .eq('status', 'active');
    
    if (providerError) {
      console.warn('[seed-bsba-templates] Failed to fetch provider pricing:', providerError.message);
    }
    
    // Build provider rates map and check provenance
    const providerRates = new Map<string, number>();
    let providerProvenanceVerified = true; // Start true, set false if any unverified
    
    (providerPacks || []).forEach((pack) => {
      const data = pack.pricing_data as ProviderPricingData;
      if (data?.effective_cost_per_credit_usd) {
        providerRates.set(pack.provider_code, data.effective_cost_per_credit_usd);
      }
      // Check if this provider has verified provenance
      if (!pack.provenance_verified_at) {
        providerProvenanceVerified = false;
      }
    });
    
    console.log('[seed-bsba-templates] Provider rates loaded:', Object.fromEntries(providerRates));
    console.log('[seed-bsba-templates] Provider provenance verified:', providerProvenanceVerified);

    // Fetch all institution pricing packs (with provenance for status)
    let pricingQuery = supabase
      .from('institution_pricing_packs')
      .select('id, institution_code, pricing_data, status, provenance_verified_at')
      .eq('status', 'active');
    
    if (institution_code) {
      pricingQuery = pricingQuery.eq('institution_code', institution_code);
    }
    
    const { data: institutionPricingPacks, error: pricingError } = await pricingQuery;
    
    if (pricingError) {
      console.warn('[seed-bsba-templates] Failed to fetch institution pricing:', pricingError.message);
    }
    
    // Build institution pricing map with proper typed structure
    const institutionPricingMap = new Map<string, InstitutionPricing>();
    
    (institutionPricingPacks || []).forEach((pack) => {
      const data = pack.pricing_data as PricingPackData;
      const model = (data?.model || 'per_credit') as 'per_credit' | 'flat_term';
      const provenanceVerified = !!pack.provenance_verified_at;
      
      const feesUsd = data?.required_fees_usd ?? 
        Object.values(data?.fee_schedule || {}).reduce((sum: number, fee: unknown) => sum + (fee as number), 0);
      
      if (model === 'flat_term') {
        // WGU-style flat-term pricing
        institutionPricingMap.set(pack.institution_code, {
          model: 'flat_term',
          pricingPackId: pack.id,
          provenanceVerified,
          feesUsd,
          termCostUsd: data?.term_cost_usd ?? 3855,
          typicalTerms: data?.typical_terms_to_complete ?? 4,
          termWeeks: data?.term_weeks ?? 26,
        });
      } else {
        // Standard per-credit pricing
        institutionPricingMap.set(pack.institution_code, {
          model: 'per_credit',
          pricingPackId: pack.id,
          provenanceVerified,
          feesUsd,
          perCreditUsd: data?.per_credit_usd ?? FALLBACK_PER_CREDIT_USD,
        });
      }
    });
    
    console.log('[seed-bsba-templates] Institution pricing loaded:', institutionPricingMap.size, 'schools');

    // Query active policy packs
    let packsQuery = supabase
      .from('institution_policy_packs')
      .select('id, institution, policy_data, confidence_score')
      .eq('status', 'active');

    if (institution_code) {
      packsQuery = packsQuery.eq('institution', institution_code);
    }

    const { data: activePacks, error: packsError } = await packsQuery;

    if (packsError) {
      throw new Error(`Failed to fetch active policy packs: ${packsError.message}`);
    }

    console.log(`[seed-bsba-templates] Found ${activePacks?.length || 0} active policy pack(s)`);

    if (!activePacks || activePacks.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          jobName: 'seed-bsba-templates',
          results: {},
          summary: {
            templatesCreated: 0,
            message: institution_code 
              ? `No active policy pack found for ${institution_code}` 
              : 'No active policy packs found',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Process each active pack
    for (const pack of activePacks) {
      const code = pack.institution;
      console.log(`[seed-bsba-templates] Processing ${code} (pack ${pack.id.slice(0, 8)})...`);

      // Get institution ID
      const { data: inst, error: instError } = await supabase
        .from('institutions')
        .select('id')
        .eq('code', code)
        .single();

      if (instError || !inst) {
        results[code] = { 
          inserted: 0, 
          source: 'policy_pack',
          error: `Institution not found: ${instError?.message}` 
        };
        continue;
      }

      // Get institution pricing (use fallback if not found)
      const institutionPricing: InstitutionPricing = institutionPricingMap.get(code) || {
        model: 'per_credit',
        provenanceVerified: false,
        perCreditUsd: FALLBACK_PER_CREDIT_USD,
        feesUsd: 200,
        pricingPackId: undefined,
      };
      
      if (!institutionPricingMap.has(code)) {
        console.warn(`[seed-bsba-templates] No pricing pack for ${code}, using fallback $${FALLBACK_PER_CREDIT_USD}/credit`);
      }

      // Extract policy_data
      const policyData: PolicyData = typeof pack.policy_data === 'object' && pack.policy_data !== null
        ? pack.policy_data as PolicyData
        : {};

      const displayRate = institutionPricing.model === 'flat_term' 
        ? `$${institutionPricing.termCostUsd}/term`
        : `$${institutionPricing.perCreditUsd}/credit`;
      console.log(`[seed-bsba-templates] ${code}: ${institutionPricing.model} model, ${displayRate}`);

      // Generate templates from pack with real pricing
      const genResult = await generateTemplatesFromPack(
        supabase,
        code,
        inst.id,
        policyData,
        pack.id,
        program_code,
        institutionPricing,
        providerRates,
        providerProvenanceVerified
      );

      const insertedCount = (genResult.standard ? 1 : 0) + (genResult.altMax ? 1 : 0);
      
      results[code] = {
        inserted: insertedCount,
        templates: { standard: genResult.standard, altMax: genResult.altMax },
        source: 'policy_pack',
        error: genResult.errors.length > 0 ? genResult.errors.join('; ') : undefined,
      };

      // Log template generation event
      await supabase.from('policy_pack_events').insert({
        institution: code,
        pack_id: pack.id,
        run_id: null,
        event_type: 'templates_generated',
        actor_user_id: null,
        payload: {
          program_code,
          tracks_generated: ['standard', 'alt_max'].filter(t => 
            t === 'standard' ? genResult.standard : genResult.altMax
          ),
          template_ids: [genResult.standard, genResult.altMax].filter(Boolean),
          policy_confidence: pack.confidence_score,
          cost_formula_version: '3.0',
          pricing_model: institutionPricing.model,
        },
      }).then(({ error }) => {
        if (error) console.warn(`[seed-bsba-templates] Failed to log event for ${code}:`, error.message);
      });
    }

    const totalCreated = Object.values(results).reduce((sum, r) => sum + r.inserted, 0);
    console.log(`[seed-bsba-templates] ✅ Complete. Created ${totalCreated} template(s) with real costs`);

    return new Response(
      JSON.stringify({
        success: true,
        jobName: 'seed-bsba-templates',
        results,
        summary: {
          templatesCreated: totalCreated,
          institutionsProcessed: Object.keys(results).length,
          programCode: program_code,
          costFormulaVersion: '3.0',
          providerRatesUsed: Object.fromEntries(providerRates),
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[seed-bsba-templates] ❌ Error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        jobName: 'seed-bsba-templates',
        error: err instanceof Error ? err.message : 'Unknown error',
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
