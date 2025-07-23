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
      
      console.log('🔍 Fetching career steps for career path:', careerPathId);
      
      // First get all career steps for this path
      const { data: stepsData, error } = await supabase
        .from('career_steps')
        .select('id, title, prerequisites, step_order, is_terminal, estimated_time, career_path_id, description')
        .eq('career_path_id', careerPathId)
        .order('step_order', { ascending: true });
      
      if (error) {
        console.error('Career steps fetch error:', error);
        throw error;
      }
      
      if (!stepsData || stepsData.length === 0) {
        console.log('No career steps found for this path');
        return [];
      }
      
      // Calculate levels based on prerequisite chains
      const calculateLevels = (steps: any[]) => {
        const stepMap = new Map(steps.map(step => [step.id, step]));
        const levelMap = new Map<string, number>();
        
        const calculateLevel = (stepId: string, visited = new Set<string>()): number => {
          if (levelMap.has(stepId)) return levelMap.get(stepId)!;
          if (visited.has(stepId)) return 0; // Circular dependency protection
          
          visited.add(stepId);
          const step = stepMap.get(stepId);
          
          if (!step || !step.prerequisites || step.prerequisites.length === 0) {
            levelMap.set(stepId, 0);
            return 0;
          }
          
          const maxPrereqLevel = Math.max(
            ...step.prerequisites.map((prereqId: string) => calculateLevel(prereqId, visited))
          );
          
          const level = maxPrereqLevel + 1;
          levelMap.set(stepId, level);
          return level;
        };
        
        // Calculate levels for all steps
        steps.forEach(step => calculateLevel(step.id));
        
        return steps.map(step => ({
          ...step,
          level: levelMap.get(step.id) || 0
        }));
      };
      
      const stepsWithLevels = calculateLevels(stepsData);
      
      // Map to our CareerStep interface
      const careerSteps: CareerStep[] = stepsWithLevels.map(step => ({
        id: String(step.id).trim(),
        title: step.title,
        description: step.description,
        prerequisites: step.prerequisites || [],
        level: step.level,
        career_path_id: step.career_path_id,
        order_index: step.step_order,
        is_terminal: step.is_terminal,
        estimated_duration: step.estimated_time,
        completed: false // This would need to come from user progress if needed
      }));
      
      console.log('📚 Career steps fetched successfully:', careerSteps.length, 'steps');
      console.log('→ Terminal steps:', careerSteps.filter(s => s.is_terminal).map(s => s.title));
      console.log('→ Level distribution:', careerSteps.reduce((acc, s) => ({ ...acc, [`Level ${s.level}`]: (acc[`Level ${s.level}`] || 0) + 1 }), {}));
      
      return careerSteps;
    },
    enabled: !!careerPathId,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  });
};