import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { InstitutionCode } from '@/types/degreeTemplates';

interface InstitutionCreditLimit {
  limit_type:
    | 'total_transfer'
    | 'alt_credit_max'
    | 'comm_college_max'
    | 'min_ra_credit'
    | 'min_residency';
  credit_value: number;
  notes: string | null;
}

export function useInstitutionLimits(code: InstitutionCode) {
  return useQuery({
    queryKey: ['institutionLimits', code],
    queryFn: async () => {
      const { data: inst, error: instError } = await supabase
        .from('institutions' as any)
        .select('id')
        .eq('code', code)
        .single();

      if (instError) throw instError;

      const { data, error } = await supabase
        .from('institution_credit_limits' as any)
        .select('limit_type, credit_value, notes')
        .eq('institution_id', (inst as any).id);

      if (error) throw error;
      return data as unknown as InstitutionCreditLimit[];
    },
  });
}
