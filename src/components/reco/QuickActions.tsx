import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Users, Briefcase, TrendingUp } from 'lucide-react';
import { UnifiedRecommendation } from '@/types/recommendations';

interface QuickActionsProps {
  skillGaps: UnifiedRecommendation[];
}

export function QuickActions({ skillGaps }: QuickActionsProps) {
  const topSkillGap = skillGaps[0]?.skills?.[0] || '';

  const quickActions = [
    {
      label: 'Find Courses for Skill Gaps',
      icon: BookOpen,
      href: '/discover?filter=skill-gaps',
      testId: 'qa-find-courses',
      description: 'Browse courses to close your skill gaps'
    },
    {
      label: 'Connect with Mentors',
      icon: Users,
      href: `/discover?tab=mentors${topSkillGap ? `&skill=${topSkillGap}` : ''}`,
      testId: 'qa-find-mentors',
      description: 'Get guidance from industry experts'
    },
    {
      label: 'Start Suggested Project',
      icon: Briefcase,
      href: '/progress?tab=portfolio&suggested=true',
      testId: 'qa-start-project',
      description: 'Build projects to demonstrate skills'
    },
    {
      label: 'View Market Updates',
      icon: TrendingUp,
      href: '/discover?tab=market',
      testId: 'qa-market-updates',
      description: 'Stay updated on industry trends'
    }
  ];

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.testId}
              variant="outline"
              className="w-full justify-start h-auto p-3"
              onClick={() => window.location.href = action.href}
              data-testid={action.testId}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 flex-shrink-0" />
                <div className="text-left">
                  <div className="text-sm font-medium">{action.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {action.description}
                  </div>
                </div>
              </div>
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}