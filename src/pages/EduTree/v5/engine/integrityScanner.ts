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

type SelectionStrategy = 'best_cri' | 'cheapest' | 'maximize_noncollegiate' | 'maximize_residency';

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
  
  // 2. Run simulations with different strategies
  const strategies: SelectionStrategy[] = [
    'best_cri',
    'cheapest', 
    'maximize_noncollegiate',
    'maximize_residency',
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
// Known Policy Drift Locations (static audit results)
// ============================================================================

function getKnownDriftFindings(): IntegrityScanSummary['driftFindings'] {
  // These are known drift locations from manual audit
  // A real CI/CD check would grep the codebase
  return [
    { file: 'src/pages/EduTree/v5/engine/constraints.ts:253-270', issue: 'Hardcoded providerLimits for CLEP/DSST/Sophia/Study.com' },
    { file: 'src/lib/creditOptimizer.ts:292-306', issue: 'providerLimitMap uses legacy clep_max, dsst_max keys' },
    { file: 'src/hooks/useInstitutionLimits.ts:5-19', issue: 'Interface includes legacy per-provider cap keys' },
    { file: 'scripts/optimizer-tables-setup.sql:197-206', issue: 'Seeds wrong upper_division_min: 30, alt_credit_max: 80' },
  ];
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Run integrity scan on all templates
 */
export async function runIntegrityScan(
  templates: any[],
  config?: IntegrityScanConfig,
  allOptions?: MarketplaceOption[]
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
  
  // Add drift to failure codes if found
  if (driftFindings.length > 0) {
    failureCodes['POLICY_DRIFT_REFERENCE_FOUND'] = driftFindings.length;
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
  };
  
  return { summary, results };
}
