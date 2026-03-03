/**
 * useUpdatePlanCourseStatus — mutation to change a plan course's status
 * with toast feedback and progress cache invalidation.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updatePlanCourseStatus } from '@/shared/lib/api/userPlanCourses';
import { invalidateEduTreePlan } from '@/shared/lib/intelligence/invalidation';
import { useToast } from '@/hooks/use-toast';
import { useActivePlan } from '@/hooks/useActivePlan';
import { useTargetCareer } from '@/hooks/useTargetCareer';

type PlanStatus = 'planned' | 'enrolled' | 'complete' | 'dropped';

const STATUS_LABELS: Record<PlanStatus, string> = {
  planned: 'Planned',
  enrolled: 'Enrolled',
  complete: 'Completed',
  dropped: 'Dropped',
};

export function useUpdatePlanCourseStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: activePlan } = useActivePlan();
  const { data: targetCareer } = useTargetCareer(activePlan?.target_career_id);

  return useMutation({
    mutationFn: ({
      planCourseId,
      status,
    }: {
      planCourseId: string;
      status: PlanStatus;
      planId: string;
    }) => updatePlanCourseStatus(planCourseId, status),

    onSuccess: (_, { status, planId }) => {
      // Invalidate plan-related caches
      invalidateEduTreePlan(queryClient, planId);

      // Invalidate progress cache so hero updates
      queryClient.invalidateQueries({ queryKey: ['plan-progress', planId] });

      // Toast with career context
      const label = STATUS_LABELS[status];
      const careerSuffix = status === 'complete' && targetCareer?.title
        ? ` — progress updated toward ${targetCareer.title}`
        : '';

      toast({
        title: `Course marked ${label.toLowerCase()}`,
        description: `Plan progress updated${careerSuffix}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update course',
        description: error.message || 'Something went wrong',
        variant: 'destructive',
      });
    },
  });
}
