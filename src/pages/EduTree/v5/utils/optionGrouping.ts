/**
 * Option Grouping Utility
 * Groups marketplace options by equivalency key for cleaner UI display.
 * 
 * Guardrail #2: Grouping is opt-in only - fallback to flat list when:
 * - No equivalency_key exists
 * - Group size is 1 (no alternatives)
 */

import type { ScoreBreakdown, ProviderType } from './optionScoring';

export interface ScoredOption {
  option: {
    id: string;
    courseId: string;
    title: string;
    credits: number;
    provider: string;
    providerType?: ProviderType;
    providerCode?: string;
    level?: number;
    cost_usd: number | null;
    duration_weeks: number | null;
    aceNccrs?: boolean;
    proctored?: boolean;
    equivalency_key?: string;
    // Phase 1 additions
    pace_type?: 'self_paced' | 'cohort';
    start_windows?: string[];
    workload_weekly_hours?: number;
    satisfies_requirements?: string[];
    prereq_course_ids?: string[];
    unlocks_count?: number;
    [key: string]: any;
  };
  score: number;
  breakdown: ScoreBreakdown;
  reason: string;
}

export interface OptionGroup {
  key: string;
  displayTitle: string;
  bestOption: ScoredOption;
  alternatives: ScoredOption[];
  hasMultipleProviders: boolean;
}

export interface GroupingResult {
  groups: OptionGroup[];
  ungrouped: ScoredOption[];
  isGrouped: boolean;
}

/**
 * Groups scored options by equivalency key.
 * Only creates groups when equivalency_key exists AND there are multiple options.
 * 
 * @param scoredOptions - Options with scores attached (not mutated)
 * @returns GroupingResult with groups and ungrouped items
 */
export function groupOptionsByEquivalency(
  scoredOptions: ScoredOption[]
): GroupingResult {
  const groupMap = new Map<string, ScoredOption[]>();
  const ungrouped: ScoredOption[] = [];
  
  // Partition: options with equivalency_key vs without
  for (const scored of scoredOptions) {
    const key = scored.option.equivalency_key;
    
    if (!key) {
      // No equivalency_key - stays ungrouped
      ungrouped.push(scored);
      continue;
    }
    
    const existing = groupMap.get(key) || [];
    groupMap.set(key, [...existing, scored]);
  }
  
  // Build groups only for keys with >1 option
  const groups: OptionGroup[] = [];
  
  for (const [key, options] of groupMap.entries()) {
    if (options.length === 1) {
      // Single option - move to ungrouped (no group UI needed)
      ungrouped.push(options[0]);
      continue;
    }
    
    // Sort by score descending (best first)
    const sorted = [...options].sort((a, b) => b.score - a.score);
    const bestOption = sorted[0];
    
    groups.push({
      key,
      displayTitle: bestOption.option.title,
      bestOption,
      alternatives: sorted.slice(1),
      hasMultipleProviders: hasMultipleProviders(sorted),
    });
  }
  
  // Sort groups by best option score
  groups.sort((a, b) => b.bestOption.score - a.bestOption.score);
  
  // Sort ungrouped by score
  ungrouped.sort((a, b) => b.score - a.score);
  
  return {
    groups,
    ungrouped,
    isGrouped: groups.length > 0,
  };
}

function hasMultipleProviders(options: ScoredOption[]): boolean {
  const providers = new Set(options.map(o => o.option.provider));
  return providers.size > 1;
}

/**
 * Flattens a GroupingResult back to a sorted list.
 * Useful when user wants flat view or for backwards compatibility.
 */
export function flattenGroupingResult(result: GroupingResult): ScoredOption[] {
  const flattened: ScoredOption[] = [];
  
  // Add grouped items (best first, then alternatives)
  for (const group of result.groups) {
    flattened.push(group.bestOption);
    flattened.push(...group.alternatives);
  }
  
  // Add ungrouped
  flattened.push(...result.ungrouped);
  
  // Re-sort by score
  return flattened.sort((a, b) => b.score - a.score);
}
