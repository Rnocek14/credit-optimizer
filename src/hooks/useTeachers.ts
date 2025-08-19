import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Teacher } from '@/types/institutions';

export function useTeachers(institutionId?: string) {
  return useQuery({
    queryKey: ['teachers', institutionId],
    queryFn: async () => {
      let query = supabase
        .from('teachers')
        .select(`
          *,
          institution:institutions(*)
        `)
        .order('average_rating', { ascending: false });

      if (institutionId) {
        query = query.eq('institution_id', institutionId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Teacher[];
    },
  });
}

export function useTopTeachers(limit = 10) {
  return useQuery({
    queryKey: ['teachers', 'top', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teachers')
        .select(`
          *,
          institution:institutions(*)
        `)
        .order('average_rating', { ascending: false })
        .order('total_reviews', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as Teacher[];
    },
  });
}