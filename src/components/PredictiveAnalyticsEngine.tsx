import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, AlertTriangle, Target } from 'lucide-react';
import { useUnifiedData } from '@/contexts/UnifiedDataContext';
import { useEnhancedMarketIntelligence } from '@/hooks/useEnhancedMarketIntelligence';

interface PredictiveInsight {
  type: 'trajectory' | 'market_shift' | 'skill_gap' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
  timeframe: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
}

interface CareerTrajectory {
  current_role: string;
  predicted_paths: Array<{
    role: string;
    probability: number;
    timeframe: string;
    required_actions: string[];
  }>;
  market_factors: Array<{
    factor: string;
    influence: number;
    trend: 'positive' | 'negative' | 'neutral';
  }>;
}

export const PredictiveAnalyticsEngine: React.FC = () => {
  const { state } = useUnifiedData();
  const { getHistoricalTrends, generateDemandForecast } = useEnhancedMarketIntelligence();
  const [insights, setInsights] = useState<PredictiveInsight[]>([]);
  const [trajectory, setTrajectory] = useState<CareerTrajectory | null>(null);
  const [loading, setLoading] = useState(false);

  // Memoized analytics calculations
  const analyticsData = useMemo(() => {
    if (!state.selectedCareerPath || !state.selectedLocation) return null;
    
    return {
      careerPath: state.selectedCareerPath,
      location: state.selectedLocation,
      marketData: state.marketData,
      readinessData: state.readinessData
    };
  }, [state.selectedCareerPath, state.selectedLocation, state.marketData, state.readinessData]);

  // Predictive analytics engine
  const generatePredictiveInsights = async () => {
    if (!analyticsData) return;

    setLoading(true);
    try {
      // Simulate advanced ML predictions
      const mockInsights: PredictiveInsight[] = [
        {
          type: 'trajectory',
          title: 'Strong Growth Trajectory Detected',
          description: `Your current path in ${analyticsData.careerPath} shows 87% alignment with high-growth career tracks. Market demand is projected to increase by 34% over the next 18 months.`,
          confidence: 87,
          timeframe: '18 months',
          impact: 'high',
          actionable: true
        },
        {
          type: 'market_shift',
          title: 'Emerging Skills Gap Opportunity',
          description: 'AI/ML integration skills are becoming critical in your field. Early adoption could position you in the top 15% of candidates.',
          confidence: 92,
          timeframe: '6-12 months',
          impact: 'high',
          actionable: true
        },
        {
          type: 'skill_gap',
          title: 'Strategic Skill Development Needed',
          description: 'Cloud architecture expertise is increasingly valued. Adding this skillset could increase your market value by 25-40%.',
          confidence: 78,
          timeframe: '3-6 months',
          impact: 'medium',
          actionable: true
        },
        {
          type: 'opportunity',
          title: 'Optimal Transition Window',
          description: `Current market conditions in ${analyticsData.location} favor career transitions. Competition is 23% lower than historical average.`,
          confidence: 85,
          timeframe: 'Next 4 months',
          impact: 'high',
          actionable: true
        }
      ];

      const mockTrajectory: CareerTrajectory = {
        current_role: analyticsData.careerPath,
        predicted_paths: [
          {
            role: 'Senior Technical Lead',
            probability: 78,
            timeframe: '12-18 months',
            required_actions: ['Complete advanced cloud certification', 'Lead 2+ cross-functional projects']
          },
          {
            role: 'Engineering Manager',
            probability: 65,
            timeframe: '18-24 months', 
            required_actions: ['Develop team leadership skills', 'Complete management training']
          },
          {
            role: 'Solutions Architect',
            probability: 82,
            timeframe: '6-12 months',
            required_actions: ['Gain system design expertise', 'Build portfolio of architectural solutions']
          }
        ],
        market_factors: [
          { factor: 'Remote work adoption', influence: 85, trend: 'positive' },
          { factor: 'AI automation impact', influence: 72, trend: 'neutral' },
          { factor: 'Industry growth rate', influence: 91, trend: 'positive' }
        ]
      };

      setInsights(mockInsights);
      setTrajectory(mockTrajectory);
    } catch (error) {
      console.error('Error generating predictive insights:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (analyticsData) {
      generatePredictiveInsights();
    }
  }, [analyticsData]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trajectory': return <TrendingUp className="h-4 w-4" />;
      case 'market_shift': return <AlertTriangle className="h-4 w-4" />;
      case 'opportunity': return <Target className="h-4 w-4" />;
      default: return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-secondary text-secondary-foreground';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (!analyticsData) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center">
            Select a career path and location to view predictive analytics
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Career Trajectory Prediction */}
      {trajectory && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Career Trajectory Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              {trajectory.predicted_paths.map((path, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">{path.role}</h4>
                    <Badge variant="outline">{path.probability}% probability</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Timeline: {path.timeframe}</p>
                  <Progress value={path.probability} className="h-2" />
                  <div className="space-y-1">
                    <p className="text-xs font-medium">Required Actions:</p>
                    {path.required_actions.map((action, idx) => (
                      <p key={idx} className="text-xs text-muted-foreground">• {action}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Predictive Insights */}
      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Insights</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-full"></div>
                </div>
              ))}
            </div>
          ) : (
            insights.map((insight, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getInsightIcon(insight.type)}
                    <h4 className="font-medium">{insight.title}</h4>
                  </div>
                  <Badge className={getImpactColor(insight.impact)}>
                    {insight.impact} impact
                  </Badge>
                </div>
                
                <p className="text-sm text-muted-foreground">{insight.description}</p>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Timeline: {insight.timeframe}</span>
                  <div className="flex items-center gap-2">
                    <span>Confidence:</span>
                    <Progress value={insight.confidence} className="h-1 w-16" />
                    <span className="font-medium">{insight.confidence}%</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Market Factors */}
      {trajectory && (
        <Card>
          <CardHeader>
            <CardTitle>Market Influence Factors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trajectory.market_factors.map((factor, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{factor.factor}</span>
                  <div className="flex items-center gap-2">
                    <Progress value={factor.influence} className="h-2 w-20" />
                    <span className="text-xs font-medium w-8">{factor.influence}%</span>
                    {factor.trend === 'positive' ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : factor.trend === 'negative' ? (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    ) : (
                      <div className="h-3 w-3 rounded-full bg-gray-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};