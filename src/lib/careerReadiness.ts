/**
 * Career Readiness Index (CRI) calculation and scoring logic
 * Based on the research specifications for user progress tracking
 */

import { supabase } from '@/integrations/supabase/client';

export interface CRIScore {
  overall: number;
  skillsScore: number;
  stepsScore: number;
  experienceScore: number;
  breakdown: {
    completedSkills: number;
    totalSkills: number;
    completedSteps: number;
    totalSteps: number;
    yearsExperience: number;
  };
}

export interface UserProgress {
  skillId: string;
  stepId?: string;
  status: 'locked' | 'available' | 'in_progress' | 'completed';
  completedAt?: Date;
  criScore?: number;
}

/**
 * Calculate Career Readiness Index for a user towards a specific job/goal
 */
export const calculateCRI = async (
  userId: string,
  targetJobId?: string,
  targetStepId?: string
): Promise<CRIScore> => {
  try {
    // Get user's skill progress
    const { data: userSkills, error: skillsError } = await supabase
      .from('user_skill_progress')
      .select('skill_id, status, cri_score')
      .eq('user_id', userId);

    if (skillsError) throw skillsError;

    // Get user's step progress
    const { data: userSteps, error: stepsError } = await supabase
      .from('user_step_progress')
      .select('step_id, status, completed_at')
      .eq('user_id', userId);

    if (stepsError) throw stepsError;

    // Get user profile for experience
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('years_experience')
      .eq('user_id', userId)
      .single();

    if (profileError) throw profileError;

    let requiredSkills: any[] = [];
    let requiredSteps: any[] = [];

    if (targetJobId) {
      // Get required skills for target job
      const { data: jobSkills } = await supabase
        .from('career_paths')
        .select(`
          required_skill_ids,
          optional_skill_ids,
          career_steps!inner(id)
        `)
        .eq('id', targetJobId)
        .single();

      if (jobSkills) {
        requiredSkills = jobSkills.required_skill_ids || [];
        requiredSteps = jobSkills.career_steps || [];
      }
    } else if (targetStepId) {
      // Get required skills for target step
      const { data: stepSkills } = await supabase
        .from('career_step_skills')
        .select('skill_id, importance_score')
        .eq('step_id', targetStepId);

      requiredSkills = stepSkills?.map(s => s.skill_id) || [];
    }

    // Calculate scores
    const completedSkills = userSkills?.filter(s => s.status === 'completed').length || 0;
    const relevantCompletedSkills = userSkills?.filter(s => 
      s.status === 'completed' && requiredSkills.includes(s.skill_id)
    ).length || 0;

    const completedSteps = userSteps?.filter(s => s.status === 'completed').length || 0;
    const relevantCompletedSteps = userSteps?.filter(s => 
      s.status === 'completed' && requiredSteps.some(rs => rs.id === s.step_id)
    ).length || 0;

    const yearsExperience = profile?.years_experience || 0;

    // Calculate weighted scores
    const skillsScore = requiredSkills.length > 0 
      ? (relevantCompletedSkills / requiredSkills.length) * 100 
      : completedSkills * 10; // Fallback scoring

    const stepsScore = requiredSteps.length > 0 
      ? (relevantCompletedSteps / requiredSteps.length) * 100 
      : completedSteps * 10; // Fallback scoring

    const experienceScore = Math.min(yearsExperience * 10, 50); // Cap at 50 points

    // Weighted overall score: 50% skills, 30% steps, 20% experience
    const overall = Math.min(
      (skillsScore * 0.5) + (stepsScore * 0.3) + (experienceScore * 0.2),
      100
    );

    return {
      overall: Math.round(overall),
      skillsScore: Math.round(skillsScore),
      stepsScore: Math.round(stepsScore),
      experienceScore: Math.round(experienceScore),
      breakdown: {
        completedSkills: relevantCompletedSkills || completedSkills,
        totalSkills: requiredSkills.length || completedSkills,
        completedSteps: relevantCompletedSteps || completedSteps,
        totalSteps: requiredSteps.length || completedSteps,
        yearsExperience
      }
    };

  } catch (error) {
    console.error('Error calculating CRI:', error);
    return {
      overall: 0,
      skillsScore: 0,
      stepsScore: 0,
      experienceScore: 0,
      breakdown: {
        completedSkills: 0,
        totalSkills: 0,
        completedSteps: 0,
        totalSteps: 0,
        yearsExperience: 0
      }
    };
  }
};

/**
 * Get user's progress for all skills and steps
 */
export const getUserProgress = async (userId: string): Promise<UserProgress[]> => {
  try {
    const [skillsResult, stepsResult] = await Promise.all([
      supabase
        .from('user_skill_progress')
        .select('skill_id, status, verification_date, cri_score')
        .eq('user_id', userId),
      supabase
        .from('user_step_progress')
        .select('step_id, status, completed_at')
        .eq('user_id', userId)
    ]);

    const progress: UserProgress[] = [];

    // Add skill progress
    skillsResult.data?.forEach(skill => {
      progress.push({
        skillId: skill.skill_id,
        status: skill.status as any,
        completedAt: skill.verification_date ? new Date(skill.verification_date) : undefined,
        criScore: skill.cri_score || undefined
      });
    });

    // Add step progress
    stepsResult.data?.forEach(step => {
      progress.push({
        skillId: '', // Steps don't have skill IDs directly
        stepId: step.step_id,
        status: step.status as any,
        completedAt: step.completed_at ? new Date(step.completed_at) : undefined
      });
    });

    return progress;
  } catch (error) {
    console.error('Error fetching user progress:', error);
    return [];
  }
};

/**
 * Update user progress for a skill or step
 */
export const updateUserProgress = async (
  userId: string,
  itemId: string,
  itemType: 'skill' | 'step',
  status: 'locked' | 'available' | 'in_progress' | 'completed',
  criScore?: number
): Promise<boolean> => {
  try {
    if (itemType === 'skill') {
      const { error } = await supabase
        .from('user_skill_progress')
        .upsert({
          user_id: userId,
          skill_id: itemId,
          status,
          cri_score: criScore,
          verification_date: status === 'completed' ? new Date().toISOString() : null
        });
      
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('user_step_progress')
        .upsert({
          user_id: userId,
          step_id: itemId,
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        });
      
      if (error) throw error;
    }

    return true;
  } catch (error) {
    console.error('Error updating user progress:', error);
    return false;
  }
};

/**
 * Determine if a node is unlocked based on prerequisites and user progress
 */
export const isNodeUnlocked = (
  nodeId: string,
  nodeType: 'skill' | 'step' | 'job',
  prerequisites: string[],
  userProgress: UserProgress[]
): boolean => {
  if (!prerequisites || prerequisites.length === 0) {
    return true; // No prerequisites means it's unlocked
  }

  // Check if all prerequisites are completed
  return prerequisites.every(prereqId => {
    return userProgress.some(p => 
      (p.skillId === prereqId || p.stepId === prereqId) && 
      p.status === 'completed'
    );
  });
};