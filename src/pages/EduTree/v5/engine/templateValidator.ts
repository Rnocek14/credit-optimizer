import { supabase } from '@/integrations/supabase/client';
import type { ModuleTemplate, TemplateValidation, CanonicalId } from '../types/templates';
import type { BasketItem, Constraints } from '../state/usePlanBasket';
import type { MarketplaceOption } from '../types/exports';
import type { EvidenceSummary } from '@/pages/EduTree/hooks/useUserEvidence'; // Phase 1c
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

type TransferRuleCacheEntry =
  | {
      acceptance_status: 'accepted' | 'elective' | 'rejected';
      target_equiv_code?: string | null;
      confidence?: number | null;
    }
  | null;

const transferRuleCache: Record<string, TransferRuleCacheEntry> = {};

export interface TransferRuleCheckResult {
  accepted: boolean;          // safe to auto-use in templates / planners
  electiveOnly: boolean;      // transfers, but as elective only
  targetEquivCode?: string;   // mapped target course code, if any
  confidence: number;         // 0–1; always present
}

/**
 * Core transfer rule checker used by planners and validators.
 * 
 * Default behavior:
 *  - Institutional courses (provider === target) are always accepted at 1.0 confidence.
 *  - If no rule is found, course is NOT accepted (strict mode).
 *  - Only rules with confidence >= minConfidence are auto-accepted.
 */
async function checkTransferRule(
  providerCode: string | null | undefined,
  courseCode: string,
  targetSchool: string | null | undefined,
  opts?: {
    requirementType?: 'major' | 'elective' | 'genED';
    minConfidence?: number;  // default 0.7
  }
): Promise<TransferRuleCheckResult> {
  const minConfidence = opts?.minConfidence ?? 0.7;
  const requirementType = opts?.requirementType ?? 'major';

  const provider = (providerCode || '').trim().toUpperCase();
  const target = (targetSchool || '').trim().toUpperCase();
  const code = (courseCode || '').trim().toUpperCase();

  // If we don't know the target school, we can't do transfer validation
  if (!target || !code) {
    return {
      accepted: false,
      electiveOnly: false,
      targetEquivCode: undefined,
      confidence: 0,
    };
  }

  const cacheKey = `${provider}|${code}|${target}`;

  // 1) Cache hit
  const cached = transferRuleCache[cacheKey];
  if (cached !== undefined) {
    if (cached === null) {
      // Cached as "no safe rule"
      return {
        accepted: false,
        electiveOnly: false,
        targetEquivCode: undefined,
        confidence: 0,
      };
    }

    const rawConfidence = cached.confidence ?? 0.5;
    const normalizedConfidence = Math.max(0, Math.min(1, rawConfidence));

    const acceptedByStatus =
      cached.acceptance_status === 'accepted' ||
      cached.acceptance_status === 'elective';

    // For major requirements, only accept 'accepted' status
    // For elective/genED requirements, accept both 'accepted' and 'elective'
    const accepted =
      acceptedByStatus && 
      normalizedConfidence >= minConfidence &&
      (requirementType !== 'major' || cached.acceptance_status === 'accepted');

    return {
      accepted,
      electiveOnly: cached.acceptance_status === 'elective',
      targetEquivCode: cached.target_equiv_code || undefined,
      confidence: normalizedConfidence,
    };
  }

  // 2) Institutional courses are always safe
  if (provider && provider === target) {
    transferRuleCache[cacheKey] = {
      acceptance_status: 'accepted',
      confidence: 1.0,
      target_equiv_code: code,
    };

    return {
      accepted: true,
      electiveOnly: false,
      targetEquivCode: code,
      confidence: 1.0,
    };
  }

  // 3) Query transfer rules table
  try {
    const { data, error } = await supabase
      .from('credit_transfer_rules')
      .select('*')
      .eq('source_institution', provider)
      .eq('source_course_code', code)
      .eq('target_institution', target)
      .maybeSingle();

    // PGRST116 = no rows; treat as "no rule"
    if (error && error.code !== 'PGRST116') {
      console.error('[Transfer] Query error:', error);
      // On hard errors, default to "not accepted" (fail safe)
      transferRuleCache[cacheKey] = null;
      return {
        accepted: false,
        electiveOnly: false,
        targetEquivCode: undefined,
        confidence: 0,
      };
    }

    if (!data) {
      // No rule found - strict mode
      transferRuleCache[cacheKey] = null;
      console.warn(`[Transfer] No rule found for ${provider} ${code} -> ${target}`);
      return {
        accepted: false,
        electiveOnly: false,
        targetEquivCode: undefined,
        confidence: 0,
      };
    }

    // Validate acceptance_status before caching
    const acceptanceStatus = data.acceptance_status as 'accepted' | 'elective' | 'rejected';
    if (!['accepted', 'elective', 'rejected'].includes(acceptanceStatus)) {
      console.warn(`[Transfer] Invalid acceptance_status: ${data.acceptance_status}`);
      transferRuleCache[cacheKey] = null;
      return {
        accepted: false,
        electiveOnly: false,
        targetEquivCode: undefined,
        confidence: 0,
      };
    }

    const entry: TransferRuleCacheEntry = {
      acceptance_status: acceptanceStatus,
      target_equiv_code: data.target_course_code,
      confidence: data.confidence,
    };

    transferRuleCache[cacheKey] = entry;

    const rawConfidence = data.confidence ?? 0.5;
    const normalizedConfidence = Math.max(0, Math.min(1, rawConfidence));

    const acceptedByStatus =
      acceptanceStatus === 'accepted' ||
      acceptanceStatus === 'elective';

    // For major requirements, only accept 'accepted' status
    // For elective/genED requirements, accept both 'accepted' and 'elective'
    const accepted =
      acceptedByStatus && 
      normalizedConfidence >= minConfidence &&
      (requirementType !== 'major' || acceptanceStatus === 'accepted');

    if (acceptanceStatus === 'rejected') {
      console.warn(`[Transfer] Rejected: ${provider} ${code} -> ${target}`);
    } else if (normalizedConfidence < minConfidence) {
      console.warn(`[Transfer] Low confidence (${normalizedConfidence}): ${provider} ${code} -> ${target}`);
    }

    return {
      accepted,
      electiveOnly: acceptanceStatus === 'elective',
      targetEquivCode: data.target_course_code || undefined,
      confidence: normalizedConfidence,
    };
  } catch (err) {
    console.error('[Transfer] Unexpected error:', err);
    transferRuleCache[cacheKey] = null;
    return {
      accepted: false,
      electiveOnly: false,
      targetEquivCode: undefined,
      confidence: 0,
    };
  }
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
    const providerCode = String(opt.providerCode || opt.provider || 'UNKNOWN').toUpperCase();
    const targetUpper = String(targetSchool || '').toUpperCase();
    
    // Skip if course is from target school (in-residence)
    if (providerCode === targetUpper) {
      continue;
    }
    
    const rule = await checkTransferRule(providerCode, opt.courseId, targetUpper);
    
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

/**
 * Rank templates by validation score + heuristics
 * Phase 1c: Evidence-aware filtering
 */
export async function rankTemplates(
  templates: ModuleTemplate[],
  basket: BasketItem[],
  constraints: Constraints,
  allOptions: MarketplaceOption[],
  evidence?: EvidenceSummary
): Promise<Array<{ template: ModuleTemplate; validation: TemplateValidation; score: number }>> {
  
  // ✅ Fast path: If no evidence provided, skip filtering and rank all templates
  if (!evidence || (evidence.completed.length === 0 && evidence.inProgress.length === 0)) {
    console.info('[rankTemplates] No evidence provided, ranking all templates without filtering');
    const scored = await Promise.all(
      templates.map(async (t) => {
        const validation = await validateModuleTemplate(t, basket, constraints, allOptions);
        let score = 0;
        
        if (validation.isValid) score += 1000;
        if (validation.canonicalFit.complete) score += 500;
        if (validation.transferStatus?.accepted) score += 300;
        
        const maxCost = 2000;
        score += Math.max(0, 100 - (validation.impact.costDelta / maxCost) * 100);
        
        const maxWeeks = 16;
        score += Math.max(0, 50 - (validation.impact.weeksDelta / maxWeeks) * 50);
        
        score += (validation.impact.criDelta / 100) * 50;
        
        // Stable tie-breaker: deterministic hash to ensure consistent order
        const tieBreaker = [...t.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0) * 1e-6;
        
        return { template: t, validation, score: score + tieBreaker };
      })
    );
    return scored.sort((a, b) => b.score - a.score);
  }

  // ✅ Evidence-aware path: Filter + rank
  const completedIds = new Set((evidence.completed ?? []).map(s => s.toUpperCase()));
  const basketIds = new Set(basket.map(b => b.courseId.toUpperCase()));
  
  // Canonical sets derived from evidence + basket (treat both as "already satisfied")
  const completedCanonical = new Set<string>();
  completedIds.forEach(cid => {
    getCanonicalIds('', cid).forEach(canon => completedCanonical.add(canon));
  });
  basket.forEach(item => {
    const providerCode = (item as any).providerCode || '';
    getCanonicalIds(providerCode, item.courseId).forEach(canon => completedCanonical.add(canon));
  });
  
  // Filter templates by evidence
  const filteredTemplates = templates.map(t => {
    // 1) Direct duplicates: drop options that match completed or in-basket
    const noDupes = t.options.filter(opt => {
      const id = opt.courseId?.toUpperCase() || '';
      return !completedIds.has(id) && !basketIds.has(id);
    });
    
    // 2) Canonical-satisfied: drop options that only satisfy canonicals we already have
    const canonAware = noDupes.filter(opt => {
      const providerCode = opt.providerCode || opt.provider || '';
      const optCanonicals = getCanonicalIds(providerCode, opt.courseId);
      return optCanonicals.length === 0 || optCanonicals.some(c => !completedCanonical.has(c));
    });
    
    return { ...t, options: canonAware };
  })
  .filter(t => t.options.length > 0);

  // Rank filtered templates
  const scored = await Promise.all(
    filteredTemplates.map(async (t) => {
      const validation = await validateModuleTemplate(t, basket, constraints, allOptions);
      let score = 0;
      
      if (validation.isValid) score += 1000;
      if (validation.canonicalFit.complete) score += 500;
      if (validation.transferStatus?.accepted) score += 300;
      
      const maxCost = 2000;
      score += Math.max(0, 100 - (validation.impact.costDelta / maxCost) * 100);
      
      const maxWeeks = 16;
      score += Math.max(0, 50 - (validation.impact.weeksDelta / maxWeeks) * 50);
      
      score += (validation.impact.criDelta / 100) * 50;
      
      // Stable tie-breaker: deterministic hash to ensure consistent order
      const tieBreaker = [...t.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 0) * 1e-6;
      
      return { template: t, validation, score: score + tieBreaker };
    })
  );
  
  return scored.sort((a, b) => b.score - a.score);
}

// ============ Cache Management ============

export function clearTransferRuleCache(): void {
  Object.keys(transferRuleCache).forEach(key => delete transferRuleCache[key]);
}
