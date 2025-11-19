import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CareerPathListItem {
  id: string;
  title: string;
  slug?: string | null;
  summary?: string | null;
  average_salary?: number | null;
  industry?: string | null;
}

export function useCareerPaths() {
  return useQuery({
    queryKey: ['career-paths'],
    queryFn: async () => {
      console.log('[useCareerPaths] Starting query...');
      
      try {
        // @ts-ignore - Table exists after migration
        const { data, error } = await supabase
          .from('career_paths' as any)
          .select('*')
          .order('title', { ascending: true });

        console.log('[useCareerPaths] Query result:', { data, error });

        if (error) {
          console.error('[useCareerPaths] Database error:', error);
          throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
        }
        
        if (!data) {
          console.warn('[useCareerPaths] No data returned');
          return [];
        }

        console.log('[useCareerPaths] Success! Found', data.length, 'careers');
        return data as unknown as CareerPathListItem[];
      } catch (err) {
        console.error('[useCareerPaths] Unexpected error:', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
