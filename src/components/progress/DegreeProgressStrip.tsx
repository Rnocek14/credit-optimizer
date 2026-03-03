/**
 * DegreeProgressStrip — compact degree progress row for ProgressHub.
 *
 * Shows credits earned/required + courses complete/total + percent.
 * Handles no-plan, loading, and error states gracefully.
 */
import { GraduationCap, BookOpen, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { useDegreeProgress } from '@/hooks/useDegreeProgress';
import { Progress } from '@/components/ui/progress';

export function DegreeProgressStrip() {
  const { data, isLoading, isLoadingPlan, planId, planName, isError } = useDegreeProgress();

  // No plan → CTA
  if (!isLoadingPlan && !planId) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-card p-4 mb-6">
        <GraduationCap className="h-5 w-5 text-muted-foreground shrink-0" />
        <p className="text-sm text-muted-foreground">
          No active plan yet.{' '}
          <Link to="/plan" className="font-medium text-primary hover:underline">
            Start a degree plan →
          </Link>
        </p>
      </div>
    );
  }

  // Loading
  if (isLoading || isLoadingPlan) {
    return (
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-lg" />
        ))}
      </div>
    );
  }

  // Error — don't crash, just show fallback
  if (isError || !data) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 mb-6">
        <GraduationCap className="h-5 w-5 text-destructive shrink-0" />
        <p className="text-sm text-muted-foreground">
          Couldn't load degree progress. Your other data is still available below.
        </p>
      </div>
    );
  }

  const { creditsEarned, creditsRequired, coursesComplete, coursesTotal, percent } = data;

  return (
    <div className="space-y-3 mb-6">
      {/* Plan name + progress bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h2 className="text-sm font-semibold">
            {planName ?? 'Degree Progress'}
          </h2>
        </div>
        {percent !== null && (
          <span className="text-sm font-bold text-primary">{percent}%</span>
        )}
      </div>

      {percent !== null && (
        <Progress value={percent} className="h-2" />
      )}

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Credits */}
        <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
          <TrendingUp className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-2xl font-bold leading-none">
              {creditsEarned}
              {creditsRequired !== null && (
                <span className="text-base font-normal text-muted-foreground">
                  {' '}/ {creditsRequired}
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Credits earned</p>
          </div>
        </div>

        {/* Courses */}
        <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
          <BookOpen className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-2xl font-bold leading-none">
              {coursesComplete}
              <span className="text-base font-normal text-muted-foreground">
                {' '}/ {coursesTotal}
              </span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">Courses complete</p>
          </div>
        </div>
      </div>
    </div>
  );
}
