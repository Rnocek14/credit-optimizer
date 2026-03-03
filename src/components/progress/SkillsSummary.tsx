import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSkillGaps } from '@/hooks/useSkillGaps';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { useActivePlan } from '@/hooks/useActivePlan';
import { useTargetCareer } from '@/hooks/useTargetCareer';
import { useMemo, useState } from 'react';
import type { SkillGap } from '@/types/skill';

const priorityColor: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-primary text-primary-foreground',
  medium: 'bg-secondary text-secondary-foreground',
  low: 'bg-muted text-muted-foreground',
};

// Status normalizer — keeps counts accurate even if DB values drift
const COMPLETED_STATUSES = ['completed', 'complete'];
const IN_PROGRESS_STATUSES = ['in_progress', 'enrolled', 'started'];
const isCompleted = (s: string) => COMPLETED_STATUSES.includes(s);
const isInProgress = (s: string) => IN_PROGRESS_STATUSES.includes(s);

const MAX_VISIBLE_GAPS = 8;

interface SkillsSummaryProps {
  courseHistory?: Array<{ status: string; [k: string]: unknown }>;
  userId?: string;
}

export function SkillsSummary({ courseHistory = [], userId }: SkillsSummaryProps) {
  const { data: activePlan } = useActivePlan();
  const { data: targetCareer } = useTargetCareer(activePlan?.target_career_id);
  const { data: skillGaps = [], isLoading: gapsLoading } = useSkillGaps(userId);
  const { criScore, isLoading: criLoading } = useCareerReadiness({
    userId,
    targetJobId: activePlan?.target_career_id ?? undefined,
    enabled: !!userId,
  });
  const [showAll, setShowAll] = useState(false);

  const completedCount = courseHistory.filter(c => isCompleted(c.status)).length;
  const inProgressCount = courseHistory.filter(c => isInProgress(c.status)).length;

  // Sort: critical → high → medium → low (already sorted by hook, but enforce for display grouping)
  const sortedGaps = useMemo(() => {
    const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...skillGaps].sort((a, b) =>
      (order[a.priority] ?? 4) - (order[b.priority] ?? 4) ||
      (b.criImpact ?? 0) - (a.criImpact ?? 0)
    );
  }, [skillGaps]);

  const visibleGaps = showAll ? sortedGaps : sortedGaps.slice(0, MAX_VISIBLE_GAPS);
  const hasMore = sortedGaps.length > MAX_VISIBLE_GAPS;
  const criticalCount = skillGaps.filter(g => g.priority === 'critical').length;
  const hasCRI = criScore?.overall != null;

  if (gapsLoading || criLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* CRI card — graceful when not calculated */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {targetCareer ? `${targetCareer.title} Readiness` : 'Readiness Score'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasCRI ? (
              <>
                <p className="text-3xl font-bold">{criScore.overall}%</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {targetCareer
                    ? `${criScore.overall >= 70 ? 'On track' : 'Building toward'} ${targetCareer.title}`
                    : criScore.overall >= 70
                      ? "You're on track for your target role"
                      : 'Keep building skills to improve your score'}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-muted-foreground">Not calculated yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Set a career goal to see your readiness score.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-2">
                  <Link to="/plan?tab=goals">Set Goal</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Course Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              <div>
                <p className="text-3xl font-bold">{completedCount}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
              <div>
                <p className="text-3xl font-bold">{inProgressCount}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-primary" />
              Skill Gaps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{skillGaps.length}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {criticalCount > 0
                ? `${criticalCount} critical gap${criticalCount > 1 ? 's' : ''} to address`
                : skillGaps.length > 0
                  ? 'No critical gaps — keep going!'
                  : 'Set a goal to detect gaps'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Skill gaps detail — sorted, capped */}
      <Card>
        <CardHeader>
          <CardTitle>Skill Gaps to Close</CardTitle>
          <CardDescription>
            Prioritized skills needed for your target role
          </CardDescription>
        </CardHeader>
        <CardContent>
          {skillGaps.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-10 w-10 mx-auto mb-3 text-primary" />
              <h3 className="font-medium mb-1">No skill gaps detected</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Set a career goal to get personalized skill gap analysis.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link to="/plan?tab=goals">Set Career Goal</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleGaps.map((gap) => (
                <div
                  key={gap.skill}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    <Badge className={`text-xs ${priorityColor[gap.priority] ?? ''}`}>
                      {gap.priority}
                    </Badge>
                    <span className="font-medium capitalize">{gap.skill}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {gap.criImpact != null && (
                      <span>+{gap.criImpact}% CRI</span>
                    )}
                    {gap.estimatedTimeToClose && (
                      <span>{gap.estimatedTimeToClose}</span>
                    )}
                  </div>
                </div>
              ))}
              {hasMore && !showAll && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAll(true)}>
                  View all {sortedGaps.length} gaps
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* CTA to degree plan */}
      <Card className="border-dashed border-2 border-primary/20">
        <CardContent className="flex items-center justify-between p-4">
          <div>
            <p className="font-medium">Close skill gaps faster with a structured plan</p>
            <p className="text-sm text-muted-foreground">
              Your degree plan maps courses directly to the skills you need.
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/plan" className="flex items-center gap-2">
              Open Degree Plan <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
