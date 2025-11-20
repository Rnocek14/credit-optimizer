import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { InstitutionCode } from '@/types/degreeTemplates';

interface Institution {
  id: string;
  code: InstitutionCode;
  name: string;
  accreditation: string | null;
}

export function useInstitution(code: InstitutionCode) {
  return useQuery({
    queryKey: ['institution', code],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('institutions' as any)
        .select('id, code, name, accreditation')
        .eq('code', code)
        .single();

      if (error) throw error;
      return data as unknown as Institution;
    },
  });
}
