import { supabase } from '@/integrations/supabase/client';
import type { ModuleTemplate, TemplateValidation, CanonicalId } from '../types/templates';
import type { BasketItem, Constraints } from '../state/usePlanBasket';
import type { MarketplaceOption } from '../types/exports';
import { resolveChain } from './prereqs';
import { calculateTotals } from '../utils/totalsCalculator';
import { getCanonicalIds } from '../data/canonicalMappings';
import { trackTelemetryEvent } from '@/utils/telemetry';

// ============ Canonical Validation (Always Runs) ============

function validateCanonicalFit(
  template: ModuleTemplate
): { complete: boolean; satisfied: CanonicalId[]; missing: CanonicalId[] } {
  const targetIds = new Set(template.targetCanonicalIds);
  const satisfied = new Set<CanonicalId>();
  
  for (const opt of template.options) {
    const providerCode = opt.providerCode || opt.provider || 'UNKNOWN';
    const canonicalIds = getCanonicalIds(providerCode, opt.courseId);
    canonicalIds.forEach(id => {
      if (targetIds.has(id)) satisfied.add(id);
    });
  }
  
  const missing = Array.from(targetIds).filter(id => !satisfied.has(id));
  
  return {
    complete: missing.length === 0,
    satisfied: Array.from(satisfied),
    missing
  };
}

// ============ Transfer Validation (When Anchor School Set) ============

interface TransferRuleCache {
  [key: string]: { acceptance_status: string; target_equiv_code?: string } | null;
}

const transferRuleCache: TransferRuleCache = {};

async function checkTransferRule(
  providerCode: string,
  courseCode: string,
  targetSchool: string
): Promise<{ accepted: boolean; electiveOnly: boolean; targetEquivCode?: string }> {
  const cacheKey = `${providerCode}|${courseCode}|${targetSchool}`.toUpperCase();
  
  if (transferRuleCache[cacheKey] !== undefined) {
    const cached = transferRuleCache[cacheKey];
    if (!cached) return { accepted: false, electiveOnly: false };
    
    return {
      accepted: cached.acceptance_status === 'accepted',
      electiveOnly: cached.acceptance_status === 'elective',
      targetEquivCode: cached.target_equiv_code
    };
  }
  
  // Phase 1 Stub: Always accept transfers (wire up real rules in Phase 2)
  transferRuleCache[cacheKey] = { acceptance_status: 'accepted' };
  return { accepted: true, electiveOnly: false };
}

async function validateTransferStatus(
  template: ModuleTemplate,
  targetSchool: string
): Promise<{ accepted: boolean; electiveOnly: boolean; unverified: boolean; rejectedCourses: string[] }> {
  const rejectedCourses: string[] = [];
  let hasElectiveOnly = false;
  let hasUnverified = false;
  let allAccepted = true;
  
  for (const opt of template.options) {
    const providerCode = opt.providerCode || opt.provider || 'UNKNOWN';
    
    // Skip if course is from target school (in-residence)
    if (providerCode.toUpperCase() === targetSchool.toUpperCase()) {
      continue;
    }
    
    const rule = await checkTransferRule(providerCode, opt.courseId, targetSchool);
    
    if (!rule.accepted && !rule.electiveOnly) {
      rejectedCourses.push(opt.title || opt.courseId);
      allAccepted = false;
    } else if (rule.electiveOnly) {
      hasElectiveOnly = true;
    }
    
    if (!rule.accepted && !rule.electiveOnly) {
      hasUnverified = true;
    }
  }
  
  return {
    accepted: allAccepted && rejectedCourses.length === 0,
    electiveOnly: hasElectiveOnly,
    unverified: hasUnverified,
    rejectedCourses
  };
}

// ============ Main Validator (Dual-Mode) ============

export async function validateModuleTemplate(
  template: ModuleTemplate,
  basket: BasketItem[],
  constraints: Constraints,
  allOptions: MarketplaceOption[]
): Promise<TemplateValidation> {
  const result: TemplateValidation = {
    isValid: true,
    blockedReasons: [],
    warnings: [],
    canonicalFit: { complete: false, satisfied: [], missing: [] },
    impact: { costDelta: 0, aceDelta: 0, weeksDelta: 0, workloadDelta: 0, criDelta: 0 }
  };
  
  const currentTotals = calculateTotals(basket, constraints);
  const basketIds = new Set(basket.map(b => b.courseId));
  
  // ===== 1. CANONICAL FIT (Always runs) =====
  result.canonicalFit = validateCanonicalFit(template);
  
  if (!result.canonicalFit.complete) {
    result.warnings.push(
      `May not satisfy: ${result.canonicalFit.missing.join(', ')}`
    );
  }
  
  // ===== 2. TRANSFER VALIDATION (Only if anchor school set) =====
  if (constraints.target_school) {
    result.transferStatus = await validateTransferStatus(template, constraints.target_school);
    
    if (!result.transferStatus.accepted) {
      result.isValid = false;
      result.blockedReasons.push(
        `Not accepted by ${constraints.target_school}: ${result.transferStatus.rejectedCourses.join(', ')}`
      );
    } else if (result.transferStatus.electiveOnly) {
      result.warnings.push(`Transfers as elective only at ${constraints.target_school}`);
    }
  }
  
  // ===== 3. EXISTING VALIDATIONS (Prereqs, Budget, ACE, Workload) =====
  for (const opt of template.options) {
    // A. Prerequisites
    if (opt.prereq_course_ids && opt.prereq_course_ids.length > 0) {
      const chain = resolveChain(opt.courseId, allOptions, basket);
      if (chain.unsatisfiable.length > 0) {
        result.isValid = false;
        result.blockedReasons.push(`Missing prerequisites: ${chain.unsatisfiable.join(', ')}`);
      }
    }
    
    // B. Budget
    const newCost = currentTotals.totalCost + (opt.cost_usd ?? 0);
    if (constraints.max_budget_usd && newCost > constraints.max_budget_usd) {
      result.isValid = false;
      result.blockedReasons.push(
        `Exceeds budget by $${(newCost - constraints.max_budget_usd).toFixed(0)}`
      );
    }
    
    // C. ACE cap
    const isAltCredit = opt.providerType === 'mooc' || opt.providerType === 'testing_center';
    if (isAltCredit && constraints.max_ace_credits) {
      const newAce = currentTotals.aceCredits + opt.credits;
      if (newAce > constraints.max_ace_credits) {
        result.isValid = false;
        result.blockedReasons.push(
          `Exceeds ACE cap by ${newAce - constraints.max_ace_credits} credits`
        );
      }
    }
    
    // D. Workload (warning only)
    const workload = opt.workload_weekly_hours ?? (opt.credits * 2.5);
    if (constraints.max_weekly_hours && workload > constraints.max_weekly_hours * 0.8) {
      result.warnings.push(`High workload: ${Math.round(workload)}hrs/week`);
    }
    
    // ===== Calculate Impact Deltas =====
    result.impact.costDelta += (opt.cost_usd ?? 0);
    if (isAltCredit) result.impact.aceDelta += opt.credits;
    result.impact.weeksDelta += (opt.duration_weeks ?? 0);
    result.impact.workloadDelta += workload;
    result.impact.criDelta += (opt.cri_score ?? 0);
  }
  
  // Average CRI delta
  if (template.options.length > 0) {
    result.impact.criDelta = Math.round(result.impact.criDelta / template.options.length);
  }
  
  // Track blocked templates
  if (!result.isValid) {
    void trackTelemetryEvent({
      task: 'template_blocked',
      scope: 'module',
      complexity: {
        templateId: template.id,
        reasons: result.blockedReasons,
        hasTransferIssue: !!result.transferStatus && !result.transferStatus.accepted
      }
    });
  }
  
  return result;
}

// ============ Template Ranking ============

export async function rankTemplates(
  templates: ModuleTemplate[],
  basket: BasketItem[],
  constraints: Constraints,
  allOptions: MarketplaceOption[]
): Promise<Array<{ template: ModuleTemplate; validation: TemplateValidation; score: number }>> {
  const scored = await Promise.all(
    templates.map(async (t) => {
      const validation = await validateModuleTemplate(t, basket, constraints, allOptions);
      let score = 0;
      
      // Priority 1: Validity (1000 points)
      if (validation.isValid) score += 1000;
      
      // Priority 2: Canonical fit (500 points)
      if (validation.canonicalFit.complete) score += 500;
      
      // Priority 3: Transfer acceptance (300 points)
      if (validation.transferStatus?.accepted) score += 300;
      
      // Priority 4: Cost (lower is better, up to 100 points)
      const maxCost = 2000;
      score += Math.max(0, 100 - (validation.impact.costDelta / maxCost) * 100);
      
      // Priority 5: Speed (faster is better, up to 50 points)
      const maxWeeks = 16;
      score += Math.max(0, 50 - (validation.impact.weeksDelta / maxWeeks) * 50);
      
      // Priority 6: CRI (higher is better, up to 50 points)
      score += (validation.impact.criDelta / 100) * 50;
      
      return { template: t, validation, score };
    })
  );
  
  return scored.sort((a, b) => b.score - a.score);
}

// ============ Cache Management ============

export function clearTransferRuleCache(): void {
  Object.keys(transferRuleCache).forEach(key => delete transferRuleCache[key]);
}
