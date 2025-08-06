import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { getCurrentDevUser, setupAishaForValidation } from '@/lib/devUserSetup';
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
  Star,
  PlayCircle,
  StopCircle,
  MessageSquare
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useRealTimeEngagement } from '@/hooks/useRealTimeEngagement';
import { useEnhancedMayaFeedback } from '@/hooks/useEnhancedMayaFeedback';
import { usePredictiveEngagement } from '@/hooks/usePredictiveEngagement';
import { useCourseProgress } from '@/hooks/useCourseProgress';
import { useGamification } from '@/hooks/useGamification';
import { StreakTracker } from '@/components/StreakTracker';
import { CelebrationModal } from '@/components/CelebrationModal';

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
  // Use new real-time engagement hooks
  const {
    sessions,
    interventions,
    activeSession,
    sessionMetrics,
    isLoading,
    startSession,
    endSession,
    updateSessionMetrics,
    trackActivity,
    engagementMetrics
  } = useRealTimeEngagement();

  const {
    feedbackHistory,
    submitFeedback,
    trackRecommendationOutcome,
    feedbackAnalytics
  } = useEnhancedMayaFeedback();

  const {
    loading: predictiveLoading,
    lastRiskAssessment,
    lastModelUpdate,
    triggerManualPrediction,
    updateMayaFeedbackModel
  } = usePredictiveEngagement();

  const { courseProgress } = useCourseProgress();

  const [sessionFeedback, setSessionFeedback] = useState({
    difficulty: 3,
    engagement: 3,
    concepts: { struggled: '', mastered: '' },
    notes: ''
  });
  const [selectedCelebration, setSelectedCelebration] = useState<any>(null);
  const { toast } = useToast();

  // Initialize gamification hooks
  const {
    getUnreadCelebrations,
    updateStreak,
    markCelebrationDisplayed
  } = useGamification(userId);

  // Auto-setup Aisha for testing if no dev user is set
  useEffect(() => {
    const devUser = getCurrentDevUser();
    if (!devUser) {
      setupAishaForValidation();
      toast({
        title: "Dev User Setup",
        description: "Aisha Khan setup for Phase 3.1 testing",
      });
    }
  }, [toast]);

  // Convert engagement metrics to legacy format for UI compatibility
  const metrics: LearningMetrics = {
    averageSessionDuration: engagementMetrics.averageSessionDuration,
    completionRate: engagementMetrics.retentionRate * 100,
    retentionScore: engagementMetrics.retentionRate * 100,
    engagementTrend: 0, // Calculated from historical data
    difficultyOptimal: engagementMetrics.averageSessionDuration >= 30 && engagementMetrics.averageSessionDuration <= 90,
    paceOptimal: engagementMetrics.learningEfficiency > 0.6,
    burnoutRisk: engagementMetrics.burnoutRisk * 100,
    strengthAreas: [], // Will be populated from session data
    improvementAreas: [] // Will be populated from session data
  };

  // Generate recommendations based on real engagement data
  const generateRecommendationsFromEngagement = (metrics: any, interventions: any[]): AdaptiveRecommendation[] => {
    const recommendations: AdaptiveRecommendation[] = [];

    // Convert motivation interventions to recommendations
    interventions?.forEach(intervention => {
      if (intervention.user_response !== 'dismissed') {
        recommendations.push({
          type: intervention.intervention_type as any,
          title: intervention.intervention_data.title || 'Maya Suggestion',
          description: intervention.intervention_data.description || '',
          action: intervention.intervention_data.actions?.[0] || 'Consider this suggestion',
          confidence: intervention.confidence_score * 100,
          reasoning: `Based on ${intervention.intervention_type} analysis`
        });
      }
    });

    // Add engagement-based recommendations
    if (metrics.burnoutRisk > 0.6) {
      recommendations.push({
        type: 'break_recommendation',
        title: 'Take a Learning Break',
        description: 'High burnout risk detected based on recent patterns',
        action: 'Consider a 1-2 day break or switch to lighter content',
        confidence: 90,
        reasoning: `Burnout risk: ${Math.round(metrics.burnoutRisk * 100)}%`
      });
    }

    if (metrics.learningEfficiency < 0.4) {
      recommendations.push({
        type: 'learning_style',
        title: 'Try Different Learning Methods',
        description: 'Learning efficiency could be improved',
        action: 'Switch between videos, articles, and hands-on projects',
        confidence: 75,
        reasoning: 'Low learning efficiency detected'
      });
    }

    return recommendations.slice(0, 5);
  };

  const recommendations = generateRecommendationsFromEngagement(engagementMetrics, interventions || []);

  const startLearningSession = async (nodeId: string, nodeTitle: string) => {
    try {
      // Generate a proper UUID for the course_id if nodeId is not a valid UUID
      const validCourseId = nodeId && nodeId.length === 36 && nodeId.includes('-') 
        ? nodeId 
        : crypto.randomUUID();
      
      // Start session with real-time tracking
      await startSession.mutateAsync({
        courseId: validCourseId,
        sessionType: 'learning'
      });
      
      // Track the start event
      trackActivity('session_start', { nodeId, nodeTitle });
    } catch (error) {
      console.error('Error starting session:', error);
      toast({
        title: "Error",
        description: "Failed to start learning session",
        variant: "destructive",
      });
    }
  };

  const endLearningSession = async () => {
    if (!activeSession) return;
    
    try {
      // End session with collected feedback
      await endSession.mutateAsync({
        difficulty_feedback: sessionFeedback.difficulty,
        completion_percentage: 75, // Estimate based on time spent
        session_notes: sessionFeedback.notes,
        retention_indicators: {
          struggled_concepts: sessionFeedback.concepts.struggled.split(',').map(c => c.trim()).filter(Boolean),
          mastered_concepts: sessionFeedback.concepts.mastered.split(',').map(c => c.trim()).filter(Boolean)
        }
      });
      
      // Reset feedback form
      setSessionFeedback({
        difficulty: 3,
        engagement: 3,
        concepts: { struggled: '', mastered: '' },
        notes: ''
      });

      // Update learning streak
      updateStreak.mutate();
      
    } catch (error) {
      console.error('Error saving session:', error);
      toast({
        title: "Error",
        description: "Failed to save learning session",
        variant: "destructive",
      });
    }
  };

  // Track user interactions for engagement scoring
  useEffect(() => {
    const handleClick = () => trackActivity('click', {});
    const handleScroll = () => trackActivity('scroll', {});
    
    document.addEventListener('click', handleClick);
    document.addEventListener('scroll', handleScroll);
    
    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('scroll', handleScroll);
    };
  }, [trackActivity]);

  const unreadCelebrations = getUnreadCelebrations();

  const handleCelebrationClick = (celebration: any) => {
    setSelectedCelebration(celebration);
    if (!celebration.displayed_at) {
      markCelebrationDisplayed.mutate(celebration.id);
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
                    <p className="text-sm text-muted-foreground">Learning Session in Progress</p>
                  </div>
                  <Badge>
                    {Math.round((Date.now() - new Date(activeSession.started_at).getTime()) / 60000)} min
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="metrics">Learning Metrics</TabsTrigger>
            <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
            <TabsTrigger value="feedback">Maya Feedback</TabsTrigger>
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
                    {getMetricTrendIcon(metrics.engagementTrend, metrics.completionRate >= 80)}
                  </div>
                  <Progress value={metrics.completionRate} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Engagement</p>
                      <p className="text-2xl font-bold">{Math.round(engagementMetrics.dailyEngagementScore * 100)}%</p>
                    </div>
                    {getMetricTrendIcon(metrics.engagementTrend, engagementMetrics.dailyEngagementScore >= 0.7)}
                  </div>
                  <Progress value={engagementMetrics.dailyEngagementScore * 100} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Burnout Risk</p>
                      <p className="text-2xl font-bold">{Math.round(metrics.burnoutRisk)}%</p>
                    </div>
                    {getMetricTrendIcon(0, metrics.burnoutRisk < 40)}
                  </div>
                  <Progress 
                    value={metrics.burnoutRisk} 
                    className="mt-2"
                  />
                 </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <div className="space-y-4">
              {recommendations.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-muted-foreground">Great job! No recommendations at this time.</p>
                    <p className="text-sm text-muted-foreground mt-1">Keep up your current learning pace!</p>
                  </CardContent>
                </Card>
              ) : (
                recommendations.map((rec, index) => (
                  <Card key={index}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {getRecommendationIcon(rec.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{rec.title}</h4>
                            <Badge variant="outline">{rec.confidence}% confidence</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                          <Alert>
                            <Zap className="h-4 w-4" />
                            <AlertDescription>
                              <strong>Suggested Action:</strong> {rec.action}
                            </AlertDescription>
                          </Alert>
                          <p className="text-xs text-muted-foreground mt-2">
                            <strong>Reasoning:</strong> {rec.reasoning}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Phase 3.2: Predictive Engagement Testing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Phase 3.2: Predictive Engagement Analysis
                </CardTitle>
                <CardDescription>
                  Test autonomous intervention generation and Maya feedback model updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button 
                    onClick={() => triggerManualPrediction('2b458624-d498-4cca-a63d-9341cc20e363')}
                    disabled={predictiveLoading}
                    variant="outline"
                  >
                    <TrendingUp className="h-4 w-4 mr-2" />
                    {predictiveLoading ? 'Analyzing...' : 'Run Predictive Analysis'}
                  </Button>
                  
                  <Button 
                    onClick={() => updateMayaFeedbackModel('2b458624-d498-4cca-a63d-9341cc20e363')}
                    disabled={predictiveLoading}
                    variant="outline"
                  >
                    <Brain className="h-4 w-4 mr-2" />
                    Update Feedback Model
                  </Button>
                </div>

                {lastRiskAssessment && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-2">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          <AlertTriangle className={`h-4 w-4 ${
                            lastRiskAssessment.risk_level === 'high' ? 'text-destructive' :
                            lastRiskAssessment.risk_level === 'medium' ? 'text-warning' : 'text-success'
                          }`} />
                          Risk Assessment
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Risk Level:</span>
                            <Badge variant={
                              lastRiskAssessment.risk_level === 'high' ? 'destructive' :
                              lastRiskAssessment.risk_level === 'medium' ? 'secondary' : 'default'
                            }>
                              {lastRiskAssessment.risk_level.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Confidence:</span>
                            <span className="text-sm font-medium">
                              {Math.round(lastRiskAssessment.confidence_score * 100)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Sessions:</span>
                            <span className="text-sm font-medium">{lastRiskAssessment.session_count}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">Avg Engagement:</span>
                            <span className="text-sm font-medium">
                              {Math.round(lastRiskAssessment.avg_engagement * 100)}%
                            </span>
                          </div>
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground mb-1">Risk Factors:</p>
                            <div className="space-y-1">
                              {lastRiskAssessment.reasons.map((reason, index) => (
                                <div key={index} className="text-xs bg-muted p-2 rounded">
                                  {reason}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {lastModelUpdate && (
                      <Card className="border-2">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Brain className="h-4 w-4 text-primary" />
                            Model Update Results
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Updated Feedbacks:</span>
                              <span className="text-sm font-medium">{lastModelUpdate.updated_feedbacks}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Avg Improvement:</span>
                              <span className="text-sm font-medium">
                                {(lastModelUpdate.average_engagement_improvement * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">Model Updates:</span>
                              <span className="text-sm font-medium">{lastModelUpdate.model_updates.length}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
                  <strong>Phase 3.2 Features:</strong> Predictive engagement decline analysis, autonomous intervention generation, 
                  and Maya feedback model refinement. The system analyzes learning patterns to predict when users might 
                  disengage and automatically generates personalized interventions to maintain motivation.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="space-y-4">
              {sessions && sessions.length > 0 ? (
                sessions.slice(0, 10).map((session) => (
                  <Card key={session.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">Learning Session</h4>
                          <p className="text-sm text-muted-foreground">
                            {new Date(session.started_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{session.duration_minutes} minutes</p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round(session.engagement_score * 100)}% engagement
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{session.completion_percentage}% completed</span>
                        </div>
                        {session.difficulty_feedback && (
                          <div className="flex items-center gap-1">
                            <BarChart3 className="w-4 h-4" />
                            <span>Difficulty: {session.difficulty_feedback}/5</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Calendar className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No learning sessions yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Start a session to see your history</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Streak Tracker */}
      <StreakTracker userId={userId} />

      {/* Unread Celebrations */}
      {unreadCelebrations.length > 0 && (
        <Card className="relative overflow-hidden border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50">
          <div className="absolute top-2 right-2">
            <span className="text-2xl animate-bounce">🎉</span>
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              New Celebrations!
            </CardTitle>
            <CardDescription>
              You have {unreadCelebrations.length} new achievement{unreadCelebrations.length > 1 ? 's' : ''} to celebrate
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => handleCelebrationClick(unreadCelebrations[0])}
              className="w-full"
              variant="default"
            >
              View Celebration ✨
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Celebration Modal */}
      {selectedCelebration && (
        <CelebrationModal
          isOpen={!!selectedCelebration}
          onClose={() => setSelectedCelebration(null)}
          celebration={selectedCelebration}
        />
      )}
    </div>
  );
}