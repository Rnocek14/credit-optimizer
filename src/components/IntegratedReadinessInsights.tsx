import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Brain,
  BarChart3,
  Shield,
  Clock,
  ArrowRight,
  Lightbulb,
  Zap
} from 'lucide-react';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { useCRIGoals } from '@/hooks/useCRIGoals';

interface IntegratedReadinessInsightsProps {
  userId: string;
  suggestions?: any[];
  mayaReasoning?: string;
}

interface ContextualInsight {
  id: string;
  type: 'skill_gap' | 'experience_boost' | 'market_alignment' | 'goal_strategy';
  title: string;
  description: string;
  relatedMetric: 'skills' | 'experience' | 'market';
  currentScore: number;
  targetScore: number;
  priority: 'high' | 'medium' | 'low';
  actionItems: string[];
  estimatedImpact: number;
}

export function IntegratedReadinessInsights({ 
  userId, 
  suggestions = [], 
  mayaReasoning 
}: IntegratedReadinessInsightsProps) {
  const { 
    criScore,
    isLoading,
    error
  } = useCareerReadiness({ userId });

  const {
    criGoal,
    targetCRI,
    isUpdating,
    updateGoal
  } = useCRIGoals(userId);

  const [contextualInsights, setContextualInsights] = useState<ContextualInsight[]>([]);

  useEffect(() => {
    if (criScore) {
      generateContextualInsights();
    }
  }, [criScore]);

  const generateContextualInsights = () => {
    const insights: ContextualInsight[] = [];

    // Skills-based insights
    if (criScore?.skillsScore && criScore.skillsScore < 70) {
      insights.push({
        id: 'skills-improvement',
        type: 'skill_gap',
        title: 'Technical Skills Enhancement',
        description: 'Your technical skills score indicates room for improvement through targeted learning',
        relatedMetric: 'skills',
        currentScore: criScore.skillsScore,
        targetScore: 80,
        priority: 'high',
        actionItems: [
          'Complete 2-3 relevant certification courses',
          'Build portfolio projects showcasing key skills',
          'Practice on coding platforms or technical assessments'
        ],
        estimatedImpact: 12
      });
    }

    // Experience-based insights
    if (criScore?.experienceScore && criScore.experienceScore < 75) {
      insights.push({
        id: 'experience-boost',
        type: 'experience_boost',
        title: 'Experience Portfolio Growth',
        description: 'Strengthen your practical experience through strategic project work',
        relatedMetric: 'experience',
        currentScore: criScore.experienceScore,
        targetScore: 85,
        priority: 'medium',
        actionItems: [
          'Contribute to open-source projects',
          'Take on freelance or volunteer projects',
          'Document and showcase completed work'
        ],
        estimatedImpact: 8
      });
    }

    // Market alignment insights
    if (criScore?.stepsScore && criScore.stepsScore < 80) {
      insights.push({
        id: 'market-alignment',
        type: 'market_alignment',
        title: 'Market Demand Alignment',
        description: 'Align your skills with current market trends and demands',
        relatedMetric: 'market',
        currentScore: criScore.stepsScore,
        targetScore: 90,
        priority: 'high',
        actionItems: [
          'Research trending technologies in your field',
          'Update skills based on job market analysis',
          'Network with professionals in target markets'
        ],
        estimatedImpact: 15
      });
    }

    setContextualInsights(insights);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-4 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Error loading career readiness data: {error?.message || 'Unknown error'}
        </AlertDescription>
      </Alert>
    );
  }

  const currentCRI = criScore?.overall || 0;
  const progressToGoal = Math.min((currentCRI / targetCRI) * 100, 100);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-success';
    if (score >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 60) return 'secondary';
    return 'destructive';
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'skill_gap': return <Brain className="h-4 w-4 text-primary" />;
      case 'experience_boost': return <BarChart3 className="h-4 w-4 text-secondary" />;
      case 'market_alignment': return <Shield className="h-4 w-4 text-accent" />;
      default: return <Lightbulb className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Career Readiness & Insights</h2>
          <p className="text-muted-foreground">Your readiness metrics with contextual recommendations</p>
        </div>
        <Button disabled={isLoading} variant="outline">
          <Activity className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Main Readiness + Insights Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Side: Readiness Metrics (3/5 width on large screens) */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* CRI Goal Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                CRI Goal Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold text-foreground">{currentCRI.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Current CRI Score</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-foreground">{targetCRI}</p>
                  <p className="text-sm text-muted-foreground">Target CRI</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress to Goal</span>
                  <span>{progressToGoal.toFixed(1)}%</span>
                </div>
                <Progress value={progressToGoal} className="h-3" />
              </div>

              {progressToGoal >= 100 ? (
                <Alert className="border-success/50 bg-success/10">
                  <CheckCircle className="h-4 w-4 text-success" />
                  <AlertDescription className="text-success">
                    Congratulations! You've reached your CRI goal. Consider setting a higher target.
                  </AlertDescription>
                </Alert>
              ) : (
                <p className="text-sm text-muted-foreground">
                  You need {(targetCRI - currentCRI).toFixed(1)} more points to reach your goal.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Readiness Metrics Grid */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="relative">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-foreground">
                      {criScore?.skillsScore?.toFixed(1) || 0}
                    </span>
                    <Badge variant={getScoreBadgeVariant(criScore?.skillsScore || 0)}>
                      Technical
                    </Badge>
                  </div>
                  <Progress value={criScore?.skillsScore || 0} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Skill assessments & certifications
                  </p>
                </div>
              </CardContent>
              {/* Connection indicator for insights */}
              {contextualInsights.some(i => i.relatedMetric === 'skills') && (
                <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 hidden lg:block">
                  <ArrowRight className="h-5 w-5 text-primary animate-pulse" />
                </div>
              )}
            </Card>

            <Card className="relative">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Experience
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-foreground">
                      {criScore?.experienceScore?.toFixed(1) || 0}
                    </span>
                    <Badge variant={getScoreBadgeVariant(criScore?.experienceScore || 0)}>
                      Projects
                    </Badge>
                  </div>
                  <Progress value={criScore?.experienceScore || 0} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Portfolio & practical work
                  </p>
                </div>
              </CardContent>
              {contextualInsights.some(i => i.relatedMetric === 'experience') && (
                <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 hidden lg:block">
                  <ArrowRight className="h-5 w-5 text-secondary animate-pulse" />
                </div>
              )}
            </Card>

            <Card className="relative">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Market Fit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-foreground">
                      {criScore?.stepsScore?.toFixed(1) || 0}
                    </span>
                    <Badge variant={getScoreBadgeVariant(criScore?.stepsScore || 0)}>
                      Alignment
                    </Badge>
                  </div>
                  <Progress value={criScore?.stepsScore || 0} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    Market demand alignment
                  </p>
                </div>
              </CardContent>
              {contextualInsights.some(i => i.relatedMetric === 'market') && (
                <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 hidden lg:block">
                  <ArrowRight className="h-5 w-5 text-accent animate-pulse" />
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Right Side: Contextual Insights (2/5 width on large screens) */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-l-4 border-l-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-primary" />
                Actionable Insights
                <Badge variant="outline" className="text-xs">
                  Based on readiness
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {contextualInsights.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
                  <p className="text-sm text-muted-foreground">
                    Great job! Your readiness scores are strong across all areas.
                  </p>
                </div>
              ) : (
                contextualInsights.map((insight) => (
                  <div 
                    key={insight.id} 
                    className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow bg-card"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getInsightIcon(insight.type)}
                        <div>
                          <h4 className="font-medium text-sm">{insight.title}</h4>
                          <Badge variant="outline" className="text-xs mt-1">
                            {insight.priority} priority
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Impact</div>
                        <div className="text-sm font-semibold text-primary">
                          +{insight.estimatedImpact} pts
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {insight.description}
                    </p>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>Current: {insight.currentScore}</span>
                        <span>Target: {insight.targetScore}</span>
                      </div>
                      <Progress 
                        value={(insight.currentScore / insight.targetScore) * 100} 
                        className="h-1" 
                      />
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium">Recommended Actions:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {insight.actionItems.slice(0, 2).map((action, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-primary">•</span>
                            {action}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button size="sm" variant="outline" className="w-full text-xs">
                      Create Action Plan
                    </Button>
                  </div>
                ))
              )}
              
              {mayaReasoning && (
                <div className="border-t pt-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs font-medium mb-1">Maya's Analysis:</p>
                    <p className="text-xs text-muted-foreground italic">
                      "{mayaReasoning}"
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}