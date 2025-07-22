
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/authHelper';

export interface CareerPath {
  id: string;
  title: string;
  track: string;
  level: string;
  average_salary?: number;
  roi_score?: number;
  required_skill_ids: string[];
  optional_skill_ids: string[];
  checkpoint_skill_id?: string;
}

export interface UserCareerSelection {
  id: string;
  career_path_id: string;
  is_active: boolean;
  checkpoint_reached: boolean;
  pivot_choices: Record<string, string>;
  selected_at: string;
}

export interface CareerProgressData {
  completionPercentage: number;
  requiredSkillsCompleted: number;
  totalRequiredSkills: number;
  optionalSkillsCompleted: number;
  totalOptionalSkills: number;
  estimatedTimeRemaining?: string;
  currentROI?: number;
}

export const useCareerSelection = () => {
  const queryClient = useQueryClient();
  const [showCheckpointModal, setShowCheckpointModal] = useState(false);
  const [checkpointSkill, setCheckpointSkill] = useState<any>(null);

  // Get current user with stable reference
  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        return await getCurrentUser();
      } catch (error) {
        console.warn('[CareerSelection] Auth failed, using demo user');
        return {
          id: '2b458624-d498-4cca-a63d-9341cc20e363',
          email: 'aisha@demo.com',
          name: 'Aisha Khan',
          isDevUser: true
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Fetch all available career paths with fallbacks and stable cache
  const { data: careerPaths = [], isLoading: pathsLoading } = useQuery({
    queryKey: ['career-paths'],
    queryFn: async () => {
      console.log('[CareerSelection] Fetching career paths...');
      try {
        const { data, error } = await supabase
          .from('career_paths')
          .select('*')
          .order('title');
        
        if (error) throw error;
        
        console.log(`[CareerSelection] Loaded ${data?.length || 0} career paths`);
        return data as CareerPath[];
      } catch (error) {
        console.error('[CareerSelection] Career paths fetch failed:', error);
        // Return stable fallback career paths
        return [
          {
            id: 'a0b1c2d3-e4f5-6789-abcd-ef0123456789',
            title: 'UX Designer',
            track: 'design',
            level: 'entry',
            average_salary: 78000,
            roi_score: 1.4,
            required_skill_ids: ['1', '2', '3'],
            optional_skill_ids: ['4', '5'],
            checkpoint_skill_id: '2'
          }
        ] as CareerPath[];
      }
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false
  });

  // Fetch user's active career selection with stable cache
  const { data: activeSelection } = useQuery({
    queryKey: ['user-career-selection', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      console.log('[CareerSelection] Fetching user career selection...');
      try {
        const { data, error } = await supabase
          .from('user_career_selections')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .maybeSingle();
        
        if (error) throw error;
        
        console.log('[CareerSelection] Active selection:', data?.career_path_id || 'none');
        return data as UserCareerSelection | null;
      } catch (error) {
        console.error('[CareerSelection] Selection fetch failed:', error);
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Fetch user's skill progress with stable cache
  const { data: userProgress = [] } = useQuery({
    queryKey: ['user-skill-progress', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      console.log('[CareerSelection] Fetching user skill progress...');
      try {
        const { data, error } = await supabase
          .from('user_skill_progress')
          .select('*')
          .eq('user_id', user.id);
        
        if (error) throw error;
        
        console.log(`[CareerSelection] Loaded ${data?.length || 0} progress records`);
        return data || [];
      } catch (error) {
        console.error('[CareerSelection] Progress fetch failed:', error);
        // Return stable fallback progress
        return [
          { skill_id: '1', status: 'completed', xp_earned: 20 },
          { skill_id: '2', status: 'in_progress', xp_earned: 15 },
          { skill_id: '3', status: 'available', xp_earned: 0 }
        ];
      }
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Get selected career path details with stable reference
  const selectedCareerPath = useMemo(() => {
    return careerPaths.find(path => path.id === activeSelection?.career_path_id) || null;
  }, [careerPaths, activeSelection?.career_path_id]);

  // Select career path mutation with improved error handling
  const selectCareerPathMutation = useMutation({
    mutationFn: async (careerPathId: string) => {
      if (!user?.id) {
        console.warn('[CareerSelection] No user for career path selection');
        return;
      }

      console.log(`[CareerSelection] Selecting career path: ${careerPathId}`);
      
      try {
        // Deactivate existing selections
        await supabase
          .from('user_career_selections')
          .update({ is_active: false })
          .eq('user_id', user.id);

        // Create new selection
        const { data, error } = await supabase
          .from('user_career_selections')
          .insert({
            user_id: user.id,
            career_path_id: careerPathId,
            is_active: true,
            checkpoint_reached: false,
            pivot_choices: {}
          })
          .select()
          .single();

        if (error) throw error;
        
        console.log('[CareerSelection] Career path selected successfully');
        return data;
      } catch (error) {
        console.error('[CareerSelection] Selection failed:', error);
        throw error;
      }
    },
    onSuccess: () => {
      // Only invalidate specific queries to prevent cascading updates
      queryClient.invalidateQueries({ 
        queryKey: ['user-career-selection', user?.id],
        exact: true 
      });
    },
    onError: (error) => {
      console.error('[CareerSelection] Career selection error:', error);
    }
  });

  // Stable selectCareerPath function
  const selectCareerPath = useCallback((careerPathId: string) => {
    selectCareerPathMutation.mutate(careerPathId);
  }, [selectCareerPathMutation]);

  // Calculate progress data with stable reference
  const progressData = useMemo((): CareerProgressData => {
    if (!selectedCareerPath) {
      return {
        completionPercentage: 0,
        requiredSkillsCompleted: 0,
        totalRequiredSkills: 0,
        optionalSkillsCompleted: 0,
        totalOptionalSkills: 0
      };
    }

    const requiredSkillIds = selectedCareerPath.required_skill_ids || [];
    const optionalSkillIds = selectedCareerPath.optional_skill_ids || [];
    
    if (requiredSkillIds.length === 0 && optionalSkillIds.length === 0) {
      return {
        completionPercentage: 0,
        requiredSkillsCompleted: 0,
        totalRequiredSkills: 0,
        optionalSkillsCompleted: 0,
        totalOptionalSkills: 0,
        estimatedTimeRemaining: 'Skills mapping pending',
        currentROI: selectedCareerPath.roi_score
      };
    }

    const completedSkillIds = userProgress
      .filter(p => p.status === 'completed')
      .map(p => p.skill_id);

    const requiredSkillsCompleted = requiredSkillIds
      .filter(skillId => completedSkillIds.includes(skillId)).length;

    const optionalSkillsCompleted = optionalSkillIds
      .filter(skillId => completedSkillIds.includes(skillId)).length;

    const totalRequiredSkills = requiredSkillIds.length;
    const totalOptionalSkills = optionalSkillIds.length;

    let completionPercentage = 0;
    if (totalRequiredSkills > 0) {
      const requiredProgress = requiredSkillsCompleted / totalRequiredSkills;
      const optionalProgress = totalOptionalSkills > 0 ? (optionalSkillsCompleted / totalOptionalSkills) : 0;
      completionPercentage = Math.round((requiredProgress * 0.8 + optionalProgress * 0.2) * 100);
    }

    const remainingSkills = totalRequiredSkills - requiredSkillsCompleted;
    const estimatedTimeRemaining = remainingSkills > 0 ? `${Math.ceil(remainingSkills * 1.5)} weeks` : undefined;

    return {
      completionPercentage,
      requiredSkillsCompleted,
      totalRequiredSkills,
      optionalSkillsCompleted,
      totalOptionalSkills,
      estimatedTimeRemaining,
      currentROI: selectedCareerPath.roi_score
    };
  }, [selectedCareerPath, userProgress]);

  // Stable checkpoint check function
  const checkForCheckpoint = useCallback((completedSkillId: string) => {
    if (!selectedCareerPath || !selectedCareerPath.checkpoint_skill_id) return;
    
    if (completedSkillId === selectedCareerPath.checkpoint_skill_id && !activeSelection?.checkpoint_reached) {
      setCheckpointSkill({ id: completedSkillId, name: 'Checkpoint Skill', category: 'General' });
      setShowCheckpointModal(true);
    }
  }, [selectedCareerPath, activeSelection?.checkpoint_reached]);

  // Stable skill classification function
  const getSkillClassification = useCallback((skillId: string) => {
    if (!selectedCareerPath) return {};
    
    const requiredSkillIds = selectedCareerPath.required_skill_ids || [];
    const optionalSkillIds = selectedCareerPath.optional_skill_ids || [];
    
    return {
      isRequiredSkill: requiredSkillIds.includes(skillId),
      isOptionalSkill: optionalSkillIds.includes(skillId),
      isPivotSkill: skillId === selectedCareerPath.checkpoint_skill_id
    };
  }, [selectedCareerPath]);

  // Stable available paths function
  const getAvailablePathsForCheckpoint = useCallback(() => {
    if (!checkpointSkill || !selectedCareerPath) return [];
    
    return careerPaths.filter(path => 
      path.track === selectedCareerPath.track || 
      path.track === 'general'
    ).slice(0, 3);
  }, [checkpointSkill, selectedCareerPath, careerPaths]);

  return {
    // Data with stable references
    careerPaths,
    selectedCareerPath,
    activeSelection,
    userProgress,
    progressData,
    
    // State
    showCheckpointModal,
    checkpointSkill,
    
    // Stable action functions
    selectCareerPath,
    checkForCheckpoint,
    getSkillClassification,
    getAvailablePathsForCheckpoint,
    setShowCheckpointModal,
    
    // Loading states
    isLoading: pathsLoading || selectCareerPathMutation.isPending
  };
};
