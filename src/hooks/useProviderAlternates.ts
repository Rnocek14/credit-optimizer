import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QUERY_KEYS } from '@/lib/queryKeys';
import { rankAlternatives } from '@/lib/ranking/alternates';
import type { Teacher, Institution } from '@/types/institutions';

interface UseProviderAlternatesParams {
  skillTags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours?: number;
}

export interface ProviderAlternative {
  institutionId: string;
  teacherId?: string;
  institution: Institution;
  teacher?: Teacher;
  teacherRating?: number;
  outcomeScore?: number;
  criDelta?: number;
  timeDelta?: number;
  costDelta?: number;
  isBestRating?: boolean;
  isBestOutcome?: boolean;
  isFastest?: boolean;
  totalScore: number;
}

export function useProviderAlternates({
  skillTags = [],
  difficulty,
  estimatedHours,
}: UseProviderAlternatesParams) {
  return useQuery({
    queryKey: QUERY_KEYS.PROVIDER_ALTERNATES(skillTags, difficulty, estimatedHours),
    queryFn: async (): Promise<ProviderAlternative[]> => {
      // Fetch institutions
      const { data: institutions, error: institutionsError } = await supabase
        .from('institutions')
        .select('*')
        .eq('verification_status', 'verified')
        .order('reputation_score', { ascending: false });

      if (institutionsError) throw institutionsError;

      // Fetch teachers with their institutions
      const { data: teachers, error: teachersError } = await supabase
        .from('teachers')
        .select(`
          *,
          institution:institutions(*)
        `)
        .in('verification_status', ['verified', 'expert'])
        .order('average_rating', { ascending: false });

      if (teachersError) throw teachersError;

      // Create combinations of institutions and teachers
      const alternatives: ProviderAlternative[] = [];

      // Institution-only alternatives
      institutions?.forEach((institution) => {
        alternatives.push({
          institutionId: institution.id,
          institution,
          totalScore: 0, // Will be calculated by ranking function
        });
      });

      // Institution + teacher combinations
      teachers?.forEach((teacher) => {
        if (teacher.institution) {
          alternatives.push({
            institutionId: teacher.institution.id,
            teacherId: teacher.id,
            institution: teacher.institution as any,
            teacher: teacher as any,
            teacherRating: teacher.average_rating,
            outcomeScore: teacher.outcome_score,
            totalScore: 0, // Will be calculated by ranking function
          });
        }
      });

      // Rank alternatives using the ranking algorithm
      const rankedAlternatives = rankAlternatives(alternatives, {
        skillTags,
        difficulty,
        estimatedHours,
      });

      return rankedAlternatives;
    },
    enabled: skillTags.length > 0 || !!difficulty,
  });
}