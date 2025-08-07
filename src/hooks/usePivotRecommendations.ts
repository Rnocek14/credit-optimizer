import { useQuery } from '@tanstack/react-query';
import { recommendPivotPaths, type PivotPathRequest, type PivotPath } from '@/lib/pivotPaths';
import { useToast } from '@/hooks/use-toast';

interface UsePivotRecommendationsOptions {
  current_career: string;
  user_skills: string[];
  preferred_locations: string[];
  enabled?: boolean;
}

export const usePivotRecommendations = ({
  current_career,
  user_skills,
  preferred_locations,
  enabled = true
}: UsePivotRecommendationsOptions) => {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['pivot-recommendations', current_career, user_skills, preferred_locations],
    queryFn: async (): Promise<PivotPath[]> => {
      try {
        const request: PivotPathRequest = {
          current_career,
          user_skills,
          preferred_locations
        };

        const response = await recommendPivotPaths(request);
        
        if (!response.pivots) {
          throw new Error('Invalid response: missing pivots array');
        }

        return response.pivots;
      } catch (error) {
        console.error('Failed to get pivot recommendations:', error);
        toast({
          title: "Using demo data",
          description: "Pivot recommendations service is temporarily unavailable",
          variant: "default"
        });
        
        // Return mock data as fallback
        return [
          {
            new_career: "Product Manager",
            shared_skills: user_skills.slice(0, 3),
            missing_skills: ["Product Strategy", "Market Research", "Analytics"],
            roi_score: 85,
            estimated_time: "4 months",
            estimated_cost: "$800",
            reasoning: "Your technical background provides a strong foundation for product management. High demand in tech markets."
          },
          {
            new_career: "DevOps Engineer", 
            shared_skills: user_skills.slice(0, 2),
            missing_skills: ["Kubernetes", "CI/CD", "Infrastructure"],
            roi_score: 78,
            estimated_time: "3 months", 
            estimated_cost: "$600",
            reasoning: "Natural progression from development skills. Growing demand for DevOps expertise."
          },
          {
            new_career: "AI/ML Engineer",
            shared_skills: user_skills.filter(s => s.includes('Python')),
            missing_skills: ["Machine Learning", "TensorFlow", "Data Science"],
            roi_score: 92,
            estimated_time: "6 months",
            estimated_cost: "$1200", 
            reasoning: "High-growth field with excellent ROI. Your programming skills are transferable."
          }
        ];
      }
    },
    enabled: enabled && !!current_career && user_skills.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
};