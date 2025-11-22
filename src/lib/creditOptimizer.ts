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
    | 'upper_division_min';
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

  // 2) Iterate through terms/slots and choose options
  const hydratedTerms: HydratedTerm[] = [];
  let metrics: OptimizedPlanMetrics = initEmptyMetrics(limitMap);

  for (const term of template.template_data.terms) {
    const termSelected: SelectedOption[] = [];

    for (const slot of term.slots) {
      const selected = chooseBestOptionForSlot({
        slot,
        institutionCode,
        mode,
        preferences,
        equivIndex,
      });

      // Update metrics (credits, alt vs institutional, gened buckets)
      metrics = updateMetricsWithSelection(metrics, selected, slot.requirementArea);

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
// Helper 3: Choosing the Best Option for a Slot
// ============================================================================
interface ChooseSlotParams {
  slot: TemplateSlot;
  institutionCode: string;
  mode: OptimizerMode;
  preferences?: OptimizerPreferences;
  equivIndex: Map<string, AltCreditEquivalency[]>;
}

function chooseBestOptionForSlot(params: ChooseSlotParams): SelectedOption {
  const { slot, mode, preferences, equivIndex } = params;
  const { preferred, alternatives = [] } = slot;

  const options: TemplateCourseOption[] = [preferred, ...alternatives];

  // Filter out options based on prefs
  const filtered = options.filter((opt) => {
    if (opt.type === 'alt_credit') {
      if (preferences?.avoidExams && (opt.sourceCode === 'CLEP' || opt.sourceCode === 'DSST')) {
        return false;
      }
      // If preferSophia, we don't filter others here; we'll rank them.
    }
    return true;
  });

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

function rankOption(
  a: TemplateCourseOption,
  b: TemplateCourseOption,
  mode: OptimizerMode,
  prefs: OptimizerPreferences | undefined,
  equivIndex: Map<string, AltCreditEquivalency[]>,
  slotMinCredits: number,
): number {
  // Very simple heuristic for now:
  // - alt_max → alt_credit first, prefer Sophia if preferSophia
  // - standard_like → institutional first
  if (mode === 'standard_like') {
    if (a.type === 'institutional_course' && b.type !== 'institutional_course') return -1;
    if (b.type === 'institutional_course' && a.type !== 'institutional_course') return 1;
  }

  if (mode === 'alt_max') {
    if (a.type === 'alt_credit' && b.type !== 'alt_credit') return -1;
    if (b.type === 'alt_credit' && a.type !== 'alt_credit') return 1;

    if (prefs?.preferSophia) {
      if (isSophia(a) && !isSophia(b)) return -1;
      if (isSophia(b) && !isSophia(a)) return 1;
    }
  }

  // TODO: add cost/time heuristics using resolved equivalencies
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
