
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sampleCareerPaths } from '@/data/sampleCareerPaths';

export const useSampleCareerData = () => {
  const queryClient = useQueryClient();

  // Check if career paths exist
  const { data: existingPaths, isLoading: pathsLoading } = useQuery({
    queryKey: ['career-paths-check'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('career_paths')
        .select('id, title, required_skill_ids, optional_skill_ids')
        .limit(10);
      
      if (error) {
        console.warn('Career paths check error:', error);
        return [];
      }
      return data || [];
    }
  });

  // Fetch skills for mapping skill names to IDs
  const { data: skills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['skills-for-mapping'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('id, name, category');
      
      if (error) {
        console.warn('Skills fetch error for mapping:', error);
        return [];
      }
      console.log(`[SampleCareerData] Loaded ${data?.length || 0} skills for mapping`);
      return data || [];
    }
  });

  // Function to map skill names to IDs with improved matching
  const mapSkillNamesToIds = (skillNames: string[]) => {
    if (!skills.length) return [];
    
    const mappedIds = skillNames
      .map(skillName => {
        // Try exact match first (case insensitive)
        let skill = skills.find(s => 
          s.name.toLowerCase() === skillName.toLowerCase()
        );
        
        // If no exact match, try partial match
        if (!skill) {
          skill = skills.find(s => 
            s.name.toLowerCase().includes(skillName.toLowerCase()) ||
            skillName.toLowerCase().includes(s.name.toLowerCase())
          );
        }
        
        // Try category-based matching as fallback
        if (!skill && skillName.toLowerCase().includes('design')) {
          skill = skills.find(s => s.category?.toLowerCase().includes('design'));
        }
        
        if (skill) {
          console.log(`[SkillMapping] Mapped "${skillName}" -> "${skill.name}" (${skill.id})`);
        } else {
          console.warn(`[SkillMapping] Could not map skill: "${skillName}"`);
        }
        
        return skill?.id;
      })
      .filter(Boolean) as string[];
    
    console.log(`[SkillMapping] Mapped ${mappedIds.length}/${skillNames.length} skills`);
    return mappedIds;
  };

  // Check if existing paths need skill mapping updates
  const needsSkillMapping = existingPaths?.some(path => 
    !path.required_skill_ids?.length && !path.optional_skill_ids?.length
  );

  // Mutation to create or update career paths with skill mappings
  const createOrUpdateSampleData = useMutation({
    mutationFn: async () => {
      if (!skills.length) {
        throw new Error('Skills not loaded yet');
      }

      const hasExistingPaths = existingPaths && existingPaths.length > 0;
      
      if (hasExistingPaths && !needsSkillMapping) {
        console.log('[SampleCareerData] Career paths already exist with skill mappings, skipping');
        return;
      }

      console.log(`[SampleCareerData] ${hasExistingPaths ? 'Updating' : 'Creating'} career paths with skill mappings...`);
      
      const careerPathsWithSkillIds = sampleCareerPaths.map(path => {
        const requiredSkillIds = mapSkillNamesToIds(path.required_skills);
        const optionalSkillIds = mapSkillNamesToIds(path.required_skills.slice(3, 6)); // Take some as optional
        const checkpointSkillId = requiredSkillIds[Math.floor(requiredSkillIds.length / 2)] || null;
        
        console.log(`[SampleCareerData] Processing ${path.title}:`, {
          original_skills: path.required_skills,
          mapped_required: requiredSkillIds.length,
          mapped_optional: optionalSkillIds.length,
          has_checkpoint: !!checkpointSkillId
        });

        return {
          title: path.title,
          track: path.track,
          level: path.level,
          average_salary: path.average_salary,
          roi_score: path.roi_score,
          summary: path.description,
          key_skills: path.required_skills,
          required_skill_ids: requiredSkillIds,
          optional_skill_ids: optionalSkillIds,
          checkpoint_skill_id: checkpointSkillId,
        };
      });

      if (hasExistingPaths && needsSkillMapping) {
        // Update existing paths with skill mappings
        console.log('[SampleCareerData] Updating existing career paths with skill mappings');
        
        for (const newPath of careerPathsWithSkillIds) {
          const existingPath = existingPaths.find(p => p.title === newPath.title);
          if (existingPath) {
            const { error } = await supabase
              .from('career_paths')
              .update({
                required_skill_ids: newPath.required_skill_ids,
                optional_skill_ids: newPath.optional_skill_ids,
                checkpoint_skill_id: newPath.checkpoint_skill_id
              })
              .eq('id', existingPath.id);
            
            if (error) {
              console.error(`Error updating ${newPath.title}:`, error);
            } else {
              console.log(`[SampleCareerData] Updated ${newPath.title} with skill mappings`);
            }
          }
        }
      } else {
        // Create new career paths
        const { data, error } = await supabase
          .from('career_paths')
          .insert(careerPathsWithSkillIds);

        if (error) {
          console.error('Error creating sample career data:', error);
          throw error;
        }
        
        console.log('[SampleCareerData] Created sample career paths successfully');
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-paths'] });
      queryClient.invalidateQueries({ queryKey: ['career-paths-check'] });
      console.log('[SampleCareerData] Career paths updated successfully');
    },
    onError: (error) => {
      console.error('Failed to create/update sample career data:', error);
    }
  });

  // Auto-trigger creation/update when conditions are met
  useEffect(() => {
    // Prevent infinite loops by checking if mutation has already succeeded
    if (createOrUpdateSampleData.isSuccess) {
      return;
    }

    const shouldTrigger = !pathsLoading && 
                         !skillsLoading && 
                         skills.length > 0 && 
                         !createOrUpdateSampleData.isPending &&
                         !createOrUpdateSampleData.isError &&
                         (
                           (existingPaths && existingPaths.length === 0) || 
                           (needsSkillMapping && existingPaths && existingPaths.length > 0)
                         );

    if (shouldTrigger) {
      console.log('[SampleCareerData] Triggering career data creation/update...');
      createOrUpdateSampleData.mutate();
    }
  }, [pathsLoading, skillsLoading, existingPaths?.length, needsSkillMapping, skills.length, createOrUpdateSampleData.isSuccess]);

  return {
    isCreating: createOrUpdateSampleData.isPending || pathsLoading,
    error: createOrUpdateSampleData.error,
    skillsLoaded: skills.length > 0,
    pathsExist: (existingPaths?.length || 0) > 0,
    needsMapping: needsSkillMapping
  };
};
