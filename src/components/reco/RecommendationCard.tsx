import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Info, ExternalLink, MoreHorizontal } from 'lucide-react';
import { UnifiedRecommendation, RecommendationDensity } from '@/types/recommendations';
import { CRIBoostChip } from '@/components/ui/cri-boost-chip';
import { cn } from '@/lib/utils';

interface RecommendationCardProps {
  recommendation: UnifiedRecommendation;
  density: RecommendationDensity;
  isPrimary?: boolean;
  criBoost?: number;
  criExplanation?: string;
}

export function RecommendationCard({ 
  recommendation, 
  density, 
  isPrimary = false,
  criBoost = 0,
  criExplanation = ''
}: RecommendationCardProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'var(--destructive)';
      case 'high':
        return 'oklch(0.70 0.15 50)'; // Orange
      case 'medium':
        return 'oklch(0.85 0.15 85)'; // Yellow
      case 'low':
        return 'oklch(0.55 0.15 145)'; // Green
      default:
        return 'var(--muted)';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'skill_gap':
        return 'Skill Gap';
      case 'maya_action':
        return 'Maya Suggests';
      case 'market_alert':
        return 'Market Alert';
      case 'proof_project':
        return 'Project Idea';
      default:
        return type;
    }
  };

  const handleActionClick = (action: any) => {
    if (action.href) {
      window.location.href = action.href;
    } else if (action.on && action.params) {
      // Build URL based on hub and params
      const baseUrl = `/${action.on}`;
      const searchParams = new URLSearchParams();
      
      Object.entries(action.params).forEach(([key, value]) => {
        searchParams.set(key, String(value));
      });
      
      const fullUrl = `${baseUrl}?${searchParams.toString()}`;
      window.location.href = fullUrl;
    }
  };

  const visibleActions = recommendation.actions.slice(0, 2);
  const overflowActions = recommendation.actions.slice(2);

  return (
    <Card 
      className={cn(
        "relative transition-all duration-200 hover:shadow-md",
        density === 'compact' && "py-2"
      )}
      data-testid="reco-card"
    >
      {/* Priority color strip */}
      <div 
        className="absolute left-0 top-0 w-1 h-full rounded-l-lg"
        style={{ backgroundColor: getPriorityColor(recommendation.priority) }}
      />
      
      <CardHeader className={cn(
        "pb-3",
        density === 'compact' && "py-3"
      )}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={cn(
                "font-medium",
                density === 'compact' ? "text-sm" : "text-base"
              )}>
                {recommendation.title}
              </h3>
              <Badge variant="outline" className="text-xs">
                {getTypeLabel(recommendation.type)}
              </Badge>
              {criBoost > 0 && (
                <CRIBoostChip 
                  boostPercentage={criBoost} 
                  explanation={criExplanation}
                  size={density === 'compact' ? 'sm' : 'default'}
                />
              )}
            </div>
            <p className={cn(
              "text-muted-foreground",
              density === 'compact' ? "text-xs" : "text-sm"
            )}>
              {recommendation.description}
            </p>
          </div>
          
          {recommendation.reason && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              <Info className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Skills chips */}
        {recommendation.skills && recommendation.skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {recommendation.skills.map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className={cn(
        "pt-0",
        density === 'compact' && "py-2"
      )}>
        {/* Meta information row */}
        {(recommendation.timeEstimate || recommendation.progress !== undefined) && (
          <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
            {recommendation.timeEstimate && (
              <span>⏱️ {recommendation.timeEstimate}</span>
            )}
            {recommendation.progress !== undefined && (
              <div className="flex items-center gap-2 flex-1">
                <span>Progress:</span>
                <Progress value={recommendation.progress} className="h-1 flex-1 max-w-20" />
                <span>{recommendation.progress}%</span>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {visibleActions.map((action, index) => (
            <Button
              key={index}
              variant={isPrimary && index === 0 ? "default" : "outline"}
              size={density === 'compact' ? "sm" : "default"}
              onClick={() => handleActionClick(action)}
              data-testid={action.testId || (isPrimary && index === 0 ? "reco-primary-cta" : undefined)}
              className="flex items-center gap-1"
            >
              {action.label}
              <ExternalLink className="h-3 w-3" />
            </Button>
          ))}
          
          {overflowActions.length > 0 && (
            <Button variant="outline" size="sm" className="px-2">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}