/**
 * Marketplace Action Executor
 *
 * Translates recommendation action params into real writes:
 * - kind: 'save_to_plan'   → saved_plan_items (soft staging via CrossHub DAL)
 * - kind: 'add_to_edutree' → user_plan_courses (hard placement via DAL)
 * - kind: 'open' | 'navigate' → router navigation
 *
 * Routes on action.kind (stable discriminator), never on label text.
 * Accepts optional defaultPlanId so callers don't need to thread planId.
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { insertSavedPlanItem } from '@/shared/lib/api/crosshub';
import { addCourseToUserPlan } from '@/shared/lib/api/userPlanCourses';
import { invalidateEduTreePlan, invalidateUserIntelligence } from '@/shared/lib/intelligence/invalidation';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { ensureValidSession } from '@/lib/auth';
import type { ActionKind, ParamsMap } from '@/shared/types/intelligence';
import { usePlanBasket } from '@/pages/EduTree/v5/state/usePlanBasket';

// ─── Types ──────────────────────────────────────────────────────

export interface ActionPayload {
  kind: ActionKind;
  label: string;
  on?: 'discover' | 'plan' | 'progress' | 'contribute';
  href?: string;
  params?: ParamsMap;
}

interface ExecuteActionInput {
  action: ActionPayload;
  title: string;
  description?: string;
  skillTags?: string[];
  timeEstimate?: string;
  /** Override planId for this specific action (else uses defaultPlanId). */
  planId?: string;
  /** Target requirement block for placement (null = elective/unassigned). */
  requirementId?: string;
}

// ─── Hook ───────────────────────────────────────────────────────

export function useMarketplaceActions(userId?: string, defaultPlanId?: string) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ── save_to_plan → saved_plan_items ────────────────────────

  const addToPlanMutation = useMutation({
    mutationFn: async (input: ExecuteActionInput) => {
      if (!userId) throw new Error('Authentication required');
      await ensureValidSession(userId);

      const courseId = String(input.action.params?.courseId ?? '');
      if (!courseId) throw new Error('Missing courseId in action params');

      return insertSavedPlanItem({
        user_id: userId,
        item_type: 'course',
        item_id: courseId,
        title: input.title,
        description: input.description,
        priority: 'medium',
        estimated_time_to_complete: input.timeEstimate,
        skill_tags: input.skillTags ?? [],
        added_from_hub: 'intelligence',
        status: 'pending',
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.PLAN_ITEMS(userId!, undefined) });
      invalidateUserIntelligence(queryClient, userId!);
      toast.success(`${variables.title} saved to your Plan!`);
    },
    onError: (err: Error) => {
      toast.error(`Failed to save: ${err.message}`);
    },
  });

  // ── add_to_edutree → user_plan_courses (via DAL) ──────────

  const addToEduTreeMutation = useMutation({
    mutationFn: async (input: ExecuteActionInput & { resolvedPlanId: string }) => {
      if (!userId) throw new Error('Authentication required');
      await ensureValidSession(userId);

      const courseId = String(input.action.params?.courseId ?? '');
      const providerId = String(input.action.params?.providerId ?? '');
      if (!courseId) throw new Error('Missing courseId in action params');
      if (!providerId) throw new Error('Missing providerId — course has no provider');

      return addCourseToUserPlan({
        plan_id: input.resolvedPlanId,
        course_id: courseId,
        provider_id: providerId,
        requirement_id: input.requirementId ?? null,
        status: 'planned',
      });
    },
    onSuccess: (_, variables) => {
      invalidateEduTreePlan(queryClient, variables.resolvedPlanId);
      invalidateUserIntelligence(queryClient, userId!);

      // ── Optimistic board update: add to Zustand basket so V5 board renders it instantly ──
      // Safe interim: always __unassigned__ until proven requirement→module mapping exists
      const courseId = String(variables.action.params?.courseId ?? '');
      const providerId = String(variables.action.params?.providerId ?? '');
      usePlanBasket.getState().addItem({
        moduleId: '__unassigned__',
        courseId,
        title: variables.title,
        credits: 3, // best-effort default; sync will reconcile
        cost_usd: null,
        duration_weeks: null,
        workload_weekly_hours: 9,
        cri_score: 0,
        status: 'pinned',
        providerId,        // UUID for DB writes
        providerCode: String(variables.action.params?.providerCode ?? ''),
        source: { type: 'manual' },
      });

      toast.success(`${variables.title} added to your EduTree plan!`);
    },
    onError: (err: Error) => {
      toast.error(`Failed to add to EduTree: ${err.message}`);
    },
  });

  // ── Unified executor ───────────────────────────────────────

  const executeAction = useCallback(
    (input: ExecuteActionInput) => {
      const { action } = input;

      switch (action.kind) {
        case 'save_to_plan':
          addToPlanMutation.mutate(input);
          break;

        case 'add_to_edutree': {
          const resolvedPlanId = input.planId ?? defaultPlanId;
          if (!resolvedPlanId) {
            toast.error('No active plan — create or select a plan first');
            return;
          }
          if (!input.action.params?.providerId) {
            toast.error('Course has no provider — cannot add to EduTree');
            return;
          }
          addToEduTreeMutation.mutate({ ...input, resolvedPlanId });
          break;
        }

        case 'open':
        case 'navigate':
          if (action.href) {
            navigate(action.href);
          }
          break;

        default:
          if (action.href) {
            navigate(action.href);
          }
      }
    },
    [addToPlanMutation, addToEduTreeMutation, navigate, defaultPlanId],
  );

  return {
    executeAction,
    isExecuting: addToPlanMutation.isPending || addToEduTreeMutation.isPending,
  };
}
