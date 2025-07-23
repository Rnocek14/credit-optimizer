import { useQuery } from '@tanstack/react-query';
import { recommendPivotPaths, type PivotPathRequest, type PivotPath } from '@/lib/pivotPaths';

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
  return useQuery({
    queryKey: ['pivot-recommendations', current_career, user_skills, preferred_locations],
    queryFn: async (): Promise<PivotPath[]> => {
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
    },
    enabled: enabled && !!current_career && user_skills.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });
};