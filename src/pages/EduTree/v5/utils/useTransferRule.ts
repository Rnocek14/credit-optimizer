import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type Acceptance = 'accepted' | 'elective' | 'rejected';

export interface TransferRule {
  id?: string;
  source_institution: string;
  source_course_code: string;
  target_institution: string;
  target_course_code: string | null;
  acceptance_status: Acceptance;
  rule_source?: string;
  confidence?: number | null;
  evidence_url?: string | null;
}

export function useTransferRule(
  providerCode?: string,
  courseCode?: string,
  targetSchool?: string
) {
  return useQuery({
    queryKey: ['transfer-rule', providerCode, courseCode, targetSchool],
    queryFn: async () => {
      if (!providerCode || !courseCode || !targetSchool) return null;

      const normalizedProvider = providerCode.toUpperCase();
      const normalizedTarget = targetSchool.toUpperCase();

      // Instrumentation: log transfer rule lookup normalization
      console.log('[TransferRule] lookup', {
        raw: { providerCode, courseCode, targetSchool },
        normalized: { provider: normalizedProvider, target: normalizedTarget },
      });

      const { data, error } = await supabase
        .from('credit_transfer_rules' as any)
        .select('*')
        .eq('source_institution', normalizedProvider)
        .eq('source_course_code', courseCode)
        .eq('target_institution', normalizedTarget)
        .maybeSingle();

      // PostgREST no-rows code is fine
      if (error && error.code !== 'PGRST116') throw error;
      return (data as unknown as TransferRule) || null;
    },
    staleTime: 60_000,
  });
}
