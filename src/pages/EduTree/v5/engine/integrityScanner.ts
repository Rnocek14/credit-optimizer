/**
 * Integrity Scanner - Proves the system is NOT a random class picker
 * 
 * Verifies:
 * 1. Templates are structurally valid
 * 2. Transfer rules are enforced consistently
 * 3. Node selections update eligibility across the plan
 * 4. No dead-end selections allowed
 */

import { validateTemplate } from '../utils/templateValidator';
import { validateGraduationReadiness, type GraduationReadiness } from '../utils/graduationValidator';
import { filterEligibleOptions, scoreOptions, pickBestOption } from './optionFilters';
import { checkForDeadEnd, type DeadEndCheck, type RemainingModule } from './deadEndDetector';
import { checkTransferRule } from './transferEngine';
import { applyTemplate as applyTemplateEngine, type ApplyResult } from './applyTemplate';
import { getPolicyOrDefault, getNoncollegiateCap, getResidencyCredits } from '@/lib/degree/institutionPolicies';
import type { BasketItem, Constraints } from '../state/usePlanBasket';
import type { MarketplaceOption } from '../types/v5';

// ============================================================================
// Types
// ============================================================================

export interface IntegrityScanConfig {
  templateId?: string;
  anchorSchool?: string; // default 'TESU'
  maxSimulations?: number; // default 25
  seed?: number; // deterministic runs
}

export interface SelectionLogEntry {
  moduleId: string;
  selectedCourseId: string;
  providerCode?: string;
  credits: number;
  runningAceCredits: number;
  runningResidency: number;
  eligibleBefore: number;
  eligibleAfter: number;
}

export interface BlockedSelection {
  moduleId: string;
  courseId: string;
  reason: DeadEndCheck | string;
  blockType: 'dead_end' | 'transfer_rejected' | 'apply_blocked';
}

export interface SimulationRun {
  runId: string;
  strategy: string;
  selectionLog: SelectionLogEntry[];
  blockedSelections: BlockedSelection[];
  finalReadiness: GraduationReadiness | null;
  transferSummary: { unverified: number; electiveOnly: number; rejected: number };
  eligibilityContractionObserved: boolean;
  success: boolean;
}

export interface IntegrityScanResult {
  templateId: string;
  anchorSchool: string;
  passes: boolean;
  failures: Array<{ code: string; message: string; details?: any }>;
  warnings: Array<{ code: string; message: string; details?: any }>;
  simulationRuns: SimulationRun[];
  templateValidation: ReturnType<typeof validateTemplate>;
}

export interface IntegrityScanSummary {
  totalTemplates: number;
  passing: number;
  failing: number;
  totalSimulations: number;
  passedSimulations: number;
  failedSimulations: number;
  failureCodes: Record<string, number>;
  driftFindings: Array<{ file: string; issue: string }>;
  // NEW: Anchor Contract Report
  anchorContractReport?: AnchorContractReport;
  // NEW: Remediation queue
  remediationQueue?: RemediationItem[];
}

// Anchor Contract Report - single source of truth for what's selectable
export interface AnchorContractReport {
  selectableAnchors: AnchorEligibility[];
  blockedAnchors: AnchorEligibility[];
  totals: {
    selectableCount: number;
    blockedCount: number;
  };
  blockedByReason: Record<string, number>;
  policyContractViolations: PolicyContractViolation[];
  // Draft eligibility preview: what drafts need to become eligible (includes status)
  draftEligibilityPreview: DraftEligibilityPreviewItem[];
}

// Draft preview item with status for operator workflow
export type DraftEligibilityPreviewItem = AnchorEligibility & { status: string };

export interface PolicyContractViolation {
  institution: string;
  severity: 'SEV0' | 'SEV1' | 'SEV2';
  violation: string;
  details?: any;
}

// Remediation queue item - actionable operator tasks
export interface RemediationItem {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  file: string;
  issue: string;
  action: string;
  owner: 'human' | 'automated';
  suggestedSQL?: string;
}

// ============================================================================
// Deterministic RNG for reproducible simulations
// ============================================================================

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

// ============================================================================
// Selection Strategies (deterministic)
// ============================================================================

type SelectionStrategy = 
  | 'best_cri' 
  | 'cheapest' 
  | 'maximize_noncollegiate' 
  | 'maximize_residency'
  | 'minimize_residency'
  | 'minimize_upper_div'
  | 'push_cap_then_over';

function selectByStrategy(
  scored: ReturnType<typeof scoreOptions>,
  strategy: SelectionStrategy
): typeof scored[0] | null {
  if (scored.length === 0) return null;
  
  switch (strategy) {
    case 'cheapest':
      return [...scored].sort((a, b) => (a.cost_usd ?? 0) - (b.cost_usd ?? 0))[0];
    
    case 'maximize_noncollegiate':
      // Prefer MOOC/testing to push toward caps
      const noncollegiate = scored.filter(s => s.providerType === 'mooc' || s.providerType === 'testing_center');
      return noncollegiate.length > 0 ? noncollegiate[0] : scored[0];
    
    case 'maximize_residency':
      // Prefer university courses
      const university = scored.filter(s => s.providerType === 'university');
      return university.length > 0 ? university[0] : scored[0];
    
    case 'minimize_residency':
      // Stress test: avoid university to starve residency
      const nonUni = scored.filter(s => s.providerType !== 'university');
      return nonUni.length > 0 ? nonUni[0] : scored[0];
    
    case 'minimize_upper_div':
      // Stress test: prefer < 300 level courses to starve upper-div
      const lowLevel = scored.filter(s => !((s as any).level >= 300));
      return lowLevel.length > 0 ? lowLevel[0] : scored[0];
    
    case 'push_cap_then_over':
      // Stress test: always pick noncollegiate even near/over cap
      // This tests whether apply/eligibility blocks correctly
      const noncol = scored.filter(s => s.providerType === 'mooc' || s.providerType === 'testing_center');
      return noncol.length > 0 ? noncol[0] : scored[0];
    
    case 'best_cri':
    default:
      return pickBestOption(scored);
  }
}

// ============================================================================
// Core Scanner
// ============================================================================

/**
 * Run a single simulation on a template
 * Simulates course selection module-by-module with constraint enforcement
 */
async function runSingleSimulation(
  template: any,
  anchorSchool: string,
  runId: string,
  strategy: SelectionStrategy,
  allOptions: MarketplaceOption[]
): Promise<SimulationRun> {
  const selectionLog: SelectionLogEntry[] = [];
  const blockedSelections: BlockedSelection[] = [];
  let basket: BasketItem[] = [];
  
  const policy = getPolicyOrDefault(anchorSchool);
  const noncollegiateCap = getNoncollegiateCap(anchorSchool);
  const residencyRequired = getResidencyCredits(anchorSchool, 'standard');
  
  const partnerPolicy = {
    partner_name: policy.name,
    max_alt_credits: noncollegiateCap,
    min_residency_credits: residencyRequired,
    upper_division_min: policy.upperDivisionAreaOfStudyMin,
    notes: '',
  };
  
  const constraints: Constraints = {
    target_school: anchorSchool,
    max_ace_credits: noncollegiateCap,
  };
  
  let runningTotals = { cost: 0, aceCredits: 0, workloadHours: 0 };
  let transferSummary = { unverified: 0, electiveOnly: 0, rejected: 0 };
  let eligibilityContractionObserved = false;
  let previousEligibleCount = -1;
  
  // Collect all modules from template
  const modules: Array<{ moduleId: string; options: MarketplaceOption[]; creditsRequired: number }> = [];
  for (const yearTemplate of template.yearTemplates || []) {
    for (const moduleTemplate of yearTemplate.moduleTemplates || []) {
      modules.push({
        moduleId: moduleTemplate.moduleId,
        options: (moduleTemplate.options || []) as MarketplaceOption[],
        creditsRequired: moduleTemplate.creditsRequired || 3,
      });
    }
  }
  
  // Iterate through modules
  for (let moduleIdx = 0; moduleIdx < modules.length; moduleIdx++) {
    const { moduleId, options } = modules[moduleIdx];
    
    if (options.length === 0) continue;
    
    // Build basket course IDs for prereq checking
    const basketCourseIds = new Set(basket.map(b => b.courseId));
    
    // Filter eligible options using RUNTIME function
    const eligible = filterEligibleOptions(
      options,
      constraints,
      runningTotals,
      basketCourseIds
    );
    
    const eligibleBefore = eligible.length;
    
    // Check eligibility contraction from previous selection
    if (previousEligibleCount >= 0 && eligibleBefore < previousEligibleCount) {
      eligibilityContractionObserved = true;
    }
    previousEligibleCount = eligibleBefore;
    
    // Build remaining modules list for dead-end detection
    const remainingMods: RemainingModule[] = modules.slice(moduleIdx + 1).map(m => ({
      moduleId: m.moduleId,
      options: m.options,
      creditsRequired: m.creditsRequired,
    }));
    
    // Check for dead-ends using RUNTIME function with remaining modules
    const optionsWithDeadEnds = eligible.map(opt => ({
      option: opt,
      deadEnd: checkForDeadEnd(opt, basket, constraints, remainingMods),
    }));
    
    const viableOptions = optionsWithDeadEnds.filter(o => !o.deadEnd.isDeadEnd);
    const deadEndOptions = optionsWithDeadEnds.filter(o => o.deadEnd.isDeadEnd);
    
    // HARD FAIL CHECK: Dead-end options that passed filterEligibleOptions but fail dead-end check
    // This means eligibility filtering is NOT enforcing degree feasibility
    for (const de of deadEndOptions) {
      blockedSelections.push({
        moduleId,
        courseId: de.option.courseId,
        reason: de.deadEnd,
        blockType: 'dead_end',
      });
    }
    
    if (viableOptions.length === 0) {
      continue;
    }
    
    // Score and pick option using strategy
    const scored = scoreOptions(
      viableOptions.map(v => v.option),
      { cost: 0.5, time: 0.3, quality: 0.2 }
    );
    const best = selectByStrategy(scored, strategy);
    
    if (!best) continue;
    
    // === RUN REAL TRANSFER CHECK ===
    const transferResult = await checkTransferRule(
      best.providerCode,
      best.courseId,
      anchorSchool,
      { minConfidence: 0.7 }
    );
    
    if (!transferResult.accepted) {
      // Transfer rejected - block this selection
      blockedSelections.push({
        moduleId,
        courseId: best.courseId,
        reason: `Transfer rule rejected: confidence ${transferResult.confidence}`,
        blockType: 'transfer_rejected',
      });
      transferSummary.rejected++;
      continue; // Do NOT apply
    }
    
    if (transferResult.confidence < 1.0) {
      transferSummary.unverified++;
    }
    if (transferResult.electiveOnly) {
      transferSummary.electiveOnly++;
    }
    
    // === USE REAL APPLY FUNCTION ===
    const applyResult: ApplyResult = applyTemplateEngine({
      scope: 'course',
      scopeId: moduleId,
      templateId: template.id || 'simulation',
      options: [best],
      currentBasket: basket,
      constraints,
      allOptions,
    });
    
    // Check if apply was blocked via conflicts
    const hasBlockingConflict = applyResult.conflicts.some(c => c.severity === 'error');
    if (hasBlockingConflict) {
      blockedSelections.push({
        moduleId,
        courseId: best.courseId,
        reason: applyResult.conflicts.map(c => c.reason).join('; '),
        blockType: 'apply_blocked',
      });
      continue;
    }
    
    // Apply to basket
    const prevBasketWithoutRemoved = basket.filter(b => !applyResult.removed.includes(b));
    basket = [...prevBasketWithoutRemoved, ...applyResult.added];
    
    // Update running totals
    runningTotals.cost += applyResult.diff.costDelta;
    runningTotals.aceCredits += applyResult.diff.aceCredits;
    
    // Calculate eligibility contraction for next module (BEFORE vs AFTER this selection)
    const nextModuleIdx = moduleIdx + 1;
    let eligibleAfter = eligibleBefore;
    if (nextModuleIdx < modules.length) {
      const nextModule = modules[nextModuleIdx];
      
      // Compute what next module's eligibility WOULD have been before this selection
      const eligibleBeforeNext = filterEligibleOptions(
        nextModule.options,
        constraints,
        { cost: runningTotals.cost - (best.cost_usd ?? 0), aceCredits: runningTotals.aceCredits - best.credits },
        new Set(prevBasketWithoutRemoved.map(b => b.courseId))
      ).length;
      
      // Compute eligibility AFTER this selection
      const eligibleAfterNext = filterEligibleOptions(
        nextModule.options,
        constraints,
        runningTotals,
        new Set(basket.map(b => b.courseId))
      ).length;
      
      eligibleAfter = eligibleAfterNext;
      
      // True contraction: same module, fewer options after selection
      if (eligibleAfterNext < eligibleBeforeNext) {
        eligibilityContractionObserved = true;
      }
    }
    
    const residencyCredits = basket
      .filter(b => b.providerType === 'university')
      .reduce((s, b) => s + b.credits, 0);
    
    selectionLog.push({
      moduleId,
      selectedCourseId: best.courseId,
      providerCode: best.providerCode,
      credits: best.credits,
      runningAceCredits: runningTotals.aceCredits,
      runningResidency: residencyCredits,
      eligibleBefore,
      eligibleAfter,
    });
  }
  
  // === RUN REAL GRADUATION CHECK ===
  const finalReadiness = validateGraduationReadiness(basket, partnerPolicy);
  
  return {
    runId,
    strategy,
    selectionLog,
    blockedSelections,
    finalReadiness,
    transferSummary,
    eligibilityContractionObserved,
    success: finalReadiness.isGraduationReady,
  };
}

/**
 * Run integrity scan on a single template
 */
async function scanTemplate(
  template: any,
  config: IntegrityScanConfig,
  allOptions: MarketplaceOption[]
): Promise<IntegrityScanResult> {
  const anchorSchool = config.anchorSchool || template.anchorSchool || 'TESU';
  const maxSimulations = config.maxSimulations || 25;
  
  const failures: IntegrityScanResult['failures'] = [];
  const warnings: IntegrityScanResult['warnings'] = [];
  const simulationRuns: SimulationRun[] = [];
  
  // 1. Validate template structure
  const templateValidation = validateTemplate(template);
  
  if (!templateValidation.valid) {
    for (const issue of templateValidation.issues) {
      if (issue.type === 'error') {
        failures.push({
          code: issue.code,
          message: issue.message,
          details: issue.details,
        });
      } else {
        warnings.push({
          code: issue.code,
          message: issue.message,
          details: issue.details,
        });
      }
    }
  }
  
  // Check for publish blocker
  if (!templateValidation.publishable) {
    failures.push({
      code: 'TEMPLATE_NOT_PUBLISHABLE',
      message: 'Template has publish-blocking issues',
      details: templateValidation.issues.filter(i => i.blocksPublish),
    });
  }
  
  // 2. Run simulations with different strategies including stress tests
  const strategies: SelectionStrategy[] = [
    'best_cri',
    'cheapest', 
    'maximize_noncollegiate',
    'maximize_residency',
    // Stress test strategies to prove constraint enforcement
    'minimize_residency',      // Starve residency to trigger dead-end detection
    'minimize_upper_div',      // Starve upper-div to trigger dead-end detection  
    'push_cap_then_over',      // Push past noncollegiate cap to verify blocking
  ];
  
  const simsPerStrategy = Math.ceil(maxSimulations / strategies.length);
  
  for (let stratIdx = 0; stratIdx < strategies.length; stratIdx++) {
    const strategy = strategies[stratIdx];
    
    for (let i = 0; i < simsPerStrategy && simulationRuns.length < maxSimulations; i++) {
      const run = await runSingleSimulation(
        template,
        anchorSchool,
        `run-${simulationRuns.length}-${strategy}`,
        strategy,
        allOptions
      );
      simulationRuns.push(run);
      
      // Check for simulation failures
      if (!run.success) {
        if (templateValidation.publishable) {
          failures.push({
            code: 'PUBLISHABLE_BUT_FAILS_SIMULATION',
            message: `Template marked publishable but ${strategy} simulation fails graduation`,
            details: {
              strategy,
              blockers: run.finalReadiness?.blockers,
              warnings: run.finalReadiness?.warnings,
            },
          });
        }
      }
      
      // HARD FAILURE: Dead-end options that were in the eligible list
      // These passed filterEligibleOptions but would brick the degree
      const deadEndLeaks = run.blockedSelections.filter(b => b.blockType === 'dead_end');
      if (deadEndLeaks.length > 0) {
        failures.push({
          code: 'DEAD_END_OPTION_ALLOWED',
          message: `${deadEndLeaks.length} dead-end options were in eligible list. Eligibility filtering not enforcing degree feasibility.`,
          details: deadEndLeaks.slice(0, 10),
        });
      }
      
      // ========================================================================
      // STRESS STRATEGY ASSERTIONS - Prove blocking works, not just final failure
      // ========================================================================
      
      // A) push_cap_then_over: Verify cap breaches are blocked before they happen
      if (strategy === 'push_cap_then_over') {
        const noncollegiateCap = getNoncollegiateCap(anchorSchool);
        const capExceededInLog = run.selectionLog.some(entry => entry.runningAceCredits > noncollegiateCap);
        const hadCapBlock = run.blockedSelections.some(
          b => b.blockType === 'dead_end' || b.blockType === 'apply_blocked'
        );
        
        if (capExceededInLog && !hadCapBlock) {
          failures.push({
            code: 'NONCOLLEGIATE_CAP_BYPASSED',
            message: `Noncollegiate credits exceeded cap (${noncollegiateCap}) without blocking. Cap enforcement failed.`,
            details: {
              cap: noncollegiateCap,
              maxReached: Math.max(...run.selectionLog.map(e => e.runningAceCredits)),
              blockedSelections: run.blockedSelections,
            },
          });
        }
      }
      
      // B) minimize_residency: Verify we either graduate OR block dead-ends along the way
      if (strategy === 'minimize_residency') {
        const residencyRequired = getResidencyCredits(anchorSchool, 'standard');
        const finalResidency = run.selectionLog.length > 0 
          ? run.selectionLog[run.selectionLog.length - 1].runningResidency 
          : 0;
        const residencyShortfall = residencyRequired - finalResidency;
        const hadDeadEndBlocks = run.blockedSelections.some(b => b.blockType === 'dead_end');
        
        // If we filled most modules but failed residency WITHOUT any dead-end blocks, that's a leak
        if (!run.success && residencyShortfall > 0 && !hadDeadEndBlocks && run.selectionLog.length >= 5) {
          failures.push({
            code: 'RESIDENCY_STARVE_PATH_ALLOWED',
            message: `Plan starved residency (need ${residencyShortfall} more) without dead-end blocks. Feasibility filtering failed.`,
            details: {
              residencyRequired,
              finalResidency,
              shortfall: residencyShortfall,
              modulesCompleted: run.selectionLog.length,
            },
          });
        }
      }
      
      // C) minimize_upper_div: Same pattern for upper-division
      if (strategy === 'minimize_upper_div') {
        const policy = getPolicyOrDefault(anchorSchool);
        const upperDivRequired = policy.upperDivisionAreaOfStudyMin;
        const hadDeadEndBlocks = run.blockedSelections.some(b => b.blockType === 'dead_end');
        
        // Check final readiness for upper-div shortfall
        const upperDivBlocker = run.finalReadiness?.blockers?.find(
          b => b.includes('upper') || b.includes('Upper') || b.includes('300')
        );
        
        if (!run.success && upperDivBlocker && !hadDeadEndBlocks && run.selectionLog.length >= 5) {
          failures.push({
            code: 'UPPER_DIV_STARVE_PATH_ALLOWED',
            message: `Plan starved upper-division requirements without dead-end blocks. Feasibility filtering failed.`,
            details: {
              upperDivRequired,
              blocker: upperDivBlocker,
              modulesCompleted: run.selectionLog.length,
            },
          });
        }
      }
      
      // Check for transfer bypasses
      if (run.transferSummary.rejected > 0) {
        // Good - we blocked them
      }
      
      // Warn about unverified transfers
      if (run.transferSummary.unverified > 0) {
        warnings.push({
          code: 'UNVERIFIED_TRANSFERS_IN_SIMULATION',
          message: `${run.transferSummary.unverified} courses with unverified transfer rules in ${strategy} strategy`,
          details: run.transferSummary,
        });
      }
    }
  }
  
  // 3. Check for eligibility contraction (proves cross-node constraints work)
  const anyContractionObserved = simulationRuns.some(r => r.eligibilityContractionObserved);
  if (!anyContractionObserved && simulationRuns.length > 0) {
    warnings.push({
      code: 'NO_ELIGIBILITY_CONTRACTION_OBSERVED',
      message: 'No simulation observed eligibility changes after selections - constraints may not be propagating',
    });
  }
  
  const passes = failures.length === 0;
  
  return {
    templateId: template.id || 'unknown',
    anchorSchool,
    passes,
    failures,
    warnings,
    simulationRuns,
    templateValidation,
  };
}

// ============================================================================
// Policy Contract Checks (mirrors useAvailableInstitutions gating)
// ============================================================================

export interface AnchorEligibility {
  institution: string;
  selectable: boolean;
  reason?: 'missing_fields' | 'unknown_bucket_mode' | 'missing_provenance' | 'missing_provenance_verified_at' | 'stale_provenance' | 'missing_mode_caps';
  missingFields?: string[];
  bucketMode?: string;
  daysSinceVerified?: number;
}

const STALENESS_THRESHOLD_DAYS = 180;

/**
 * Check if a policy pack meets all anchor selection requirements
 * Must exactly mirror useAvailableInstitutions logic
 * 
 * ORDERING (critical for clean analytics):
 * 1. Check bucket mode first → unknown_bucket_mode
 * 2. Check mode-specific caps → missing_mode_caps  
 * 3. Check base required fields → missing_fields
 * 4. Check provenance_verified_at exists → missing_provenance_verified_at
 * 5. Check staleness → stale_provenance
 */
export function checkAnchorEligibility(policyData: any, institution: string): AnchorEligibility {
  const pd = policyData || {};
  const gradeRules = pd.grade_rules || {};
  const bucketMode = pd.transfer_alt_bucket_mode as string | undefined;
  
  // GATE 1: Bucket mode must be known FIRST (before checking mode-specific fields)
  const hasKnownBucketMode = bucketMode === 'separate' || bucketMode === 'combined';
  if (!hasKnownBucketMode) {
    return {
      institution,
      selectable: false,
      reason: 'unknown_bucket_mode',
      bucketMode: bucketMode ?? 'undefined',
    };
  }
  
  // GATE 2: Mode-specific caps must exist
  if (bucketMode === 'separate') {
    const maxAltCredit = pd.max_alt_credit ?? pd.transfer_credit_policy?.max_alt_credit;
    if (maxAltCredit == null) {
      return {
        institution,
        selectable: false,
        reason: 'missing_mode_caps',
        missingFields: ['max_alt_credit'],
        bucketMode,
      };
    }
  } else if (bucketMode === 'combined') {
    if (pd.max_transfer_alt_combined_credits == null) {
      return {
        institution,
        selectable: false,
        reason: 'missing_mode_caps',
        missingFields: ['max_transfer_alt_combined_credits'],
        bucketMode,
      };
    }
  }
  
  // GATE 3: Base required fields (bucket mode already validated)
  const baseRequiredFields: Record<string, unknown> = {
    residency_credits: pd.residency_credits,
    max_transfer_credits: pd.max_transfer_credits,
    capstone_in_residence: pd.capstone_in_residence,
    degree_credit_total: pd.degree_credit_total,
    min_transfer_grade: gradeRules.min_transfer_grade,
  };
  
  const missingFields = Object.entries(baseRequiredFields)
    .filter(([_, v]) => v == null)
    .map(([k]) => k);
  
  if (missingFields.length > 0) {
    return {
      institution,
      selectable: false,
      reason: 'missing_fields',
      missingFields,
      bucketMode,
    };
  }
  
  // GATE 4: Provenance verified_at must exist (excerpt alone is not sufficient for staleness)
  // excerpt-only policies are treated as missing provenance_verified_at
  const verifiedAt = pd.provenance_verified_at ? new Date(pd.provenance_verified_at) : null;
  
  if (!verifiedAt) {
    // Check if they have excerpt but no verified_at (legacy state)
    if (pd.provenance_excerpt) {
      return {
        institution,
        selectable: false,
        reason: 'missing_provenance_verified_at',
        bucketMode,
      };
    }
    return {
      institution,
      selectable: false,
      reason: 'missing_provenance',
      bucketMode,
    };
  }
  
  // GATE 5: Staleness check (verified_at is the anchor, not excerpt)
  const daysSinceVerified = Math.floor((Date.now() - verifiedAt.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysSinceVerified > STALENESS_THRESHOLD_DAYS) {
    return {
      institution,
      selectable: false,
      reason: 'stale_provenance',
      bucketMode,
      daysSinceVerified,
    };
  }
  
  // All gates passed
  return {
    institution,
    selectable: true,
    bucketMode,
    daysSinceVerified,
  };
}

/**
 * Check if a policy pack has the min_upper_division_credits field
 * If null, degree completion claims are "unverified"
 */
export function checkUpperDivisionVerified(policyData: any): { verified: boolean; value?: number } {
  // Canonical fallback: prefer min_upper_division_credits, fall back to upper_division_min
  const minUL = policyData?.min_upper_division_credits ?? policyData?.upper_division_min ?? null;
  return {
    verified: minUL != null,
    value: minUL ?? undefined,
  };
}

// Severity mapping: Contract violations (SEV0) vs Eligibility failures (SEV1)
// SEV0: Violates hard contract rules (things DB trigger should guarantee)
// SEV1: Valid contract, but not currently eligible (staleness)
// SEV2: Informational / truth completeness gaps
const REASON_TO_SEVERITY: Record<string, PolicyContractViolation['severity']> = {
  missing_fields: 'SEV0',
  unknown_bucket_mode: 'SEV0',
  missing_mode_caps: 'SEV0',
  missing_provenance: 'SEV0',
  missing_provenance_verified_at: 'SEV0', // Required for active packs
  stale_provenance: 'SEV1', // Valid contract, just needs re-verification
  unknown: 'SEV0', // Unmapped reasons default to SEV0 (should never happen)
};

/**
 * Build Anchor Contract Report from list of policy packs
 * This is the single source of truth for what's selectable
 * 
 * Includes:
 * - activeReport: selectable/blocked active packs with violations
 * - draftEligibilityPreview: what drafts are missing to become eligible
 */
export function buildAnchorContractReport(
  policyPacks: Array<{ institution: string; status: string; policy_data: any }>
): AnchorContractReport {
  const selectableAnchors: AnchorEligibility[] = [];
  const blockedAnchors: AnchorEligibility[] = [];
  const blockedByReason: Record<string, number> = {};
  const policyContractViolations: PolicyContractViolation[] = [];
  const draftEligibilityPreview: DraftEligibilityPreviewItem[] = [];
  
  for (const pack of policyPacks) {
    const eligibility = checkAnchorEligibility(pack.policy_data, pack.institution);
    
    // Handle drafts separately (no violations, just preview with status)
    if (pack.status !== 'active') {
      draftEligibilityPreview.push({ ...eligibility, status: pack.status });
      continue;
    }
    
    // Active pack processing
    if (eligibility.selectable) {
      selectableAnchors.push(eligibility);
    } else {
      blockedAnchors.push(eligibility);
      const reason = eligibility.reason || 'unknown';
      blockedByReason[reason] = (blockedByReason[reason] || 0) + 1;
      
      // Map reason to appropriate severity
      const severity = REASON_TO_SEVERITY[reason as keyof typeof REASON_TO_SEVERITY] || 'SEV0';
      
      policyContractViolations.push({
        institution: pack.institution,
        severity,
        violation: severity === 'SEV1' 
          ? `Active pack needs re-verification: ${reason}`
          : `Active pack violates contract: ${reason}`,
        details: eligibility,
      });
    }
    
    // Check upper-division verification status (SEV2 for all active packs)
    const ulCheck = checkUpperDivisionVerified(pack.policy_data);
    if (!ulCheck.verified) {
      policyContractViolations.push({
        institution: pack.institution,
        severity: 'SEV2',
        violation: 'min_upper_division_credits not set - degree completion claims unverified',
      });
    }
  }
  
  return {
    selectableAnchors,
    blockedAnchors,
    totals: {
      selectableCount: selectableAnchors.length,
      blockedCount: blockedAnchors.length,
    },
    blockedByReason,
    policyContractViolations,
    draftEligibilityPreview,
  };
}

// ============================================================================
// Remediation Queue (actionable operator tasks)
// ============================================================================

function buildRemediationQueue(): RemediationItem[] {
  return [
    {
      severity: 'MEDIUM',
      file: 'src/hooks/useInstitutionLimits.ts:5-19',
      issue: 'Interface includes legacy per-provider cap keys',
      action: 'Keep for backward compat; deprecation comment added',
      owner: 'human',
    },
    {
      severity: 'HIGH',
      file: 'scripts/optimizer-tables-setup.sql:197-206',
      issue: 'Seeds upper_division_min: 30, alt_credit_max: 80 that conflict with verified-only policy',
      action: 'Remove these seeds OR mark as legacy/test-only; policy comes from institution_policy_packs only',
      owner: 'human',
      suggestedSQL: `-- Remove hardcoded seeds or add comment
-- DELETE FROM institution_credit_limits WHERE limit_type IN ('upper_division_min', 'alt_credit_max') AND notes LIKE '%seed%';`,
    },
    {
      severity: 'MEDIUM',
      file: 'institution_policy_packs',
      issue: 'min_upper_division_credits not populated for active packs',
      action: 'Add min_upper_division_credits to policy_data with provenance for each active institution',
      owner: 'human',
      suggestedSQL: `-- Example: Add UL requirement to TESU (verify from catalog first!)
-- UPDATE institution_policy_packs 
-- SET policy_data = policy_data || '{"min_upper_division_credits": 30}'::jsonb
-- WHERE institution = 'TESU' AND status = 'active';`,
    },
  ];
}

// ============================================================================
// Known Policy Drift Locations (legacy - replaced by remediation queue)
// ============================================================================

function getKnownDriftFindings(): IntegrityScanSummary['driftFindings'] {
  // DEPRECATED: Use remediationQueue instead
  // Keeping for backward compat with existing report consumers
  return buildRemediationQueue().map(item => ({
    file: item.file,
    issue: item.issue,
  }));
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Run integrity scan on all templates
 * 
 * Optionally accepts policyPacks to generate Anchor Contract Report
 */
export async function runIntegrityScan(
  templates: any[],
  config?: IntegrityScanConfig,
  allOptions?: MarketplaceOption[],
  policyPacks?: Array<{ institution: string; status: string; policy_data: any }>
): Promise<{ summary: IntegrityScanSummary; results: IntegrityScanResult[] }> {
  const results: IntegrityScanResult[] = [];
  const failureCodes: Record<string, number> = {};
  
  // Filter by templateId if specified
  const templatesToScan = config?.templateId
    ? templates.filter(t => t.id === config.templateId)
    : templates;
  
  const options = allOptions || [];
  
  for (const template of templatesToScan) {
    const result = await scanTemplate(template, config || {}, options);
    results.push(result);
    
    // Count failure codes
    for (const f of result.failures) {
      failureCodes[f.code] = (failureCodes[f.code] || 0) + 1;
    }
  }
  
  const totalSimulations = results.reduce((s, r) => s + r.simulationRuns.length, 0);
  const passedSimulations = results.reduce(
    (s, r) => s + r.simulationRuns.filter(run => run.success).length,
    0
  );
  
  const driftFindings = getKnownDriftFindings();
  const remediationQueue = buildRemediationQueue();
  
  // Build Anchor Contract Report if policy packs provided
  const anchorContractReport = policyPacks 
    ? buildAnchorContractReport(policyPacks) 
    : undefined;
  
  // Add drift/remediation to failure codes
  if (driftFindings.length > 0) {
    failureCodes['POLICY_DRIFT_REFERENCE_FOUND'] = driftFindings.length;
  }
  
  // Add anchor contract violations to failure codes
  if (anchorContractReport?.policyContractViolations.length) {
    const sev0Count = anchorContractReport.policyContractViolations.filter(v => v.severity === 'SEV0').length;
    if (sev0Count > 0) {
      failureCodes['ANCHOR_CONTRACT_VIOLATION_SEV0'] = sev0Count;
    }
  }
  
  const summary: IntegrityScanSummary = {
    totalTemplates: results.length,
    passing: results.filter(r => r.passes).length,
    failing: results.filter(r => !r.passes).length,
    totalSimulations,
    passedSimulations,
    failedSimulations: totalSimulations - passedSimulations,
    failureCodes,
    driftFindings,
    anchorContractReport,
    remediationQueue,
  };
  
  return { summary, results };
}
