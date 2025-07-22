
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

  // Mutation to create sample data
  const createSampleData = useMutation({
    mutationFn: async () => {
      if (existingPaths && existingPaths.length > 0) {
        return; // Data already exists
      }

      console.log('Creating sample career paths...');
      
      const { data, error } = await supabase
        .from('career_paths')
        .insert(sampleCareerPaths.map(path => ({
          title: path.title,
          track: path.track,
          level: path.level,
          average_salary: path.average_salary,
          roi_score: path.roi_score,
          summary: path.description,
          key_skills: path.required_skills,
          required_skill_ids: '{}', // Empty array for now
          optional_skill_ids: '{}', // Empty array for now
        })));

      if (error) {
        console.error('Error creating sample data:', error);
        throw error;
      }

      console.log('Sample career paths created successfully');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['career-paths'] });
    }
  });

  // Auto-create sample data if none exists
  useEffect(() => {
    if (!isLoading && existingPaths && existingPaths.length === 0) {
      createSampleData.mutate();
    }
  }, [isLoading, existingPaths, createSampleData]);

  return {
    isCreating: createSampleData.isPending,
    error: createSampleData.error
  };
};
