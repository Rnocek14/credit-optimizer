import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Recommendation {
  id: string;
  user_id: string;
  recommendation_type: 'career_move' | 'location_move' | 'skill_development' | 'market_alert';
  priority_score: number;
  confidence_score: number;
  recommendation_data: {
    title: string;
    description: string;
    [key: string]: any;
  };
  reasoning: string;
  action_required: string;
  expires_at: string;
  status: 'active' | 'dismissed' | 'completed' | 'expired';
  created_at: string;
  updated_at: string;
}

export interface UserMarketPreferences {
  id?: string;
  user_id?: string;
  preferred_locations: string[];
  preferred_industries: string[];
  salary_range_min?: number;
  salary_range_max?: number;
  growth_preference?: 'stability' | 'growth' | 'high_growth';
  risk_tolerance?: 'low' | 'medium' | 'high';
  work_style?: 'remote' | 'hybrid' | 'onsite' | 'flexible';
  career_stage?: 'entry' | 'mid' | 'senior' | 'executive';
  learning_preferences?: Record<string, any>;
  notification_preferences?: Record<string, any>;
}

export interface FeedbackData {
  feedback_type: 'helpful' | 'not_helpful' | 'irrelevant' | 'completed';
  feedback_text?: string;
  rating?: number;
}

export const usePersonalizedInsights = () => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [preferences, setPreferences] = useState<UserMarketPreferences | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load user's recommendations and preferences
  const loadUserData = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Load recommendations
      const { data: recsData, error: recsError } = await supabase
        .from('personalized_recommendations' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('priority_score', { ascending: false });

      if (recsError) {
        throw new Error(`Failed to load recommendations: ${recsError.message}`);
      }

      // Load preferences
      const { data: prefsData, error: prefsError } = await supabase
        .from('user_market_preferences' as any)
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (prefsError && prefsError.code !== 'PGRST116') { // Not found is OK
        throw new Error(`Failed to load preferences: ${prefsError.message}`);
      }

      setRecommendations((recsData as any[])?.map(item => ({
        id: item.id,
        user_id: item.user_id,
        recommendation_type: item.recommendation_type,
        priority_score: item.priority_score,
        confidence_score: item.confidence_score,
        recommendation_data: item.recommendation_data,
        reasoning: item.reasoning,
        action_required: item.action_required,
        expires_at: item.expires_at,
        status: item.status,
        created_at: item.created_at,
        updated_at: item.updated_at
      })) || []);
      
      if (prefsData && !prefsError) {
        const prefs = prefsData as any;
        setPreferences({
          id: prefs.id,
          user_id: prefs.user_id,
          preferred_locations: prefs.preferred_locations || [],
          preferred_industries: prefs.preferred_industries || [],
          salary_range_min: prefs.salary_range_min,
          salary_range_max: prefs.salary_range_max,
          growth_preference: prefs.growth_preference,
          risk_tolerance: prefs.risk_tolerance,
          work_style: prefs.work_style,
          career_stage: prefs.career_stage,
          learning_preferences: prefs.learning_preferences || {},
          notification_preferences: prefs.notification_preferences || {}
        });
      } else {
        setPreferences(null);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate new recommendations using AI
  const refreshRecommendations = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('🤖 Generating personalized recommendations...');

      const { data, error } = await supabase.functions.invoke('personalized-market-insights', {
        body: { user_id: user.id }
      });

      if (error) {
        throw new Error(`Failed to generate recommendations: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to generate recommendations');
      }

      setRecommendations(data.recommendations || []);
      
      toast({
        title: "Recommendations Updated",
        description: `Generated ${data.recommendations?.length || 0} personalized recommendations.`,
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error refreshing recommendations:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Dismiss a recommendation
  const dismissRecommendation = async (recommendationId: string) => {
    try {
      const { error } = await supabase
        .from('personalized_recommendations' as any)
        .update({ status: 'dismissed' })
        .eq('id', recommendationId);

      if (error) {
        throw new Error(`Failed to dismiss recommendation: ${error.message}`);
      }

      setRecommendations(prev => 
        prev.filter(rec => rec.id !== recommendationId)
      );

      toast({
        title: "Recommendation Dismissed",
        description: "The recommendation has been removed from your list.",
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error dismissing recommendation:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Provide feedback on a recommendation
  const provideFeedback = async (recommendationId: string, feedback: FeedbackData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('recommendation_feedback' as any)
        .insert({
          user_id: user.id,
          recommendation_id: recommendationId,
          ...feedback
        });

      if (error) {
        throw new Error(`Failed to submit feedback: ${error.message}`);
      }

      // If marked as completed, update recommendation status
      if (feedback.feedback_type === 'completed') {
        await supabase
          .from('personalized_recommendations' as any)
          .update({ status: 'completed' })
          .eq('id', recommendationId);

        setRecommendations(prev => 
          prev.filter(rec => rec.id !== recommendationId)
        );
      }

      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback! This helps improve our recommendations.",
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error providing feedback:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Update user market preferences
  const updatePreferences = async (newPreferences: Partial<UserMarketPreferences>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('user_market_preferences' as any)
        .upsert({
          user_id: user.id,
          ...newPreferences,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update preferences: ${error.message}`);
      }

      if (data && !error) {
        const prefs = data as any;
        setPreferences({
          id: prefs.id,
          user_id: prefs.user_id,
          preferred_locations: prefs.preferred_locations || [],
          preferred_industries: prefs.preferred_industries || [],
          salary_range_min: prefs.salary_range_min,
          salary_range_max: prefs.salary_range_max,
          growth_preference: prefs.growth_preference,
          risk_tolerance: prefs.risk_tolerance,
          work_style: prefs.work_style,
          career_stage: prefs.career_stage,
          learning_preferences: prefs.learning_preferences || {},
          notification_preferences: prefs.notification_preferences || {}
        });
      } else {
        setPreferences(null);
      }
      
      toast({
        title: "Preferences Updated",
        description: "Your market preferences have been saved successfully.",
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error updating preferences:', err);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  // Get top recommendations by type
  const getTopRecommendations = (count: number = 3) => {
    return recommendations
      .sort((a, b) => b.priority_score - a.priority_score)
      .slice(0, count);
  };

  // Get recommendations by type
  const getRecommendationsByType = (type: Recommendation['recommendation_type']) => {
    return recommendations.filter(rec => rec.recommendation_type === type);
  };

  // Load data on mount
  useEffect(() => {
    loadUserData();
  }, []);

  return {
    recommendations,
    preferences,
    loading,
    error,
    refreshRecommendations,
    dismissRecommendation,
    provideFeedback,
    updatePreferences,
    getTopRecommendations,
    getRecommendationsByType,
    loadUserData
  };
};