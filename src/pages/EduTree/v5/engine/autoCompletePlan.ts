// src/pages/EduTree/v5/engine/autoCompletePlan.ts
import type {
  BasketItem,
  Constraints,
  MarketplaceOption,
  ModuleData,
  ScoringWeights,
} from '../types/exports';

import { calculateTotals } from '../utils/totalsCalculator';
import {
  filterEligibleOptions,
  scoreOptions,
  pickBestOption,
  withinConstraints,
} from './optionFilters';
import { resolveChain } from './prereqs';

export interface PlanAutoCompleteResult {
  suggestions: BasketItem[];
  reasoning: string[];
  status: 'ok' | 'partial' | 'none';
  totals: { totalCost: number; totalWeeks: number; totalWorkloadHours: number; aceCredits: number };
  stoppedReason?: string;
}

/** Convert an option to a BasketItem for a given moduleId */
function toBasketItem(moduleId: string, opt: MarketplaceOption, isPrereq = false): BasketItem {
  return {
    // Put prerequisites into a neutral bucket so they don't masquerade
    // as part of the current module (cleaner UI/compare)
    moduleId: isPrereq ? 'prereqs' : moduleId,
    courseId: opt.courseId,
    title: opt.title ?? opt.courseId,
    credits: opt.credits ?? 0,
    cost_usd: opt.cost_usd ?? 0,
    duration_weeks: opt.duration_weeks ?? 8,
    workload_weekly_hours: opt.workload_weekly_hours ?? (opt.credits ? opt.credits * 2.5 : 0),
    cri_score: opt.cri_score ?? (opt.scoreBreakdown?.cri ?? 0),
    providerType: opt.providerType,
    providerCode: opt.providerCode, // ✅ Phase 1: Add provider code for transfer validation
    level: opt.level, // ✅ Phase 1: Add level for upper-division tracking
    status: 'auto-filled',
    autoFillReason: isPrereq ? 'Required prerequisite' : (opt.autoFillReason ?? inferReason(opt)),
  };
}

/** Simple human-readable reason from scoring metadata */
function inferReason(opt: MarketplaceOption): string {
  const br = opt.scoreBreakdown;
  if (!br) return 'Best available match';
  
  // Determine which factor contributed most to this pick
  if (br.cri >= 85) return 'Top-rated match';
  if (br.cost >= 80) return 'Budget-friendly choice';
  if (br.time >= 80) return 'Fast completion';
  return 'Quality pick';
}

export function autoCompletePlan(
  modules: ModuleData[],
  basket: BasketItem[],
  constraints: Constraints,
  weights: ScoringWeights
): PlanAutoCompleteResult {
  const suggestions: BasketItem[] = [];
  const reasoning: string[] = [];
  let status: PlanAutoCompleteResult['status'] = 'ok';
  let stoppedReason: string | undefined;

  const allOptions: MarketplaceOption[] = modules.flatMap(m => m.marketplaceOptions ?? []);
  const basketIds = new Set<string>(basket.map(b => b.courseId));

  // Running totals derived from basket + current suggestions
  const computeRunning = () => {
    const totals = calculateTotals([...basket, ...suggestions], constraints);
    return {
      cost: totals.totalCost,
      aceCredits: totals.aceCredits,
      workloadHours: totals.totalWorkloadHours,
    };
  };

  const unfilled = modules.filter(m => (m.creditsRequired - m.creditsEarned) > 0);

  for (const mod of unfilled) {
    const options = (mod.marketplaceOptions ?? []);
    if (options.length === 0) continue;

    // Filter eligible options
    const runningBefore = computeRunning();
    const eligible = filterEligibleOptions(options, constraints, runningBefore, basketIds);

    if (eligible.length === 0) {
      continue;
    }

    // Score and pick best (convert 3-weight to optionScoring's quality format)
    const scoringWeights = {
      cost: weights.cost,
      time: weights.time,
      quality: weights.cri, // map cri to quality for optionScoring
    };
    const scored = scoreOptions(eligible, scoringWeights);
    const best = pickBestOption(scored);
    if (!best) continue;

    // Resolve missing prereqs for this best choice
    const chain = resolveChain(best.courseId, allOptions, [...basket, ...suggestions]);
    
    // Check for unsatisfiable prereqs
    if (chain.unsatisfiable.length > 0) {
      // Skip this option if prereqs can't be satisfied
      continue;
    }

    const chainOptions = chain.chain
      .map(cid => allOptions.find(o => o.courseId === cid))
      .filter(Boolean) as MarketplaceOption[];

    const toAddOptions: MarketplaceOption[] = [...chainOptions, best];

    // Validate incremental constraints
    const runningAfter = computeRunning();
    const within = withinConstraints(toAddOptions, runningAfter, constraints);
    
    if (!within) {
      status = suggestions.length ? 'partial' : 'none';
      stoppedReason = `Constraints limit reached while filling module ${mod.id}`;
      break;
    }

    // Commit: add prereqs first, then target — skip duplicates explicitly
    for (const opt of toAddOptions) {
      if (basketIds.has(opt.courseId)) continue; // Explicit duplicate prevention
      
      const isPrereq = chainOptions.includes(opt);
      const item = toBasketItem(mod.id, opt, isPrereq);
      
      suggestions.push(item);
      basketIds.add(item.courseId);
      reasoning.push(item.autoFillReason ?? (isPrereq ? 'Required prerequisite' : 'Best available match'));
    }
  }

  // Finalize totals
  const totals = calculateTotals([...basket, ...suggestions], constraints);
  if (suggestions.length === 0) status = 'none';

  return {
    suggestions,
    reasoning,
    status,
    totals: {
      totalCost: totals.totalCost,
      totalWeeks: totals.totalWeeks,
      totalWorkloadHours: totals.totalWorkloadHours,
      aceCredits: totals.aceCredits,
    },
    stoppedReason,
  };
}
