/**
 * usePlanSync — Bridges server plan (user_plan_courses) ↔ Zustand basket.
 *
 * Server is source of truth when authenticated.
 * Basket is the fast UI cache + offline scratchpad.
 *
 * On mount: loads server rows → transforms → seeds basket (one-time hydrate).
 * On basket changes: debounced diff → upsert/delete to server.
 * Loop protection via isHydrating ref + content hash comparison.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePlanBasket, type BasketItem } from '../state/usePlanBasket';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { dbg } from '../utils/dbg';

// ─── Types ──────────────────────────────────────────────────────

interface ServerPlanCourse {
  id: string;
  plan_id: string;
  course_id: string;
  provider_id: string;
  requirement_id: string | null;
  planned_term: string | null;
  status: string;
  notes: string | null;
  credits_earned: number | null;
  cost_paid: number | null;
}

// ─── Helpers ────────────────────────────────────────────────────

/** Hash basket content for change detection (avoids unnecessary syncs) */
function hashBasket(items: BasketItem[]): string {
  return items
    .map(i => `${i.courseId}:${i.moduleId}:${i.credits}`)
    .sort()
    .join('|');
}

/** Convert a server row into a BasketItem (best-effort mapping) */
function serverRowToBasketItem(row: ServerPlanCourse): BasketItem {
  return {
    moduleId: row.requirement_id ?? '__unassigned__',
    courseId: row.course_id,
    credits: row.credits_earned ?? 3, // fallback
    cost_usd: row.cost_paid ?? null,
    duration_weeks: null,
    workload_weekly_hours: (row.credits_earned ?? 3) * 3,
    cri_score: 0,
    status: 'pinned',
    providerCode: row.provider_id,
    source: { type: 'manual' as const },
    // Store server row id for delta sync
    _serverId: row.id,
  } as BasketItem & { _serverId?: string };
}

// ─── Hook ───────────────────────────────────────────────────────

export function usePlanSync(planId: string | null | undefined) {
  const queryClient = useQueryClient();
  const isHydratingRef = useRef(false);
  const lastServerHashRef = useRef<string>('');
  const lastBasketHashRef = useRef<string>('');
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Fetch server plan courses ─────────────────────────────
  const { data: serverCourses, isLoading } = useQuery({
    queryKey: QUERY_KEYS.USER_PLAN_COURSES(planId ?? undefined),
    queryFn: async (): Promise<ServerPlanCourse[]> => {
      if (!planId) return [];
      const { data, error } = await supabase
        .from('user_plan_courses')
        .select('id, plan_id, course_id, provider_id, requirement_id, planned_term, status, notes, credits_earned, cost_paid')
        .eq('plan_id', planId);
      if (error) throw error;
      return (data ?? []) as ServerPlanCourse[];
    },
    enabled: !!planId,
    staleTime: 30_000,
  });

  // ── Hydrate basket from server (one-time on data arrival) ──
  useEffect(() => {
    if (!serverCourses || serverCourses.length === 0) return;

    const serverHash = hashBasket(
      serverCourses.map(serverRowToBasketItem)
    );

    // Skip if we already hydrated this exact server state
    if (serverHash === lastServerHashRef.current) return;

    const currentBasket = usePlanBasket.getState().items;
    const basketHash = hashBasket(currentBasket);

    // Only hydrate if basket is empty OR server has changed since last hydrate
    if (currentBasket.length === 0 || lastServerHashRef.current !== '') {
      dbg('PlanSync', `Hydrating ${serverCourses.length} courses from server`);
      isHydratingRef.current = true;
      lastServerHashRef.current = serverHash;

      const items = serverCourses.map(serverRowToBasketItem);
      // Merge with existing basket items that don't overlap
      const serverCourseIds = new Set(items.map(i => i.courseId));
      const nonOverlapping = currentBasket.filter(i => !serverCourseIds.has(i.courseId));
      const merged = [...nonOverlapping, ...items];

      usePlanBasket.setState({ items: merged });
      lastBasketHashRef.current = hashBasket(merged);

      // Reset hydrating flag after microtask
      queueMicrotask(() => {
        isHydratingRef.current = false;
      });
    }
  }, [serverCourses]);

  // ── Persist basket changes to server (debounced) ──────────
  const persistToServer = useCallback(async () => {
    if (!planId || isHydratingRef.current) return;

    const currentItems = usePlanBasket.getState().items;
    const currentHash = hashBasket(currentItems);

    // Skip if nothing changed
    if (currentHash === lastBasketHashRef.current) return;
    lastBasketHashRef.current = currentHash;

    dbg('PlanSync', `Persisting ${currentItems.length} items to server`);

    try {
      // Simple strategy: delete all + re-insert
      // (More efficient diff-based sync can come later)
      const { error: deleteErr } = await supabase
        .from('user_plan_courses')
        .delete()
        .eq('plan_id', planId);

      if (deleteErr) {
        console.error('[PlanSync] Delete failed:', deleteErr);
        return;
      }

      if (currentItems.length > 0) {
        const rows = currentItems.map(item => ({
          plan_id: planId,
          course_id: item.courseId,
          provider_id: item.providerCode || 'unknown',
          requirement_id: item.moduleId === '__unassigned__' ? null : item.moduleId,
          status: 'planned' as const,
          credits_earned: item.credits,
          cost_paid: item.cost_usd,
          notes: item.title || null,
        }));

        const { error: insertErr } = await supabase
          .from('user_plan_courses')
          .insert(rows);

        if (insertErr) {
          console.error('[PlanSync] Insert failed:', insertErr);
          return;
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

    const unsub = usePlanBasket.subscribe((state) => {
      if (isHydratingRef.current) return;

      // Debounce writes to avoid hammering server
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(persistToServer, 1500);
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
