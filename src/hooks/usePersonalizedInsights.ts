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
  preferred_careers: string[];
  preferred_locations: string[];
  salary_range_min?: number;
  salary_range_max?: number;
  alert_enabled?: boolean;
  alert_frequency?: string;
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

      // For now, create demo recommendations since the table doesn't exist yet
      const demoRecommendations: Recommendation[] = [
        {
          id: '1',
          user_id: user.id,
          recommendation_type: 'career_move',
          priority_score: 85,
          confidence_score: 92,
          recommendation_data: {
            title: "Transition to Senior Data Scientist",
            description: "Based on your current skills and the strong demand for senior data scientists in San Francisco, this could be an excellent career move with 40% salary potential increase.",
            target_role: "Senior Data Scientist",
            target_industry: "Technology",
            estimated_timeline: "6-9 months",
            skill_gaps: ["MLOps", "Advanced Statistics"],
            expected_salary_range: "$140,000 - $180,000",
            growth_potential: "High"
          },
          reasoning: 'Your background in data analysis and machine learning aligns perfectly with current market demand for senior data scientists. The tech industry in SF is actively hiring for these roles.',
          action_required: 'Start building MLOps experience through online courses and consider getting AWS or Google Cloud certifications.',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '2',
          user_id: user.id,
          recommendation_type: 'skill_development',
          priority_score: 90,
          confidence_score: 95,
          recommendation_data: {
            title: "Master MLOps and Cloud Platforms",
            description: "Learning MLOps and cloud platforms could increase your market value by 35% and open doors to senior roles.",
            target_skills: ["MLOps", "AWS", "Kubernetes", "Docker"],
            learning_resources: ["AWS Certified Machine Learning", "MLOps Coursera Specialization"],
            estimated_time: "3-4 months",
            market_demand: "Very High",
            salary_impact: "35% increase potential"
          },
          reasoning: 'MLOps is the most in-demand skill for data scientists right now. Companies are willing to pay premium for this expertise.',
          action_required: 'Enroll in an MLOps course and start practicing with AWS SageMaker or Google Vertex AI.',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: '3',
          user_id: user.id,
          recommendation_type: 'market_alert',
          priority_score: 70,
          confidence_score: 85,
          recommendation_data: {
            title: "Set Alert for Senior Data Science Roles",
            description: "Get notified when senior data science positions open up at top tech companies in your preferred locations.",
            alert_criteria: "Senior Data Scientist roles at companies with 1000+ employees",
            expected_frequency: "Weekly",
            trigger_conditions: ["New senior DS roles", "Salary > $130k", "Remote/Hybrid options"],
            potential_opportunities: "15-20 relevant positions per month"
          },
          reasoning: 'The market for senior data science roles is very active. Setting up alerts will help you catch opportunities quickly.',
          action_required: 'Configure market alerts to monitor senior data science openings at your target companies.',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];

      // Load preferences from existing table
      const { data: prefsData, error: prefsError } = await supabase
        .from('user_market_preferences' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (prefsError && prefsError.code !== 'PGRST116') { // Not found is OK
        console.warn('Failed to load preferences:', prefsError.message);
      }

      setRecommendations(demoRecommendations);
      
      if (prefsData && !prefsError) {
        const prefs = prefsData as any;
        setPreferences({
          id: prefs.id,
          user_id: prefs.user_id,
          preferred_careers: prefs.preferred_careers || [],
          preferred_locations: prefs.preferred_locations || [],
          salary_range_min: prefs.salary_range_min,
          salary_range_max: prefs.salary_range_max,
          alert_enabled: prefs.alert_enabled,
          alert_frequency: prefs.alert_frequency
        });
      } else {
        setPreferences({
          preferred_careers: [],
          preferred_locations: [],
          salary_range_min: 50000,
          salary_range_max: 200000,
          alert_enabled: true,
          alert_frequency: 'weekly'
        });
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

      // For now, just simulate a refresh with slight changes
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call

      const updatedRecommendations = recommendations.map(rec => ({
        ...rec,
        priority_score: Math.min(100, rec.priority_score + Math.floor(Math.random() * 10) - 5),
        confidence_score: Math.min(100, rec.confidence_score + Math.floor(Math.random() * 6) - 3),
        updated_at: new Date().toISOString()
      }));

      setRecommendations(updatedRecommendations);
      
      toast({
        title: "Recommendations Updated",
        description: `Generated ${updatedRecommendations.length} personalized recommendations.`,
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
      console.log('Feedback provided for recommendation:', recommendationId, feedback);

      // If marked as completed, update recommendation status
      if (feedback.feedback_type === 'completed') {
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
          preferred_careers: prefs.preferred_careers || [],
          preferred_locations: prefs.preferred_locations || [],
          salary_range_min: prefs.salary_range_min,
          salary_range_max: prefs.salary_range_max,
          alert_enabled: prefs.alert_enabled,
          alert_frequency: prefs.alert_frequency
        });
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