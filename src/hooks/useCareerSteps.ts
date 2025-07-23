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
      
      // Recursive SQL query to calculate step levels based on prerequisites
      const { data, error } = await supabase.rpc('calculate_career_step_levels', {
        career_path_id_param: careerPathId
      });
      
      if (error) {
        console.error('Career steps with levels fetch error:', error);
        // Fallback to basic query without levels
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('career_steps')
          .select('*')
          .eq('career_path_id', careerPathId)
          .order('order_index');
        
        if (fallbackError) {
          throw fallbackError;
        }
        
        // Calculate basic levels based on order_index as fallback
        return (fallbackData || []).map((step, index) => ({
          ...step,
          level: Math.floor(index / 3) // Simple grouping by 3s
        })) as CareerStep[];
      }
      
      console.log('Career steps with levels fetched:', data?.length || 0);
      return (data || []) as CareerStep[];
    },
    enabled: !!careerPathId,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });
};