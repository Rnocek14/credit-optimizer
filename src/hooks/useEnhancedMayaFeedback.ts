import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getCurrentDevUser } from '@/lib/devUserSetup';

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
  const { data: feedbackHistory, isLoading } = useQuery({
    queryKey: ['maya-feedback-correlations'],
    queryFn: async () => {
      const userId = await getCurrentUserId();
      
      const { data, error } = await supabase
        .from('maya_feedback_correlations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as MayaFeedbackCorrelation[];
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
        const { data, error } = await supabase.rpc('dev_user_submit_maya_feedback', {
          dev_user_id: userId,
          feedback_type_param: feedback.type,
          feedback_data_param: feedback.data,
          user_rating_param: feedback.rating || null
        });

        if (error) throw error;
        
        // Fetch the created feedback
        const { data: feedbackData, error: fetchError } = await supabase
          .from('maya_feedback_correlations')
          .select('*')
          .eq('id', data)
          .single();
          
        if (fetchError) throw fetchError;
        return feedbackData as MayaFeedbackCorrelation;
      } else {
        // Regular authenticated user flow
        const initialEffectiveness = feedback.rating ? feedback.rating / 5.0 : 0.5;
        
        const correlationData = {
          user_id: userId,
          feedback_type: feedback.type,
          feedback_data: feedback.data,
          user_action: feedback.userAction || 'provided_feedback',
          outcome_metrics: {
            user_rating: feedback.rating,
            user_feedback: feedback.feedback,
            submission_timestamp: new Date().toISOString()
          },
          correlation_score: 0.0, // Will be calculated later with more data
          feedback_effectiveness: initialEffectiveness,
          time_to_action_hours: null,
          long_term_impact: {}
        };

        const { data, error } = await supabase
          .from('maya_feedback_correlations')
          .insert(correlationData)
          .select()
          .single();

        if (error) throw error;
        return data as MayaFeedbackCorrelation;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maya-feedback-correlations'] });
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

      const { data, error } = await supabase
        .from('maya_feedback_correlations')
        .update(updateData)
        .eq('id', correlationId)
        .select()
        .single();

      if (error) throw error;
      return data as MayaFeedbackCorrelation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['maya-feedback-correlations'] });
    }
  });

  // Calculate correlation score based on outcome metrics
  const calculateCorrelationScore = (outcomeMetrics: Record<string, any>): number | null => {
    // Base correlation on measurable outcomes
    let score = 0;
    let factors = 0;

    // User rating correlation
    if (outcomeMetrics.user_rating) {
      score += outcomeMetrics.user_rating / 5.0;
      factors++;
    }

    // Course completion improvement
    if (outcomeMetrics.completion_rate_before && outcomeMetrics.completion_rate_after) {
      const improvement = outcomeMetrics.completion_rate_after - outcomeMetrics.completion_rate_before;
      score += Math.max(0, Math.min(1, improvement / 0.2)); // 20% improvement = full score
      factors++;
    }

    // Engagement improvement
    if (outcomeMetrics.engagement_before && outcomeMetrics.engagement_after) {
      const improvement = outcomeMetrics.engagement_after - outcomeMetrics.engagement_before;
      score += Math.max(0, Math.min(1, improvement / 0.3)); // 30% improvement = full score
      factors++;
    }

    // Learning velocity improvement
    if (outcomeMetrics.velocity_before && outcomeMetrics.velocity_after) {
      const improvement = outcomeMetrics.velocity_after - outcomeMetrics.velocity_before;
      score += Math.max(0, Math.min(1, improvement / 0.25)); // 25% improvement = full score
      factors++;
    }

    return factors > 0 ? score / factors : null;
  };

  // Analyze feedback effectiveness
  const analyzeFeedbackEffectiveness = useCallback((): FeedbackAnalytics | null => {
    if (!feedbackHistory || feedbackHistory.length === 0) return null;

    const totalFeedback = feedbackHistory.length;
    const avgEffectiveness = feedbackHistory.reduce((sum, f) => sum + f.feedback_effectiveness, 0) / totalFeedback;

    // Group by feedback type and calculate effectiveness
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

    // Calculate engagement rate (feedback with outcomes vs total)
    const feedbackWithOutcomes = feedbackHistory.filter(f => 
      Object.keys(f.outcome_metrics).length > 1 // More than just initial submission
    );
    const engagementRate = feedbackWithOutcomes.length / totalFeedback;

    // Calculate average response time for feedbacks with time_to_action
    const feedbackWithResponseTime = feedbackHistory.filter(f => f.time_to_action_hours !== null);
    const avgResponseTime = feedbackWithResponseTime.length > 0
      ? feedbackWithResponseTime.reduce((sum, f) => sum + (f.time_to_action_hours || 0), 0) / feedbackWithResponseTime.length
      : 0;

    // Calculate improvement trends (compare last 30 days vs previous 30 days)
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

      // Find existing feedback correlation or create new one
      const existingFeedback = feedbackHistory?.find(f => 
        f.feedback_type === 'recommendation' &&
        JSON.stringify(f.feedback_data) === JSON.stringify(recommendationData)
      );

      if (existingFeedback) {
        // Update existing correlation with outcome
        await updateFeedbackOutcome.mutateAsync({
          correlationId: existingFeedback.id,
          outcomeMetrics: {
            ...existingFeedback.outcome_metrics,
            ...outcomeData,
            outcome_tracked_at: new Date().toISOString()
          }
        });
      } else {
        // Create new correlation entry
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