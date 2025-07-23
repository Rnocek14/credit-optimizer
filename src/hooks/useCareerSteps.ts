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
  is_terminal?: boolean;
  estimated_duration?: string;
  completed?: boolean;
}

export const useCareerSteps = (careerPathId: string | null) => {
  return useQuery({
    queryKey: ['career-steps-with-levels', careerPathId],
    queryFn: async () => {
      if (!careerPathId) return [];
      
      console.log('🔍 Fetching career steps with levels for career path:', careerPathId);
      
      // Query the new career_steps_with_levels view
      const { data: stepsData, error } = await supabase
        .from('career_steps_with_levels')
        .select('id, title, prerequisites, level, step_order, is_terminal, estimated_time, career_path_id')
        .eq('career_path_id', careerPathId)
        .order('level', { ascending: true });
      
      if (error) {
        console.error('Career steps fetch error:', error);
        throw error;
      }
      
      // Map the view data to our CareerStep interface
      const stepsWithLevels: CareerStep[] = (stepsData || []).map(step => ({
        id: step.id,
        title: step.title,
        prerequisites: step.prerequisites || [],
        level: step.level,
        career_path_id: step.career_path_id,
        order_index: step.step_order,
        is_capstone: step.is_terminal,
        is_terminal: step.is_terminal,
        estimated_duration: step.estimated_time,
        completed: false // This would need to come from user progress if needed
      }));
      
      console.log('📚 Career steps fetched successfully:', stepsWithLevels.length, 'steps');
      console.log('→ Sample data:', stepsWithLevels.slice(0, 3).map(s => ({ 
        id: s.id, 
        title: s.title, 
        level: s.level, 
        is_terminal: s.is_terminal 
      })));
      return stepsWithLevels;
    },
    enabled: !!careerPathId,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });
};