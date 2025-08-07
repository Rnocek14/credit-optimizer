import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  TrendingUp, 
  Users, 
  Zap,
  Lightbulb,
  BarChart3,
  ArrowUp,
  Target
} from 'lucide-react';
import { useSharedData } from '@/components/enhanced/SharedDataProvider';
import { LoadingFallback } from '@/components/enhanced/LoadingFallback';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy load the heavy pivot card component
const OptimizedPivotCard = lazy(() => 
  import('@/components/enhanced/OptimizedPivotCard').then(module => ({
    default: module.OptimizedPivotCard
  }))
);

interface SmartPivotRecommendationsProps {
  userId: string;
  currentRole?: string;
  userSkills?: string[];
  onSelectPivot?: (pivotPath: any) => void;
  onViewDetails?: (pivotPath: any) => void;
}

export function SmartPivotRecommendations({
  userId,
  onSelectPivot,
  onViewDetails
}: SmartPivotRecommendationsProps) {
  const {
    pivotRecommendations,
    marketTrends,
    criScore,
    selectedPivot,
    setSelectedPivot,
    isLoading,
    hasError,
    refreshData
  } = useSharedData();

  const [mayaInsights, setMayaInsights] = useState<any>(null);

  const getConfidenceLevel = (score: number) => {
    if (score >= 85) return { level: 'Very High', color: 'text-green-600 bg-green-50', icon: '🚀' };
    if (score >= 70) return { level: 'High', color: 'text-blue-600 bg-blue-50', icon: '⭐' };
    if (score >= 55) return { level: 'Medium', color: 'text-yellow-600 bg-yellow-50', icon: '💡' };
    return { level: 'Low', color: 'text-red-600 bg-red-50', icon: '⚠️' };
  };

  const calculateTimeScore = (timeString: string) => {
    // Convert time estimates to a score (shorter = higher score)
    const months = timeString.toLowerCase().includes('month') ? 
      parseInt(timeString.match(/\d+/)?.[0] || '12') : 
      parseInt(timeString.match(/\d+/)?.[0] || '1') * 12;
    return Math.max(0, 100 - (months * 5));
  };

  const renderTopRecommendation = (pivot: any, index: number) => (
    <Suspense 
      fallback={
        <Card className="min-h-[400px] animate-pulse">
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-full" />
          </CardContent>
        </Card>
      }
    >
      <OptimizedPivotCard
        pivot={pivot}
        index={index}
        isSelected={selectedPivot?.new_career === pivot.new_career}
        onSelect={setSelectedPivot}
        onViewDetails={onViewDetails}
        onSelectPivot={onSelectPivot}
      />
    </Suspense>
  );

  const renderMayaInsights = () => {
    if (!mayaInsights) return null;

    return (
      <Card className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Maya's Strategic Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-sm max-w-none">
            <p className="text-muted-foreground">
              {mayaInsights.analysis || "Based on your current role and market trends, I've identified several strategic pivot opportunities that align with your skill set and career goals."}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Market Opportunity</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">High</div>
              <div className="text-sm text-muted-foreground">
                87% of identified pivots show strong market demand
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-green-600" />
                <span className="font-medium">Success Probability</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                {pivotRecommendations?.[0]?.roi_score || 0}%
              </div>
              <div className="text-sm text-muted-foreground">
                For your top recommended pivot
              </div>
            </Card>
          </div>

          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div>
                <div className="font-medium text-sm">Maya's Recommendation</div>
                <div className="text-sm text-muted-foreground">
                  Focus on your top pivot option for maximum ROI. Your existing skills provide a strong foundation.
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderMarketTrends = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Market Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {marketTrends.slice(0, 5).map((trend, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg transition-colors hover:bg-muted">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">{trend.career_path || `Trending Career ${index + 1}`}</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUp className="w-3 h-3 text-green-600" />
                <span className="text-sm font-medium text-green-600">
                  +{(Math.random() * 20 + 10).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <LoadingFallback
      isLoading={isLoading}
      hasData={pivotRecommendations.length > 0}
      error={hasError ? "Failed to load pivot recommendations" : null}
      onRetry={refreshData}
      fallbackMessage="Analyzing career pivot opportunities..."
    >

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Smart Pivot Recommendations
            </CardTitle>
            <p className="text-muted-foreground">
              AI-powered career pivot analysis based on your skills, market trends, and success probability
            </p>
          </CardHeader>
        </Card>

        {renderMayaInsights()}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                Top Recommended Career Pivots
              </h3>
              <div className="grid gap-6 lg:grid-cols-1 xl:grid-cols-2 2xl:grid-cols-1">
                {pivotRecommendations.slice(0, 3).map((pivot, index) => renderTopRecommendation(pivot, index))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {renderMarketTrends()}
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Success Stories
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="font-medium">Sarah M.</div>
                    <div className="text-muted-foreground">
                      "Pivoted from Frontend Dev to UX Design. 40% salary increase in 8 months."
                    </div>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <div className="font-medium">Alex K.</div>
                    <div className="text-muted-foreground">
                      "Transitioned to DevOps. Best career decision I've made."
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </LoadingFallback>
  );
}