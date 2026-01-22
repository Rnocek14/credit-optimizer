import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchPlanInvariants,
  fetchRequirementEligibility,
  type PlanInvariantResult,
  type RequirementEligibilityResult,
} from "@/lib/planValidation";

/**
 * Query key factory for plan validation queries
 */
export const planValidationKeys = {
  invariants: (planId?: string, persist?: boolean) =>
    ["plan-invariants", planId, persist] as const,
  eligibility: (planId?: string, blockId?: string) =>
    ["requirement-eligibility", planId, blockId] as const,
  allEligibility: (planId?: string) =>
    ["requirement-eligibility", planId] as const,
};

/**
 * Fetch and cache plan invariant validation results
 * 
 * @param planId - The plan to validate
 * @param persist - Whether to persist violations to DB (default: true)
 * @returns Query result with ok/violations/totals
 */
export function usePlanInvariants(planId?: string, persist = true) {
  return useQuery<PlanInvariantResult>({
    queryKey: planValidationKeys.invariants(planId, persist),
    queryFn: () => fetchPlanInvariants(planId!, persist),
    enabled: !!planId,
    staleTime: 15_000, // 15 seconds - balance freshness vs spam
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Mutation to revalidate a plan after edits
 * 
 * Use this after:
 * - Adding/removing a course from plan
 * - Changing course provider
 * - Moving course between terms
 * 
 * Automatically invalidates related caches
 */
export function useRevalidatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planId }: { planId: string }) => {
      return fetchPlanInvariants(planId, true);
    },
    onSuccess: (data, vars) => {
      // Update the invariants cache directly with fresh data
      queryClient.setQueryData(
        planValidationKeys.invariants(vars.planId, true),
        data
      );
      
      // Invalidate eligibility caches (caps/usage changed)
      queryClient.invalidateQueries({
        queryKey: planValidationKeys.allEligibility(vars.planId),
      });
      
      // Invalidate any direct violations table queries
      queryClient.invalidateQueries({
        queryKey: ["plan-violations", vars.planId],
      });
      
      // Invalidate user plan courses (may have status changes)
      queryClient.invalidateQueries({
        queryKey: ["user-plan-courses", vars.planId],
      });

      console.log(
        "[usePlanValidation] Revalidated plan:",
        vars.planId,
        "ok:",
        data.ok,
        "violations:",
        data.violations.length
      );
    },
    onError: (error) => {
      console.error("[usePlanValidation] Revalidation failed:", error);
    },
  });
}

/**
 * Fetch eligible courses for a specific requirement block
 * 
 * Returns ranked courses that can satisfy the block,
 * with eligibility flags and scores
 */
export function useRequirementEligibility(planId?: string, blockId?: string) {
  return useQuery<RequirementEligibilityResult>({
    queryKey: planValidationKeys.eligibility(planId, blockId),
    queryFn: () => fetchRequirementEligibility(planId!, blockId!),
    enabled: !!planId && !!blockId,
    staleTime: 30_000, // 30 seconds - eligibility changes less frequently
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

/**
 * Hook to get validation state for a specific block/requirement
 * Derives from the main invariants query
 * Works with both requirement_id and requirement_block_id for compatibility
 */
export function useBlockValidationState(planId?: string, blockId?: string) {
  const { data: invariants } = usePlanInvariants(planId);

  if (!invariants || !blockId) {
    return {
      isComplete: false,
      isIncomplete: false,
      violations: [],
    };
  }

  // Filter violations by either requirement_id or requirement_block_id
  const blockViolations = invariants.violations.filter(
    (v) => v.requirement_id === blockId || v.requirement_block_id === blockId
  );

  // Check for incomplete using both code names for compatibility
  const isIncomplete = blockViolations.some(
    (v) => v.code === "REQUIREMENT_INCOMPLETE" || v.code === "BLOCK_INCOMPLETE"
  );

  return {
    isComplete: !isIncomplete && blockViolations.length === 0,
    isIncomplete,
    violations: blockViolations,
  };
}

/**
 * Hook to prefetch eligibility for multiple blocks
 * Useful when rendering a list of blocks
 */
export function usePrefetchBlockEligibility() {
  const queryClient = useQueryClient();

  return (planId: string, blockIds: string[]) => {
    for (const blockId of blockIds) {
      queryClient.prefetchQuery({
        queryKey: planValidationKeys.eligibility(planId, blockId),
        queryFn: () => fetchRequirementEligibility(planId, blockId),
        staleTime: 30_000,
      });
    }
  };
}
