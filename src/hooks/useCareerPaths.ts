import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CareerPathListItem {
  id: string;
  title: string;
  slug?: string | null;
  summary?: string | null;
  industry?: string | null;
  average_salary?: number | null;
  baseline_salary?: number | null;
}

export function useCareerPaths() {
  return useQuery({
    queryKey: ['career-paths'],
    queryFn: async () => {
      console.log('[useCareerPaths] Querying career_paths...');

      const { data, error } = await supabase
        // @ts-ignore – Supabase types will catch up
        .from('career_paths' as any)
        .select('*')
        .order('title', { ascending: true });

      if (error) {
        console.error('[useCareerPaths] DB error:', error);
        throw error;
      }

      const safeData = (data ?? []) as unknown as CareerPathListItem[];
      console.log('[useCareerPaths] Found careers:', safeData.length);
      return safeData;
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
