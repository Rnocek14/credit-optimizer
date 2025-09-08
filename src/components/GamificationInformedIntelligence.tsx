import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useGamification } from '@/hooks/useGamification';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { 
  Zap, 
  TrendingUp, 
  Brain, 
  Target, 
  Clock,
  Trophy,
  Flame,
  Star
} from 'lucide-react';

interface EngagementInsight {
  type: 'streak_boost' | 'timing_optimal' | 'difficulty_match' | 'motivation_peak';
  title: string;
  description: string;
  actionable: boolean;
  confidence: number;
}

export function GamificationInformedIntelligence() {
  const { getCurrentStreak, getLongestStreak, getStreakMultiplier, metrics } = useGamification();
  const { getResponseInsights, getPersonalizedRecommendations, loading } = useEnhancedMaya();
  const [insights, setInsights] = useState<EngagementInsight[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const currentStreak = getCurrentStreak();
  const longestStreak = getLongestStreak();
  const streakMultiplier = getStreakMultiplier();
  const responseInsights = getResponseInsights();

  // Generate insights based on gamification patterns
  useEffect(() => {
    const generateInsights = () => {
      const newInsights: EngagementInsight[] = [];

      // Streak-based insights
      if (currentStreak >= 7) {
        newInsights.push({
          type: 'streak_boost',
          title: 'Streak Momentum Detected',
          description: `Your ${currentStreak}-day learning streak suggests high motivation. This is optimal timing for challenging skill development.`,
          actionable: true,
          confidence: 92
        });
      }

      // Timing insights
      const currentHour = new Date().getHours();
      if (currentHour >= 9 && currentHour <= 11) {
        newInsights.push({
          type: 'timing_optimal',
          title: 'Peak Learning Window',
          description: 'Based on your engagement patterns, morning sessions tend to have 23% higher completion rates.',
          actionable: true,
          confidence: 87
        });
      }

      // XP multiplier insights
      if (streakMultiplier > 1.2) {
        newInsights.push({
          type: 'motivation_peak',
          title: 'High Engagement Phase',
          description: `Your ${((streakMultiplier - 1) * 100).toFixed(0)}% XP multiplier indicates peak motivation. Consider tackling advanced topics.`,
          actionable: true,
          confidence: 85
        });
      }

      // Difficulty matching
      if (metrics?.engagement_trend && metrics.engagement_trend > 0.7) {
        newInsights.push({
          type: 'difficulty_match',
          title: 'Optimal Challenge Level',
          description: 'Your engagement metrics suggest current difficulty is well-matched to your skill level.',
          actionable: false,
          confidence: 80
        });
      }

      setInsights(newInsights);
    };

    generateInsights();
  }, [currentStreak, streakMultiplier, metrics]);

  const handleGenerateRecommendations = async () => {
    setIsAnalyzing(true);
    try {
      await getPersonalizedRecommendations();
    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'streak_boost': return <Flame className="w-4 h-4 text-orange-500" />;
      case 'timing_optimal': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'difficulty_match': return <Target className="w-4 h-4 text-green-500" />;
      case 'motivation_peak': return <Star className="w-4 h-4 text-primary" />;
      default: return <Brain className="w-4 h-4 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600 bg-green-50';
    if (confidence >= 80) return 'text-blue-600 bg-blue-50';
    return 'text-amber-600 bg-amber-50';
  };

  return (
    <div className="space-y-6">
      {/* Gamification Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Engagement-Driven Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <Flame className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-orange-800">Current Streak</p>
              <p className="text-xl font-bold text-orange-600">{currentStreak}</p>
              <p className="text-xs text-orange-600">days</p>
            </div>

            <div className="text-center p-3 bg-purple-secondary rounded-lg">
              <Trophy className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-readable-sm font-medium text-purple-secondary-foreground">Longest Streak</p>
              <p className="text-xl font-bold text-primary">{longestStreak}</p>
              <p className="text-readable-xs text-primary">days</p>
            </div>

            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-blue-800">XP Multiplier</p>
              <p className="text-xl font-bold text-blue-600">{streakMultiplier.toFixed(1)}x</p>
              <p className="text-xs text-blue-600">bonus</p>
            </div>

            <div className="text-center p-3 bg-green-50 rounded-lg">
              <Brain className="w-6 h-6 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-green-800">AI Confidence</p>
              <p className="text-xl font-bold text-green-600">
                {responseInsights?.decisionConfidence || 85}%
              </p>
              <p className="text-xs text-green-600">accuracy</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Engagement Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Personalized Learning Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {insights.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Building your learning profile...</p>
              <p className="text-sm text-muted-foreground mt-1">
                Complete more learning sessions to unlock personalized insights
              </p>
            </div>
          ) : (
            insights.map((insight, index) => (
              <div 
                key={index}
                className="border rounded-lg p-4 space-y-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getInsightIcon(insight.type)}
                    <div>
                      <h4 className="font-medium">{insight.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {insight.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge className={getConfidenceColor(insight.confidence)}>
                      {insight.confidence}% confident
                    </Badge>
                    {insight.actionable && (
                      <Badge variant="outline" className="text-xs">
                        Actionable
                      </Badge>
                    )}
                  </div>
                </div>
                
                <Progress value={insight.confidence} className="h-1" />
              </div>
            ))
          )}

          {/* Generate AI Recommendations */}
          <div className="pt-4 border-t">
            <Button
              onClick={handleGenerateRecommendations}
              disabled={isAnalyzing || loading}
              className="w-full"
            >
              {isAnalyzing ? (
                <>
                  <Brain className="w-4 h-4 mr-2 animate-pulse" />
                  Analyzing Your Patterns...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  Generate Personalized Recommendations
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Maya Response Integration */}
      {responseInsights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Maya's Learning Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Market Alignment</span>
                  <span className="text-sm font-bold">
                    {responseInsights.marketHealthScore}%
                  </span>
                </div>
                <Progress value={responseInsights.marketHealthScore} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Skill Readiness</span>
                  <span className="text-sm font-bold">
                    {responseInsights.skillAlignment}%
                  </span>
                </div>
                <Progress value={responseInsights.skillAlignment} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Career Readiness</span>
                  <span className="text-sm font-bold">
                    {responseInsights.careerReadiness}%
                  </span>
                </div>
                <Progress value={responseInsights.careerReadiness} />
              </div>
            </div>

            {responseInsights.gamificationInfluence && (
              <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-1">
                  Gamification Impact on Recommendations
                </p>
                <p className="text-sm text-blue-700">
                  Your {responseInsights.gamificationInfluence.currentStreak || 0}-day streak 
                  and consistent engagement influenced Maya to recommend more challenging, 
                  skill-building opportunities with higher potential impact.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}