/**
 * usePlanSync — Bridges server plan (user_plan_courses) ↔ Zustand basket.
 *
 * Server is source of truth when authenticated.
 * Basket is the fast UI cache + offline scratchpad.
 *
 * On mount: loads server rows → transforms → seeds basket (one-time hydrate).
 * On basket changes: debounced diff → upsert new/changed + delete removed.
 * Loop protection via isHydrating ref + content hash comparison.
 *
 * KEY DESIGN DECISIONS:
 * 1. All server rows hydrate as __unassigned__ unless a proven requirement→module
 *    mapping exists. This prevents ghost completeness.
 * 2. provider_id (UUID) and provider_code (human name) are stored separately.
 * 3. Sync uses diff-based upsert + tombstone delete (never delete-all + re-insert).
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { fetchPlanCoursesWithProvider, type PlanCourseWithProvider } from '@/shared/lib/api/userPlans';
import { usePlanBasket, type BasketItem } from '../state/usePlanBasket';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { dbg } from '../utils/dbg';

// ─── Constants ──────────────────────────────────────────────────

const UNASSIGNED = '__unassigned__';
const SYNC_DEBOUNCE_MS = 1500;

// ─── Helpers ────────────────────────────────────────────────────

/** Deterministic key for a basket item — matches unique(plan_id, course_id) */
function itemKey(courseId: string): string {
  return courseId;
}

/** Hash basket content for change detection */
function hashBasket(items: BasketItem[]): string {
  return items
    .map(i => `${i.courseId}:${i.moduleId}:${i.credits}:${i.providerId ?? ''}`)
    .sort()
    .join('|');
}

/**
 * Convert a server row into a BasketItem.
 *
 * SAFE INTERIM RULE: All items map to __unassigned__ because we cannot
 * confidently map requirement_id → V5 moduleId without a proven mapping table.
 * Users can drag items into modules manually.
 */
function serverRowToBasketItem(row: PlanCourseWithProvider): BasketItem {
  return {
    // Safe: always unassigned until we have a proven mapping
    moduleId: UNASSIGNED,
    courseId: row.course_id,
    credits: row.credits_earned ?? 3,
    cost_usd: row.cost_paid ?? null,
    duration_weeks: null,
    workload_weekly_hours: (row.credits_earned ?? 3) * 3,
    cri_score: 0,
    status: 'pinned',
    // Store BOTH provider fields correctly
    providerId: row.provider_id,
    providerCode: row.provider_code ?? undefined,
    source: { type: 'manual' as const },
    title: row.notes ?? undefined,
  };
}

/** Convert a basket item back to a server row shape for upsert */
function basketItemToServerRow(item: BasketItem, planId: string) {
  return {
    plan_id: planId,
    course_id: item.courseId,
    provider_id: item.providerId || item.providerCode || 'unknown',
    requirement_id: item.moduleId === UNASSIGNED ? null : item.moduleId,
    status: 'planned' as const,
    credits_earned: item.credits,
    cost_paid: item.cost_usd,
    notes: item.title || null,
  };
}

// ─── Hook ───────────────────────────────────────────────────────

export function usePlanSync(planId: string | null | undefined) {
  const queryClient = useQueryClient();
  const isHydratingRef = useRef(false);
  const lastServerHashRef = useRef<string>('');
  const lastBasketHashRef = useRef<string>('');
  const hasHydratedRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Fetch server plan courses (with provider name) ────────
  const { data: serverCourses, isLoading } = useQuery({
    queryKey: QUERY_KEYS.USER_PLAN_COURSES(planId ?? undefined),
    queryFn: () => fetchPlanCoursesWithProvider(planId!),
    enabled: !!planId,
    staleTime: 30_000,
  });

  // ── Reset hydration flag when planId changes ──────────────
  useEffect(() => {
    hasHydratedRef.current = false;
    lastServerHashRef.current = '';
    lastBasketHashRef.current = '';
  }, [planId]);

  // ── Hydrate basket from server ────────────────────────────
  useEffect(() => {
    if (!planId || isLoading || serverCourses === undefined) return;
    if (hasHydratedRef.current) return;

    hasHydratedRef.current = true;
    isHydratingRef.current = true;

    if (serverCourses.length > 0) {
      dbg('PlanSync', `Hydrating ${serverCourses.length} courses from server`);
      const items = serverCourses.map(serverRowToBasketItem);
      usePlanBasket.setState({ items });
      const hash = hashBasket(items);
      lastServerHashRef.current = hash;
      lastBasketHashRef.current = hash;
    } else {
      // Server has 0 rows — respect server as truth, clear basket
      const currentBasket = usePlanBasket.getState().items;
      if (currentBasket.length > 0) {
        dbg('PlanSync', 'Server empty, clearing basket to match');
        usePlanBasket.setState({ items: [] });
      }
      lastServerHashRef.current = '';
      lastBasketHashRef.current = '';
    }

    // Reset hydrating flag after microtask
    queueMicrotask(() => {
      isHydratingRef.current = false;
    });
  }, [planId, serverCourses, isLoading]);

  // ── Diff-based persist to server ──────────────────────────
  const persistToServer = useCallback(async () => {
    if (!planId || isHydratingRef.current) return;

    const currentItems = usePlanBasket.getState().items;
    const currentHash = hashBasket(currentItems);

    // Skip if nothing changed
    if (currentHash === lastBasketHashRef.current) return;
    lastBasketHashRef.current = currentHash;

    dbg('PlanSync', `Persisting ${currentItems.length} items (diff-based)`);

    try {
      // 1. Fetch current server state
      const serverRows = await fetchPlanCoursesWithProvider(planId);
      const serverKeys = new Map(
        serverRows.map(r => [itemKey(r.course_id), r])
      );

      // 2. Build basket key map
      const basketRows = currentItems.map(item => basketItemToServerRow(item, planId));
      const basketKeys = new Set(
        basketRows.map(r => itemKey(r.course_id))
      );

      // 3. Upsert: items in basket (new or changed)
      const toUpsert = basketRows.filter(row => {
        const existing = serverKeys.get(itemKey(row.course_id));
        if (!existing) return true;
        return existing.credits_earned !== row.credits_earned
          || existing.cost_paid !== row.cost_paid
          || existing.provider_id !== row.provider_id;
      });

      if (toUpsert.length > 0) {
        const newRows = toUpsert.filter(r => !serverKeys.has(itemKey(r.course_id)));
        const changedRows = toUpsert.filter(r => serverKeys.has(itemKey(r.course_id)));

        if (newRows.length > 0) {
          const { error } = await supabase
            .from('user_plan_courses')
            .insert(newRows);
          if (error) {
            console.error('[PlanSync] Insert failed:', error);
            return;
          }
        }

        for (const row of changedRows) {
          const existing = serverKeys.get(itemKey(row.course_id));
          if (!existing) continue;
          const { error } = await supabase
            .from('user_plan_courses')
            .update({
              credits_earned: row.credits_earned,
              cost_paid: row.cost_paid,
              provider_id: row.provider_id,
              notes: row.notes,
            })
            .eq('id', existing.id);
          if (error) {
            console.error('[PlanSync] Update failed:', error);
          }
        }
      }

      // 4. Tombstone delete: items on server but not in basket
      const toDelete = serverRows.filter(
        r => !basketKeys.has(itemKey(r.course_id))
      );

      if (toDelete.length > 0) {
        const deleteIds = toDelete.map(r => r.id);
        const { error } = await supabase
          .from('user_plan_courses')
          .delete()
          .in('id', deleteIds);
        if (error) {
          console.error('[PlanSync] Delete failed:', error);
        }
      }

      // Update server hash to prevent re-hydration of our own writes
      lastServerHashRef.current = currentHash;

      // Invalidate queries so other consumers see fresh data
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.USER_PLAN_COURSES(planId),
      });
    } catch (err) {
      console.error('[PlanSync] Persist error:', err);
    }
  }, [planId, queryClient]);

  // ── Subscribe to basket changes ───────────────────────────
  useEffect(() => {
    if (!planId) return;

    const unsub = usePlanBasket.subscribe(() => {
      if (isHydratingRef.current) return;

      // Debounce writes to avoid hammering server
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(persistToServer, SYNC_DEBOUNCE_MS);
    });

    return () => {
      unsub();
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [planId, persistToServer]);

  return {
    isHydrating: isHydratingRef.current,
    isLoading,
    serverCourseCount: serverCourses?.length ?? 0,
  };
}
