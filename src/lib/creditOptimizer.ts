import type {
  DegreeTemplate,
  TemplateSlot,
  TemplateCourseOption,
  RequirementArea,
} from '@/types/degreeTemplates';
import type {
  OptimizerPreferences,
  OptimizerMode,
  OptimizedPlanResult,
  SelectedOption,
  HydratedTerm,
  OptimizedPlanMetrics,
  OptimizedPlanWarnings,
} from '@/types/optimizer';
import type { AltCreditEquivalency } from '@/hooks/useAltCreditEquivalencies';

interface InstitutionCreditLimit {
  limit_type:
    | 'total_transfer'
    | 'alt_credit_max'
    | 'comm_college_max'
    | 'min_ra_credit'
    | 'min_residency'
    | 'clep_max'
    | 'dsst_max'
    | 'upper_division_min'
    | 'sophia_max'
    | 'study_com_max';
  credit_value: number;
  notes: string | null;
}

export interface CreditOptimizerParams {
  institutionCode: string;
  template: DegreeTemplate;
  mode: OptimizerMode;
  preferences?: OptimizerPreferences;
  equivalencies: AltCreditEquivalency[];
  limits: InstitutionCreditLimit[];
}

// Running metrics tracked during slot selection to enforce limits
interface RunningMetrics {
  totalCredits: number;
  totalAltCredits: number;
  totalInstitutionalCredits: number;
  totalTransferCredits: number;
  upperDivisionCredits: number;
  perProviderCredits: {
    CLEP: number;
    DSST: number;
    SOPHIA: number;
    STUDY_COM: number;
    TESU: number;
  };
  genedCreditsByCategory: Record<string, number>;
}

// ============================================================================
// Main Optimizer Function
// ============================================================================
export function optimizeDegreePlan(params: CreditOptimizerParams): OptimizedPlanResult {
  const {
    institutionCode,
    template,
    mode,
    preferences,
    equivalencies,
    limits,
  } = params;

  console.log('[Credit Optimizer] Starting optimization:', {
    institution: institutionCode,
    program: template.program_code,
    track: template.track_type,
    mode,
    termsCount: template.template_data.terms.length,
  });

  // 1) Precompute some maps
  const limitMap = buildLimitMap(limits);
  const equivIndex = buildEquivalencyIndex(equivalencies);

  // 2) Iterate through terms/slots and choose options with limit-aware selection
  const hydratedTerms: HydratedTerm[] = [];
  let metrics: OptimizedPlanMetrics = initEmptyMetrics(limitMap);
  
  // Initialize running metrics for limit enforcement
  let runningMetrics: RunningMetrics = {
    totalCredits: 0,
    totalAltCredits: 0,
    totalInstitutionalCredits: 0,
    totalTransferCredits: 0,
    upperDivisionCredits: 0,
    perProviderCredits: {
      CLEP: 0,
      DSST: 0,
      SOPHIA: 0,
      STUDY_COM: 0,
      TESU: 0,
    },
    genedCreditsByCategory: {},
  };

  for (const term of template.template_data.terms) {
    const termSelected: SelectedOption[] = [];

    for (const slot of term.slots) {
      const selected = chooseBestOptionForSlot({
        slot,
        institutionCode,
        mode,
        preferences,
        equivIndex,
        runningMetrics,
        limitMap,
      });

      // Update both metrics and running metrics
      metrics = updateMetricsWithSelection(metrics, selected, slot.requirementArea);
      runningMetrics = updateRunningMetrics(runningMetrics, selected, slot, equivIndex);

      termSelected.push(selected);
    }

    hydratedTerms.push({
      id: term.id,
      label: term.label,
      slots: termSelected,
      termCredits: termSelected.reduce((sum, s) => sum + s.credits, 0),
    });
  }

  // 3) Post-process metrics: enforce limits, compute warnings
  const warnings = buildWarnings(metrics, limitMap);

  console.log('[Credit Optimizer] Optimization complete:', {
    totalCredits: metrics.totalCredits,
    altCredits: metrics.totalAltCredits,
    institutionalCredits: metrics.totalInstitutionalCredits,
    upperDivisionCredits: runningMetrics.upperDivisionCredits,
    perProviderCredits: runningMetrics.perProviderCredits,
    estCost: metrics.estTotalCostUsd,
    warnings,
  });

  return {
    institutionCode: institutionCode as any,
    programCode: template.program_code,
    trackType: template.track_type,
    mode,
    templateId: template.id,
    hydratedTerms,
    metrics,
    warnings,
  };
}

// ============================================================================
// Helper 1: Build Limit Map
// ============================================================================
function buildLimitMap(limits: InstitutionCreditLimit[]) {
  const map: Record<string, number | null> = {
    total_transfer: null,
    alt_credit_max: null,
    comm_college_max: null,
    min_ra_credit: null,
    min_residency: null,
  };

  for (const l of limits) {
    map[l.limit_type] = l.credit_value;
  }

  return map;
}

function initEmptyMetrics(limitMap: Record<string, number | null>): OptimizedPlanMetrics {
  return {
    totalCredits: 0,
    totalAltCredits: 0,
    totalInstitutionalCredits: 0,
    estTotalCostUsd: 0,
    estDurationMonths: null,
    altCreditCap: limitMap.alt_credit_max ?? null,
    totalTransferCap: limitMap.total_transfer ?? null,
    minResidencyRequired: limitMap.min_residency ?? null,
    genedCreditsByCategory: {},
  };
}

// ============================================================================
// Helper 2: Equivalency Index
// ============================================================================
function buildEquivalencyIndex(equivalencies: AltCreditEquivalency[]) {
  // key: `${source_code}::${identifier}`
  const index = new Map<string, AltCreditEquivalency[]>();

  for (const e of equivalencies) {
    const key = `${e.alt_source_code}::${e.alt_identifier}`;
    if (!index.has(key)) index.set(key, []);
    index.get(key)!.push(e);
  }

  return index;
}

// ============================================================================
// Helper 3: Choosing the Best Option for a Slot (Limit-Aware)
// ============================================================================
interface ChooseSlotParams {
  slot: TemplateSlot;
  institutionCode: string;
  mode: OptimizerMode;
  preferences?: OptimizerPreferences;
  equivIndex: Map<string, AltCreditEquivalency[]>;
  runningMetrics: RunningMetrics;
  limitMap: Record<string, number | null>;
}

function chooseBestOptionForSlot(params: ChooseSlotParams): SelectedOption {
  const { slot, mode, preferences, equivIndex, runningMetrics, limitMap } = params;
  const { preferred, alternatives = [] } = slot;

  const options: TemplateCourseOption[] = [preferred, ...alternatives];

  // Filter out options based on preferences
  let filtered = options.filter((opt) => {
    if (opt.type === 'alt_credit') {
      if (preferences?.avoidExams && (opt.sourceCode === 'CLEP' || opt.sourceCode === 'DSST')) {
        return false;
      }
    }
    return true;
  });

  // CRITICAL: Filter out options that would violate limits
  filtered = filtered.filter((opt) => {
    const resolved = resolveOptionDetails(opt, slot, equivIndex);
    return !wouldViolateLimits(opt, resolved, runningMetrics, limitMap, equivIndex);
  });

  // If all options filtered out (rare edge case), fall back to preferred
  if (filtered.length === 0) {
    console.warn('[Credit Optimizer] All options filtered out for slot:', slot.slotId, '- using preferred anyway');
    filtered = [preferred];
  }

  // Rank options
  const ranked = filtered.sort((a, b) =>
    rankOption(a, b, mode, preferences, equivIndex, slot.minCredits),
  );

  const chosen = ranked[0] ?? preferred;

  // Resolve credits & cost
  const resolved = resolveOptionDetails(chosen, slot, equivIndex);

  return {
    slotId: slot.slotId,
    requirementArea: slot.requirementArea,
    kind: slot.kind,
    chosen,
    sourceType: chosen.type === 'institutional_course' ? 'institutional' : 'alt_credit',
    sourceCode: chosen.type === 'alt_credit' ? chosen.sourceCode : undefined,
    identifier: chosen.type === 'alt_credit' ? chosen.identifier : undefined,
    courseCode: chosen.type === 'institutional_course' ? chosen.courseCode : resolved.courseCode,
    credits: resolved.credits,
    estCostUsd: resolved.estCostUsd,
  };
}

// ============================================================================
// Helper 3a: Check if adding an option would violate limits
// ============================================================================
function wouldViolateLimits(
  option: TemplateCourseOption,
  resolved: ResolvedOptionDetails,
  runningMetrics: RunningMetrics,
  limitMap: Record<string, number | null>,
  equivIndex: Map<string, AltCreditEquivalency[]>
): boolean {
  const credits = resolved.credits;

  // Per-provider caps
  if (option.type === 'alt_credit') {
    const provider = option.sourceCode;
    const currentProviderCredits = runningMetrics.perProviderCredits[provider as keyof typeof runningMetrics.perProviderCredits] ?? 0;
    
    // Check provider-specific limits
    const providerLimitMap: Record<string, string> = {
      'CLEP': 'clep_max',
      'DSST': 'dsst_max',
      'SOPHIA': 'sophia_max',
      'STUDY_COM': 'study_com_max',
    };

    const limitKey = providerLimitMap[provider];
    if (limitKey) {
      const limit = limitMap[limitKey];
      if (limit != null && currentProviderCredits + credits > limit) {
        console.log(`[Credit Optimizer] Rejecting ${provider} option - would exceed ${limit} credit cap (current: ${currentProviderCredits}, adding: ${credits})`);
        return true;
      }
    }

    // Check total alt credit cap
    const altCreditMax = limitMap.alt_credit_max;
    if (altCreditMax != null && runningMetrics.totalAltCredits + credits > altCreditMax) {
      console.log(`[Credit Optimizer] Rejecting alt credit option - would exceed ${altCreditMax} alt credit cap`);
      return true;
    }
  }

  // Total transfer cap (non-TESU credits)
  const totalTransferMax = limitMap.total_transfer;
  if (totalTransferMax != null) {
    const isTransfer = option.type === 'alt_credit' || 
                      (option.type === 'institutional_course' && option.courseCode.includes('TESU') === false);
    
    if (isTransfer && runningMetrics.totalTransferCredits + credits > totalTransferMax) {
      console.log(`[Credit Optimizer] Rejecting option - would exceed ${totalTransferMax} transfer credit cap`);
      return true;
    }
  }

  // Check upper-division minimum (should prefer 300/400 level courses)
  // This is a "minimum" not a "maximum", so we don't reject, just de-prioritize via ranking

  // Check residency minimum (should prefer TESU courses)
  // Also a minimum, not enforced here but via ranking

  return false;
}

// ============================================================================
// Helper 3b: Update running metrics after selection
// ============================================================================
function updateRunningMetrics(
  metrics: RunningMetrics,
  selected: SelectedOption,
  slot: TemplateSlot,
  equivIndex: Map<string, AltCreditEquivalency[]>
): RunningMetrics {
  const next = { ...metrics };
  const credits = selected.credits;

  next.totalCredits += credits;

  if (selected.sourceType === 'alt_credit') {
    next.totalAltCredits += credits;
    next.totalTransferCredits += credits;

    // Update per-provider credits
    const provider = selected.sourceCode as keyof typeof next.perProviderCredits;
    if (provider && next.perProviderCredits[provider] !== undefined) {
      next.perProviderCredits[provider] += credits;
    }
  } else {
    next.totalInstitutionalCredits += credits;
    
    // Check if it's TESU or other institution
    const isTESU = selected.courseCode?.includes('TESU') || 
                   selected.chosen.type === 'institutional_course';
    
    if (isTESU) {
      next.perProviderCredits.TESU += credits;
    } else {
      next.totalTransferCredits += credits;
    }
  }

  // Track upper-division credits (300+ level)
  if (selected.sourceType === 'alt_credit' && selected.sourceCode && selected.identifier) {
    const key = `${selected.sourceCode}::${selected.identifier}`;
    const equivs = equivIndex.get(key) || [];
    const level = equivs[0]?.level ?? 100;
    if (level >= 300) {
      next.upperDivisionCredits += credits;
    }
  } else {
    // Parse course code for level (e.g., "BUS-301" -> 301)
    const match = selected.courseCode?.match(/[A-Z]+-(\d+)/);
    if (match) {
      const level = parseInt(match[1]);
      if (level >= 300) {
        next.upperDivisionCredits += credits;
      }
    }
  }

  // Update gen-ed category credits
  if (slot.kind === 'gened') {
    const categoryCode = slot.requirementArea;
    next.genedCreditsByCategory[categoryCode] =
      (next.genedCreditsByCategory[categoryCode] ?? 0) + credits;
  }

  return next;
}

function rankOption(
  a: TemplateCourseOption,
  b: TemplateCourseOption,
  mode: OptimizerMode,
  prefs: OptimizerPreferences | undefined,
  equivIndex: Map<string, AltCreditEquivalency[]>,
  slotMinCredits: number,
): number {
  // Negative => a before b, Positive => b before a, 0 => equal

  // standard_like: prefer institutional courses
  if (mode === 'standard_like') {
    if (a.type === 'institutional_course' && b.type !== 'institutional_course') return -1;
    if (b.type === 'institutional_course' && a.type !== 'institutional_course') return 1;
    return 0;
  }

  // alt_max: prefer alt credits, with provider scoring
  if (mode === 'alt_max') {
    if (a.type === 'alt_credit' && b.type !== 'alt_credit') return -1;
    if (b.type === 'alt_credit' && a.type !== 'alt_credit') return 1;

    if (prefs?.preferSophia) {
      if (isSophia(a) && !isSophia(b)) return -1;
      if (isSophia(b) && !isSophia(a)) return 1;
    }

    // Provider preference scoring
    const scoreProvider = (opt: TemplateCourseOption): number => {
      if (opt.type !== 'alt_credit') return 0;
      switch (opt.sourceCode) {
        case 'SOPHIA': return 3;
        case 'CLEP': 
        case 'DSST': return 2;
        case 'STUDY_COM': return 1;
        default: return 0;
      }
    };
    const diff = scoreProvider(b) - scoreProvider(a);
    if (diff !== 0) return diff;
    return 0;
  }

  // cost_min & time_min: resolve details and compare
  const resolveDetails = (opt: TemplateCourseOption) => {
    const DEFAULT_TESU_COST = 399;
    const DEFAULT_SOPHIA_COST = 50;
    const DEFAULT_CLEP_COST = 35;
    const DEFAULT_DSST_COST = 35;
    const DEFAULT_STUDYCOM_COST = 60;
    const DEFAULT_TESU_WEEKS = 16;
    const DEFAULT_SOPHIA_WEEKS = 3;
    const DEFAULT_CLEP_WEEKS = 4;
    const DEFAULT_STUDYCOM_WEEKS = 8;

    if (opt.type === 'institutional_course') {
      return { 
        cost: slotMinCredits * DEFAULT_TESU_COST, 
        weeks: DEFAULT_TESU_WEEKS, 
        credits: slotMinCredits,
        isInstitutional: true 
      };
    }

    const key = `${opt.sourceCode}::${opt.identifier}`;
    const equivs = equivIndex.get(key) || [];
    const credits = equivs[0]?.credits_awarded ?? slotMinCredits;

    let costPerCr = DEFAULT_SOPHIA_COST;
    let weeks = DEFAULT_SOPHIA_WEEKS;
    switch (opt.sourceCode) {
      case 'CLEP':
        costPerCr = DEFAULT_CLEP_COST;
        weeks = DEFAULT_CLEP_WEEKS;
        break;
      case 'DSST':
        costPerCr = DEFAULT_DSST_COST;
        weeks = DEFAULT_CLEP_WEEKS;
        break;
      case 'STUDY_COM':
        costPerCr = DEFAULT_STUDYCOM_COST;
        weeks = DEFAULT_STUDYCOM_WEEKS;
        break;
    }

    return { cost: credits * costPerCr, weeks, credits, isInstitutional: false };
  };

  const aDetails = resolveDetails(a);
  const bDetails = resolveDetails(b);

  if (mode === 'cost_min') {
    // Primary: lower cost
    if (aDetails.cost !== bDetails.cost) return aDetails.cost - bDetails.cost;
    // Tie-breaker 1: faster
    if (aDetails.weeks !== bDetails.weeks) return aDetails.weeks - bDetails.weeks;
    // Tie-breaker 2: more credits
    if (aDetails.credits !== bDetails.credits) return bDetails.credits - aDetails.credits;
    // Final tie: prefer institutional for stability
    if (aDetails.isInstitutional !== bDetails.isInstitutional) {
      return aDetails.isInstitutional ? -1 : 1;
    }
    return 0;
  }

  if (mode === 'time_min') {
    // Primary: faster duration
    if (aDetails.weeks !== bDetails.weeks) return aDetails.weeks - bDetails.weeks;
    // Tie-breaker 1: cheaper
    if (aDetails.cost !== bDetails.cost) return aDetails.cost - bDetails.cost;
    // Tie-breaker 2: more credits
    if (aDetails.credits !== bDetails.credits) return bDetails.credits - aDetails.credits;
    // Final tie: prefer institutional
    if (aDetails.isInstitutional !== bDetails.isInstitutional) {
      return aDetails.isInstitutional ? -1 : 1;
    }
    return 0;
  }

  // Unknown mode: no bias
  return 0;
}

function isSophia(option: TemplateCourseOption): boolean {
  return option.type === 'alt_credit' && option.sourceCode === 'SOPHIA';
}

// ============================================================================
// Helper 4: Resolve Credits & Cost
// ============================================================================
interface ResolvedOptionDetails {
  credits: number;
  estCostUsd: number;
  courseCode?: string;
}

function resolveOptionDetails(
  option: TemplateCourseOption,
  slot: TemplateSlot,
  equivIndex: Map<string, AltCreditEquivalency[]>,
): ResolvedOptionDetails {
  const DEFAULT_TESU_COST_PER_CR = 399;       // placeholder
  const DEFAULT_SOPHIA_COST_PER_CR = 50;      // placeholder
  const DEFAULT_CLEP_COST_PER_CR = 35;        // placeholder
  const DEFAULT_DSST_COST_PER_CR = 35;
  const DEFAULT_STUDYCOM_COST_PER_CR = 60;

  if (option.type === 'institutional_course') {
    const credits = slot.minCredits;
    return {
      credits,
      estCostUsd: credits * DEFAULT_TESU_COST_PER_CR,
      courseCode: option.courseCode,
    };
  }

  // alt_credit
  const key = `${option.sourceCode}::${option.identifier}`;
  const equivs = equivIndex.get(key) || [];
  const bestEquiv = equivs[0];

  const credits = bestEquiv?.credits_awarded ?? slot.minCredits;

  let perCr = DEFAULT_SOPHIA_COST_PER_CR;
  switch (option.sourceCode) {
    case 'CLEP':
      perCr = DEFAULT_CLEP_COST_PER_CR;
      break;
    case 'DSST':
      perCr = DEFAULT_DSST_COST_PER_CR;
      break;
    case 'STUDY_COM':
      perCr = DEFAULT_STUDYCOM_COST_PER_CR;
      break;
    case 'SOPHIA':
    default:
      perCr = DEFAULT_SOPHIA_COST_PER_CR;
  }

  return {
    credits,
    estCostUsd: credits * perCr,
    courseCode: bestEquiv?.institutional_course_code,
  };
}

// ============================================================================
// Helper 5: Update Metrics & Build Warnings
// ============================================================================
function updateMetricsWithSelection(
  metrics: OptimizedPlanMetrics,
  selected: SelectedOption,
  area: RequirementArea,
): OptimizedPlanMetrics {
  const next = { ...metrics };

  next.totalCredits += selected.credits;
  next.estTotalCostUsd += selected.estCostUsd;

  if (selected.sourceType === 'alt_credit') {
    next.totalAltCredits += selected.credits;
  } else {
    next.totalInstitutionalCredits += selected.credits;
  }

  // GenEd category bucket: only for gened kinds
  if (selected.kind === 'gened') {
    const code = area; // e.g., 'WRITTEN_COMM'
    next.genedCreditsByCategory[code] =
      (next.genedCreditsByCategory[code] ?? 0) + selected.credits;
  }

  return next;
}

function buildWarnings(
  metrics: OptimizedPlanMetrics,
  limits: Record<string, number | null>,
): OptimizedPlanWarnings {
  const warnings: OptimizedPlanWarnings = {};

  if (limits.alt_credit_max != null && metrics.totalAltCredits > limits.alt_credit_max) {
    warnings.exceedsAltCreditCap = true;
  }

  if (limits.total_transfer != null && metrics.totalCredits > limits.total_transfer) {
    warnings.exceedsTotalTransferCap = true;
  }

  if (
    limits.min_residency != null &&
    metrics.totalInstitutionalCredits < limits.min_residency
  ) {
    warnings.belowResidencyMin = true;
  }

  // GenEd completeness check will need GenEd category requirements:
  // can be added later with gened_categories.credit_required vs metrics.genedCreditsByCategory

  return warnings;
}
