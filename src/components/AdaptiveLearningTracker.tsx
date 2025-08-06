import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { 
  TrendingUp, 
  Target, 
  Brain, 
  Clock, 
  Award, 
  Zap,
  CheckCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Activity,
  BarChart3,
  Calendar,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdaptiveLearningTrackerProps {
  userId: string;
  currentPath?: any;
}

interface LearningSession {
  id: string;
  nodeId: string;
  nodeTitle: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  completionRate: number;
  difficultyFeedback: number; // 1-5 scale
  engagementScore: number; // 1-5 scale
  struggledConcepts: string[];
  masteredConcepts: string[];
  notes: string;
}

interface AdaptiveRecommendation {
  type: 'difficulty_adjustment' | 'pace_change' | 'learning_style' | 'resource_suggestion' | 'break_recommendation';
  title: string;
  description: string;
  action: string;
  confidence: number;
  reasoning: string;
}

interface LearningMetrics {
  averageSessionDuration: number;
  completionRate: number;
  retentionScore: number;
  engagementTrend: number;
  difficultyOptimal: boolean;
  paceOptimal: boolean;
  burnoutRisk: number;
  strengthAreas: string[];
  improvementAreas: string[];
}

export function AdaptiveLearningTracker({ userId, currentPath }: AdaptiveLearningTrackerProps) {
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [metrics, setMetrics] = useState<LearningMetrics | null>(null);
  const [recommendations, setRecommendations] = useState<AdaptiveRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<LearningSession | null>(null);
  const [sessionFeedback, setSessionFeedback] = useState({
    difficulty: 3,
    engagement: 3,
    concepts: { struggled: '', mastered: '' },
    notes: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadLearningData();
  }, [userId]);

  const loadLearningData = async () => {
    try {
      // For now, use mock data since database types are not updated yet
      const sessionsData = null; // Would fetch from learning_sessions table
      const sessionsError = null;

      if (sessionsError) throw sessionsError;

      setSessions((sessionsData as any[]) || []);
      
      // Calculate metrics
      if (sessionsData && sessionsData.length > 0) {
        const calculatedMetrics = calculateLearningMetrics(sessionsData);
        setMetrics(calculatedMetrics);
        
        // Generate adaptive recommendations
        const adaptiveRecommendations = generateAdaptiveRecommendations(sessionsData, calculatedMetrics);
        setRecommendations(adaptiveRecommendations);
      }

    } catch (error) {
      console.error('Error loading learning data:', error);
      toast({
        title: "Error",
        description: "Failed to load learning progress data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateLearningMetrics = (sessions: any[]): LearningMetrics => {
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.completion_rate >= 80);
    
    const avgDuration = sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / totalSessions;
    const avgCompletion = sessions.reduce((sum, s) => sum + (s.completion_rate || 0), 0) / totalSessions;
    const avgDifficulty = sessions.reduce((sum, s) => sum + (s.difficulty_feedback || 3), 0) / totalSessions;
    const avgEngagement = sessions.reduce((sum, s) => sum + (s.engagement_score || 3), 0) / totalSessions;
    
    // Calculate trends (last 5 vs previous 5 sessions)
    const recent = sessions.slice(0, 5);
    const previous = sessions.slice(5, 10);
    
    const recentEngagement = recent.reduce((sum, s) => sum + (s.engagement_score || 3), 0) / recent.length;
    const previousEngagement = previous.length > 0 
      ? previous.reduce((sum, s) => sum + (s.engagement_score || 3), 0) / previous.length 
      : recentEngagement;
    
    const engagementTrend = recentEngagement - previousEngagement;
    
    // Assess burnout risk
    const recentSessions = sessions.slice(0, 7); // Last week
    const longSessions = recentSessions.filter(s => (s.duration_minutes || 0) > 120).length;
    const lowEngagement = recentSessions.filter(s => (s.engagement_score || 3) < 3).length;
    const burnoutRisk = Math.min(100, (longSessions * 20) + (lowEngagement * 15));
    
    // Identify strength and improvement areas
    const conceptsData = sessions.flatMap(s => [
      ...(s.mastered_concepts || []).map((c: string) => ({ concept: c, type: 'mastered' })),
      ...(s.struggled_concepts || []).map((c: string) => ({ concept: c, type: 'struggled' }))
    ]);
    
    const conceptCounts = conceptsData.reduce((acc: any, item) => {
      if (!acc[item.concept]) acc[item.concept] = { mastered: 0, struggled: 0 };
      acc[item.concept][item.type]++;
      return acc;
    }, {});
    
    const strengthAreas = Object.entries(conceptCounts)
      .filter(([_, counts]: [string, any]) => counts.mastered > counts.struggled)
      .map(([concept]) => concept)
      .slice(0, 5);
      
    const improvementAreas = Object.entries(conceptCounts)
      .filter(([_, counts]: [string, any]) => counts.struggled > counts.mastered)
      .map(([concept]) => concept)
      .slice(0, 5);

    return {
      averageSessionDuration: avgDuration,
      completionRate: avgCompletion,
      retentionScore: Math.min(100, (completedSessions.length / totalSessions) * 100),
      engagementTrend,
      difficultyOptimal: avgDifficulty >= 2.5 && avgDifficulty <= 3.5,
      paceOptimal: avgDuration >= 30 && avgDuration <= 90,
      burnoutRisk,
      strengthAreas,
      improvementAreas
    };
  };

  const generateAdaptiveRecommendations = (sessions: any[], metrics: LearningMetrics): AdaptiveRecommendation[] => {
    const recommendations: AdaptiveRecommendation[] = [];
    
    // Difficulty adjustment recommendations
    const recentDifficulty = sessions.slice(0, 5).reduce((sum, s) => sum + (s.difficulty_feedback || 3), 0) / 5;
    
    if (recentDifficulty > 4) {
      recommendations.push({
        type: 'difficulty_adjustment',
        title: 'Consider Easier Content',
        description: 'Recent sessions indicate content may be too challenging',
        action: 'Review fundamentals or seek additional resources',
        confidence: 85,
        reasoning: `Average difficulty rating: ${recentDifficulty.toFixed(1)}/5`
      });
    } else if (recentDifficulty < 2) {
      recommendations.push({
        type: 'difficulty_adjustment',
        title: 'Ready for Advanced Content',
        description: 'You\'re finding current content too easy',
        action: 'Consider skipping ahead or tackling advanced topics',
        confidence: 80,
        reasoning: `Average difficulty rating: ${recentDifficulty.toFixed(1)}/5`
      });
    }
    
    // Pace recommendations
    if (metrics.averageSessionDuration > 120) {
      recommendations.push({
        type: 'pace_change',
        title: 'Shorter Learning Sessions',
        description: 'Long sessions may reduce retention and increase fatigue',
        action: 'Try 45-60 minute sessions with breaks',
        confidence: 75,
        reasoning: `Average session: ${Math.round(metrics.averageSessionDuration)} minutes`
      });
    } else if (metrics.averageSessionDuration < 20) {
      recommendations.push({
        type: 'pace_change',
        title: 'Extend Learning Sessions',
        description: 'Longer sessions could improve deep learning',
        action: 'Aim for 30-45 minute focused sessions',
        confidence: 70,
        reasoning: `Average session: ${Math.round(metrics.averageSessionDuration)} minutes`
      });
    }
    
    // Burnout risk
    if (metrics.burnoutRisk > 60) {
      recommendations.push({
        type: 'break_recommendation',
        title: 'Take a Learning Break',
        description: 'High burnout risk detected based on recent patterns',
        action: 'Consider a 1-2 day break or switch to lighter content',
        confidence: 90,
        reasoning: `Burnout risk: ${metrics.burnoutRisk}%`
      });
    }
    
    // Engagement trends
    if (metrics.engagementTrend < -0.5) {
      recommendations.push({
        type: 'learning_style',
        title: 'Try Different Learning Methods',
        description: 'Engagement has been declining recently',
        action: 'Switch between videos, articles, and hands-on projects',
        confidence: 75,
        reasoning: 'Declining engagement trend detected'
      });
    }
    
    // Resource suggestions based on struggle areas
    if (metrics.improvementAreas.length > 0) {
      recommendations.push({
        type: 'resource_suggestion',
        title: 'Focus on Weak Areas',
        description: `Struggling with: ${metrics.improvementAreas.slice(0, 2).join(', ')}`,
        action: 'Seek additional practice materials for these concepts',
        confidence: 85,
        reasoning: 'Based on tracked concept difficulties'
      });
    }
    
    return recommendations.slice(0, 5); // Limit to top 5 recommendations
  };

  const startLearningSession = async (nodeId: string, nodeTitle: string) => {
    const newSession: LearningSession = {
      id: `session_${Date.now()}`,
      nodeId,
      nodeTitle,
      startTime: new Date().toISOString(),
      durationMinutes: 0,
      completionRate: 0,
      difficultyFeedback: 3,
      engagementScore: 3,
      struggledConcepts: [],
      masteredConcepts: [],
      notes: ''
    };
    
    setActiveSession(newSession);
    
    toast({
      title: "Learning Session Started",
      description: `Started tracking: ${nodeTitle}`,
    });
  };

  const endLearningSession = async () => {
    if (!activeSession) return;
    
    try {
      const endTime = new Date().toISOString();
      const startTime = new Date(activeSession.startTime);
      const duration = Math.round((Date.now() - startTime.getTime()) / 60000);
      
      const completedSession = {
        ...activeSession,
        endTime,
        durationMinutes: duration,
        difficultyFeedback: sessionFeedback.difficulty,
        engagementScore: sessionFeedback.engagement,
        struggledConcepts: sessionFeedback.concepts.struggled.split(',').map(c => c.trim()).filter(Boolean),
        masteredConcepts: sessionFeedback.concepts.mastered.split(',').map(c => c.trim()).filter(Boolean),
        notes: sessionFeedback.notes
      };
      
      // For now, simulate successful save
      const error = null; // Would save to learning_sessions table
      
      if (error) throw error;
      
      setActiveSession(null);
      setSessionFeedback({
        difficulty: 3,
        engagement: 3,
        concepts: { struggled: '', mastered: '' },
        notes: ''
      });
      
      // Reload data to update metrics and recommendations
      await loadLearningData();
      
      toast({
        title: "Session Completed",
        description: `Tracked ${duration} minutes of learning`,
      });
      
    } catch (error) {
      console.error('Error saving session:', error);
      toast({
        title: "Error",
        description: "Failed to save learning session",
        variant: "destructive",
      });
    }
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case 'difficulty_adjustment': return <BarChart3 className="w-4 h-4" />;
      case 'pace_change': return <Clock className="w-4 h-4" />;
      case 'learning_style': return <Brain className="w-4 h-4" />;
      case 'resource_suggestion': return <Target className="w-4 h-4" />;
      case 'break_recommendation': return <AlertTriangle className="w-4 h-4" />;
      default: return <Zap className="w-4 h-4" />;
    }
  };

  const getMetricTrendIcon = (value: number, optimal: boolean) => {
    if (optimal) return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (value > 0) return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (value < 0) return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <Activity className="w-4 h-4 text-yellow-500" />;
  };

  if (isLoading) {
    return <div>Loading adaptive learning tracker...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Adaptive Learning Tracker
          </CardTitle>
          <CardDescription>
            AI-powered learning optimization based on your progress patterns
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!activeSession ? (
            <div className="text-center py-8">
              <Button onClick={() => startLearningSession('current-node', 'Current Learning Node')}>
                <Activity className="w-4 h-4 mr-2" />
                Start Learning Session
              </Button>
              <p className="text-sm text-muted-foreground mt-2">
                Track your learning session for personalized insights
              </p>
            </div>
          ) : (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="font-semibold">Active Session</h4>
                    <p className="text-sm text-muted-foreground">{activeSession.nodeTitle}</p>
                  </div>
                  <Badge>
                    {Math.round((Date.now() - new Date(activeSession.startTime).getTime()) / 60000)} min
                  </Badge>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">How challenging is this content? (1-5)</label>
                    <Slider
                      value={[sessionFeedback.difficulty]}
                      onValueChange={([value]) => setSessionFeedback(prev => ({...prev, difficulty: value}))}
                      max={5}
                      min={1}
                      step={1}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Too Easy</span>
                      <span>Perfect</span>
                      <span>Too Hard</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">How engaged are you? (1-5)</label>
                    <Slider
                      value={[sessionFeedback.engagement]}
                      onValueChange={([value]) => setSessionFeedback(prev => ({...prev, engagement: value}))}
                      max={5}
                      min={1}
                      step={1}
                      className="mt-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Bored</span>
                      <span>Focused</span>
                      <span>Excited</span>
                    </div>
                  </div>
                  
                  <Button onClick={endLearningSession} className="w-full">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    End Session & Save Progress
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {metrics && (
        <Tabs defaultValue="metrics" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="metrics">Learning Metrics</TabsTrigger>
            <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
            <TabsTrigger value="history">Session History</TabsTrigger>
          </TabsList>

          <TabsContent value="metrics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Avg Session</p>
                      <p className="text-2xl font-bold">{Math.round(metrics.averageSessionDuration)}min</p>
                    </div>
                    {getMetricTrendIcon(0, metrics.paceOptimal)}
                  </div>
                  <Progress value={(metrics.averageSessionDuration / 120) * 100} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Completion Rate</p>
                      <p className="text-2xl font-bold">{Math.round(metrics.completionRate)}%</p>
                    </div>
                    {getMetricTrendIcon(metrics.completionRate - 80, metrics.completionRate > 80)}
                  </div>
                  <Progress value={metrics.completionRate} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Engagement Trend</p>
                      <p className="text-2xl font-bold">
                        {metrics.engagementTrend > 0 ? '+' : ''}{metrics.engagementTrend.toFixed(1)}
                      </p>
                    </div>
                    {getMetricTrendIcon(metrics.engagementTrend, metrics.engagementTrend > 0)}
                  </div>
                  <Progress 
                    value={Math.max(0, Math.min(100, (metrics.engagementTrend + 2) * 25))} 
                    className="mt-2" 
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Burnout Risk</p>
                      <p className="text-2xl font-bold">{Math.round(metrics.burnoutRisk)}%</p>
                    </div>
                    {getMetricTrendIcon(-metrics.burnoutRisk, metrics.burnoutRisk < 30)}
                  </div>
                  <Progress 
                    value={metrics.burnoutRisk} 
                    className={`mt-2 ${metrics.burnoutRisk > 60 ? 'bg-red-100' : ''}`} 
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Strength Areas</CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics.strengthAreas.length > 0 ? (
                    <div className="space-y-2">
                      {metrics.strengthAreas.map((area, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm">{area}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Complete more sessions to identify strengths</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Areas for Improvement</CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics.improvementAreas.length > 0 ? (
                    <div className="space-y-2">
                      {metrics.improvementAreas.map((area, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-blue-500" />
                          <span className="text-sm">{area}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Great! No major struggle areas identified</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            {recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendations.map((rec, index) => (
                  <Alert key={index} className="border-l-4 border-l-primary">
                    <div className="flex items-start gap-3">
                      {getRecommendationIcon(rec.type)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">{rec.title}</h4>
                          <Badge variant="outline">{rec.confidence}% confidence</Badge>
                        </div>
                        <AlertDescription className="text-sm mb-2">
                          {rec.description}
                        </AlertDescription>
                        <div className="text-xs text-muted-foreground mb-2">
                          <strong>Recommended Action:</strong> {rec.action}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <strong>Why:</strong> {rec.reasoning}
                        </div>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Brain className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No Recommendations Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Complete a few learning sessions to receive personalized AI recommendations
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {sessions.length > 0 ? (
              <div className="space-y-4">
                {sessions.slice(0, 10).map((session, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                  <h4 className="font-medium">{session.nodeTitle}</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{session.durationMinutes}min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>{session.completionRate}% complete</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BarChart3 className="w-3 h-3" />
                      <span>Difficulty: {session.difficultyFeedback}/5</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      <span>Engagement: {session.engagementScore}/5</span>
                    </div>
                  </div>
                  {session.notes && (
                    <p className="text-sm text-muted-foreground mt-2">{session.notes}</p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(session.startTime).toLocaleDateString()}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">No Learning History</h3>
                  <p className="text-sm text-muted-foreground">
                    Start your first learning session to begin tracking progress
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}