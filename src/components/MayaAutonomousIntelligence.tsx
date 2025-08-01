import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  Target, 
  TrendingUp, 
  Settings, 
  Activity, 
  Zap, 
  Eye, 
  BarChart3,
  CheckCircle,
  AlertTriangle,
  Clock,
  Lightbulb,
  Cog,
  Users,
  BookOpen,
  ArrowRight,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { usePredictiveCareerInsights } from '@/hooks/usePredictiveCareerInsights';
import { useAdaptiveLearning } from '@/hooks/useAdaptiveLearning';
import { useProactiveDecisions } from '@/hooks/useProactiveDecisions';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { useRealtimeMayaData } from '@/hooks/useRealtimeMayaData';
import { LoadingState } from './LoadingState';
import { MayaDataQualityIndicator } from './MayaDataQualityIndicator';
import { StableLoadingState, StableMetricCard } from './StableLoadingState';
import { useRequestQueue } from '@/hooks/useRequestQueue';
import { useCircuitBreaker } from '@/hooks/useCircuitBreaker';

interface AutomationMetrics {
  totalAutonomousActions: number;
  predictionAccuracy: number;
  learningOptimizations: number;
  careerProgressAcceleration: number;
  timeToGoalReduction: number;
  userSatisfactionScore: number;
}

interface MayaThoughtProcess {
  id: string;
  timestamp: Date;
  action: string;
  reasoning: string;
  confidence: number;
  outcome?: string;
  category: 'prediction' | 'optimization' | 'decision' | 'intervention';
}

export function MayaAutonomousIntelligence() {
  const [activeTab, setActiveTab] = useState('overview');
  const [autonomyLevel, setAutonomyLevel] = useState(85);
  const [autoOptimization, setAutoOptimization] = useState(true);
  const [thoughtProcessVisible, setThoughtProcessVisible] = useState(true);
  
  // Request management and stability
  const { enqueueRequest, getQueueStatus } = useRequestQueue(2, 2000); // Max 2 concurrent, 2s delay
  const circuitBreaker = useCircuitBreaker();
  const refreshInProgress = useRef(false);
  
  const { 
    insights, 
    patterns, 
    loading: insightsLoading,
    runPredictiveAnalysis,
    isUsingMockData: insightsMockData,
    lastAnalysis: insightsLastRefresh,
    error: insightsError
  } = usePredictiveCareerInsights();
  
  const { 
    optimizations, 
    metrics, 
    interventions,
    loading: learningLoading,
    runAdaptiveAnalysis,
    isUsingMockData: optimizationsMockData,
    lastRefreshed: optimizationsLastRefresh,
    error: optimizationsError
  } = useAdaptiveLearning();
  
  const { 
    decisions, 
    loading: decisionsLoading,
    generateProactiveDecisions,
    isUsingMockData: decisionsMockData,
    lastRefreshed: decisionsLastRefresh,
    error: decisionsError
  } = useProactiveDecisions();
  
  const { loading: mayaLoading } = useEnhancedMaya();
  const mayaData = useRealtimeMayaData();

  // Mock automation metrics - in real implementation, these would come from analytics
  const automationMetrics: AutomationMetrics = {
    totalAutonomousActions: 342,
    predictionAccuracy: 89.2,
    learningOptimizations: 47,
    careerProgressAcceleration: 34.5,
    timeToGoalReduction: 28.7,
    userSatisfactionScore: 4.7
  };

  // Mock Maya's thought process - in real implementation, this would be logged from actual AI decisions
  const [thoughtProcess, setThoughtProcess] = useState<MayaThoughtProcess[]>([
    {
      id: 'thought-1',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      action: 'Detected declining engagement in JavaScript course',
      reasoning: 'User completion rate dropped 15% over 3 days. Learning velocity decreased. Recommended intervention.',
      confidence: 0.92,
      outcome: 'Suggested shorter learning sessions',
      category: 'optimization'
    },
    {
      id: 'thought-2',
      timestamp: new Date(Date.now() - 12 * 60 * 1000),
      action: 'Predicted React demand surge in user location',
      reasoning: 'Job posting analysis shows 23% increase in React positions. User has 65% React skill completion.',
      confidence: 0.87,
      outcome: 'Prioritized React learning path',
      category: 'prediction'
    },
    {
      id: 'thought-3',
      timestamp: new Date(Date.now() - 18 * 60 * 1000),
      action: 'Identified career pivot opportunity',
      reasoning: 'User skills align 91% with emerging Full Stack role. Market timing optimal.',
      confidence: 0.94,
      outcome: 'Generated pivot recommendation',
      category: 'decision'
    }
  ]);

  const isLoading = insightsLoading || learningLoading || decisionsLoading || mayaLoading;

  const refreshAllSystems = useCallback(async () => {
    // Prevent concurrent refresh operations
    if (refreshInProgress.current) {
      console.log('⏳ Refresh already in progress, skipping...');
      return;
    }

    refreshInProgress.current = true;
    console.log('🔄 Refreshing all Maya automation systems...');
    
    try {
      // Use circuit breaker to prevent cascading failures
      await circuitBreaker.executeWithCircuitBreaker(async () => {
        // Queue requests to prevent overwhelming the API
        const refreshTasks = [
          enqueueRequest(() => runPredictiveAnalysis(), 'refresh-insights'),
          enqueueRequest(() => runAdaptiveAnalysis(), 'refresh-optimization'),
          enqueueRequest(() => generateProactiveDecisions(), 'refresh-decisions'),
          enqueueRequest(() => mayaData.fetchInitialData(), 'refresh-realtime')
        ];

        // Wait for all with timeout
        await Promise.race([
          Promise.allSettled(refreshTasks),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Refresh timeout')), 30000)
          )
        ]);
      }, () => {
        console.warn('⚠️ Using cached data due to circuit breaker');
        return Promise.resolve();
      });

      console.log('✅ All systems refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing systems:', error);
    } finally {
      refreshInProgress.current = false;
    }
  }, [runPredictiveAnalysis, runAdaptiveAnalysis, generateProactiveDecisions, mayaData, enqueueRequest, circuitBreaker]);

  const getCategoryIcon = (category: MayaThoughtProcess['category']) => {
    switch (category) {
      case 'prediction': return <TrendingUp className="h-4 w-4" />;
      case 'optimization': return <Cog className="h-4 w-4" />;
      case 'decision': return <Target className="h-4 w-4" />;
      case 'intervention': return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingState message="Initializing Maya's autonomous intelligence systems..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Maya Autonomous Intelligence</h1>
          <p className="text-muted-foreground mt-1">Advanced AI-driven automation with transparent, controllable, and trackable intelligence</p>
          <div className="mt-2">
            <MayaDataQualityIndicator 
              isConnected={mayaData.isConnected}
              lastRefreshed={mayaData.lastUpdate}
            />
          </div>
        </div>
        
        <Button 
          onClick={refreshAllSystems} 
          variant="outline"
          disabled={isLoading || refreshInProgress.current}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading || refreshInProgress.current ? 'animate-spin' : ''}`} />
          Refresh All Systems
        </Button>
      </div>

      {/* Quick Metrics with Stable Loading */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StableMetricCard
          title="Autonomous Actions"
          value={automationMetrics.totalAutonomousActions}
          isLoading={isLoading}
          className="relative"
        />
        
        <StableMetricCard
          title="Prediction Accuracy"
          value={`${automationMetrics.predictionAccuracy}%`}
          isLoading={isLoading}
        />
        
        <StableMetricCard
          title="Learning Velocity"
          value={`+${automationMetrics.careerProgressAcceleration}%`}
          isLoading={isLoading}
        />
        
        <StableMetricCard
          title="Autonomy Level"
          value={`${autonomyLevel}%`}
          isLoading={isLoading}
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="predictive">Predictive Intelligence</TabsTrigger>
          <TabsTrigger value="learning">Learning Optimization</TabsTrigger>
          <TabsTrigger value="decisions">Decision Intelligence</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {/* Automation Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Automation Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Autonomy Level: {autonomyLevel}%</label>
                  <Progress value={autonomyLevel} className="w-full" />
                  <p className="text-xs text-muted-foreground">
                    Higher levels allow Maya to make more decisions automatically
                  </p>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto-Optimization</p>
                    <p className="text-xs text-muted-foreground">Let Maya optimize your learning path automatically</p>
                  </div>
                  <Switch 
                    checked={autoOptimization} 
                    onCheckedChange={setAutoOptimization}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Performance Impact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Time to Goal Reduction</span>
                  <Badge variant="default">{automationMetrics.timeToGoalReduction}% faster</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Learning Optimizations</span>
                  <Badge variant="secondary">{automationMetrics.learningOptimizations} applied</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">User Satisfaction</span>
                  <Badge variant="outline">{automationMetrics.userSatisfactionScore}/5.0</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Maya's Thought Process */}
          {thoughtProcessVisible && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Maya's Thought Process
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setThoughtProcessVisible(false)}
                  >
                    <Eye className="h-4 w-4" />
                    Hide
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {thoughtProcess.map((thought) => (
                  <div key={thought.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(thought.category)}
                        <span className="font-medium text-sm">{thought.action}</span>
                        <Badge variant="outline" className="text-xs">
                          {(thought.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {thought.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{thought.reasoning}</p>
                    {thought.outcome && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-green-700">{thought.outcome}</span>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Predictive Intelligence Tab */}
        <TabsContent value="predictive" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Predictive Intelligence Overview
                <MayaDataQualityIndicator 
                  variant="compact"
                  isUsingMockData={insightsMockData}
                  lastRefreshed={insightsLastRefresh}
                />
              </CardTitle>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  AI-powered analysis of your career trajectory and future opportunities
                </p>
                {insightsError && (
                  <div className="text-destructive text-sm mb-4">Error: {insightsError}</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {insights.map((insight) => (
                    <Card key={insight.id} className="relative">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant={insight.urgency === 'high' ? 'destructive' : insight.urgency === 'medium' ? 'default' : 'secondary'}>
                            {insight.type}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{(insight.confidence * 100).toFixed(0)}%</span>
                        </div>
                        <h4 className="font-semibold text-sm mb-2">{insight.title}</h4>
                        <p className="text-xs text-muted-foreground mb-3">{insight.description}</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>Impact:</span>
                            <Progress value={insight.potentialImpact.careerGrowth * 100} className="w-16 h-2" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </CardHeader>
          </Card>
        </TabsContent>

        {/* Learning Optimization Tab */}
        <TabsContent value="learning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Learning Optimization Engine
                <MayaDataQualityIndicator 
                  variant="compact"
                  isUsingMockData={optimizationsMockData}
                  lastRefreshed={optimizationsLastRefresh}
                />
              </CardTitle>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Adaptive learning path optimization based on your performance patterns
                </p>
                {optimizationsError && (
                  <div className="text-destructive text-sm mb-4">Error: {optimizationsError}</div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {optimizations.map((optimization) => (
                    <Card key={optimization.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline">{optimization.type.replace('_', ' ')}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {(optimization.confidence * 100).toFixed(0)}% confidence
                          </span>
                        </div>
                        <h4 className="font-semibold text-sm mb-2">{optimization.title}</h4>
                        <p className="text-xs text-muted-foreground mb-3">{optimization.description}</p>
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Completion Rate:</span>
                              <span className="ml-1 text-green-600">
                                +{(optimization.expectedImprovement.completionRate * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Retention:</span>
                              <span className="ml-1 text-blue-600">
                                +{(optimization.expectedImprovement.retentionRate * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </CardHeader>
          </Card>
        </TabsContent>

        {/* Decision Intelligence Tab */}
        <TabsContent value="decisions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Proactive Decision Intelligence
                <MayaDataQualityIndicator 
                  variant="compact"
                  isUsingMockData={decisionsMockData}
                  lastRefreshed={decisionsLastRefresh}
                />
              </CardTitle>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  AI-generated decision support for strategic career moves
                </p>
                {decisionsError && (
                  <div className="text-destructive text-sm mb-4">Error: {decisionsError}</div>
                )}
                <div className="space-y-4">
                  {decisions.map((decision) => (
                    <Card key={decision.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{decision.title}</h4>
                            <p className="text-sm text-muted-foreground mt-1">{decision.description}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge variant={decision.urgency === 'high' ? 'destructive' : 'default'}>
                              {decision.urgency}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {(decision.confidence * 100).toFixed(0)}% confidence
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium mb-2">Options:</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {decision.options.map((option) => (
                                <div key={option.id} className="border rounded p-3 space-y-2">
                                  <h5 className="font-medium text-sm">{option.title}</h5>
                                  <p className="text-xs text-muted-foreground">{option.description}</p>
                                  <div className="flex justify-between text-xs">
                                    <span>Success Rate:</span>
                                    <span className="text-green-600">
                                      {(option.expectedOutcome.successProbability * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="text-xs text-muted-foreground">
                            <strong>Time Window:</strong> {decision.timeWindow}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}