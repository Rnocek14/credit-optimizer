import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { InstitutionCode } from '@/types/degreeTemplates';

interface GenEdFramework {
  id: string;
  institution_id: string;
  framework_code: string; // 'FW30', etc.
  total_credits: number;
  description: string | null;
}

export function useGenEdFramework(code: InstitutionCode) {
  return useQuery({
    queryKey: ['genedFramework', code],
    queryFn: async () => {
      const { data: inst, error: instError } = await supabase
        .from('institutions' as any)
        .select('id')
        .eq('code', code)
        .single();

      if (instError) throw instError;

      const { data, error } = await supabase
        .from('gened_frameworks' as any)
        .select('*')
        .eq('institution_id', (inst as any).id)
        .single();

      if (error) throw error;
      return data as unknown as GenEdFramework;
    },
  });
}
