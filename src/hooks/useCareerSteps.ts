import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CareerStep {
  id: string;
  title: string;
  description?: string;
  order_index?: number;
  prerequisites: string[];
  level: number;
  career_path_id: string;
  is_checkpoint?: boolean;
  is_capstone?: boolean;
  estimated_duration?: string;
  completed?: boolean;
}

export const useCareerSteps = (careerPathId: string | null) => {
  return useQuery({
    queryKey: ['career-steps-with-levels', careerPathId],
    queryFn: async () => {
      if (!careerPathId) return [];
      
      console.log('Fetching career steps with levels for career path:', careerPathId);
      
      // Use direct query for now since function isn't recognized in types
      const { data: stepsData, error } = await supabase
        .from('career_steps')
        .select('*')
        .eq('career_path_id', careerPathId)
        .order('order_index');
      
      if (error) {
        console.error('Career steps fetch error:', error);
        throw error;
      }
      
      // Calculate levels based on prerequisites
      const steps = stepsData || [];
      const stepsWithLevels: CareerStep[] = [];
      const processedIds = new Set<string>();
      
      // Process steps iteratively by dependency levels
      let currentLevel = 0;
      let remainingSteps = [...steps];
      
      while (remainingSteps.length > 0 && currentLevel < 10) {
        const levelSteps = remainingSteps.filter(step => {
          if (!step.prerequisites || step.prerequisites.length === 0) {
            return currentLevel === 0;
          }
          return step.prerequisites.every(prereqId => processedIds.has(prereqId));
        });
        
        if (levelSteps.length === 0) break;
        
        levelSteps.forEach(step => {
          stepsWithLevels.push({
            ...step,
            level: currentLevel
          });
          processedIds.add(step.id);
        });
        
        remainingSteps = remainingSteps.filter(step => !processedIds.has(step.id));
        currentLevel++;
      }
      
      // Add any remaining steps at the highest level
      remainingSteps.forEach(step => {
        stepsWithLevels.push({
          ...step,
          level: currentLevel
        });
      });
      
      console.log('Career steps with levels calculated:', stepsWithLevels.length);
      return stepsWithLevels;
    },
    enabled: !!careerPathId,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });
};