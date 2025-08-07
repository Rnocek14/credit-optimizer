import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { useGamification } from '@/hooks/useGamification';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Lightbulb,
  BarChart3,
  Zap
} from 'lucide-react';

interface PredictionMetric {
  label: string;
  value: number;
  trend: 'up' | 'down' | 'stable';
  confidence: number;
  gamificationFactor: number;
}

interface LearningPathPrediction {
  pathway: string;
  successProbability: number;
  timeToCompletion: string;
  gamificationBoost: number;
  keyFactors: string[];
  riskFactors: string[];
}

export function MayaPredictiveTransparency() {
  const { getResponseInsights, explainDecision, loading } = useEnhancedMaya();
  const { getCurrentStreak, getStreakMultiplier, metrics } = useGamification();
  const [activeTab, setActiveTab] = useState('predictions');
  const [predictionsData, setPredictionsData] = useState<PredictionMetric[]>([]);
  const [pathwayPredictions, setPathwayPredictions] = useState<LearningPathPrediction[]>([]);

  const insights = getResponseInsights();
  const currentStreak = getCurrentStreak();
  const streakMultiplier = getStreakMultiplier();

  useEffect(() => {
    // Generate prediction metrics based on current data
    const generatePredictions = () => {
      const baseMetrics: PredictionMetric[] = [
        {
          label: 'Skill Acquisition Rate',
          value: 78 + (currentStreak * 2), // Streak influences learning speed
          trend: currentStreak > 3 ? 'up' : 'stable',
          confidence: 87,
          gamificationFactor: (streakMultiplier - 1) * 100
        },
        {
          label: 'Course Completion Probability',
          value: 85 + Math.min(currentStreak, 15), // Max 15% boost from streak
          trend: 'up',
          confidence: 92,
          gamificationFactor: currentStreak * 2
        },
        {
          label: 'Market Readiness Score',
          value: insights?.careerReadiness || 75,
          trend: 'stable',
          confidence: insights?.decisionConfidence || 80,
          gamificationFactor: 0
        },
        {
          label: 'Learning Velocity',
          value: Math.min(95, 65 + (streakMultiplier * 20)),
          trend: currentStreak >= 7 ? 'up' : 'stable',
          confidence: 88,
          gamificationFactor: (streakMultiplier - 1) * 30
        }
      ];

      setPredictionsData(baseMetrics);

      // Generate pathway predictions
      const pathways: LearningPathPrediction[] = [
        {
          pathway: 'Data Science Specialization',
          successProbability: Math.min(95, 78 + (currentStreak * 1.5)),
          timeToCompletion: currentStreak >= 7 ? '8-10 weeks' : '12-14 weeks',
          gamificationBoost: (streakMultiplier - 1) * 15,
          keyFactors: [
            'Strong mathematical foundation',
            'Consistent learning pattern',
            'High engagement with Python content'
          ],
          riskFactors: currentStreak < 3 ? ['Inconsistent study schedule'] : []
        },
        {
          pathway: 'Machine Learning Engineer',
          successProbability: Math.min(90, 72 + (currentStreak * 2)),
          timeToCompletion: currentStreak >= 10 ? '10-12 weeks' : '16-18 weeks',
          gamificationBoost: (streakMultiplier - 1) * 20,
          keyFactors: [
            'Programming experience',
            'Learning streak momentum',
            'Market demand alignment'
          ],
          riskFactors: currentStreak < 5 ? ['Advanced concepts may require more time', 'Complex project requirements'] : ['Advanced concepts may require more time']
        },
        {
          pathway: 'Full Stack Developer',
          successProbability: Math.min(92, 82 + currentStreak),
          timeToCompletion: currentStreak >= 5 ? '12-14 weeks' : '16-20 weeks',
          gamificationBoost: (streakMultiplier - 1) * 12,
          keyFactors: [
            'Broad skill development',
            'Practical project focus',
            'High completion rates for similar profiles'
          ],
          riskFactors: currentStreak < 7 ? ['Wide skill range requires sustained effort'] : []
        }
      ];

      setPathwayPredictions(pathways);
    };

    generatePredictions();
  }, [insights, currentStreak, streakMultiplier]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingUp className="w-4 h-4 text-red-500 transform rotate-180" />;
      default: return <Target className="w-4 h-4 text-blue-500" />;
    }
  };

  const getSuccessColor = (probability: number) => {
    if (probability >= 85) return 'text-green-600 bg-green-50';
    if (probability >= 70) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Maya's Predictive Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="predictions">Success Metrics</TabsTrigger>
            <TabsTrigger value="pathways">Learning Paths</TabsTrigger>
            <TabsTrigger value="reasoning">AI Reasoning</TabsTrigger>
          </TabsList>

          <TabsContent value="predictions" className="space-y-4">
            <div className="grid gap-4">
              {predictionsData.map((metric, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTrendIcon(metric.trend)}
                      <span className="font-medium">{metric.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {metric.confidence}% confidence
                      </Badge>
                      {metric.gamificationFactor > 0 && (
                        <Badge className="text-xs bg-purple-100 text-purple-800">
                          <Zap className="w-3 h-3 mr-1" />
                          +{metric.gamificationFactor.toFixed(0)}% boost
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Predicted Score</span>
                      <span className="font-bold">{metric.value}%</span>
                    </div>
                    <Progress value={metric.value} className="h-2" />
                  </div>

                  {metric.gamificationFactor > 0 && (
                    <div className="text-xs text-purple-600 bg-purple-50 p-2 rounded">
                      Your {currentStreak}-day learning streak is boosting this prediction by {metric.gamificationFactor.toFixed(1)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pathways" className="space-y-4">
            <div className="grid gap-4">
              {pathwayPredictions.map((pathway, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{pathway.pathway}</h4>
                    <Badge className={getSuccessColor(pathway.successProbability)}>
                      {pathway.successProbability}% success rate
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Completion Time:</span>
                      <p className="font-medium">{pathway.timeToCompletion}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gamification Boost:</span>
                      <p className="font-medium text-purple-600">+{pathway.gamificationBoost.toFixed(1)}%</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-medium text-sm flex items-center gap-1">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Success Factors
                    </h5>
                    <ul className="space-y-1">
                      {pathway.keyFactors.map((factor, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                          <div className="w-1 h-1 bg-green-500 rounded-full" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {pathway.riskFactors.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-medium text-sm flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Considerations
                      </h5>
                      <ul className="space-y-1">
                        {pathway.riskFactors.map((risk, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                            <div className="w-1 h-1 bg-amber-500 rounded-full" />
                            {risk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <Progress value={pathway.successProbability} className="h-2" />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reasoning" className="space-y-4">
            <div className="text-center py-8">
              <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">AI Decision Reasoning</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Understand how Maya analyzes your learning patterns and market data to make predictions
              </p>
              
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg text-left">
                  <h4 className="font-medium text-blue-800 mb-2">Current Analysis Factors</h4>
                  <ul className="space-y-1 text-sm text-blue-700">
                    <li>• Learning streak: {currentStreak} days ({currentStreak > 7 ? 'Strong momentum' : 'Building consistency'})</li>
                    <li>• XP multiplier: {streakMultiplier.toFixed(1)}x (influences recommendation difficulty)</li>
                    <li>• Engagement trend: {((metrics?.engagement_trend || 0.75) * 100).toFixed(0)}% positive</li>
                    <li>• Market alignment: {insights?.marketHealthScore || 75}% favorable</li>
                  </ul>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg text-left">
                  <h4 className="font-medium text-purple-800 mb-2">Gamification Impact</h4>
                  <p className="text-sm text-purple-700">
                    Your consistent learning behavior and {currentStreak}-day streak indicates high 
                    motivation and discipline. Maya adjusts recommendations to match this engagement 
                    level, suggesting more challenging paths with higher potential rewards.
                  </p>
                </div>

                {insights?.primaryFactors && insights.primaryFactors.length > 0 && (
                  <div className="bg-green-50 p-4 rounded-lg text-left">
                    <h4 className="font-medium text-green-800 mb-2">Key Decision Factors</h4>
                    <ul className="space-y-1 text-sm text-green-700">
                      {insights.primaryFactors.map((factor, i) => (
                        <li key={i}>• {factor}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}