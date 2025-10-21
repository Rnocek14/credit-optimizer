import type { BasketItem, Constraints } from '../state/usePlanBasket';
import type { ScoringWeights } from '../utils/optionScoring';
import type { ProviderType } from '../types/v5';

export interface ModuleData {
  id: string;
  marketplaceOptions?: any[];
}

interface AutoCompleteOption {
  courseId: string;
  credits: number;
  cost_usd: number | null;
  duration_weeks: number | null;
  score?: number;
  scoreBreakdown?: {
    cri: number;
    cost: number;
    time: number;
    quality: number;
    total: number;
  };
  providerType?: ProviderType;
  prereq_course_ids?: string[];
}

export type AutoCompleteStatus = 'ok' | 'partial' | 'none';

export interface AutoCompleteResult {
  suggestions: BasketItem[];
  reasoning: Map<string, string>; // courseId -> human explanation
  status: AutoCompleteStatus;
}

export function autoCompletePlan(
  modules: ModuleData[],
  currentBasket: BasketItem[],
  constraints: Constraints,
  weights: ScoringWeights
): AutoCompleteResult {
  // Early return for empty degree (no data vs constraints block)
  if (modules.length === 0) {
    console.warn('[AutoComplete] No modules provided');
    return {
      suggestions: [],
      reasoning: new Map(),
      status: 'none'
    };
  }

  const suggestions: BasketItem[] = [];
  const reasoning = new Map<string, string>();
  
  // Track running totals
  let runningCost = currentBasket.reduce((sum, i) => sum + (i.cost_usd ?? 0), 0);
  let runningAceCredits = currentBasket
    .filter(i => i.providerType === 'mooc' || i.providerType === 'testing_center')
    .reduce((sum, i) => sum + i.credits, 0);
  
  // Find modules not yet satisfied
  const unfilledModules = modules.filter(m => {
    const alreadyFilled = currentBasket.some(b => b.moduleId === m.id);
    return !alreadyFilled && (m.marketplaceOptions?.length ?? 0) > 0;
  });
  
  for (const module of unfilledModules) {
    const eligible = (module.marketplaceOptions || []).filter((opt: AutoCompleteOption) => {
      // Budget check
      if (constraints.max_budget_usd) {
        const newCost = runningCost + (opt.cost_usd ?? 0);
        if (newCost > constraints.max_budget_usd) return false;
      }
      
      // CRI floor check
      if (constraints.min_cri_score && (opt.scoreBreakdown?.cri ?? 0) < constraints.min_cri_score) {
        return false;
      }
      
      // Transfer cap check
      const isAltCredit = opt.providerType === 'mooc' || opt.providerType === 'testing_center';
      if (isAltCredit && constraints.max_ace_credits) {
        const newAceCredits = runningAceCredits + opt.credits;
        if (newAceCredits > constraints.max_ace_credits) return false;
      }
      
      // Prerequisite check
      if (opt.prereq_course_ids?.length) {
        const basketCourseIds = new Set([
          ...currentBasket.map(b => b.courseId),
          ...suggestions.map(s => s.courseId)
        ]);
        const prereqsMet = opt.prereq_course_ids.every(pid => basketCourseIds.has(pid));
        if (!prereqsMet) return false;
      }
      
      return true;
    });
    
    if (eligible.length === 0) {
      console.warn(`[AutoComplete] No eligible options for module ${module.id} under constraints`);
      continue;
    }
    
    // Pick best: highest score → highest CRI → lowest cost → shortest duration
    const best = eligible.reduce((a: AutoCompleteOption, b: AutoCompleteOption) => {
      if ((b.score ?? 0) > (a.score ?? 0)) return b;
      if ((b.score ?? 0) === (a.score ?? 0)) {
        const aCRI = a.scoreBreakdown?.cri ?? 0;
        const bCRI = b.scoreBreakdown?.cri ?? 0;
        if (bCRI > aCRI) return b;
        if (bCRI === aCRI) {
          const aCost = a.cost_usd ?? Infinity;
          const bCost = b.cost_usd ?? Infinity;
          if (bCost < aCost) return b;
          if (bCost === aCost) {
            return (b.duration_weeks ?? 999) < (a.duration_weeks ?? 999) ? b : a;
          }
        }
      }
      return a;
    });
    
    // Generate reasoning (scores are 0-100 scale)
    const reasons: string[] = [];
    if ((best.score ?? 0) >= 80) reasons.push('Top-rated match');
    if ((best.scoreBreakdown?.cri ?? 0) >= 85) reasons.push(`${best.scoreBreakdown!.cri}% transfer safety`);
    if ((best.cost_usd ?? Infinity) === Math.min(...eligible.map((o: AutoCompleteOption) => o.cost_usd ?? Infinity))) {
      reasons.push('Lowest cost');
    }
    if ((best.duration_weeks ?? 999) <= 8) reasons.push('Fast completion');
    if (constraints.max_budget_usd && runningCost + (best.cost_usd ?? 0) < constraints.max_budget_usd * 0.9) {
      reasons.push('Fits budget');
    }
    
    const reasonText = reasons.length > 0 
      ? `Chosen: ${reasons.join(', ')}` 
      : 'Best available under constraints';
    
    reasoning.set(best.courseId, reasonText);
    
    // Add to suggestions
    suggestions.push({
      moduleId: module.id,
      courseId: best.courseId,
      credits: best.credits,
      cost_usd: best.cost_usd,
      duration_weeks: best.duration_weeks,
      workload_weekly_hours: best.credits * 2.5, // estimate
      cri_score: best.scoreBreakdown?.cri ?? 0,
      status: 'auto-filled',
      providerType: best.providerType,
      autoFillReason: reasonText // Phase 1b: inline reasoning
    });
    
    // Update running totals
    runningCost += (best.cost_usd ?? 0);
    if (best.providerType === 'mooc' || best.providerType === 'testing_center') {
      runningAceCredits += best.credits;
    }
  }
  
  // Calculate status
  const unfilledCount = unfilledModules.length;
  const status: AutoCompleteStatus =
    suggestions.length === 0
      ? 'none'
      : suggestions.length < unfilledCount
        ? 'partial'
        : 'ok';
  
  return { suggestions, reasoning, status };
}
