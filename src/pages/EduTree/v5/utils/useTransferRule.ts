import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizeProviderCode } from '@/lib/providerNormalization';
import { ENV } from '@/config/env';

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

// Debug flag: only log in dev or with ?debug=1
const isDebug = () => 
  !ENV.PROD || new URLSearchParams(window.location.search).get('debug') === '1';

export function useTransferRule(
  providerCode?: string,
  courseCode?: string,
  targetSchool?: string
) {
  return useQuery({
    queryKey: ['transfer-rule', providerCode, courseCode, targetSchool],
    queryFn: async () => {
      if (!providerCode || !courseCode || !targetSchool) return null;

      // Use canonical normalization for consistent matching
      const normalizedProvider = normalizeProviderCode(providerCode);
      const normalizedTarget = targetSchool.toUpperCase();

      // Instrumentation: log transfer rule lookup (dev only)
      if (isDebug()) {
        console.log('[TransferRule] lookup', {
          raw: { providerCode, courseCode, targetSchool },
          normalized: { provider: normalizedProvider, target: normalizedTarget },
        });
      }

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
