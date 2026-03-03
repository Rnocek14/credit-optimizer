import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSkillGaps } from '@/hooks/useSkillGaps';
import { useUser } from '@/hooks/useUser';
import { useQuery } from '@tanstack/react-query';
import { fetchCourseProgress } from '@/shared/lib/api/progress';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';

const priorityColor: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-primary text-primary-foreground',
  medium: 'bg-secondary text-secondary-foreground',
  low: 'bg-muted text-muted-foreground',
};

export function SkillsSummary() {
  const { user } = useUser();
  const { data: skillGaps = [], isLoading: gapsLoading } = useSkillGaps(user?.id);
  const { criScore, isLoading: criLoading } = useCareerReadiness({ userId: user?.id, enabled: !!user?.id });

  const { data: courseHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['course-progress', user?.id],
    queryFn: () => fetchCourseProgress(user!.id),
    enabled: !!user?.id,
  });

  const completedCount = courseHistory.filter(c => c.status === 'completed').length;
  const inProgressCount = courseHistory.filter(c => c.status === 'in_progress').length;
  const isLoading = gapsLoading || criLoading || historyLoading;

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const criticalGaps = skillGaps.filter(g => g.priority === 'critical');
  const highGaps = skillGaps.filter(g => g.priority === 'high');
  const otherGaps = skillGaps.filter(g => g.priority !== 'critical' && g.priority !== 'high');

  return (
    <div className="space-y-4">
      {/* CRI + Progress summary row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Career Readiness
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{criScore?.overall ?? 0}%</p>
            <p className="text-sm text-muted-foreground mt-1">
              {criScore?.overall && criScore.overall >= 70
                ? "You're on track for your target role"
                : 'Keep building skills to improve your score'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-primary" />
              Courses Progress
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
              {criticalGaps.length > 0
                ? `${criticalGaps.length} critical gap${criticalGaps.length > 1 ? 's' : ''} to address`
                : 'No critical gaps — keep going!'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Skill gaps detail */}
      <Card>
        <CardHeader>
          <CardTitle>Skill Gaps to Close</CardTitle>
          <CardDescription>
            Skills needed for your target role, sorted by priority
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
              {skillGaps.map((gap) => (
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
                    {gap.criImpact && (
                      <span>+{gap.criImpact}% CRI</span>
                    )}
                    {gap.estimatedTimeToClose && (
                      <span>{gap.estimatedTimeToClose}</span>
                    )}
                  </div>
                </div>
              ))}
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
