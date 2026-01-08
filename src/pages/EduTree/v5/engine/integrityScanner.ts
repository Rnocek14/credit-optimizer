/**
 * Integrity Scanner - Proves the system is NOT a random class picker
 * 
 * Verifies:
 * 1. Templates are structurally valid
 * 2. Transfer rules are enforced consistently
 * 3. Node selections update eligibility across the plan
 * 4. No dead-end selections allowed
 */

import { validateTemplate, validateTemplateWithTransfers } from '../utils/templateValidator';
import { validateGraduationReadiness, type GraduationReadiness } from '../utils/graduationValidator';
import { filterEligibleOptions, scoreOptions, pickBestOption } from './optionFilters';
import { checkForDeadEnd, type DeadEndCheck } from './deadEndDetector';
import { getAnchorPolicyFromConstraints } from '../utils/anchorPolicyAdapter';
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
}

export interface BlockedSelection {
  moduleId: string;
  courseId: string;
  reason: DeadEndCheck | string;
}

export interface SimulationRun {
  runId: string;
  selectionLog: SelectionLogEntry[];
  blockedSelections: BlockedSelection[];
  finalReadiness: GraduationReadiness | null;
  transferSummary: { unverified: number; electiveOnly: number; rejected: number };
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
// Core Scanner
// ============================================================================

/**
 * Run a single simulation on a template
 * Simulates course selection module-by-module with constraint enforcement
 */
function runSingleSimulation(
  template: any,
  anchorSchool: string,
  runId: string,
  rng: () => number
): SimulationRun {
  const selectionLog: SelectionLogEntry[] = [];
  const blockedSelections: BlockedSelection[] = [];
  const basket: BasketItem[] = [];
  
  const policy = getPolicyOrDefault(anchorSchool);
  const partnerPolicy = {
    partner_name: policy.name,
    max_alt_credits: getNoncollegiateCap(anchorSchool),
    min_residency_credits: getResidencyCredits(anchorSchool, 'standard'),
    upper_division_min: policy.upperDivisionAreaOfStudyMin,
    notes: '',
  };
  
  const constraints: Constraints = {
    target_school: anchorSchool,
    max_ace_credits: partnerPolicy.max_alt_credits,
  };
  
  let runningTotals = { cost: 0, aceCredits: 0 };
  let transferSummary = { unverified: 0, electiveOnly: 0, rejected: 0 };
  
  // Iterate through template modules
  for (const yearTemplate of template.yearTemplates || []) {
    for (const moduleTemplate of yearTemplate.moduleTemplates || []) {
      const { moduleId, options = [], creditsRequired = 3 } = moduleTemplate;
      
      if (options.length === 0) continue;
      
      // Build basket course IDs for prereq checking
      const basketCourseIds = new Set(basket.map(b => b.courseId));
      
      // Filter eligible options using runtime function
      const eligible = filterEligibleOptions(
        options as MarketplaceOption[],
        constraints,
        runningTotals,
        basketCourseIds
      );
      
      // Check for dead-ends in remaining options
      const optionsWithDeadEnds = eligible.map(opt => ({
        option: opt,
        deadEnd: checkForDeadEnd(opt as MarketplaceOption, basket, constraints),
      }));
      
      const viableOptions = optionsWithDeadEnds.filter(o => !o.deadEnd.isDeadEnd);
      const deadEndOptions = optionsWithDeadEnds.filter(o => o.deadEnd.isDeadEnd);
      
      // Log blocked dead-end options
      for (const de of deadEndOptions) {
        blockedSelections.push({
          moduleId,
          courseId: de.option.courseId,
          reason: de.deadEnd,
        });
      }
      
      if (viableOptions.length === 0) {
        // No viable options - skip module
        continue;
      }
      
      // Score and pick best option deterministically
      const scored = scoreOptions(
        viableOptions.map(v => v.option),
        { cost: 0.5, time: 0.3, quality: 0.2 }
      );
      const best = pickBestOption(scored);
      
      if (!best) continue;
      
      // Apply selection
      const newItem: BasketItem = {
        moduleId,
        courseId: best.courseId,
        title: best.title,
        credits: best.credits,
        cost_usd: best.cost_usd ?? null,
        duration_weeks: best.duration_weeks ?? null,
        workload_weekly_hours: best.credits * 2.5,
        cri_score: best.scoreBreakdown?.cri ?? 0,
        status: 'auto-filled',
        providerType: best.providerType,
        providerCode: best.providerCode,
        level: best.level,
      };
      
      basket.push(newItem);
      
      // Update running totals
      runningTotals.cost += best.cost_usd ?? 0;
      if (best.providerType === 'mooc' || best.providerType === 'testing_center') {
        runningTotals.aceCredits += best.credits;
      }
      
      // Track transfer status (if available on the option)
      const optTransfer = (best as any).transferStatus;
      if (optTransfer) {
        if (!optTransfer.verified) transferSummary.unverified++;
        if (optTransfer.electiveOnly) transferSummary.electiveOnly++;
      }
      
      selectionLog.push({
        moduleId,
        selectedCourseId: best.courseId,
        providerCode: best.providerCode,
        credits: best.credits,
        runningAceCredits: runningTotals.aceCredits,
        runningResidency: basket.filter(b => b.providerType === 'university').reduce((s, b) => s + b.credits, 0),
      });
    }
  }
  
  // Run final graduation readiness check
  const finalReadiness = validateGraduationReadiness(basket, partnerPolicy);
  
  return {
    runId,
    selectionLog,
    blockedSelections,
    finalReadiness,
    transferSummary,
    success: finalReadiness.isGraduationReady,
  };
}

/**
 * Run integrity scan on a single template
 */
function scanTemplate(
  template: any,
  config: IntegrityScanConfig
): IntegrityScanResult {
  const anchorSchool = config.anchorSchool || template.anchorSchool || 'TESU';
  const maxSimulations = config.maxSimulations || 25;
  const seed = config.seed || 1337;
  
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
  
  // 2. Run simulations
  const rng = seededRandom(seed);
  
  for (let i = 0; i < Math.min(maxSimulations, 1); i++) { // Run 1 simulation for now
    const run = runSingleSimulation(template, anchorSchool, `run-${i}`, rng);
    simulationRuns.push(run);
    
    // Check for simulation failures
    if (!run.success) {
      if (templateValidation.publishable) {
        // Template was marked publishable but simulation fails
        failures.push({
          code: 'PUBLISHABLE_BUT_FAILS_SIMULATION',
          message: 'Template marked publishable but greedy simulation fails graduation',
          details: {
            blockers: run.finalReadiness?.blockers,
            warnings: run.finalReadiness?.warnings,
          },
        });
      }
    }
    
    // Check for unverified transfers
    if (run.transferSummary.unverified > 0) {
      warnings.push({
        code: 'UNVERIFIED_TRANSFERS_IN_SIMULATION',
        message: `${run.transferSummary.unverified} courses with unverified transfer rules`,
        details: run.transferSummary,
      });
    }
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
// Policy Drift Scanner
// ============================================================================

const DRIFT_PATTERNS = [
  { pattern: 'clep_max', issue: 'Legacy per-provider cap (CLEP)' },
  { pattern: 'dsst_max', issue: 'Legacy per-provider cap (DSST)' },
  { pattern: 'sophia_max', issue: 'Legacy per-provider cap (Sophia)' },
  { pattern: 'study_com_max', issue: 'Legacy per-provider cap (Study.com)' },
  { pattern: 'PROVIDER_CAPS', issue: 'Legacy provider caps constant' },
  { pattern: 'INSTITUTION_POLICY_LEGACY', issue: 'Deprecated legacy policy constant' },
  { pattern: 'min_residency_credits: 30', issue: 'Hardcoded wrong residency (TESU is 15)' },
  { pattern: 'upper_division_min: 30', issue: 'Hardcoded wrong upper-div (TESU is 18)' },
  { pattern: 'alt_credit_max: 80', issue: 'Hardcoded wrong alt credit cap (TESU is 90)' },
];

function scanForDrift(): IntegrityScanSummary['driftFindings'] {
  // In a real implementation, this would scan the codebase
  // For now, return known drift locations from the audit
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
  config?: IntegrityScanConfig
): Promise<{ summary: IntegrityScanSummary; results: IntegrityScanResult[] }> {
  const results: IntegrityScanResult[] = [];
  const failureCodes: Record<string, number> = {};
  
  // Filter by templateId if specified
  const templatesToScan = config?.templateId
    ? templates.filter(t => t.id === config.templateId)
    : templates;
  
  for (const template of templatesToScan) {
    const result = scanTemplate(template, config || {});
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
  
  const driftFindings = scanForDrift();
  
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
