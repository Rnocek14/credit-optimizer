import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface LearningSession {
  id: string;
  user_id: string;
  course_id?: string;
  session_type: 'learning' | 'practice' | 'review';
  started_at: string;
  ended_at?: string;
  duration_minutes: number;
  activity_data: Record<string, any>;
  engagement_score: number;
  difficulty_feedback?: number;
  completion_percentage: number;
  focus_events: any[];
  learning_velocity: number;
  retention_indicators: Record<string, any>;
  session_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface MotivationIntervention {
  id: string;
  user_id: string;
  intervention_type: string;
  trigger_conditions: Record<string, any>;
  intervention_data: Record<string, any>;
  confidence_score: number;
  suggested_at: string;
  user_response?: 'accepted' | 'dismissed' | 'modified';
  response_at?: string;
  effectiveness_score?: number;
  implementation_notes?: string;
  created_at: string;
}

export interface EngagementMetrics {
  averageSessionDuration: number;
  dailyEngagementScore: number;
  completionVelocity: number;
  attentionSpan: number;
  learningEfficiency: number;
  burnoutRisk: number;
  motivationLevel: number;
  retentionRate: number;
}

export const useRealTimeEngagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeSession, setActiveSession] = useState<LearningSession | null>(null);
  const [sessionMetrics, setSessionMetrics] = useState<Partial<LearningSession>>({});

  // Get current user ID with dev support
  const getCurrentUserId = useCallback(async () => {
    const devUser = localStorage.getItem("devUser");
    if (devUser) {
      const parsedDevUser = JSON.parse(devUser);
      return parsedDevUser.id;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      return user.id;
    }
  }, []);

  // Fetch recent learning sessions
  const { data: sessions, isLoading } = useQuery({
    queryKey: ['learning-engagement-sessions'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      
      const { data, error } = await supabase
        .from('learning_engagement_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as LearningSession[];
    },
    enabled: true
  });

  // Fetch motivation interventions
  const { data: interventions } = useQuery({
    queryKey: ['motivation-interventions'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      
      const { data, error } = await supabase
        .from('motivation_interventions')
        .select('*')
        .eq('user_id', userId)
        .order('suggested_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as MotivationIntervention[];
    },
    enabled: true
  });

  // Start learning session
  const startSession = useMutation({
    mutationFn: async ({ courseId, sessionType }: { courseId?: string; sessionType: LearningSession['session_type'] }) => {
      const userId = await getCurrentUserId();
      
      const sessionData = {
        user_id: userId,
        course_id: courseId,
        session_type: sessionType,
        started_at: new Date().toISOString(),
        duration_minutes: 0,
        activity_data: {
          clicks: 0,
          scrolls: 0,
          pauses: [],
          navigation_events: []
        },
        engagement_score: 0.0,
        completion_percentage: 0,
        focus_events: [],
        learning_velocity: 0.0,
        retention_indicators: {}
      };

      const { data, error } = await supabase
        .from('learning_engagement_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;
      return data as LearningSession;
    },
    onSuccess: (data) => {
      setActiveSession(data);
      queryClient.invalidateQueries({ queryKey: ['learning-engagement-sessions'] });
      toast({
        title: "Learning Session Started",
        description: "Your progress is now being tracked for personalized insights."
      });
    },
    onError: (error) => {
      console.error('Error starting session:', error);
      toast({
        title: "Error",
        description: "Failed to start learning session.",
        variant: "destructive"
      });
    }
  });

  // Update session metrics in real-time
  const updateSessionMetrics = useCallback((updates: Partial<LearningSession>) => {
    setSessionMetrics(prev => ({ ...prev, ...updates }));
  }, []);

  // Calculate real-time engagement score
  const calculateEngagementScore = useCallback((metrics: Partial<LearningSession>): number => {
    const {
      duration_minutes = 0,
      activity_data = {},
      completion_percentage = 0,
      difficulty_feedback = 3,
      focus_events = []
    } = metrics;

    // Base engagement factors
    const durationFactor = Math.min(duration_minutes / 45, 1); // Optimal 45 min sessions
    const activityFactor = Math.min((activity_data.clicks || 0) / (duration_minutes || 1), 1);
    const completionFactor = completion_percentage / 100;
    const difficultyFactor = difficulty_feedback ? Math.max(0, 1 - Math.abs(difficulty_feedback - 3) / 2) : 0.5;
    const focusFactor = Math.max(0, 1 - (focus_events.length / (duration_minutes || 1)));

    // Weighted engagement score
    const score = (
      durationFactor * 0.2 +
      activityFactor * 0.2 +
      completionFactor * 0.3 +
      difficultyFactor * 0.2 +
      focusFactor * 0.1
    );

    return Math.round(score * 100) / 100;
  }, []);

  // End learning session
  const endSession = useMutation({
    mutationFn: async (finalMetrics: Partial<LearningSession>) => {
      if (!activeSession) throw new Error('No active session');

      const endTime = new Date().toISOString();
      const durationMinutes = Math.round(
        (Date.now() - new Date(activeSession.started_at).getTime()) / 60000
      );

      const finalEngagementScore = calculateEngagementScore({
        ...sessionMetrics,
        ...finalMetrics,
        duration_minutes: durationMinutes
      });

      const updateData = {
        ended_at: endTime,
        duration_minutes: durationMinutes,
        engagement_score: finalEngagementScore,
        ...finalMetrics
      };

      const { data, error } = await supabase
        .from('learning_engagement_sessions')
        .update(updateData)
        .eq('id', activeSession.id)
        .select()
        .single();

      if (error) throw error;
      return data as LearningSession;
    },
    onSuccess: (data) => {
      setActiveSession(null);
      setSessionMetrics({});
      queryClient.invalidateQueries({ queryKey: ['learning-engagement-sessions'] });
      
      // Generate motivation intervention if needed
      generateMotivationIntervention(data);
      
      toast({
        title: "Session Completed",
        description: `Tracked ${data.duration_minutes} minutes with ${Math.round(data.engagement_score * 100)}% engagement.`
      });
    },
    onError: (error) => {
      console.error('Error ending session:', error);
      toast({
        title: "Error",
        description: "Failed to save session data.",
        variant: "destructive"
      });
    }
  });

  // Generate motivation intervention based on session data
  const generateMotivationIntervention = useCallback(async (session: LearningSession) => {
    try {
      const userId = await getCurrentUserId();
      
      // Analyze session for intervention triggers
      const shouldIntervent = analyzeInterventionNeeds(session);
      
      if (shouldIntervent.intervention) {
        const { data, error } = await supabase
          .from('motivation_interventions')
          .insert({
            user_id: userId,
            intervention_type: shouldIntervent.type,
            trigger_conditions: shouldIntervent.triggers,
            intervention_data: shouldIntervent.suggestion,
            confidence_score: shouldIntervent.confidence
          });

        if (!error) {
          queryClient.invalidateQueries({ queryKey: ['motivation-interventions'] });
        }
      }
    } catch (error) {
      console.error('Error generating intervention:', error);
    }
  }, [getCurrentUserId, queryClient]);

  // Analyze if intervention is needed
  const analyzeInterventionNeeds = (session: LearningSession) => {
    // Low engagement intervention
    if (session.engagement_score < 0.4) {
      return {
        intervention: true,
        type: 'engagement_boost',
        triggers: { low_engagement: session.engagement_score },
        suggestion: {
          title: 'Try a Different Learning Style',
          description: 'Your engagement seems low. Consider switching to hands-on practice or taking a short break.',
          actions: ['take_break', 'switch_format', 'adjust_difficulty']
        },
        confidence: 0.8
      };
    }

    // Session too long intervention
    if (session.duration_minutes > 90) {
      return {
        intervention: true,
        type: 'break_suggestion',
        triggers: { long_session: session.duration_minutes },
        suggestion: {
          title: 'Consider Shorter Sessions',
          description: 'Long study sessions can reduce retention. Try 45-60 minute sessions with breaks.',
          actions: ['schedule_break', 'split_session']
        },
        confidence: 0.7
      };
    }

    // Difficulty feedback intervention
    if (session.difficulty_feedback && (session.difficulty_feedback > 4 || session.difficulty_feedback < 2)) {
      return {
        intervention: true,
        type: 'difficulty_adjustment',
        triggers: { difficulty_rating: session.difficulty_feedback },
        suggestion: {
          title: session.difficulty_feedback > 4 ? 'Content Too Difficult?' : 'Ready for More Challenge?',
          description: session.difficulty_feedback > 4 
            ? 'Consider reviewing prerequisites or seeking additional resources.'
            : 'You might benefit from more advanced content or faster pacing.',
          actions: session.difficulty_feedback > 4 
            ? ['review_prerequisites', 'get_help'] 
            : ['advance_content', 'increase_pace']
        },
        confidence: 0.9
      };
    }

    return { intervention: false };
  };

  // Calculate current engagement metrics
  const calculateEngagementMetrics = useCallback((): EngagementMetrics => {
    if (!sessions || sessions.length === 0) {
      return {
        averageSessionDuration: 0,
        dailyEngagementScore: 0,
        completionVelocity: 0,
        attentionSpan: 0,
        learningEfficiency: 0,
        burnoutRisk: 0,
        motivationLevel: 0,
        retentionRate: 0
      };
    }

    const recentSessions = sessions.slice(0, 10);
    const avgDuration = recentSessions.reduce((sum, s) => sum + s.duration_minutes, 0) / recentSessions.length;
    const avgEngagement = recentSessions.reduce((sum, s) => sum + s.engagement_score, 0) / recentSessions.length;
    const avgCompletion = recentSessions.reduce((sum, s) => sum + s.completion_percentage, 0) / recentSessions.length;

    // Calculate trends
    const recent5 = recentSessions.slice(0, 5);
    const previous5 = recentSessions.slice(5, 10);
    
    const recentAvgEngagement = recent5.length > 0 
      ? recent5.reduce((sum, s) => sum + s.engagement_score, 0) / recent5.length 
      : avgEngagement;
    
    const previousAvgEngagement = previous5.length > 0 
      ? previous5.reduce((sum, s) => sum + s.engagement_score, 0) / previous5.length 
      : recentAvgEngagement;

    const motivationTrend = recentAvgEngagement - previousAvgEngagement;

    // Burnout risk calculation
    const longSessions = recentSessions.filter(s => s.duration_minutes > 120).length;
    const lowEngagementSessions = recentSessions.filter(s => s.engagement_score < 0.4).length;
    const burnoutRisk = Math.min(1, (longSessions * 0.3 + lowEngagementSessions * 0.2));

    return {
      averageSessionDuration: avgDuration,
      dailyEngagementScore: avgEngagement,
      completionVelocity: avgCompletion / avgDuration,
      attentionSpan: avgDuration,
      learningEfficiency: avgEngagement * (avgCompletion / 100),
      burnoutRisk: burnoutRisk,
      motivationLevel: Math.max(0, Math.min(1, avgEngagement + motivationTrend)),
      retentionRate: avgCompletion / 100
    };
  }, [sessions]);

  // Track activity event
  const trackActivity = useCallback((eventType: string, eventData: any) => {
    if (activeSession) {
      const updatedActivityData = {
        ...sessionMetrics.activity_data,
        [eventType]: (sessionMetrics.activity_data?.[eventType] || 0) + 1,
        events: [
          ...(sessionMetrics.activity_data?.events || []),
          { type: eventType, data: eventData, timestamp: new Date().toISOString() }
        ]
      };
      
      updateSessionMetrics({ activity_data: updatedActivityData });
    }
  }, [activeSession, sessionMetrics, updateSessionMetrics]);

  return {
    // Data
    sessions,
    interventions,
    activeSession,
    sessionMetrics,
    isLoading,
    
    // Actions
    startSession,
    endSession,
    updateSessionMetrics,
    trackActivity,
    calculateEngagementScore,
    
    // Computed
    engagementMetrics: calculateEngagementMetrics()
  };
};