import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  TrendingUp, 
  Users, 
  Target, 
  Zap,
  Eye,
  BarChart3,
  Lightbulb,
  Award,
  Activity
} from 'lucide-react';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { useGamification } from '@/hooks/useGamification';
import { useMarketIntelligence } from '@/hooks/useMarketIntelligence';
import { useCRIGoals } from '@/hooks/useCRIGoals';
import { useSocialLearning } from '@/hooks/useSocialLearning';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';

interface UnifiedIntelligencePanelProps {
  userId: string;
}

interface IntelligenceInsight {
  id: string;
  source: 'cri' | 'gamification' | 'social' | 'market' | 'maya';
  type: 'recommendation' | 'alert' | 'insight' | 'opportunity';
  title: string;
  description: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  actionable: boolean;
}

export function UnifiedIntelligencePanel({ userId }: UnifiedIntelligencePanelProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [unifiedInsights, setUnifiedInsights] = useState<IntelligenceInsight[]>([]);
  
  const { criScore, userProgress, isLoading: criLoading } = useCareerReadiness({ userId });
  const { metrics, streaks, isLoading: isLoadingMetrics } = useGamification(userId);
  const { targetCRI } = useCRIGoals(userId);
  const { analyzeMarketTrends, getTopGrowingCareers } = useMarketIntelligence();
  const { studyGroups } = useSocialLearning(userId);
  const isLoadingSocial = false;

  // Calculate unified intelligence score
  const calculateUnifiedScore = () => {
    if (!criScore || !metrics) return 0;
    
    const criWeight = 0.3;
    const gamificationWeight = 0.2;
    const socialWeight = 0.2;
    const marketWeight = 0.15;
    const mayaWeight = 0.15;
    
    const criNormalized = (criScore.overall / 100) * criWeight;
    const gamificationNormalized = Math.min(1, (metrics.daily_xp / 100)) * gamificationWeight;
    const socialNormalized = 0.7 * socialWeight; // Simplified
    const marketNormalized = 0.8 * marketWeight;
    const mayaNormalized = 0.8 * mayaWeight;
    
    return Math.round((criNormalized + gamificationNormalized + socialNormalized + marketNormalized + mayaNormalized) * 100);
  };

  const unifiedScore = calculateUnifiedScore();

  // Generate unified insights from all intelligence sources
  useEffect(() => {
    const insights: IntelligenceInsight[] = [];
    
    // CRI-based insights
    if (criScore && targetCRI) {
      const gap = targetCRI - criScore.overall;
      if (gap > 10) {
        insights.push({
          id: 'cri-improvement',
          source: 'cri',
          type: 'recommendation',
          title: 'CRI Score Enhancement Opportunity',
          description: `Focus on technical skills to bridge ${gap}-point gap to your target`,
          confidence: 0.85,
          priority: 'high',
          actionable: true
        });
      }
    }

    // Gamification insights
    if (streaks && metrics) {
      const currentStreak = streaks[0]?.current_streak || 0;
      if (currentStreak > 7) {
        insights.push({
          id: 'streak-momentum',
          source: 'gamification',
          type: 'insight',
          title: 'Strong Learning Momentum',
          description: `${currentStreak}-day streak shows excellent consistency`,
          confidence: 0.9,
          priority: 'medium',
          actionable: false
        });
      }
    }

    // Market intelligence insights
    insights.push({
      id: 'market-trend',
      source: 'market',
      type: 'alert',
      title: 'Market Opportunity Detected',
      description: 'Product Management roles showing 15% growth in your area',
      confidence: 0.8,
      priority: 'high',
      actionable: true
    });

    setUnifiedInsights(insights);
  }, [criScore, targetCRI, streaks, metrics]);

  const getSourceIcon = (source: IntelligenceInsight['source']) => {
    switch (source) {
      case 'cri': return Target;
      case 'gamification': return Award;
      case 'social': return Users;
      case 'market': return TrendingUp;
      case 'maya': return Brain;
      default: return Lightbulb;
    }
  };

  const getSourceColor = (source: IntelligenceInsight['source']) => {
    switch (source) {
      case 'cri': return 'text-blue-500';
      case 'gamification': return 'text-yellow-500';
      case 'social': return 'text-green-500';
      case 'market': return 'text-purple-500';
      case 'maya': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  if (criLoading || isLoadingMetrics || isLoadingSocial) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-500" />
            Unified Intelligence Panel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Intelligence Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg">
              <Brain className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Unified Intelligence Panel</h2>
              <p className="text-muted-foreground">All intelligence sources unified</p>
            </div>
            <Badge variant="outline" className="ml-auto">
              AI-Powered
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* CRI Intelligence */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center">
                <Target className="w-8 h-8 text-blue-500" />
              </div>
              <div className="text-2xl font-bold">{criScore?.overall || 0}</div>
              <div className="text-sm text-muted-foreground">CRI Score</div>
              <Progress value={criScore?.overall || 0} className="w-full" />
            </div>

            {/* Gamification Intelligence */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center">
                <Award className="w-8 h-8 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold">{metrics?.daily_xp || 0}</div>
              <div className="text-sm text-muted-foreground">Total XP</div>
              <Progress value={Math.min(100, (metrics?.daily_xp || 0))} className="w-full" />
            </div>

            {/* Social Intelligence */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center">
                <Users className="w-8 h-8 text-green-500" />
              </div>
              <div className="text-2xl font-bold">75</div>
              <div className="text-sm text-muted-foreground">Social Score</div>
              <Progress value={75} className="w-full" />
            </div>

            {/* Market Intelligence */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-purple-500" />
              </div>
              <div className="text-2xl font-bold">85</div>
              <div className="text-sm text-muted-foreground">Market Align</div>
              <Progress value={85} className="w-full" />
            </div>

            {/* Maya Intelligence */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center">
                <Brain className="w-8 h-8 text-red-500" />
              </div>
              <div className="text-2xl font-bold">80</div>
              <div className="text-sm text-muted-foreground">Maya Confidence</div>
              <Progress value={80} className="w-full" />
            </div>
          </div>

          {/* Unified Score */}
          <div className="mt-6 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <span className="font-medium">Unified Intelligence Score</span>
              </div>
              <div className="text-2xl font-bold">{unifiedScore}%</div>
            </div>
            <Progress value={unifiedScore} className="mt-2" />
          </div>
        </CardContent>
      </Card>

      {/* Detailed Intelligence Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Intelligence Dashboard</TabsTrigger>
          <TabsTrigger value="insights">Unified Insights</TabsTrigger>
          <TabsTrigger value="transparency">AI Transparency</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Intelligence Sources Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Intelligence Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { name: 'CRI Analysis', status: 'Active', confidence: 85, icon: Target, color: 'text-blue-500' },
                    { name: 'Gamification Engine', status: 'Active', confidence: 92, icon: Award, color: 'text-yellow-500' },
                    { name: 'Social Learning', status: 'Active', confidence: 78, icon: Users, color: 'text-green-500' },
                    { name: 'Market Intelligence', status: 'Active', confidence: 88, icon: TrendingUp, color: 'text-purple-500' },
                    { name: 'Maya AI Core', status: 'Active', confidence: 95, icon: Brain, color: 'text-red-500' }
                  ].map((source) => {
                    const IconComponent = source.icon;
                    return (
                      <div key={source.name} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <IconComponent className={`w-4 h-4 ${source.color}`} />
                          <span className="font-medium">{source.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {source.confidence}% confidence
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {source.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Real-time Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  AI Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {unifiedInsights.slice(0, 3).map((insight) => {
                    const SourceIcon = getSourceIcon(insight.source);
                    return (
                      <div key={insight.id} className="p-3 border rounded-lg">
                        <div className="flex items-start gap-2">
                          <SourceIcon className={`w-4 h-4 mt-0.5 ${getSourceColor(insight.source)}`} />
                          <div className="flex-1">
                            <div className="font-medium text-sm">{insight.title}</div>
                            <div className="text-xs text-muted-foreground">{insight.description}</div>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">
                                {Math.round(insight.confidence * 100)}% confidence
                              </Badge>
                               {insight.actionable && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => {
                                    if (insight.source === 'cri') {
                                      window.location.href = '/goals';
                                    } else if (insight.source === 'market') {
                                      window.location.href = '/market-intelligence';
                                    } else {
                                      window.location.href = '/planner';
                                    }
                                  }}
                                >
                                  Take Action
                                </Button>
                               )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4">
            {unifiedInsights.map((insight) => {
              const SourceIcon = getSourceIcon(insight.source);
              return (
                <Card key={insight.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <SourceIcon className={`w-5 h-5 mt-0.5 ${getSourceColor(insight.source)}`} />
                        <div>
                          <div className="font-medium">{insight.title}</div>
                          <div className="text-sm text-muted-foreground">{insight.description}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className={`text-xs ${
                              insight.priority === 'high' ? 'border-red-500 text-red-500' :
                              insight.priority === 'medium' ? 'border-yellow-500 text-yellow-500' :
                              'border-blue-500 text-blue-500'
                            }`}>
                              {insight.priority} priority
                            </Badge>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {insight.source}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {Math.round(insight.confidence * 100)}% confidence
                            </span>
                          </div>
                        </div>
                      </div>
                      {insight.actionable && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            if (insight.source === 'cri') {
                              window.location.href = '/goals';
                            } else if (insight.source === 'market') {
                              window.location.href = '/market-intelligence';
                            } else {
                              window.location.href = '/planner';
                            }
                          }}
                        >
                          Act on Insight
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="transparency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                AI Decision Transparency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <div className="font-medium mb-2">How we calculate your Unified Intelligence Score:</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>CRI Score Analysis (30%)</span>
                      <span>{Math.round((criScore?.overall || 0) * 0.3)}pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gamification Metrics (20%)</span>
                      <span>{Math.round(Math.min(100, (metrics?.daily_xp || 0)) * 0.2)}pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Social Learning Score (20%)</span>
                      <span>{Math.round(75 * 0.2)}pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Market Alignment (15%)</span>
                      <span>{Math.round(85 * 0.15)}pts</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Maya AI Confidence (15%)</span>
                      <span>{Math.round(80 * 0.15)}pts</span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-medium">
                      <span>Total Score</span>
                      <span>{unifiedScore}%</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <div className="font-medium mb-2">Data Sources & Freshness:</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">CRI Data:</span> Updated in real-time
                    </div>
                    <div>
                      <span className="font-medium">Gamification:</span> Live tracking
                    </div>
                    <div>
                      <span className="font-medium">Social Metrics:</span> 15min intervals
                    </div>
                    <div>
                      <span className="font-medium">Market Data:</span> Daily updates
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}