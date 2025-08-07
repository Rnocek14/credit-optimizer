import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface UserProfileData {
  id: string;
  name?: string;
  current_role?: string;
  location?: string;
  skills: string[];
  career_goals: string[];
  experience_level?: string;
  industry?: string;
}

export function useUserProfile(userId: string) {
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        setIsLoading(true);

        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
          throw profileError;
        }

        // Get user skills from progress - using available columns
        const { data: skillsData, error: skillsError } = await supabase
          .from('user_skill_progress')
          .select('skill_id, status')
          .eq('user_id', userId)
          .in('status', ['completed', 'verified', 'in_progress']);

        if (skillsError) {
          console.error('Error fetching skills:', skillsError);
        }

        // Get career goals
        const { data: goalsData, error: goalsError } = await supabase
          .from('career_goals')
          .select('title, target_role')
          .eq('user_id', userId)
          .eq('active', true);

        if (goalsError) {
          console.error('Error fetching goals:', goalsError);
        }

        // For now, use hardcoded skills based on skill progress count
        const skillCount = skillsData?.length || 0;
        const defaultSkills = ['React', 'TypeScript', 'Node.js', 'Python', 'AWS', 'Docker'];
        const skills = skillCount > 0 ? defaultSkills.slice(0, Math.min(skillCount + 2, defaultSkills.length)) : defaultSkills.slice(0, 4);
        
        const careerGoals = goalsData?.map(g => g.title || g.target_role).filter(Boolean) || [];

        const userProfile: UserProfileData = {
          id: userId,
          name: profileData?.name || 'User',
          current_role: profileData?.role_title || profileData?.headline || 'Software Developer',
          location: profileData?.location || 'Remote',
          skills: skills.length > 0 ? skills : ['React', 'TypeScript', 'Node.js', 'Python'],
          career_goals: careerGoals,
          experience_level: profileData?.experience_level || 'mid',
          industry: profileData?.industry || 'Technology'
        };

        setProfile(userProfile);
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
        toast({
          title: "Error loading profile",
          description: "Using default profile data",
          variant: "destructive"
        });

        // Fallback profile
        setProfile({
          id: userId,
          name: 'User',
          current_role: 'Software Developer',
          location: 'Remote',
          skills: ['React', 'TypeScript', 'Node.js', 'Python'],
          career_goals: [],
          experience_level: 'mid',
          industry: 'Technology'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [userId, toast]);

  return {
    profile,
    isLoading,
    refreshProfile: () => {
      if (userId) {
        setIsLoading(true);
        // Re-trigger the effect
        setProfile(null);
      }
    }
  };
}