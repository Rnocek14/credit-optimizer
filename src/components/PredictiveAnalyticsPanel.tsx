import React, { memo, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Target, 
  AlertTriangle, 
  Lightbulb,
  Clock,
  DollarSign,
  Users,
  Zap
} from 'lucide-react';
import { useEnhancedAIInsights } from '@/hooks/useEnhancedAIInsights';
import { useUnifiedCareerContext, useUnifiedData } from '@/contexts/UnifiedDataContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface PredictiveAnalyticsPanelProps {
  className?: string;
  autoRefresh?: boolean;
}

export const PredictiveAnalyticsPanel = memo<PredictiveAnalyticsPanelProps>(({
  className,
  autoRefresh = true
}) => {
  console.log('🔍 PredictiveAnalyticsPanel: Component loading...');
  
  const { selectedCareerPath, selectedLocation } = useUnifiedCareerContext();
  const { state } = useUnifiedData();
  const {
    patterns,
    predictions,
    recommendations,
    insightsSummary,
    loading,
    errors,
    generatePredictiveAnalysis,
    discoverMarketPatterns,
    generatePersonalizedRecommendations,
    refreshAllInsights,
    isAnalysisReady,
    hasRecentInsights
  } = useEnhancedAIInsights();
  
  const [activeTab, setActiveTab] = useState('predictions');
  const [showDetails, setShowDetails] = useState(false);

  // Generate analysis for current selection - enhanced with database integration
  const handleGenerateAnalysis = useCallback(async () => {
    if (!selectedCareerPath || !selectedLocation) return;
    
    console.log('🤖 Generating comprehensive AI analysis...');
    
    try {
      // First check if we have recent data in the database
      const { data: existingPredictions } = await supabase
        .from('predictive_analysis_results')
        .select('*')
        .eq('career_path', selectedCareerPath)
        .eq('location', selectedLocation)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingPredictions && existingPredictions.length > 0) {
        console.log('📊 Using cached predictions from database');
      } else {
        console.log('🔄 Generating fresh analysis...');
      }

      // Run the AI analysis
      await Promise.all([
        generatePredictiveAnalysis(selectedCareerPath, selectedLocation, '12months'),
        discoverMarketPatterns(selectedCareerPath, selectedLocation, ['demand', 'salary', 'competition']),
        generatePersonalizedRecommendations(state.user?.id || 'anonymous-user', {
          careerPath: selectedCareerPath,
          location: selectedLocation
        })
      ]);
      
      console.log('✅ AI analysis complete');
    } catch (error) {
      console.error('❌ Error generating analysis:', error);
    }
  }, [selectedCareerPath, selectedLocation, generatePredictiveAnalysis, discoverMarketPatterns, generatePersonalizedRecommendations, state.user?.id]);

  // Memoized prediction insights
  const predictionInsights = useMemo(() => {
    if (!predictions) return null;

    const demand = predictions.predictions.demand_forecast;
    const salary = predictions.predictions.salary_projection;
    const dynamics = predictions.predictions.market_dynamics;

    return {
      demand: {
        trend: demand.trend_direction,
        growth: demand.next_6_months,
        confidence: demand.confidence,
        icon: demand.trend_direction === 'increasing' ? TrendingUp : 
              demand.trend_direction === 'decreasing' ? TrendingDown : Target,
        color: demand.trend_direction === 'increasing' ? 'text-green-500' : 
               demand.trend_direction === 'decreasing' ? 'text-red-500' : 'text-blue-500'
      },
      salary: {
        change: salary.expected_change_6m,
        risk: salary.volatility_risk,
        confidence: salary.confidence,
        icon: salary.expected_change_6m > 0 ? TrendingUp : 
              salary.expected_change_6m < 0 ? TrendingDown : DollarSign,
        color: salary.expected_change_6m > 0 ? 'text-green-500' : 
               salary.expected_change_6m < 0 ? 'text-red-500' : 'text-blue-500'
      },
      risks: dynamics.risk_factors.slice(0, 3),
      opportunities: dynamics.emerging_opportunities.slice(0, 3)
    };
  }, [predictions]);

  // Pattern insights summary
  const patternInsights = useMemo(() => {
    const highConfidencePatterns = patterns.filter(p => p.confidence_score > 0.7);
    const seasonalPatterns = patterns.filter(p => p.pattern_type === 'seasonal');
    const trendPatterns = patterns.filter(p => p.pattern_type === 'trend');
    const anomalies = patterns.filter(p => p.pattern_type === 'anomaly');

    return {
      total: patterns.length,
      highConfidence: highConfidencePatterns.length,
      seasonal: seasonalPatterns.length,
      trends: trendPatterns.length,
      anomalies: anomalies.length,
      recentPatterns: patterns.slice(0, 3)
    };
  }, [patterns]);

  // Recommendations by priority
  const prioritizedRecommendations = useMemo(() => {
    const byPriority = recommendations.reduce((acc, rec) => {
      if (!acc[rec.priority]) acc[rec.priority] = [];
      acc[rec.priority].push(rec);
      return acc;
    }, {} as Record<string, typeof recommendations>);

    return {
      high: byPriority.high || [],
      medium: byPriority.medium || [],
      low: byPriority.low || [],
      total: recommendations.length
    };
  }, [recommendations]);

  // Auto-generate analysis when context changes
  React.useEffect(() => {
    if (selectedCareerPath && selectedLocation && autoRefresh) {
      console.log('🤖 Auto-triggering AI analysis for:', { selectedCareerPath, selectedLocation });
      const timeoutId = setTimeout(() => {
        handleGenerateAnalysis();
      }, 2000); // 2 second delay to let other data load first
      
      return () => clearTimeout(timeoutId);
    }
  }, [selectedCareerPath, selectedLocation, autoRefresh, handleGenerateAnalysis]);

  const isLoading = loading.predictions || loading.patterns || loading.recommendations;

  return (
    <TooltipProvider>
      <Card className={cn("w-full", className)}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                Predictive Analytics
                {insightsSummary.predictionsAvailable && (
                  <Badge variant="secondary">
                    {Math.round(insightsSummary.predictionAccuracy * 100)}% accuracy
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                AI-powered market forecasting and pattern recognition
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2">
              {hasRecentInsights && (
                <Tooltip>
                  <TooltipTrigger>
                    <Zap className="h-4 w-4 text-green-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Fresh insights available</p>
                  </TooltipContent>
                </Tooltip>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateAnalysis}
                disabled={isLoading || !selectedCareerPath || !selectedLocation}
              >
                {isLoading ? 'Analyzing...' : 'Generate Analysis'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="predictions">Predictions</TabsTrigger>
              <TabsTrigger value="patterns">Patterns</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            <TabsContent value="predictions" className="space-y-4">
              {predictionInsights ? (
                <>
                  {/* Demand Forecast */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Demand Forecast (6 months)
                        </h4>
                        <predictionInsights.demand.icon 
                          className={cn("h-4 w-4", predictionInsights.demand.color)} 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Growth Rate</span>
                          <span className="font-medium">
                            {predictionInsights.demand.growth > 0 ? '+' : ''}
                            {predictionInsights.demand.growth.toFixed(1)}%
                          </span>
                        </div>
                        <Progress 
                          value={Math.abs(predictionInsights.demand.growth) * 2} 
                          className="h-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Trend: {predictionInsights.demand.trend}</span>
                          <span>{Math.round(predictionInsights.demand.confidence * 100)}% confidence</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Salary Projection */}
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Salary Projection (6 months)
                        </h4>
                        <predictionInsights.salary.icon 
                          className={cn("h-4 w-4", predictionInsights.salary.color)} 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Expected Change</span>
                          <span className="font-medium">
                            {predictionInsights.salary.change > 0 ? '+' : ''}
                            {predictionInsights.salary.change.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Risk Level: {predictionInsights.salary.risk}</span>
                          <span>{Math.round(predictionInsights.salary.confidence * 100)}% confidence</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Risk Factors & Opportunities */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium flex items-center gap-2 mb-3">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          Risk Factors
                        </h4>
                        <ul className="space-y-1">
                          {predictionInsights.risks.map((risk, index) => (
                            <li key={index} className="text-sm text-muted-foreground">
                              • {risk}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <h4 className="font-medium flex items-center gap-2 mb-3">
                          <Lightbulb className="h-4 w-4 text-green-500" />
                          Opportunities
                        </h4>
                        <ul className="space-y-1">
                          {predictionInsights.opportunities.map((opportunity, index) => (
                            <li key={index} className="text-sm text-muted-foreground">
                              • {opportunity}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {isLoading ? 'Generating predictions...' : 'Click "Generate Analysis" to see predictions'}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="patterns" className="space-y-4">
              {patternInsights.total > 0 ? (
                <>
                  {/* Pattern Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold">{patternInsights.total}</div>
                        <div className="text-xs text-muted-foreground">Total Patterns</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold text-green-500">{patternInsights.highConfidence}</div>
                        <div className="text-xs text-muted-foreground">High Confidence</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold text-blue-500">{patternInsights.trends}</div>
                        <div className="text-xs text-muted-foreground">Trends</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3 text-center">
                        <div className="text-2xl font-bold text-orange-500">{patternInsights.anomalies}</div>
                        <div className="text-xs text-muted-foreground">Anomalies</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Patterns */}
                  <div>
                    <h4 className="font-medium mb-3">Recent Patterns</h4>
                    <div className="space-y-2">
                      {patternInsights.recentPatterns.map((pattern) => (
                        <Card key={pattern.id}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">
                                  {pattern.pattern_type}
                                </Badge>
                                <span className="text-sm font-medium">
                                  {pattern.career_path} • {pattern.location}
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium">
                                  {Math.round(pattern.confidence_score * 100)}% confidence
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(pattern.detected_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {isLoading ? 'Discovering patterns...' : 'No patterns detected yet'}
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4">
              {prioritizedRecommendations.total > 0 ? (
                <div className="space-y-4">
                  {/* High Priority Recommendations */}
                  {prioritizedRecommendations.high.length > 0 && (
                    <div>
                      <h4 className="font-medium text-red-600 mb-3 flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        High Priority ({prioritizedRecommendations.high.length})
                      </h4>
                      <div className="space-y-2">
                        {prioritizedRecommendations.high.map((rec) => (
                          <Card key={rec.id} className="border-red-200">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-medium">{rec.title}</h5>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {rec.description}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2 text-xs">
                                    <span>Impact: {rec.impact_score}/10</span>
                                    <span>Effort: {rec.effort_required}</span>
                                    <span>Timeline: {rec.timeline}</span>
                                  </div>
                                </div>
                                <Badge variant="destructive">High</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Medium Priority Recommendations */}
                  {prioritizedRecommendations.medium.length > 0 && (
                    <div>
                      <h4 className="font-medium text-yellow-600 mb-3">
                        Medium Priority ({prioritizedRecommendations.medium.length})
                      </h4>
                      <div className="space-y-2">
                        {prioritizedRecommendations.medium.slice(0, 3).map((rec) => (
                          <Card key={rec.id} className="border-yellow-200">
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h5 className="font-medium text-sm">{rec.title}</h5>
                                  <p className="text-xs text-muted-foreground">
                                    {rec.timeline} • Impact: {rec.impact_score}/10
                                  </p>
                                </div>
                                <Badge variant="secondary">Medium</Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {isLoading ? 'Generating recommendations...' : 'No recommendations available'}
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Error States */}
          {(errors.predictions || errors.patterns || errors.recommendations) && (
            <div className="mt-4 p-3 rounded border border-red-200 bg-red-50">
              <p className="text-sm text-red-600">
                Analysis Error: {errors.predictions || errors.patterns || errors.recommendations}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
});

PredictiveAnalyticsPanel.displayName = 'PredictiveAnalyticsPanel';