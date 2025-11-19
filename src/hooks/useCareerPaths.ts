import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CareerPathListItem {
  id: string;
  title: string;
  slug: string | null;
  summary: string | null;
  average_salary: number | null;
  industry: string | null;
}

export function useCareerPaths() {
  return useQuery({
    queryKey: ['career-paths'],
    queryFn: async () => {
      // @ts-ignore - Table exists after migration
      const { data, error } = await supabase
        .from('career_paths' as any)
        .select('id, title, slug, summary, average_salary, industry')
        .order('title', { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as CareerPathListItem[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
