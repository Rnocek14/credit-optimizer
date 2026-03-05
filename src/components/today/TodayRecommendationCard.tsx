/**
 * TodayRecommendationCard — surfaces the single top intelligence recommendation.
 * Hidden when no recommendation exists. Minimal, non-intrusive.
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import type { IntelligenceRecommendation } from '@/shared/types/intelligence';

interface TodayRecommendationCardProps {
  recommendation: IntelligenceRecommendation | null;
  isLoading: boolean;
}

export function TodayRecommendationCard({ recommendation, isLoading }: TodayRecommendationCardProps) {
  if (isLoading) {
    return (
      <Card className="border-accent/20">
        <CardContent className="flex items-center gap-4 py-4">
          <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </CardContent>
      </Card>
    );
  }

  if (!recommendation) return null;

  const primaryAction = recommendation.actions?.[0];
  const reason = recommendation.breakdown?.[0]?.explanation
    ?? (recommendation.skills?.length
      ? `Addresses ${recommendation.skills.slice(0, 2).join(', ')}`
      : recommendation.description ?? 'Recommended based on your plan and target career');

  return (
    <Card className="border-accent/20 bg-accent/5" data-testid="today-recommendation">
      <CardContent className="flex items-center justify-between py-4 gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <Lightbulb className="h-4 w-4 text-accent-foreground" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm text-foreground truncate">{recommendation.title}</p>
              {recommendation.priority === 'critical' && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Critical</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate">{reason}</p>
          </div>
        </div>
        {primaryAction?.href ? (
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link to={primaryAction.href}>
              {primaryAction.label}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : (
          <Badge variant="secondary" className="shrink-0">
            {recommendation.timeEstimate ?? 'Suggested'}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
