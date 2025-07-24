/**
 * Hook for managing Career Readiness Index (CRI) and user progress
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { calculateCRI, getUserProgress, updateUserProgress, type CRIScore, type UserProgress } from '@/lib/careerReadiness';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UseCareerReadinessOptions {
  userId?: string;
  targetJobId?: string;
  targetStepId?: string;
  enabled?: boolean;
}

export const useCareerReadiness = ({
  userId,
  targetJobId,
  targetStepId,
  enabled = true
}: UseCareerReadinessOptions) => {
  const queryClient = useQueryClient();

  // Get CRI score
  const { data: criScore, isLoading: criLoading, error: criError } = useQuery({
    queryKey: ['cri-score', userId, targetJobId, targetStepId],
    queryFn: () => calculateCRI(userId!, targetJobId, targetStepId),
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Get user progress
  const { data: userProgress, isLoading: progressLoading, error: progressError } = useQuery({
    queryKey: ['user-progress', userId],
    queryFn: () => getUserProgress(userId!),
    enabled: enabled && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async (params: {
      itemId: string;
      itemType: 'skill' | 'step';
      status: 'locked' | 'available' | 'in_progress' | 'completed';
      criScore?: number;
    }) => {
      if (!userId) throw new Error('User ID is required');
      return updateUserProgress(userId, params.itemId, params.itemType, params.status, params.criScore);
    },
    onSuccess: (success, variables) => {
      if (success) {
        // Invalidate and refetch related queries
        queryClient.invalidateQueries({ queryKey: ['user-progress', userId] });
        queryClient.invalidateQueries({ queryKey: ['cri-score', userId] });
        
        toast.success(
          variables.status === 'completed' 
            ? `Marked ${variables.itemType} as completed!` 
            : `Updated ${variables.itemType} progress`
        );
      } else {
        toast.error('Failed to update progress');
      }
    },
    onError: (error) => {
      console.error('Error updating progress:', error);
      toast.error('Failed to update progress');
    }
  });

  // Helper functions
  const markCompleted = useCallback((itemId: string, itemType: 'skill' | 'step', criScore?: number) => {
    updateProgressMutation.mutate({
      itemId,
      itemType,
      status: 'completed',
      criScore
    });
  }, [updateProgressMutation]);

  const markInProgress = useCallback((itemId: string, itemType: 'skill' | 'step') => {
    updateProgressMutation.mutate({
      itemId,
      itemType,
      status: 'in_progress'
    });
  }, [updateProgressMutation]);

  const isCompleted = useCallback((itemId: string, itemType: 'skill' | 'step'): boolean => {
    if (!userProgress) return false;
    
    return userProgress.some(p => 
      (itemType === 'skill' ? p.skillId === itemId : p.stepId === itemId) &&
      p.status === 'completed'
    );
  }, [userProgress]);

  const isInProgress = useCallback((itemId: string, itemType: 'skill' | 'step'): boolean => {
    if (!userProgress) return false;
    
    return userProgress.some(p => 
      (itemType === 'skill' ? p.skillId === itemId : p.stepId === itemId) &&
      p.status === 'in_progress'
    );
  }, [userProgress]);

  const getProgressStatus = useCallback((itemId: string, itemType: 'skill' | 'step'): 'locked' | 'available' | 'in_progress' | 'completed' => {
    if (!userProgress) return 'locked';
    
    const progress = userProgress.find(p => 
      itemType === 'skill' ? p.skillId === itemId : p.stepId === itemId
    );
    
    return progress?.status || 'locked';
  }, [userProgress]);

  // Get readiness level description
  const getReadinessLevel = useCallback((score: number): { level: string, color: string, description: string } => {
    if (score >= 80) return {
      level: 'Ready',
      color: 'text-green-600',
      description: 'You\'re well-prepared for this role!'
    };
    if (score >= 60) return {
      level: 'Nearly Ready',
      color: 'text-yellow-600',
      description: 'You\'re on track, just a few more skills needed.'
    };
    if (score >= 40) return {
      level: 'In Progress',
      color: 'text-blue-600',
      description: 'You\'re making good progress towards this goal.'
    };
    if (score >= 20) return {
      level: 'Getting Started',
      color: 'text-orange-600',
      description: 'You\'ve started the journey, keep building skills.'
    };
    return {
      level: 'Just Beginning',
      color: 'text-gray-600',
      description: 'This is a new path for you, but every expert was once a beginner.'
    };
  }, []);

  return {
    // Data
    criScore,
    userProgress,
    
    // Loading states
    isLoading: criLoading || progressLoading,
    isCriLoading: criLoading,
    isProgressLoading: progressLoading,
    isUpdating: updateProgressMutation.isPending,
    
    // Errors
    error: criError || progressError,
    criError,
    progressError,
    
    // Actions
    markCompleted,
    markInProgress,
    updateProgress: updateProgressMutation.mutate,
    
    // Helpers
    isCompleted,
    isInProgress,
    getProgressStatus,
    getReadinessLevel
  };
};

/**
 * Hook for tracking progress on a specific career path
 */
export const useCareerPathProgress = (careerPathId: string, userId?: string) => {
  const { data: pathSteps } = useQuery({
    queryKey: ['career-path-steps', careerPathId],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('calculate_career_step_levels', { career_path_id_param: careerPathId });
      
      if (error) throw error;
      return data;
    },
    enabled: !!careerPathId
  });

  const { userProgress, isLoading, markCompleted, markInProgress, isCompleted, isInProgress } = useCareerReadiness({
    userId,
    targetJobId: careerPathId,
    enabled: !!userId
  });

  // Calculate path completion percentage
  const completionPercentage = useMemo(() => {
    if (!pathSteps || !userProgress) return 0;
    
    const completedSteps = pathSteps.filter((step: any) => 
      isCompleted(step.id, 'step')
    ).length;
    
    return pathSteps.length > 0 ? (completedSteps / pathSteps.length) * 100 : 0;
  }, [pathSteps, userProgress, isCompleted]);

  // Get next recommended step
  const nextStep = useMemo(() => {
    if (!pathSteps || !userProgress) return null;
    
    // Find the first uncompleted step where prerequisites are met
    return pathSteps.find((step: any) => {
      if (isCompleted(step.id, 'step')) return false;
      
      // Check if prerequisites are completed
      const prereqsMet = (step.prerequisites || []).every((prereqId: string) =>
        pathSteps.some((prereqStep: any) => 
          prereqStep.id === prereqId && isCompleted(prereqStep.id, 'step')
        )
      );
      
      return prereqsMet;
    });
  }, [pathSteps, userProgress, isCompleted]);

  return {
    pathSteps,
    userProgress,
    isLoading,
    completionPercentage: Math.round(completionPercentage),
    nextStep,
    markCompleted,
    markInProgress,
    isCompleted,
    isInProgress
  };
};

// Re-export for convenience
export type { CRIScore, UserProgress };