/**
 * Skill Gap Recommendations Component
 * Displays detected skill gaps with recommended actions for users
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, BookOpen, Users, Target, Clock } from 'lucide-react';
import { useCrossHubIntegration, type SkillGap } from '@/hooks/useCrossHubIntegration';
import { SaveToPlanButton } from '@/components/SaveToPlanButton';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '@/lib/authHelper';

interface SkillGapRecommendationsProps {
  compact?: boolean;
  maxGaps?: number;
}

export const SkillGapRecommendations: React.FC<SkillGapRecommendationsProps> = ({
  compact = false,
  maxGaps = 5
}) => {
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser
  });

  const { skillGaps, isAnalyzingSkillGaps } = useCrossHubIntegration(currentUser?.id);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <Target className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <BookOpen className="h-4 w-4 text-green-500" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const renderSkillGapCard = (gap: SkillGap, index: number) => (
    <Card key={`${gap.skill}-${index}`} className="border-l-4 border-l-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getPriorityIcon(gap.priority)}
            <CardTitle className="text-lg">{gap.skill}</CardTitle>
          </div>
          <Badge 
            variant="outline" 
            className={getPriorityColor(gap.priority)}
          >
            {gap.priority.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="font-medium">Current:</span>
            <span>{gap.currentLevel}/5</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-medium">Target:</span>
            <span>{gap.targetLevel}/5</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{gap.estimatedTimeToClose}</span>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Recommended Actions:</h4>
          <div className="grid gap-2">
            {gap.suggestedActions.slice(0, compact ? 2 : 3).map((action, actionIndex) => (
              <div key={actionIndex} className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm text-muted-foreground flex-1">{action}</span>
                {action.includes('course') && (
                  <SaveToPlanButton
                    item={{
                      type: 'skill',
                      id: `skill-gap-${gap.skill.toLowerCase().replace(/\s+/g, '-')}`,
                      title: `Learn ${gap.skill}`,
                      description: action,
                      skillTags: [gap.skill],
                      priority: gap.priority as 'high' | 'medium' | 'low',
                      estimatedTimeToComplete: gap.estimatedTimeToClose
                    }}
                    variant="outline"
                    size="sm"
                    compact
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {!compact && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(`/discover?skill=${encodeURIComponent(gap.skill)}`, '_self')}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Find Courses
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => window.open(`/discover?tab=mentors&skill=${encodeURIComponent(gap.skill)}`, '_self')}
            >
              <Users className="h-4 w-4 mr-2" />
              Find Mentors
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isAnalyzingSkillGaps) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Analyzing Skill Gaps...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!skillGaps.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Skill Gap Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Skill Gaps Detected</h3>
            <p className="text-muted-foreground">
              Set some career goals to get personalized skill gap recommendations.
            </p>
            <Button 
              className="mt-4" 
              onClick={() => window.open('/plan?tab=goals', '_self')}
            >
              Set Career Goals
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayGaps = skillGaps.slice(0, maxGaps);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Target className="h-5 w-5" />
          Skill Gap Analysis
        </h3>
        <Badge variant="secondary">
          {skillGaps.length} gap{skillGaps.length !== 1 ? 's' : ''} detected
        </Badge>
      </div>

      <div className={compact ? "space-y-3" : "grid gap-4"}>
        {displayGaps.map(renderSkillGapCard)}
      </div>

      {skillGaps.length > maxGaps && (
        <Card className="border-dashed">
          <CardContent className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              {skillGaps.length - maxGaps} more skill gaps detected
            </p>
            <Button 
              variant="outline" 
              onClick={() => window.open('/plan?tab=gaps', '_self')}
            >
              View All Skill Gaps
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};