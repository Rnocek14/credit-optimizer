
import { useState, useEffect } from 'react';
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

  // Get current user with fallback
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
    }
  });

  // Fetch all available career paths with fallbacks
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
        // Return fallback career paths with proper UUID
        return [
          {
            id: 'a0b1c2d3-e4f5-6789-abcd-ef0123456789',
            title: 'UX Designer',
            track: 'design',
            level: 'entry',
            average_salary: 78000,
            roi_score: 1.4,
            required_skill_ids: [],
            optional_skill_ids: [],
          }
        ] as CareerPath[];
      }
    }
  });

  // Fetch user's active career selection with fallbacks
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
    enabled: !!user?.id
  });

  // Fetch user's skill progress with fallbacks
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
        return [];
      }
    },
    enabled: !!user?.id
  });

  // Get selected career path details
  const selectedCareerPath = careerPaths.find(path => path.id === activeSelection?.career_path_id);

  // Select career path mutation with error handling
  const selectCareerPath = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ['user-career-selection'] });
    },
    onError: (error) => {
      console.error('[CareerSelection] Career selection error:', error);
    }
  });

  // Calculate progress data with improved error handling
  const calculateProgress = (): CareerProgressData => {
    if (!selectedCareerPath) {
      return {
        completionPercentage: 0,
        requiredSkillsCompleted: 0,
        totalRequiredSkills: 0,
        optionalSkillsCompleted: 0,
        totalOptionalSkills: 0
      };
    }

    // Handle empty or missing skill arrays
    const requiredSkillIds = selectedCareerPath.required_skill_ids || [];
    const optionalSkillIds = selectedCareerPath.optional_skill_ids || [];
    
    if (requiredSkillIds.length === 0 && optionalSkillIds.length === 0) {
      console.log('[CareerSelection] No skills mapped for career path:', selectedCareerPath.title);
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

    // Calculate completion percentage (required skills weighted more heavily)
    let completionPercentage = 0;
    if (totalRequiredSkills > 0) {
      const requiredProgress = requiredSkillsCompleted / totalRequiredSkills;
      const optionalProgress = totalOptionalSkills > 0 ? (optionalSkillsCompleted / totalOptionalSkills) : 0;
      completionPercentage = Math.round((requiredProgress * 0.8 + optionalProgress * 0.2) * 100);
    }

    // Estimate time remaining (mock calculation)
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
  };

  // Check if user has reached a checkpoint
  const checkForCheckpoint = (completedSkillId: string) => {
    if (!selectedCareerPath || !selectedCareerPath.checkpoint_skill_id) return;
    
    if (completedSkillId === selectedCareerPath.checkpoint_skill_id && !activeSelection?.checkpoint_reached) {
      // Show checkpoint modal
      setCheckpointSkill({ id: completedSkillId, name: 'Checkpoint Skill', category: 'General' });
      setShowCheckpointModal(true);
    }
  };

  // Get skill classification for a skill ID with improved fallback
  const getSkillClassification = (skillId: string) => {
    if (!selectedCareerPath) return {};
    
    const requiredSkillIds = selectedCareerPath.required_skill_ids || [];
    const optionalSkillIds = selectedCareerPath.optional_skill_ids || [];
    
    return {
      isRequiredSkill: requiredSkillIds.includes(skillId),
      isOptionalSkill: optionalSkillIds.includes(skillId),
      isPivotSkill: skillId === selectedCareerPath.checkpoint_skill_id
    };
  };

  // Get available career paths for checkpoint modal
  const getAvailablePathsForCheckpoint = () => {
    if (!checkpointSkill || !selectedCareerPath) return [];
    
    // Return paths in the same track or related tracks
    return careerPaths.filter(path => 
      path.track === selectedCareerPath.track || 
      path.track === 'general'
    ).slice(0, 3); // Limit for demo
  };

  return {
    // Data
    careerPaths,
    selectedCareerPath,
    activeSelection,
    userProgress,
    progressData: calculateProgress(),
    
    // State
    showCheckpointModal,
    checkpointSkill,
    
    // Actions
    selectCareerPath: selectCareerPath.mutate,
    checkForCheckpoint,
    getSkillClassification,
    getAvailablePathsForCheckpoint,
    setShowCheckpointModal,
    
    // Loading states
    isLoading: pathsLoading || selectCareerPath.isPending
  };
};
