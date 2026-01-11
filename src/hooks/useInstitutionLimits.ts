import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { InstitutionCode } from '@/types/degreeTemplates';

/**
 * @deprecated Legacy limit types - prefer using institution_policy_packs for verified policy data.
 * These per-provider caps (clep_max, dsst_max, sophia_max, study_com_max) are only enforced
 * when explicitly set in the policy pack. The verified-only model uses:
 * - transfer_alt_bucket_mode: 'separate' | 'combined'
 * - max_alt_credit / max_transfer_alt_combined_credits (based on mode)
 * - residency_credits, degree_credit_total
 * 
 * Provider-specific caps remain supported but require provenance verification.
 */
interface InstitutionCreditLimit {
  limit_type:
    | 'total_transfer'
    | 'alt_credit_max'
    | 'comm_college_max'
    | 'min_ra_credit'
    | 'min_residency'
    | 'clep_max'      // @deprecated - use policy pack caps
    | 'dsst_max'      // @deprecated - use policy pack caps
    | 'upper_division_min'
    | 'sophia_max'    // @deprecated - use policy pack caps
    | 'study_com_max'; // @deprecated - use policy pack caps
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
