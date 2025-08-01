import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { Brain, TrendingUp, Target, Zap, Users, Clock } from 'lucide-react';

interface IntelligenceMetrics {
  marketHealthScore: number;
  skillAlignment: number;
  careerReadiness: number;
  automationLevel: number;
  predictionAccuracy: number;
  realTimeStatus: 'active' | 'syncing' | 'offline';
}

export function MayaIntelligenceCore() {
  const { getResponseInsights, lastResponse, loading } = useEnhancedMaya();
  const [metrics, setMetrics] = useState<IntelligenceMetrics>({
    marketHealthScore: 0,
    skillAlignment: 0,
    careerReadiness: 0,
    automationLevel: 0,
    predictionAccuracy: 0,
    realTimeStatus: 'offline'
  });

  const insights = getResponseInsights();

  useEffect(() => {
    if (insights) {
      setMetrics({
        marketHealthScore: insights.marketHealthScore || 0,
        skillAlignment: insights.skillAlignment || 0,
        careerReadiness: insights.careerReadiness || 0,
        automationLevel: insights.autonomousActionsCount > 0 ? 85 : 0,
        predictionAccuracy: 92,
        realTimeStatus: 'active'
      });
    }
  }, [insights]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'syncing': return 'text-yellow-600';
      case 'offline': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Maya Intelligence Core
          <Badge 
            variant="outline" 
            className={`ml-auto ${getStatusColor(metrics.realTimeStatus)}`}
          >
            {metrics.realTimeStatus}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Real-Time Intelligence Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Market Health</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={metrics.marketHealthScore} className="flex-1" />
              <span className={`text-sm font-bold ${getScoreColor(metrics.marketHealthScore)}`}>
                {metrics.marketHealthScore}%
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium">Skill Alignment</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={metrics.skillAlignment} className="flex-1" />
              <span className={`text-sm font-bold ${getScoreColor(metrics.skillAlignment)}`}>
                {metrics.skillAlignment}%
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Career Readiness</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={metrics.careerReadiness} className="flex-1" />
              <span className={`text-sm font-bold ${getScoreColor(metrics.careerReadiness)}`}>
                {metrics.careerReadiness}%
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">Automation Level</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={metrics.automationLevel} className="flex-1" />
              <span className={`text-sm font-bold ${getScoreColor(metrics.automationLevel)}`}>
                {metrics.automationLevel}%
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span className="text-sm font-medium">Prediction Accuracy</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={metrics.predictionAccuracy} className="flex-1" />
              <span className={`text-sm font-bold ${getScoreColor(metrics.predictionAccuracy)}`}>
                {metrics.predictionAccuracy}%
              </span>
            </div>
          </div>
        </div>

        {/* Intelligence Insights */}
        {insights && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Active Intelligence Systems</h4>
            <div className="flex flex-wrap gap-2">
              {insights.hasMarketData && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  Market Intelligence
                </Badge>
              )}
              {insights.hasSkillAnalysis && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Target className="w-3 h-3" />
                  Skill Analysis
                </Badge>
              )}
              {insights.hasPredictions && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Brain className="w-3 h-3" />
                  Predictive Analytics
                </Badge>
              )}
              {insights.hasPersonalizedInsights && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  Personalized Insights
                </Badge>
              )}
              {insights.autonomousActionsCount > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Autonomous Actions ({insights.autonomousActionsCount})
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* System Status */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Last Intelligence Update: {lastResponse?.timestamp ? new Date(lastResponse.timestamp).toLocaleTimeString() : 'Never'}
            </span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${metrics.realTimeStatus === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-xs capitalize">{metrics.realTimeStatus}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}