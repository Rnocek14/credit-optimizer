import { useState, useEffect, useCallback } from 'react';
import { useUnifiedData } from '@/contexts/UnifiedDataContext';
import {
  fetchUserPreferences,
  fetchUserActivityCounts,
  upsertUserPreferences,
} from '@/shared/lib/api/userState';

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
        const data = await fetchUserPreferences(state.user.id);

        if (data) {
          const experienceLevel = data.experience_level as ExperienceLevel;
          const userPrefs: UserPreferences = {
            experienceLevel: experienceLevel || 'beginner',
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
      const { skills, courses, goals } = await fetchUserActivityCounts(state.user.id);

      const totalSkills = skills.length;
      const completedCourses = courses.filter((c: any) => c.status === 'completed').length;
      const activeGoals = goals.length;

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
      await upsertUserPreferences(state.user.id, {
        experience_level: newLevel,
        last_active_date: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in updateExperienceLevel:', error);
    }
  }, [state.user]);

  // Mark onboarding as complete
  const completeOnboarding = useCallback(async () => {
    if (!state.user) return;

    try {
      await upsertUserPreferences(state.user.id, {
        has_completed_onboarding: true,
        last_active_date: new Date().toISOString(),
      });
      setPreferences(prev => prev ? { ...prev, hasCompletedOnboarding: true } : null);
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
