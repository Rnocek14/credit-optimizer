import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getCurrentDevUser } from '@/lib/devUserSetup';
import { QUERY_KEYS } from '@/lib/queryKeys';
import {
  fetchLearningSessions,
  fetchLearningSessionById,
  insertLearningSession,
  updateLearningSession,
  rpcDevUserSessionStart,
  rpcDevUserSessionEnd,
  fetchMotivationInterventions,
  insertMotivationIntervention,
} from '@/shared/lib/api/engagement';
import type { Json } from '@/integrations/supabase/types';

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
  // Auth call is an allowed exception per API_SEAMS.md
  const getCurrentUserId = useCallback(async () => {
    const devUser = getCurrentDevUser();
    if (devUser) {
      return devUser.id;
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      return user.id;
    }
  }, []);

  // Fetch recent learning sessions
  // NOTE: userId is resolved async in queryFn (getCurrentUserId), so the key is intentionally not user-scoped.
  // Future PR can lift userId resolution out of queryFn and include it in QUERY_KEYS.LEARNING_SESSIONS(userId).
  const { data: sessions, isLoading } = useQuery({
    queryKey: QUERY_KEYS.LEARNING_SESSIONS(),
    queryFn: async () => {
      const userId = await getCurrentUserId();
      return fetchLearningSessions(userId) as Promise<LearningSession[]>;
    },
    enabled: true
  });

  // Fetch motivation interventions
  // NOTE: userId is resolved async in queryFn — key intentionally not user-scoped (see API_SEAMS.md).
  const { data: interventions } = useQuery({
    queryKey: QUERY_KEYS.MOTIVATION_INTERVENTIONS(),
    queryFn: async () => {
      const userId = await getCurrentUserId();
      return fetchMotivationInterventions(userId) as Promise<MotivationIntervention[]>;
    },
    enabled: true
  });

  // Start learning session
  const startSession = useMutation({
    mutationFn: async ({ courseId, sessionType }: { courseId?: string; sessionType: LearningSession['session_type'] }) => {
      const userId = await getCurrentUserId();
      const devUser = getCurrentDevUser();
      
      const validCourseId = courseId && courseId.length === 36 && courseId.includes('-') 
        ? courseId 
        : crypto.randomUUID();
      
      if (devUser) {
        const sessionId = await rpcDevUserSessionStart(userId, validCourseId, sessionType);
        return fetchLearningSessionById(sessionId) as Promise<LearningSession>;
      } else {
        const sessionData = {
          user_id: userId,
          course_id: validCourseId,
          session_type: sessionType,
          started_at: new Date().toISOString(),
          duration_minutes: 0,
          activity_data: {
            clicks: 0,
            scrolls: 0,
            pauses: [],
            navigation_events: []
          } as Json,
          engagement_score: 0.0,
          completion_percentage: 0,
          focus_events: [] as Json,
          learning_velocity: 0.0,
          retention_indicators: {} as Json,
        };

        return insertLearningSession(sessionData) as Promise<LearningSession>;
      }
    },
    onSuccess: (data) => {
      setActiveSession(data);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEARNING_SESSIONS() });
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

    const durationFactor = Math.min(duration_minutes / 45, 1);
    const activityFactor = Math.min((activity_data.clicks || 0) / (duration_minutes || 1), 1);
    const completionFactor = completion_percentage / 100;
    const difficultyFactor = difficulty_feedback ? Math.max(0, 1 - Math.abs(difficulty_feedback - 3) / 2) : 0.5;
    const focusFactor = Math.max(0, 1 - (focus_events.length / (duration_minutes || 1)));

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

      const userId = await getCurrentUserId();
      const devUser = getCurrentDevUser();
      
      const endTime = new Date().toISOString();
      const durationMinutes = Math.round(
        (Date.now() - new Date(activeSession.started_at).getTime()) / 60000
      );

      const finalEngagementScore = calculateEngagementScore({
        ...sessionMetrics,
        ...finalMetrics,
        duration_minutes: durationMinutes
      });

      const sessionMetricsData = {
        difficulty: finalMetrics.difficulty_feedback || 3,
        engagement: Math.round(finalEngagementScore * 5),
        mastered_topics: finalMetrics.session_notes?.split('Mastered: ')[1]?.split('Struggled:')[0]?.trim(),
        struggled_topics: finalMetrics.session_notes?.split('Struggled: ')[1]?.trim(),
        ...finalMetrics
      };

      if (devUser) {
        const updatedId = await rpcDevUserSessionEnd(userId, activeSession.id, sessionMetricsData as unknown as Json);
        return fetchLearningSessionById(updatedId) as Promise<LearningSession>;
      } else {
        const updateData = {
          ended_at: endTime,
          duration_minutes: durationMinutes,
          engagement_score: finalEngagementScore,
          final_metrics: sessionMetricsData,
          ...finalMetrics
        };

        return updateLearningSession(activeSession.id, updateData) as Promise<LearningSession>;
      }
    },
    onSuccess: (data) => {
      setActiveSession(null);
      setSessionMetrics({});
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.LEARNING_SESSIONS() });
      
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
      const shouldIntervent = analyzeInterventionNeeds(session);
      
      if (shouldIntervent.intervention) {
        await insertMotivationIntervention({
          user_id: userId,
          intervention_type: shouldIntervent.type,
          trigger_conditions: shouldIntervent.triggers as Json,
          intervention_data: shouldIntervent.suggestion as Json,
          confidence_score: shouldIntervent.confidence,
        });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MOTIVATION_INTERVENTIONS() });
      }
    } catch (error) {
      console.error('Error generating intervention:', error);
    }
  }, [getCurrentUserId, queryClient]);

  // Analyze if intervention is needed
  const analyzeInterventionNeeds = (session: LearningSession) => {
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

    return { intervention: false } as const;
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

    const recent5 = recentSessions.slice(0, 5);
    const previous5 = recentSessions.slice(5, 10);
    
    const recentAvgEngagement = recent5.length > 0 
      ? recent5.reduce((sum, s) => sum + s.engagement_score, 0) / recent5.length 
      : avgEngagement;
    
    const previousAvgEngagement = previous5.length > 0 
      ? previous5.reduce((sum, s) => sum + s.engagement_score, 0) / previous5.length 
      : recentAvgEngagement;

    const motivationTrend = recentAvgEngagement - previousAvgEngagement;

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
    sessions,
    interventions,
    activeSession,
    sessionMetrics,
    isLoading,
    startSession,
    endSession,
    updateSessionMetrics,
    trackActivity,
    calculateEngagementScore,
    engagementMetrics: calculateEngagementMetrics()
  };
};
