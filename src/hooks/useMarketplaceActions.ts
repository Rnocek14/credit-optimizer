/**
 * Marketplace Action Executor
 *
 * Translates recommendation action params into real writes:
 * - kind: 'save_to_plan'   → saved_plan_items (soft staging via CrossHub)
 * - kind: 'add_to_edutree' → user_plan_courses (hard placement via DAL)
 * - kind: 'open' | 'navigate' → router navigation
 *
 * Routes on action.kind (stable discriminator), never on label text.
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { insertSavedPlanItem } from '@/shared/lib/api/crosshub';
import { addCourseToUserPlan } from '@/shared/lib/api/userPlanCourses';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { ensureValidSession } from '@/lib/auth';
import type { ParamsMap, ActionKind } from '@/shared/types/intelligence';

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
  /** Course title for toast messages & saved_plan_items */
  title: string;
  /** Optional description */
  description?: string;
  /** Skill tags for CRI analysis */
  skillTags?: string[];
  /** Time estimate string */
  timeEstimate?: string;
  /** Plan ID (required for add_to_edutree) */
  planId?: string;
  /** Requirement ID for targeted block placement */
  requirementId?: string;
}

// ─── Hook ───────────────────────────────────────────────────────

export function useMarketplaceActions(userId?: string) {
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
      queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey.length >= 4 &&
          q.queryKey[0] === 'intelligence' &&
          q.queryKey[1] === userId,
      });
      toast.success(`${variables.title} saved to your Plan!`);
    },
    onError: (err: Error) => {
      toast.error(`Failed to save: ${err.message}`);
    },
  });

  // ── add_to_edutree → user_plan_courses (via DAL) ──────────

  const addToEduTreeMutation = useMutation({
    mutationFn: async (input: ExecuteActionInput) => {
      if (!userId) throw new Error('Authentication required');
      await ensureValidSession(userId);

      const courseId = String(input.action.params?.courseId ?? '');
      const providerId = String(input.action.params?.providerId ?? '');
      if (!courseId) throw new Error('Missing courseId in action params');
      if (!providerId) throw new Error('Missing providerId — course has no provider');
      if (!input.planId) throw new Error('No active plan selected');

      return addCourseToUserPlan({
        plan_id: input.planId,
        course_id: courseId,
        provider_id: providerId,
        requirement_id: input.requirementId ?? null,
        status: 'planned',
      });
    },
    onSuccess: (_, variables) => {
      // Invalidate EduTree queries via canonical keys
      if (variables.planId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PLAN_COURSES(variables.planId) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USER_PLAN_SELECTIONS(variables.planId) });
      }
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.BATCH_REQUIREMENT_OPTIONS([]) });
      // Invalidate intelligence
      queryClient.invalidateQueries({
        predicate: (q) =>
          q.queryKey.length >= 4 &&
          q.queryKey[0] === 'intelligence' &&
          q.queryKey[1] === userId,
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

        case 'add_to_edutree':
          if (!input.planId) {
            toast.error('Select a plan before adding to EduTree');
            return;
          }
          if (!input.action.params?.providerId) {
            toast.error('Course has no provider — cannot add to EduTree');
            return;
          }
          addToEduTreeMutation.mutate(input);
          break;

        case 'open':
        case 'navigate':
          if (action.href) {
            navigate(action.href);
          }
          break;

        default: {
          // Fallback: navigate if href exists
          if (action.href) {
            navigate(action.href);
          }
        }
      }
    },
    [addToPlanMutation, addToEduTreeMutation, navigate],
  );

  return {
    executeAction,
    isExecuting: addToPlanMutation.isPending || addToEduTreeMutation.isPending,
  };
}
