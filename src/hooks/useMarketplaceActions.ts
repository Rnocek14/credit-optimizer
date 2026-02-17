/**
 * Marketplace Action Executor
 *
 * Translates recommendation action params into real writes:
 * - "Add to Plan"    → saved_plan_items (soft staging via CrossHub)
 * - "Add to EduTree" → user_plan_courses (hard placement)
 *
 * Single handler consumed by any UI that renders recommendation actions.
 */

import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { insertSavedPlanItem } from '@/shared/lib/api/crosshub';
import { supabase } from '@/integrations/supabase/client';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { ensureValidSession } from '@/lib/auth';
import type { ParamsMap } from '@/shared/types/intelligence';

// ─── Types ──────────────────────────────────────────────────────

export interface ActionPayload {
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
}

// ─── Hook ───────────────────────────────────────────────────────

export function useMarketplaceActions(userId?: string) {
  const queryClient = useQueryClient();

  // ── Add to Plan (soft staging → saved_plan_items) ──────────

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

  // ── Add to EduTree (hard placement → user_plan_courses) ────

  const addToEduTreeMutation = useMutation({
    mutationFn: async (input: ExecuteActionInput & { planId: string; requirementId?: string; providerId: string }) => {
      if (!userId) throw new Error('Authentication required');
      await ensureValidSession(userId);

      const courseId = String(input.action.params?.courseId ?? '');
      if (!courseId) throw new Error('Missing courseId in action params');

      const { data, error } = await supabase
        .from('user_plan_courses')
        .insert({
          plan_id: input.planId,
          requirement_id: input.requirementId ?? null,
          course_id: courseId,
          provider_id: input.providerId,
          status: 'planned',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate EduTree queries
      queryClient.invalidateQueries({ queryKey: ['user-plan-courses', variables.planId] });
      queryClient.invalidateQueries({ queryKey: ['user-plan-selections', variables.planId] });
      queryClient.invalidateQueries({ queryKey: ['batch-requirement-options'] });
      queryClient.invalidateQueries({ queryKey: ['req-opt-batch'] });
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
    (input: ExecuteActionInput & { planId?: string; requirementId?: string; providerId?: string }) => {
      const { action } = input;

      // Navigation-only actions (Open Course, View Gap, etc.)
      if (action.href && !action.params) {
        window.location.href = action.href;
        return;
      }

      switch (action.label) {
        case 'Add to Plan':
          addToPlanMutation.mutate(input);
          break;

        case 'Add to EduTree': {
          if (!input.planId || !input.providerId) {
            toast.error('Select a plan and provider before adding to EduTree');
            return;
          }
          addToEduTreeMutation.mutate({
            ...input,
            planId: input.planId!,
            providerId: input.providerId!,
          });
          break;
        }

        default:
          // Fallback: navigate if href exists
          if (action.href) {
            window.location.href = action.href;
          }
      }
    },
    [addToPlanMutation, addToEduTreeMutation],
  );

  return {
    executeAction,
    isExecuting: addToPlanMutation.isPending || addToEduTreeMutation.isPending,
  };
}
