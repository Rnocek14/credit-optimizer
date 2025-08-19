import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Institution } from '@/types/institutions';

export function useInstitutions() {
  return useQuery({
    queryKey: ['institutions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions')
        .select('*')
        .order('reputation_score', { ascending: false });

      if (error) throw error;
      return data as Institution[];
    },
  });
}

export function useInstitutionsByType(type?: string) {
  return useQuery({
    queryKey: ['institutions', 'by-type', type],
    queryFn: async () => {
      let query = supabase
        .from('institutions')
        .select('*')
        .order('reputation_score', { ascending: false });

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Institution[];
    },
    enabled: !!type,
  });
}