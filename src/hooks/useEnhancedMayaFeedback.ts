import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getCurrentDevUser } from '@/lib/devUserSetup';
import { QUERY_KEYS } from '@/lib/queryKeys';
import {
  fetchMayaFeedbackCorrelations,
  fetchMayaFeedbackCorrelationById,
  insertMayaFeedbackCorrelation,
  updateMayaFeedbackCorrelation,
  rpcDevUserSubmitMayaFeedback,
} from '@/shared/lib/api/mayaFeedback';

export interface MayaFeedbackCorrelation {
  id: string;
  user_id: string;
  feedback_type: 'intervention' | 'recommendation' | 'alert';
  feedback_data: Record<string, any>;
  user_action?: string;
  outcome_metrics: Record<string, any>;
  correlation_score: number;
  feedback_effectiveness: number;
  time_to_action_hours?: number;
  long_term_impact: Record<string, any>;
  created_at: string;
  measured_at: string;
}

interface FeedbackSubmission {
  type: 'intervention' | 'recommendation' | 'alert';
  data: Record<string, any>;
  userAction?: string;
  rating?: number;
  feedback?: string;
}

interface FeedbackAnalytics {
  totalFeedbackGiven: number;
  averageEffectiveness: number;
  bestPerformingTypes: Array<{ type: string; effectiveness: number }>;
  userEngagementRate: number;
  averageResponseTime: number;
  improvementTrends: Array<{ period: string; improvement: number }>;
}

export const useEnhancedMayaFeedback = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingFeedback, setPendingFeedback] = useState<string | null>(null);

  // Get current user ID with dev support
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

  // Fetch feedback correlations
  // NOTE: userId is resolved async in queryFn (getCurrentUserId), so the key is intentionally not user-scoped.
  // Future PR can lift userId resolution out of queryFn and include it in QUERY_KEYS.MAYA_FEEDBACK_CORRELATIONS(userId).
  const { data: feedbackHistory, isLoading } = useQuery({
    queryKey: QUERY_KEYS.MAYA_FEEDBACK_CORRELATIONS(),
    queryFn: async () => {
      const userId = await getCurrentUserId();
      return fetchMayaFeedbackCorrelations(userId, 50) as Promise<MayaFeedbackCorrelation[]>;
    },
    enabled: true
  });

  // Submit feedback correlation
  const submitFeedback = useMutation({
    mutationFn: async (feedback: FeedbackSubmission) => {
      const userId = await getCurrentUserId();
      const devUser = getCurrentDevUser();
      
      if (devUser) {
        // Use dev user function for dev users
        const id = await rpcDevUserSubmitMayaFeedback(
          userId,
          feedback.type,
          feedback.data,
          feedback.rating || null
        );

        // Fetch the created feedback
        const feedbackData = await fetchMayaFeedbackCorrelationById(id);
        return feedbackData as MayaFeedbackCorrelation;
      } else {
        // Regular authenticated user flow
        const initialEffectiveness = feedback.rating ? feedback.rating / 5.0 : 0.5;
        
        const data = await insertMayaFeedbackCorrelation({
          user_id: userId,
          feedback_type: feedback.type,
          feedback_data: feedback.data,
          user_action: feedback.userAction || 'provided_feedback',
          outcome_metrics: {
            user_rating: feedback.rating,
            user_feedback: feedback.feedback,
            submission_timestamp: new Date().toISOString()
          },
          correlation_score: 0.0,
          feedback_effectiveness: initialEffectiveness,
          time_to_action_hours: null,
          long_term_impact: {}
        });

        return data as MayaFeedbackCorrelation;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MAYA_FEEDBACK_CORRELATIONS() });
      setPendingFeedback(null);
      toast({
        title: "Feedback Submitted",
        description: "Thank you! Maya is learning from your feedback to improve future recommendations."
      });
    },
    onError: (error) => {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Update feedback correlation with outcome data
  const updateFeedbackOutcome = useMutation({
    mutationFn: async ({ 
      correlationId, 
      outcomeMetrics, 
      longTermImpact 
    }: {
      correlationId: string;
      outcomeMetrics: Record<string, any>;
      longTermImpact?: Record<string, any>;
    }) => {
      const updateData: any = {
        outcome_metrics: outcomeMetrics,
        measured_at: new Date().toISOString()
      };

      if (longTermImpact) {
        updateData.long_term_impact = longTermImpact;
      }

      // Calculate correlation score based on outcomes
      const correlationScore = calculateCorrelationScore(outcomeMetrics);
      if (correlationScore !== null) {
        updateData.correlation_score = correlationScore;
      }

      const data = await updateMayaFeedbackCorrelation(correlationId, updateData);
      return data as MayaFeedbackCorrelation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.MAYA_FEEDBACK_CORRELATIONS() });
    }
  });

  // Calculate correlation score based on outcome metrics
  const calculateCorrelationScore = (outcomeMetrics: Record<string, any>): number | null => {
    let score = 0;
    let factors = 0;

    if (outcomeMetrics.user_rating) {
      score += outcomeMetrics.user_rating / 5.0;
      factors++;
    }

    if (outcomeMetrics.completion_rate_before && outcomeMetrics.completion_rate_after) {
      const improvement = outcomeMetrics.completion_rate_after - outcomeMetrics.completion_rate_before;
      score += Math.max(0, Math.min(1, improvement / 0.2));
      factors++;
    }

    if (outcomeMetrics.engagement_before && outcomeMetrics.engagement_after) {
      const improvement = outcomeMetrics.engagement_after - outcomeMetrics.engagement_before;
      score += Math.max(0, Math.min(1, improvement / 0.3));
      factors++;
    }

    if (outcomeMetrics.velocity_before && outcomeMetrics.velocity_after) {
      const improvement = outcomeMetrics.velocity_after - outcomeMetrics.velocity_before;
      score += Math.max(0, Math.min(1, improvement / 0.25));
      factors++;
    }

    return factors > 0 ? score / factors : null;
  };

  // Analyze feedback effectiveness
  const analyzeFeedbackEffectiveness = useCallback((): FeedbackAnalytics | null => {
    if (!feedbackHistory || feedbackHistory.length === 0) return null;

    const totalFeedback = feedbackHistory.length;
    const avgEffectiveness = feedbackHistory.reduce((sum, f) => sum + f.feedback_effectiveness, 0) / totalFeedback;

    const typeGroups = feedbackHistory.reduce((groups, feedback) => {
      const type = feedback.feedback_type;
      if (!groups[type]) groups[type] = [];
      groups[type].push(feedback);
      return groups;
    }, {} as Record<string, MayaFeedbackCorrelation[]>);

    const bestPerformingTypes = Object.entries(typeGroups)
      .map(([type, feedbacks]) => ({
        type,
        effectiveness: feedbacks.reduce((sum, f) => sum + f.feedback_effectiveness, 0) / feedbacks.length
      }))
      .sort((a, b) => b.effectiveness - a.effectiveness);

    const feedbackWithOutcomes = feedbackHistory.filter(f => 
      Object.keys(f.outcome_metrics).length > 1
    );
    const engagementRate = feedbackWithOutcomes.length / totalFeedback;

    const feedbackWithResponseTime = feedbackHistory.filter(f => f.time_to_action_hours !== null);
    const avgResponseTime = feedbackWithResponseTime.length > 0
      ? feedbackWithResponseTime.reduce((sum, f) => sum + (f.time_to_action_hours || 0), 0) / feedbackWithResponseTime.length
      : 0;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const recentFeedback = feedbackHistory.filter(f => new Date(f.created_at) >= thirtyDaysAgo);
    const previousFeedback = feedbackHistory.filter(f => 
      new Date(f.created_at) >= sixtyDaysAgo && new Date(f.created_at) < thirtyDaysAgo
    );

    const recentAvgEffectiveness = recentFeedback.length > 0
      ? recentFeedback.reduce((sum, f) => sum + f.feedback_effectiveness, 0) / recentFeedback.length
      : 0;

    const previousAvgEffectiveness = previousFeedback.length > 0
      ? previousFeedback.reduce((sum, f) => sum + f.feedback_effectiveness, 0) / previousFeedback.length
      : 0;

    const improvementTrends = [{
      period: 'last_30_days',
      improvement: recentAvgEffectiveness - previousAvgEffectiveness
    }];

    return {
      totalFeedbackGiven: totalFeedback,
      averageEffectiveness: avgEffectiveness,
      bestPerformingTypes,
      userEngagementRate: engagementRate,
      averageResponseTime: avgResponseTime,
      improvementTrends
    };
  }, [feedbackHistory]);

  // Track Maya recommendation outcome
  const trackRecommendationOutcome = useCallback(async (
    recommendationType: string,
    recommendationData: Record<string, any>,
    outcomeData: Record<string, any>
  ) => {
    try {
      const userId = await getCurrentUserId();

      const existingFeedback = feedbackHistory?.find(f => 
        f.feedback_type === 'recommendation' &&
        JSON.stringify(f.feedback_data) === JSON.stringify(recommendationData)
      );

      if (existingFeedback) {
        await updateFeedbackOutcome.mutateAsync({
          correlationId: existingFeedback.id,
          outcomeMetrics: {
            ...existingFeedback.outcome_metrics,
            ...outcomeData,
            outcome_tracked_at: new Date().toISOString()
          }
        });
      } else {
        await submitFeedback.mutateAsync({
          type: 'recommendation',
          data: recommendationData,
          userAction: 'followed_recommendation'
        });
      }
    } catch (error) {
      console.error('Error tracking recommendation outcome:', error);
    }
  }, [feedbackHistory, submitFeedback, updateFeedbackOutcome, getCurrentUserId]);

  return {
    // Data
    feedbackHistory,
    isLoading,
    pendingFeedback,
    
    // Actions
    submitFeedback,
    updateFeedbackOutcome,
    trackRecommendationOutcome,
    setPendingFeedback,
    
    // Analytics
    feedbackAnalytics: analyzeFeedbackEffectiveness()
  };
};
