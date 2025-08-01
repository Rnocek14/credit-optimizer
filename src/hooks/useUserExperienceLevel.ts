import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUnifiedData } from '@/contexts/UnifiedDataContext';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced';

interface UserPreferences {
  experienceLevel: ExperienceLevel;
  hasCompletedOnboarding: boolean;
  preferredFeatures: string[];
  lastActiveDate: string;
}

export function useUserExperienceLevel() {
  const { state } = useUnifiedData();
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel>('beginner');
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user preferences from database
  useEffect(() => {
    if (!state.user) {
      setIsLoading(false);
      return;
    }

    const loadUserPreferences = async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', state.user.id)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Error loading user preferences:', error);
          return;
        }

        if (data) {
          const userPrefs: UserPreferences = {
            experienceLevel: data.experience_level || 'beginner',
            hasCompletedOnboarding: data.has_completed_onboarding || false,
            preferredFeatures: data.preferred_features || [],
            lastActiveDate: data.last_active_date || new Date().toISOString()
          };
          
          setPreferences(userPrefs);
          setExperienceLevel(userPrefs.experienceLevel);
        } else {
          // Auto-detect based on user activity
          const detectedLevel = await detectExperienceLevel();
          setExperienceLevel(detectedLevel);
        }
      } catch (error) {
        console.error('Error in loadUserPreferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserPreferences();
  }, [state.user]);

  // Auto-detect experience level based on user activity
  const detectExperienceLevel = async (): Promise<ExperienceLevel> => {
    if (!state.user) return 'beginner';

    try {
      // Check various activity indicators
      const [skillProgress, courseHistory, goalCount] = await Promise.all([
        supabase.from('user_skill_progress').select('*').eq('user_id', state.user.id),
        supabase.from('course_progress').select('*').eq('user_id', state.user.id),
        supabase.from('user_goals').select('*').eq('user_id', state.user.id)
      ]);

      const totalSkills = skillProgress.data?.length || 0;
      const completedCourses = courseHistory.data?.filter(c => c.status === 'completed').length || 0;
      const activeGoals = goalCount.data?.length || 0;

      // Scoring system for experience level
      let score = 0;
      if (totalSkills > 10) score += 2;
      if (totalSkills > 25) score += 2;
      if (completedCourses > 3) score += 2;
      if (completedCourses > 10) score += 2;
      if (activeGoals > 1) score += 1;
      if (activeGoals > 3) score += 1;

      if (score >= 6) return 'advanced';
      if (score >= 3) return 'intermediate';
      return 'beginner';

    } catch (error) {
      console.error('Error detecting experience level:', error);
      return 'beginner';
    }
  };

  // Update experience level
  const updateExperienceLevel = useCallback(async (newLevel: ExperienceLevel) => {
    if (!state.user) return;

    try {
      setExperienceLevel(newLevel);

      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: state.user.id,
          experience_level: newLevel,
          last_active_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating experience level:', error);
      }
    } catch (error) {
      console.error('Error in updateExperienceLevel:', error);
    }
  }, [state.user]);

  // Mark onboarding as complete
  const completeOnboarding = useCallback(async () => {
    if (!state.user) return;

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: state.user.id,
          has_completed_onboarding: true,
          last_active_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error completing onboarding:', error);
      } else {
        setPreferences(prev => prev ? { ...prev, hasCompletedOnboarding: true } : null);
      }
    } catch (error) {
      console.error('Error in completeOnboarding:', error);
    }
  }, [state.user]);

  return {
    experienceLevel,
    preferences,
    isLoading,
    updateExperienceLevel,
    completeOnboarding,
    isNewUser: !preferences?.hasCompletedOnboarding
  };
}