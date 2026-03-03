/**
 * PlanCourseList — shows plan courses with status toggle.
 * Lives inside PlanHub, allows marking courses as complete/enrolled/etc.
 */
import { fetchPlanCoursesWithProvider, type PlanCourseWithProvider } from '@/shared/lib/api/userPlans';
import { useUpdatePlanCourseStatus } from '@/hooks/useUpdatePlanCourseStatus';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, CheckCircle2, Clock, XCircle } from 'lucide-react';

const STATUS_CONFIG = {
  planned: { label: 'Planned', icon: Clock, variant: 'secondary' as const },
  enrolled: { label: 'Enrolled', icon: BookOpen, variant: 'default' as const },
  complete: { label: 'Complete', icon: CheckCircle2, variant: 'default' as const },
  dropped: { label: 'Dropped', icon: XCircle, variant: 'destructive' as const },
} as const;

type PlanStatus = keyof typeof STATUS_CONFIG;

export function PlanCourseList({ planId }: { planId: string }) {
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['plan-courses-with-provider', planId],
    queryFn: () => fetchPlanCoursesWithProvider(planId),
    enabled: !!planId,
  });

  const { mutate: updateStatus } = useUpdatePlanCourseStatus();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground py-4">Loading courses…</div>;
  }

  if (courses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No courses in this plan yet. Open the planner to add courses.
      </p>
    );
  }

  const handleStatusChange = (course: PlanCourseWithProvider, newStatus: string) => {
    updateStatus({
      planCourseId: course.id,
      status: newStatus as PlanStatus,
      planId,
    });
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Courses ({courses.length})
      </h3>
      {courses.map((course) => {
        const status = (course.status as PlanStatus) || 'planned';
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.planned;

        return (
          <div
            key={course.id}
            className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2"
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <config.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm truncate">
                {course.course_id?.slice(0, 8) ?? 'Course'}
              </span>
              {course.provider_code && (
                <Badge variant="outline" className="text-xs shrink-0">
                  {course.provider_code}
                </Badge>
              )}
            </div>
            <Select
              value={status}
              onValueChange={(v) => handleStatusChange(course, v)}
            >
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="enrolled">Enrolled</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="dropped">Dropped</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      })}
    </div>
  );
}
