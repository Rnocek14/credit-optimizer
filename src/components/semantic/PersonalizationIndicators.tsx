import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Star, MapPin, Clock, DollarSign, TrendingUp, User } from 'lucide-react';
import { SemanticContext } from '@/types/semantic';

interface PersonalizationIndicatorsProps {
  personalizationScore: number;
  timeFeasibility: number;
  budgetFeasibility: number;
  locationRelevance: number;
  userContext?: SemanticContext;
  className?: string;
}

export const PersonalizationIndicators: React.FC<PersonalizationIndicatorsProps> = ({
  personalizationScore,
  timeFeasibility,
  budgetFeasibility,
  locationRelevance,
  userContext,
  className = ''
}) => {
  const getScoreColor = (score: number) => {
    if (score > 0.8) return 'text-success';
    if (score > 0.6) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score > 0.8) return 'default';
    if (score > 0.6) return 'secondary';
    return 'destructive';
  };

  const getOverallRating = () => {
    const average = (personalizationScore + timeFeasibility + budgetFeasibility + locationRelevance) / 4;
    if (average > 0.8) return { label: 'Excellent Match', variant: 'default' as const };
    if (average > 0.6) return { label: 'Good Match', variant: 'secondary' as const };
    return { label: 'Consider Alternatives', variant: 'destructive' as const };
  };

  const overallRating = getOverallRating();

  return (
    <Card className={`p-4 bg-card/50 backdrop-blur border ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          <h5 className="font-medium text-sm">Personalization</h5>
        </div>
        <Badge variant={overallRating.variant} className="text-xs">
          {overallRating.label}
        </Badge>
      </div>

      {/* Score breakdown */}
      <div className="space-y-4">
        {/* Overall personalization */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Star className="w-3 h-3 text-warning" />
              <span className="text-xs font-medium">Career Match</span>
            </div>
            <span className={`text-xs font-bold ${getScoreColor(personalizationScore)}`}>
              {Math.round(personalizationScore * 100)}%
            </span>
          </div>
          <Progress value={personalizationScore * 100} className="h-2" />
        </div>

        {/* Time feasibility */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3 text-info" />
              <span className="text-xs font-medium">Time Feasibility</span>
            </div>
            <span className={`text-xs font-bold ${getScoreColor(timeFeasibility)}`}>
              {Math.round(timeFeasibility * 100)}%
            </span>
          </div>
          <Progress value={timeFeasibility * 100} className="h-2" />
        </div>

        {/* Budget feasibility */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-3 h-3 text-success" />
              <span className="text-xs font-medium">Budget Feasibility</span>
            </div>
            <span className={`text-xs font-bold ${getScoreColor(budgetFeasibility)}`}>
              {Math.round(budgetFeasibility * 100)}%
            </span>
          </div>
          <Progress value={budgetFeasibility * 100} className="h-2" />
        </div>

        {/* Location relevance */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MapPin className="w-3 h-3 text-warning" />
              <span className="text-xs font-medium">Location Match</span>
            </div>
            <span className={`text-xs font-bold ${getScoreColor(locationRelevance)}`}>
              {Math.round(locationRelevance * 100)}%
            </span>
          </div>
          <Progress value={locationRelevance * 100} className="h-2" />
        </div>
      </div>

      {/* User context summary */}
      {userContext && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <h6 className="text-xs font-medium mb-2 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Personalization Factors
          </h6>
          
          <div className="space-y-2">
            {userContext.preferred_locations && userContext.preferred_locations.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground">Locations:</span>
                {userContext.preferred_locations.slice(0, 2).map((location, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {location}
                  </Badge>
                ))}
                {userContext.preferred_locations.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{userContext.preferred_locations.length - 2}
                  </Badge>
                )}
              </div>
            )}

            {userContext.career_goals && userContext.career_goals.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground">Goals:</span>
                {userContext.career_goals.slice(0, 2).map((goal, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {goal}
                  </Badge>
                ))}
                {userContext.career_goals.length > 2 && (
                  <Badge variant="secondary" className="text-xs">
                    +{userContext.career_goals.length - 2}
                  </Badge>
                )}
              </div>
            )}

            {userContext.budget_constraints && (
              <div className="text-xs text-muted-foreground">
                Budget: ${userContext.budget_constraints}
              </div>
            )}

            {userContext.time_constraints && (
              <div className="text-xs text-muted-foreground">
                Time: {userContext.time_constraints} weeks
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};