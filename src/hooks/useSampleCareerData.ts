
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { sampleCareerPaths } from '@/data/sampleCareerPaths';

export const useSampleCareerData = () => {
  const queryClient = useQueryClient();

  // Check if career paths exist
  const { data: existingPaths, isLoading } = useQuery({
    queryKey: ['career-paths-check'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('career_paths')
        .select('id')
        .limit(1);
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch skills for mapping skill names to IDs
  const { data: skills = [] } = useQuery({
    queryKey: ['skills-for-mapping'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('skills')
        .select('id, name, category');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Function to map skill names to IDs
  const mapSkillNamesToIds = (skillNames: string[]) => {
    return skillNames
      .map(skillName => {
        // Try exact match first
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
        
        return skill?.id;
      })
      .filter(Boolean) as string[];
  };

  // Mutation to create sample data with skill mappings
  const createSampleData = useMutation({
    mutationFn: async () => {
      if (existingPaths && existingPaths.length > 0) {
        console.log('Career paths already exist, skipping creation');
        return; // Data already exists
      }

      if (skills.length === 0) {
        console.log('No skills available yet, will retry...');
        throw new Error('Skills not loaded yet');
      }

      console.log('Creating sample career paths with skill mappings...');
      
      const careerPathsWithSkillIds = sampleCareerPaths.map(path => {
        const requiredSkillIds = mapSkillNamesToIds(path.required_skills);
        const optionalSkillIds = mapSkillNamesToIds(path.required_skills.slice(4, 7)); // Take some as optional
        const checkpointSkillId = requiredSkillIds[Math.floor(requiredSkillIds.length / 2)] || null;
        
        console.log(`Mapping skills for ${path.title}:`, {
          required_skills: path.required_skills,
          mapped_required: requiredSkillIds,
          mapped_optional: optionalSkillIds,
          checkpoint: checkpointSkillId
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

      const { data, error } = await supabase
        .from('career_paths')
        .insert(careerPathsWithSkillIds);

      if (error) {
        console.error('Error creating sample data:', error);
        throw error;
      }

      console.log('Sample career paths created successfully with skill mappings');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-paths'] });
      queryClient.invalidateQueries({ queryKey: ['career-paths-check'] });
    },
    onError: (error) => {
      console.error('Failed to create sample career data:', error);
    }
  });

  // Auto-create sample data if none exists and skills are loaded
  useEffect(() => {
    if (!isLoading && existingPaths && existingPaths.length === 0 && skills.length > 0) {
      console.log('Triggering sample data creation...');
      createSampleData.mutate();
    }
  }, [isLoading, existingPaths, skills.length, createSampleData]);

  return {
    isCreating: createSampleData.isPending,
    error: createSampleData.error,
    skillsLoaded: skills.length > 0
  };
};
