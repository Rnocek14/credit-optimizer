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

  // Generate demo recommendations based on user profile
  const generateDemoRecommendations = (userId: string): Recommendation[] => {
    const baseRecommendations = {
      'aisha-khan': [
        {
          id: 'demo-1-aisha',
          user_id: userId,
          recommendation_type: 'career_move' as const,
          priority_score: 88,
          confidence_score: 94,
          recommendation_data: {
            title: "Transition to Senior Software Engineer",
            description: "Your strong frontend skills and growing backend experience make you an ideal candidate for senior roles. The market demand is exceptionally high.",
            target_role: "Senior Software Engineer",
            target_industry: "Technology",
            estimated_timeline: "4-6 months",
            skill_gaps: ["System Design", "Cloud Architecture"],
            expected_salary_range: "$120,000 - $160,000",
            growth_potential: "Very High"
          },
          reasoning: 'Your JavaScript expertise and React proficiency align perfectly with current market demands for senior engineers.',
          action_required: 'Study system design patterns and consider AWS certification to strengthen your backend architecture skills.',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'demo-2-aisha',
          user_id: userId,
          recommendation_type: 'skill_development' as const,
          priority_score: 92,
          confidence_score: 96,
          recommendation_data: {
            title: "Master Cloud Architecture & DevOps",
            description: "Adding cloud skills to your profile could increase your market value by 40% and open doors to tech lead positions.",
            target_skills: ["AWS/Azure", "Docker", "Kubernetes", "CI/CD"],
            learning_resources: ["AWS Solutions Architect", "DevOps Bootcamp"],
            estimated_time: "3-4 months",
            market_demand: "Extremely High",
            salary_impact: "40% increase potential"
          },
          reasoning: 'Cloud and DevOps skills are the highest-paid additions for software engineers in 2024.',
          action_required: 'Start with AWS fundamentals and practice containerization with Docker.',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      'jade-chen': [
        {
          id: 'demo-1-jade',
          user_id: userId,
          recommendation_type: 'career_move' as const,
          priority_score: 85,
          confidence_score: 91,
          recommendation_data: {
            title: "Advance to Senior UX Designer",
            description: "Your design thinking approach and user research skills position you perfectly for senior UX roles at top tech companies.",
            target_role: "Senior UX Designer",
            target_industry: "Technology",
            estimated_timeline: "6-8 months",
            skill_gaps: ["Design Systems", "Advanced Prototyping"],
            expected_salary_range: "$95,000 - $130,000",
            growth_potential: "High"
          },
          reasoning: 'The demand for experienced UX designers who understand both user research and visual design is at an all-time high.',
          action_required: 'Build a comprehensive design system project and showcase advanced prototyping skills.',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'demo-2-jade',
          user_id: userId,
          recommendation_type: 'skill_development' as const,
          priority_score: 89,
          confidence_score: 93,
          recommendation_data: {
            title: "Specialize in Design Systems & Research",
            description: "Mastering design systems and advanced user research could increase your market value by 35% and lead to design lead roles.",
            target_skills: ["Design Systems", "Advanced Figma", "User Research", "Data-Driven Design"],
            learning_resources: ["Design Systems Course", "UX Research Certification"],
            estimated_time: "4-5 months",
            market_demand: "Very High",
            salary_impact: "35% increase potential"
          },
          reasoning: 'Companies are investing heavily in design systems and research-driven design processes.',
          action_required: 'Create a comprehensive design system project and obtain UX research certification.',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ],
      'mateo-rodriguez': [
        {
          id: 'demo-1-mateo',
          user_id: userId,
          recommendation_type: 'career_move' as const,
          priority_score: 87,
          confidence_score: 92,
          recommendation_data: {
            title: "Step Up to Senior Product Manager",
            description: "Your analytical mindset and product strategy experience make you a strong candidate for senior PM roles at growth-stage companies.",
            target_role: "Senior Product Manager",
            target_industry: "Technology",
            estimated_timeline: "5-7 months",
            skill_gaps: ["Advanced Analytics", "Growth Metrics"],
            expected_salary_range: "$110,000 - $150,000",
            growth_potential: "Very High"
          },
          reasoning: 'Your combination of technical understanding and business acumen is exactly what companies need in senior product roles.',
          action_required: 'Deepen your analytics skills and build a portfolio showcasing successful product launches.',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 'demo-2-mateo',
          user_id: userId,
          recommendation_type: 'skill_development' as const,
          priority_score: 90,
          confidence_score: 95,
          recommendation_data: {
            title: "Master Data Analytics & Growth Strategy",
            description: "Advanced analytics and growth strategy skills could boost your PM market value by 45% and open doors to VP roles.",
            target_skills: ["Advanced SQL", "Growth Analytics", "A/B Testing", "Product Strategy"],
            learning_resources: ["Advanced Analytics for PMs", "Growth Strategy Certification"],
            estimated_time: "3-4 months",
            market_demand: "Extremely High",
            salary_impact: "45% increase potential"
          },
          reasoning: 'Data-driven product managers with growth expertise are the most sought-after professionals in tech.',
          action_required: 'Complete advanced analytics training and showcase growth wins from previous roles.',
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
    };

    // Default recommendations if user not found
    const defaultRecommendations = [
      {
        id: 'demo-default-1',
        user_id: userId,
        recommendation_type: 'skill_development' as const,
        priority_score: 80,
        confidence_score: 85,
        recommendation_data: {
          title: "Develop In-Demand Tech Skills",
          description: "Focus on high-growth technology skills to advance your career in the current market.",
          target_skills: ["Cloud Computing", "Data Analysis", "AI/ML Basics"],
          learning_resources: ["Online Courses", "Certifications"],
          estimated_time: "3-6 months",
          market_demand: "High",
          salary_impact: "25% increase potential"
        },
        reasoning: 'Technology skills are consistently in high demand across all industries.',
        action_required: 'Choose a technology track that aligns with your career goals and start learning.',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'active' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    return baseRecommendations[userId as keyof typeof baseRecommendations] || defaultRecommendations;
  };

  // Generate demo preferences based on user profile
  const generateDemoPreferences = (userId: string): UserMarketPreferences => {
    const basePreferences = {
      'aisha-khan': {
        preferred_careers: ['Software Engineer', 'Full Stack Developer', 'Frontend Developer'],
        preferred_locations: ['San Francisco', 'New York', 'Seattle'],
        salary_range_min: 80000,
        salary_range_max: 180000,
        alert_enabled: true,
        alert_frequency: 'weekly'
      },
      'jade-chen': {
        preferred_careers: ['UX Designer', 'Product Designer', 'UI Designer'],
        preferred_locations: ['San Francisco', 'Austin', 'Remote'],
        salary_range_min: 70000,
        salary_range_max: 150000,
        alert_enabled: true,
        alert_frequency: 'weekly'
      },
      'mateo-rodriguez': {
        preferred_careers: ['Product Manager', 'Senior Product Manager', 'Product Owner'],
        preferred_locations: ['San Francisco', 'New York', 'Los Angeles'],
        salary_range_min: 90000,
        salary_range_max: 200000,
        alert_enabled: true,
        alert_frequency: 'daily'
      }
    };

    const defaultPreferences = {
      preferred_careers: [],
      preferred_locations: [],
      salary_range_min: 50000,
      salary_range_max: 200000,
      alert_enabled: true,
      alert_frequency: 'weekly'
    };

    return {
      user_id: userId,
      ...(basePreferences[userId as keyof typeof basePreferences] || defaultPreferences)
    };
  };

  // Load user's recommendations and preferences
  const loadUserData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Try to get authenticated user first
      const { data: { user } } = await supabase.auth.getUser();
      let currentUserId: string | null = null;
      let isDemoMode = false;

      if (user) {
        currentUserId = user.id;
      } else {
        // Check for demo user in localStorage
        const devUserStr = localStorage.getItem('devUser');
        if (devUserStr) {
          try {
            const devUser = JSON.parse(devUserStr);
            currentUserId = devUser.user_id || devUser.id;
            isDemoMode = true;
          } catch (e) {
            console.warn('Invalid devUser in localStorage');
          }
        }
      }

      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      if (isDemoMode) {
        // Handle demo mode - use localStorage and generated data
        const demoRecsKey = `demo_personalized_recommendations_${currentUserId}`;
        const demoPrefsKey = `demo_market_preferences_${currentUserId}`;

        // Load or generate recommendations
        let demoRecommendations: Recommendation[];
        const savedRecs = localStorage.getItem(demoRecsKey);
        if (savedRecs) {
          try {
            demoRecommendations = JSON.parse(savedRecs);
          } catch (e) {
            demoRecommendations = generateDemoRecommendations(currentUserId);
            localStorage.setItem(demoRecsKey, JSON.stringify(demoRecommendations));
          }
        } else {
          demoRecommendations = generateDemoRecommendations(currentUserId);
          localStorage.setItem(demoRecsKey, JSON.stringify(demoRecommendations));
        }

        // Load or generate preferences
        let demoPreferences: UserMarketPreferences;
        const savedPrefs = localStorage.getItem(demoPrefsKey);
        if (savedPrefs) {
          try {
            demoPreferences = JSON.parse(savedPrefs);
          } catch (e) {
            demoPreferences = generateDemoPreferences(currentUserId);
            localStorage.setItem(demoPrefsKey, JSON.stringify(demoPreferences));
          }
        } else {
          demoPreferences = generateDemoPreferences(currentUserId);
          localStorage.setItem(demoPrefsKey, JSON.stringify(demoPreferences));
        }

        setRecommendations(demoRecommendations);
        setPreferences(demoPreferences);
      } else {
        // Handle authenticated users - use Supabase
        // For now, create demo recommendations since the table doesn't exist yet
        const demoRecommendations = generateDemoRecommendations('default');

        // Load preferences from existing table
        const { data: prefsData, error: prefsError } = await supabase
          .from('user_market_preferences' as any)
          .select('*')
          .eq('user_id', currentUserId)
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
          setPreferences(generateDemoPreferences(currentUserId));
        }
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
      // Check for authenticated user or demo mode
      const { data: { user } } = await supabase.auth.getUser();
      let currentUserId: string | null = null;
      let isDemoMode = false;

      if (user) {
        currentUserId = user.id;
      } else {
        const devUserStr = localStorage.getItem('devUser');
        if (devUserStr) {
          try {
            const devUser = JSON.parse(devUserStr);
            currentUserId = devUser.user_id || devUser.id;
            isDemoMode = true;
          } catch (e) {
            console.warn('Invalid devUser in localStorage');
          }
        }
      }

      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      console.log('🤖 Generating personalized recommendations...');

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate updated recommendations with slight variations
      let updatedRecommendations: Recommendation[];
      
      if (isDemoMode) {
        // For demo mode, regenerate with variations
        const baseRecs = generateDemoRecommendations(currentUserId);
        updatedRecommendations = baseRecs.map(rec => ({
          ...rec,
          priority_score: Math.min(100, rec.priority_score + Math.floor(Math.random() * 10) - 5),
          confidence_score: Math.min(100, rec.confidence_score + Math.floor(Math.random() * 6) - 3),
          updated_at: new Date().toISOString()
        }));

        // Save to localStorage
        const demoRecsKey = `demo_personalized_recommendations_${currentUserId}`;
        localStorage.setItem(demoRecsKey, JSON.stringify(updatedRecommendations));
      } else {
        // For authenticated users, use existing logic
        updatedRecommendations = recommendations.map(rec => ({
          ...rec,
          priority_score: Math.min(100, rec.priority_score + Math.floor(Math.random() * 10) - 5),
          confidence_score: Math.min(100, rec.confidence_score + Math.floor(Math.random() * 6) - 3),
          updated_at: new Date().toISOString()
        }));
      }

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
      const updatedRecommendations = recommendations.filter(rec => rec.id !== recommendationId);
      setRecommendations(updatedRecommendations);

      // If in demo mode, persist to localStorage
      const devUserStr = localStorage.getItem('devUser');
      if (devUserStr) {
        try {
          const devUser = JSON.parse(devUserStr);
          const currentUserId = devUser.user_id || devUser.id;
          const demoRecsKey = `demo_personalized_recommendations_${currentUserId}`;
          localStorage.setItem(demoRecsKey, JSON.stringify(updatedRecommendations));
        } catch (e) {
          console.warn('Failed to persist dismissed recommendation');
        }
      }

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
        const updatedRecommendations = recommendations.filter(rec => rec.id !== recommendationId);
        setRecommendations(updatedRecommendations);

        // If in demo mode, persist to localStorage
        const devUserStr = localStorage.getItem('devUser');
        if (devUserStr) {
          try {
            const devUser = JSON.parse(devUserStr);
            const currentUserId = devUser.user_id || devUser.id;
            const demoRecsKey = `demo_personalized_recommendations_${currentUserId}`;
            localStorage.setItem(demoRecsKey, JSON.stringify(updatedRecommendations));
          } catch (e) {
            console.warn('Failed to persist feedback update');
          }
        }
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
      // Check for authenticated user or demo mode
      const { data: { user } } = await supabase.auth.getUser();
      let currentUserId: string | null = null;
      let isDemoMode = false;

      if (user) {
        currentUserId = user.id;
      } else {
        const devUserStr = localStorage.getItem('devUser');
        if (devUserStr) {
          try {
            const devUser = JSON.parse(devUserStr);
            currentUserId = devUser.user_id || devUser.id;
            isDemoMode = true;
          } catch (e) {
            console.warn('Invalid devUser in localStorage');
          }
        }
      }

      if (!currentUserId) {
        throw new Error('User not authenticated');
      }

      const updatedPreferences = {
        ...preferences,
        user_id: currentUserId,
        ...newPreferences
      };

      if (isDemoMode) {
        // Handle demo mode - save to localStorage
        const demoPrefsKey = `demo_market_preferences_${currentUserId}`;
        localStorage.setItem(demoPrefsKey, JSON.stringify(updatedPreferences));
        setPreferences(updatedPreferences);
      } else {
        // Handle authenticated users - save to Supabase
        const { data, error } = await supabase
          .from('user_market_preferences' as any)
          .upsert({
            user_id: currentUserId,
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