/**
 * useCompareUrlState — read/write goal + career + credit picker to ?query.
 *
 * URL shape:  /compare?goal=balanced&career=data-analyst&clep=12&sophia=30
 *
 * - Zero-credit sources are omitted from the URL for cleanliness.
 * - 'balanced' goal is the default and omitted.
 * - All updates use replace=true to avoid spamming history on slider drag.
 */
import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CREDIT_SOURCES,
  CREDIT_SOURCE_META,
  EMPTY_PICKER,
  type CreditPickerState,
  type CreditSource,
} from '../types';
import type { GoalPreference } from '@/hooks/useQuickPlanGeneration';

const VALID_GOALS: ReadonlySet<GoalPreference> = new Set(['cheapest', 'fastest', 'balanced']);

export interface CompareUrlState {
  goal: GoalPreference;
  careerId: string | null;
  picker: CreditPickerState;
}

export function useCompareUrlState() {
  const [params, setParams] = useSearchParams();

  const state = useMemo<CompareUrlState>(() => {
    const rawGoal = params.get('goal');
    const goal: GoalPreference =
      rawGoal && VALID_GOALS.has(rawGoal as GoalPreference)
        ? (rawGoal as GoalPreference)
        : 'balanced';

    const career = params.get('career');

    const picker: CreditPickerState = { ...EMPTY_PICKER };
    for (const src of CREDIT_SOURCES) {
      const raw = params.get(CREDIT_SOURCE_META[src].urlKey);
      const n = raw == null ? 0 : Number.parseInt(raw, 10);
      if (Number.isFinite(n) && n > 0) {
        picker[src] = Math.min(CREDIT_SOURCE_META[src].max, Math.max(0, n));
      }
    }

    return { goal, careerId: career, picker };
  }, [params]);

  const writeState = useCallback(
    (next: Partial<CompareUrlState>) => {
      const merged: CompareUrlState = {
        goal: next.goal ?? state.goal,
        careerId: next.careerId !== undefined ? next.careerId : state.careerId,
        picker: next.picker ?? state.picker,
      };

      const sp = new URLSearchParams();
      if (merged.goal && merged.goal !== 'balanced') sp.set('goal', merged.goal);
      if (merged.careerId) sp.set('career', merged.careerId);
      for (const src of CREDIT_SOURCES) {
        const v = merged.picker[src];
        if (v > 0) sp.set(CREDIT_SOURCE_META[src].urlKey, String(v));
      }
      setParams(sp, { replace: true });
    },
    [setParams, state]
  );

  const setGoal = useCallback(
    (goal: GoalPreference) => writeState({ goal }),
    [writeState]
  );
  const setPicker = useCallback(
    (picker: CreditPickerState) => writeState({ picker }),
    [writeState]
  );

  return { state, setGoal, setPicker };
}

/** Helper for callers that want to detect "user has touched the picker". */
export function isPickerActive(picker: CreditPickerState): boolean {
  return CREDIT_SOURCES.some((s: CreditSource) => picker[s] > 0);
}
