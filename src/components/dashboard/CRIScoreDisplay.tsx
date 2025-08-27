import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Target, Zap } from 'lucide-react';
import { useCRIEngine } from '@/hooks/useCRIEngine';
import { useToast } from '@/hooks/use-toast';

interface CRIScoreDisplayProps {
  userId?: string;
  trackId?: string;
  onImproveClick?: () => void;
}

export function CRIScoreDisplay({ userId, trackId, onImproveClick }: CRIScoreDisplayProps) {
  const { criBreakdown, isLoading, recalculateCRI, isRecalculating } = useCRIEngine(userId, trackId);
  const { toast } = useToast();

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-3/4"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-12 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-full"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!criBreakdown) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Career Readiness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-muted-foreground mb-4">Calculate your CRI score to see personalized insights</p>
            <Button 
              onClick={() => {
                if (!userId) {
                  toast({ title: 'Sign in required', description: 'Please sign in to calculate your CRI.', variant: 'destructive' });
                  return;
                }
                recalculateCRI(trackId);
              }} 
              disabled={isRecalculating || !userId}
            >
              {isRecalculating ? 'Calculating...' : 'Calculate CRI'}
            </Button>
            {!userId && (
              <p className="text-xs text-muted-foreground mt-2">Sign in to calculate and track your CRI.</p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    switch (criBreakdown.trend.direction) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTrendColor = () => {
    switch (criBreakdown.trend.direction) {
      case 'improving':
        return 'text-green-600';
      case 'declining':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  const getScoreColor = () => {
    if (criBreakdown.criScore >= 80) return 'text-green-600';
    if (criBreakdown.criScore >= 60) return 'text-blue-600';
    if (criBreakdown.criScore >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTopRecommendation = () => {
    return criBreakdown.recommendations
      .filter(r => r.priority === 'high')
      .slice(0, 1)[0] || criBreakdown.recommendations[0];
  };

  const topRec = getTopRecommendation();

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-500" />
          Career Readiness Index
          <Badge variant="outline" className="ml-auto">
            {criBreakdown.level}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center">
          <div className="relative">
            <div className={`text-4xl font-bold ${getScoreColor()}`}>
              {Math.round(criBreakdown.criScore)}
            </div>
            <div className="text-sm text-muted-foreground text-center">/ 100</div>
          </div>
          
          <div className="ml-4 flex items-center gap-2">
            {getTrendIcon()}
            <div className="text-sm">
              <div className={`font-medium ${getTrendColor()}`}>
                {criBreakdown.trend.direction}
              </div>
              <div className="text-xs text-muted-foreground">
                {Math.abs(criBreakdown.trend.change)}% change
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Overall Progress</span>
            <span>{Math.round(criBreakdown.criScore)}%</span>
          </div>
          <Progress value={criBreakdown.criScore} className="h-2" />
        </div>

        {topRec && (
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Top Priority: {topRec.area}
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                  {topRec.action}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            variant="default" 
            size="sm" 
            className="flex-1"
            onClick={onImproveClick}
          >
            Improve CRI
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => recalculateCRI(trackId)}
            disabled={isRecalculating}
          >
            {isRecalculating ? 'Updating...' : 'Refresh'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}