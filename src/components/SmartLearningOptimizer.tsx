import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Zap, 
  TrendingUp, 
  Clock, 
  Target, 
  Settings, 
  PlayCircle, 
  PauseCircle,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Lightbulb
} from 'lucide-react';
import { useAdaptiveLearning } from '@/hooks/useAdaptiveLearning';
import { LoadingState } from './LoadingState';

export function SmartLearningOptimizer() {
  const [selectedOptimization, setSelectedOptimization] = useState<string | null>(null);
  const [implementingOptimizations, setImplementingOptimizations] = useState<Set<string>>(new Set());

  const {
    optimizations,
    metrics,
    interventions,
    runAdaptiveAnalysis,
    implementOptimization,
    triggerIntervention,
    getOptimizationsByType,
    getHighImpactOptimizations,
    getAdaptiveLearningMetrics,
    autoOptimizationEnabled,
    setAutoOptimizationEnabled,
    loading,
    isReady
  } = useAdaptiveLearning();

  const adaptiveMetrics = getAdaptiveLearningMetrics();
  const highImpactOptimizations = getHighImpactOptimizations();

  const handleImplementOptimization = async (optimizationId: string) => {
    setImplementingOptimizations(prev => new Set(prev).add(optimizationId));
    
    try {
      const result = await implementOptimization(optimizationId);
      if (result?.success) {
        // Show success feedback
        console.log('Optimization implemented successfully:', result.message);
      }
    } catch (error) {
      console.error('Error implementing optimization:', error);
    } finally {
      setImplementingOptimizations(prev => {
        const newSet = new Set(prev);
        newSet.delete(optimizationId);
        return newSet;
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'sequence_change': return <Target className="h-4 w-4" />;
      case 'difficulty_adjustment': return <BarChart3 className="h-4 w-4" />;
      case 'pace_modification': return <Clock className="h-4 w-4" />;
      case 'skill_pivot': return <TrendingUp className="h-4 w-4" />;
      case 'learning_style_shift': return <Lightbulb className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getInterventionIcon = (type: string) => {
    switch (type) {
      case 'difficulty_reduction': return <BarChart3 className="h-4 w-4" />;
      case 'additional_practice': return <Target className="h-4 w-4" />;
      case 'concept_clarification': return <Lightbulb className="h-4 w-4" />;
      case 'motivation_boost': return <TrendingUp className="h-4 w-4" />;
      case 'learning_path_change': return <Zap className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  if (loading) {
    return <LoadingState type="intelligence" message="Maya is analyzing your learning patterns and generating optimizations..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" />
            Smart Learning Optimizer
          </h2>
          <p className="text-muted-foreground">
            AI-powered learning path optimization and adaptive interventions
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              checked={autoOptimizationEnabled}
              onCheckedChange={setAutoOptimizationEnabled}
            />
            <label className="text-sm">Auto-optimize</label>
          </div>
          <Button onClick={runAdaptiveAnalysis} disabled={loading}>
            <Settings className="h-4 w-4 mr-2" />
            Refresh Analysis
          </Button>
        </div>
      </div>

      {/* Performance Overview */}
      {adaptiveMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{Math.round(adaptiveMetrics.currentPerformance.completionRate * 100)}%</div>
              <p className="text-xs text-muted-foreground">Completion Rate</p>
              <div className="text-xs text-green-600 mt-1">
                +{Math.round(adaptiveMetrics.optimizationPotential.totalImprovementPotential * 100)}% potential
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{Math.round(adaptiveMetrics.currentPerformance.retentionRate * 100)}%</div>
              <p className="text-xs text-muted-foreground">Retention Rate</p>
              <div className="text-xs text-blue-600 mt-1">
                {adaptiveMetrics.optimizationPotential.highImpactOptimizations} high-impact optimizations
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{Math.round(adaptiveMetrics.currentPerformance.learningVelocity * 100)}%</div>
              <p className="text-xs text-muted-foreground">Learning Velocity</p>
              <div className="text-xs text-purple-600 mt-1">
                {adaptiveMetrics.activeInterventions} active interventions
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{Math.round(adaptiveMetrics.optimizationPotential.avgConfidence * 100)}%</div>
              <p className="text-xs text-muted-foreground">Avg Confidence</p>
              <div className="text-xs text-orange-600 mt-1">
                {adaptiveMetrics.strugglingAreas} areas need attention
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* High Impact Optimizations */}
      {highImpactOptimizations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              High-Impact Optimizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {highImpactOptimizations.slice(0, 3).map((optimization) => (
                <div key={optimization.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getTypeIcon(optimization.type)}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{optimization.title}</h4>
                          <Badge variant="outline">
                            {Math.round(optimization.confidence * 100)}% confidence
                          </Badge>
                          <span className={`px-2 py-1 rounded-full text-xs ${getEffortColor(optimization.implementationEffort)}`}>
                            {optimization.implementationEffort} effort
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{optimization.description}</p>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div>
                            <span className="font-medium">Current:</span>
                            <p className="text-muted-foreground">{optimization.currentApproach}</p>
                          </div>
                          <div>
                            <span className="font-medium">Optimized:</span>
                            <p className="text-muted-foreground">{optimization.optimizedApproach}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-4 mt-3 text-sm">
                          <span className="text-green-600">
                            +{Math.round(optimization.expectedImprovement.completionRate * 100)}% completion
                          </span>
                          <span className="text-blue-600">
                            +{Math.round(optimization.expectedImprovement.retentionRate * 100)}% retention
                          </span>
                          <span className="text-purple-600">
                            {Math.round(optimization.expectedImprovement.timeToMastery * 100)}% time to mastery
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleImplementOptimization(optimization.id)}
                      disabled={implementingOptimizations.has(optimization.id)}
                      size="sm"
                    >
                      {implementingOptimizations.has(optimization.id) ? (
                        <PauseCircle className="h-4 w-4 mr-2" />
                      ) : (
                        <PlayCircle className="h-4 w-4 mr-2" />
                      )}
                      Implement
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Metrics */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Learning Pattern Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium mb-3">Performance Metrics</h4>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Completion Rate</span>
                      <span>{Math.round(metrics.avgCompletionRate * 100)}%</span>
                    </div>
                    <Progress value={metrics.avgCompletionRate * 100} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Retention Rate</span>
                      <span>{Math.round(metrics.avgRetentionRate * 100)}%</span>
                    </div>
                    <Progress value={metrics.avgRetentionRate * 100} />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Learning Velocity</span>
                      <span>{Math.round(metrics.learningVelocity * 100)}%</span>
                    </div>
                    <Progress value={metrics.learningVelocity * 100} />
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Optimal Learning Times</h4>
                <div className="space-y-2">
                  {metrics.optimalLearningTimes.map((time, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm">{time}</span>
                    </div>
                  ))}
                </div>
                
                <h4 className="font-medium mb-3 mt-4">Preferred Methods</h4>
                <div className="space-y-2">
                  {metrics.preferredLearningMethods.map((method, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      <span className="text-sm capitalize">{method.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Struggling Areas</h4>
                <div className="space-y-2 mb-4">
                  {metrics.strugglingAreas.map((area, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <AlertTriangle className="w-3 h-3 text-red-500" />
                      <span className="text-sm capitalize">{area.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
                
                <h4 className="font-medium mb-3">Strong Areas</h4>
                <div className="space-y-2">
                  {metrics.strongAreas.map((area, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span className="text-sm capitalize">{area.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Interventions */}
      {interventions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Smart Interventions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {interventions.map((intervention) => (
                <Alert key={intervention.id}>
                  <div className="flex items-start gap-3">
                    {getInterventionIcon(intervention.interventionType)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium">{intervention.title}</h4>
                        <Badge variant={intervention.priority === 'high' ? 'destructive' : 'default'}>
                          {intervention.priority}
                        </Badge>
                        {intervention.autoImplement && (
                          <Badge variant="outline">Auto-implement</Badge>
                        )}
                      </div>
                      <AlertDescription className="mb-3">
                        {intervention.message}
                      </AlertDescription>
                      <div>
                        <h5 className="font-medium text-sm mb-2">Suggested Actions:</h5>
                        <ul className="space-y-1">
                          {intervention.actionSuggestions.map((action, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                              <div className="w-1 h-1 bg-current rounded-full" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {!intervention.autoImplement && (
                        <Button
                          size="sm"
                          className="mt-3"
                          onClick={() => triggerIntervention(intervention.id)}
                        >
                          Apply Intervention
                        </Button>
                      )}
                    </div>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Optimizations */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="sequence_change">Sequence</TabsTrigger>
          <TabsTrigger value="difficulty_adjustment">Difficulty</TabsTrigger>
          <TabsTrigger value="pace_modification">Pace</TabsTrigger>
          <TabsTrigger value="skill_pivot">Skill Pivot</TabsTrigger>
          <TabsTrigger value="learning_style_shift">Style</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {optimizations.map((optimization) => (
            <Card key={optimization.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    {getTypeIcon(optimization.type)}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{optimization.title}</h3>
                        <Badge variant="outline">
                          {Math.round(optimization.confidence * 100)}% confidence
                        </Badge>
                        <span className={`px-2 py-1 rounded-full text-xs ${getEffortColor(optimization.implementationEffort)}`}>
                          {optimization.implementationEffort} effort
                        </span>
                      </div>
                      <p className="text-muted-foreground mb-4">{optimization.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <h4 className="font-medium text-sm mb-2">Current Approach</h4>
                          <p className="text-sm text-muted-foreground">{optimization.currentApproach}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-sm mb-2">Optimized Approach</h4>
                          <p className="text-sm text-muted-foreground">{optimization.optimizedApproach}</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Completion:</span>
                          <div className="text-green-600">+{Math.round(optimization.expectedImprovement.completionRate * 100)}%</div>
                        </div>
                        <div>
                          <span className="font-medium">Retention:</span>
                          <div className="text-blue-600">+{Math.round(optimization.expectedImprovement.retentionRate * 100)}%</div>
                        </div>
                        <div>
                          <span className="font-medium">Time to Mastery:</span>
                          <div className="text-purple-600">{Math.round(optimization.expectedImprovement.timeToMastery * 100)}%</div>
                        </div>
                        <div>
                          <span className="font-medium">Engagement:</span>
                          <div className="text-orange-600">+{Math.round(optimization.expectedImprovement.engagementScore * 100)}%</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleImplementOptimization(optimization.id)}
                    disabled={implementingOptimizations.has(optimization.id)}
                  >
                    {implementingOptimizations.has(optimization.id) ? (
                      <PauseCircle className="h-4 w-4 mr-2" />
                    ) : (
                      <PlayCircle className="h-4 w-4 mr-2" />
                    )}
                    Implement
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {['sequence_change', 'difficulty_adjustment', 'pace_modification', 'skill_pivot', 'learning_style_shift'].map((type) => (
          <TabsContent key={type} value={type} className="space-y-4">
            {getOptimizationsByType(type as any).map((optimization) => (
              <Card key={optimization.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {getTypeIcon(optimization.type)}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{optimization.title}</h3>
                          <Badge variant="outline">
                            {Math.round(optimization.confidence * 100)}% confidence
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-3">{optimization.description}</p>
                        <div className="text-sm">
                          <div className="mb-2">
                            <span className="font-medium">Expected Improvement:</span>
                            <div className="mt-1 space-y-1">
                              <div>Completion Rate: <span className="text-green-600">+{Math.round(optimization.expectedImprovement.completionRate * 100)}%</span></div>
                              <div>Retention Rate: <span className="text-blue-600">+{Math.round(optimization.expectedImprovement.retentionRate * 100)}%</span></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => handleImplementOptimization(optimization.id)}
                      disabled={implementingOptimizations.has(optimization.id)}
                    >
                      Implement
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}