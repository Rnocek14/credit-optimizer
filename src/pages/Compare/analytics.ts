/**
 * /compare analytics — 5 events only.
 *
 * North-star KPI: compare_view_plan_clicked / compare_viewed
 * (broken down by goal, personalized vs theoretical, top school)
 *
 * Naming rule: lowercase + underscores, stable forever.
 */
import { logEvent } from '@/lib/analytics';
import type { GoalPreference } from '@/hooks/useQuickPlanGeneration';
import type { CreditPickerState, CreditSource } from './types';
import { totalPickerCredits } from './types';
import type { CompareRow } from './buildCompareRows';

type CompareSource = 'get_started' | 'direct';

export function trackCompareViewed(params: {
  careerId: string | null;
  goal: GoalPreference;
  picker: CreditPickerState;
  schoolCount: number;
  source: CompareSource;
}) {
  const total = totalPickerCredits(params.picker);
  logEvent('compare_viewed', {
    career_id: params.careerId,
    goal: params.goal,
    has_picker_values: total > 0,
    picker_total_credits: total,
    school_count_shown: params.schoolCount,
    source: params.source,
  });
}

export function trackCompareGoalChanged(params: {
  fromGoal: GoalPreference;
  toGoal: GoalPreference;
  careerId: string | null;
  picker: CreditPickerState;
}) {
  logEvent('compare_goal_changed', {
    from_goal: params.fromGoal,
    to_goal: params.toGoal,
    career_id: params.careerId,
    picker_total_credits: totalPickerCredits(params.picker),
  });
}

export function trackComparePickerChanged(params: {
  provider: CreditSource;
  newCredits: number;
  oldCredits: number;
  picker: CreditPickerState;
  careerId: string | null;
  goal: GoalPreference;
}) {
  logEvent('compare_picker_changed', {
    provider: params.provider,
    new_credits: params.newCredits,
    old_credits: params.oldCredits,
    picker_total_credits: totalPickerCredits(params.picker),
    career_id: params.careerId,
    goal: params.goal,
  });
}

export function trackCompareRankingsUpdated(params: {
  goal: GoalPreference;
  careerId: string | null;
  picker: CreditPickerState;
  rows: CompareRow[];
  isPersonalized: boolean;
}) {
  const [first, second, third] = params.rows;
  logEvent('compare_rankings_updated', {
    goal: params.goal,
    career_id: params.careerId,
    picker_total_credits: totalPickerCredits(params.picker),
    top_school: first?.school ?? null,
    top_program_id: first?.template.id ?? null,
    second_school: second?.school ?? null,
    third_school: third?.school ?? null,
    is_personalized: params.isPersonalized,
  });
}

export function trackCompareViewPlanClicked(params: {
  school: string;
  programId: string;
  rankPosition: number;
  goal: GoalPreference;
  careerId: string | null;
  picker: CreditPickerState;
  isPersonalized: boolean;
  topSchoolAtClick: string | null;
}) {
  logEvent('compare_view_plan_clicked', {
    school: params.school,
    program_id: params.programId,
    rank_position: params.rankPosition,
    goal: params.goal,
    career_id: params.careerId,
    picker_total_credits: totalPickerCredits(params.picker),
    is_personalized: params.isPersonalized,
    top_school_at_click: params.topSchoolAtClick,
  });
}
