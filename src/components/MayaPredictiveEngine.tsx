import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingUp, Target, Clock, Brain, Zap, BarChart3 } from 'lucide-react';
import { usePredictiveCareerInsights } from '@/hooks/usePredictiveCareerInsights';
import { LoadingState } from './LoadingState';

export function MayaPredictiveEngine() {
  const [activeInsight, setActiveInsight] = useState<string | null>(null);
  const {
    insights,
    patterns,
    runPredictiveAnalysis,
    getInsightsByType,
    getHighPriorityInsights,
    getInsightMetrics,
    loading,
    isReady,
    lastAnalysis
  } = usePredictiveCareerInsights();

  const metrics = getInsightMetrics();
  const highPriorityInsights = getHighPriorityInsights();

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <TrendingUp className="h-4 w-4" />;
      case 'risk': return <AlertTriangle className="h-4 w-4" />;
      case 'optimization': return <Zap className="h-4 w-4" />;
      case 'milestone': return <Target className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  if (loading) {
    return <LoadingState type="intelligence" message="Maya is analyzing career patterns and generating predictions..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Maya Predictive Intelligence
          </h2>
          <p className="text-muted-foreground">
            AI-powered career forecasting and pattern recognition
          </p>
        </div>
        <Button onClick={runPredictiveAnalysis} disabled={loading}>
          <BarChart3 className="h-4 w-4 mr-2" />
          Refresh Analysis
        </Button>
      </div>

      {/* Quick Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{metrics.totalInsights}</div>
              <p className="text-xs text-muted-foreground">Total Insights</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{Math.round(metrics.averageConfidence * 100)}%</div>
              <p className="text-xs text-muted-foreground">Avg Confidence</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{Math.round(metrics.opportunityRatio * 100)}%</div>
              <p className="text-xs text-muted-foreground">Opportunities</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{metrics.criticalAlerts}</div>
              <p className="text-xs text-muted-foreground">Critical Alerts</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* High Priority Alerts */}
      {highPriorityInsights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Priority Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {highPriorityInsights.slice(0, 3).map((insight) => (
                <div key={insight.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getTypeIcon(insight.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{insight.title}</h4>
                      <Badge variant={getUrgencyColor(insight.urgency)}>{insight.urgency}</Badge>
                      <Badge variant="outline">{Math.round(insight.confidence * 100)}% confident</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {insight.predictedTimeframe}
                      </span>
                      <span>Impact: +{Math.round(insight.potentialImpact.careerGrowth * 100)}% career growth</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pattern Analysis */}
      {patterns && (
        <Card>
          <CardHeader>
            <CardTitle>Learning Pattern Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Performance Metrics</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Learning Velocity</span>
                      <span>{Math.round(patterns.learningVelocity * 100)}%</span>
                    </div>
                    <Progress value={patterns.learningVelocity * 100} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Career Progression Rate</span>
                      <span>{Math.round(patterns.careerProgressionRate * 100)}%</span>
                    </div>
                    <Progress value={patterns.careerProgressionRate * 100} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Market Alignment</span>
                      <span>{Math.round(patterns.marketAlignmentScore * 100)}%</span>
                    </div>
                    <Progress value={patterns.marketAlignmentScore * 100} />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">Detected Trends</h4>
                <div className="space-y-2">
                  {patterns.engagementTrends.map((trend, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm capitalize">{trend.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Insights */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Insights</TabsTrigger>
          <TabsTrigger value="opportunity">Opportunities</TabsTrigger>
          <TabsTrigger value="risk">Risks</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
          <TabsTrigger value="milestone">Milestones</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {insights.map((insight) => (
            <Card key={insight.id}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  {getTypeIcon(insight.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{insight.title}</h3>
                      <Badge variant={getUrgencyColor(insight.urgency)}>{insight.urgency}</Badge>
                      <Badge variant="outline">{Math.round(insight.confidence * 100)}% confident</Badge>
                    </div>
                    <p className="text-muted-foreground mb-3">{insight.description}</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="font-medium text-sm mb-2">Action Items</h4>
                        <ul className="space-y-1">
                          {insight.actionItems.map((item, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                              <div className="w-1 h-1 bg-current rounded-full" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm mb-2">Impact Forecast</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Career Growth:</span>
                            <span className="text-green-600">+{Math.round(insight.potentialImpact.careerGrowth * 100)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Salary Increase:</span>
                            <span className="text-green-600">+{Math.round(insight.potentialImpact.salaryIncrease * 100)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Market Relevance:</span>
                            <span className="text-green-600">+{Math.round(insight.potentialImpact.marketRelevance * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {insight.predictedTimeframe}
                      </span>
                      <span>Market factors: {insight.marketFactors.length}</span>
                      <span>Personal factors: {insight.personalFactors.length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {['opportunity', 'risk', 'optimization', 'milestone'].map((type) => (
          <TabsContent key={type} value={type} className="space-y-4">
            {getInsightsByType(type as any).map((insight) => (
              <Card key={insight.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    {getTypeIcon(insight.type)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{insight.title}</h3>
                        <Badge variant={getUrgencyColor(insight.urgency)}>{insight.urgency}</Badge>
                        <Badge variant="outline">{Math.round(insight.confidence * 100)}% confident</Badge>
                      </div>
                      <p className="text-muted-foreground mb-3">{insight.description}</p>
                      
                      <div className="mb-4">
                        <h4 className="font-medium text-sm mb-2">Recommended Actions</h4>
                        <ul className="space-y-1">
                          {insight.actionItems.map((item, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                              <div className="w-1 h-1 bg-current rounded-full" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      {lastAnalysis && (
        <div className="text-center text-sm text-muted-foreground">
          Last analysis: {lastAnalysis.toLocaleString()}
        </div>
      )}
    </div>
  );
}