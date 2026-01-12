import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getEvidenceFreshnessLabel } from '@/lib/transfer/evidenceDecay';
import { ENV } from '@/config/env';

// Debug flag: only log in dev or with ?debug=1
const isDebug = () => 
  !ENV.PROD || new URLSearchParams(window.location.search).get('debug') === '1';

interface AdvisorPreapprovalResult {
  id: string;
  outcome_date: string | null;
  evidence_notes: string | null;
  degree_program: string | null;
  credits_applied: number | null;
  is_public: boolean | null;
}

interface UseAdvisorPreapprovalResult {
  data: AdvisorPreapprovalResult | null;
  isLoading: boolean;
  freshnessLabel: { label: string; color: 'green' | 'yellow' | 'orange' | 'red' } | null;
  advisorResult: string | null;
}

/**
 * Hook to fetch Tier 4 advisor pre-approval evidence for a course
 */
export function useAdvisorPreapproval({
  target,
  providerCode,
  courseCode,
}: {
  target: string | undefined;
  providerCode: string | undefined;
  courseCode: string | undefined;
}): UseAdvisorPreapprovalResult {
  const { data, isLoading } = useQuery({
    queryKey: ['advisor-preapproval', target, providerCode, courseCode],
    queryFn: async () => {
      if (!target || !providerCode || !courseCode) return null;

      const queryKey = ['advisor-preapproval', target, providerCode, courseCode];
      
      const { data: result, error } = await supabase
        .from('transfer_outcomes')
        .select('id, outcome_date, evidence_notes, degree_program, credits_applied, is_public')
        .eq('target_institution', target)
        .eq('source_institution', providerCode)
        .eq('source_course_code', courseCode)
        .eq('outcome_type', 'advisor_preapproval')
        .order('outcome_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Instrumentation: log evidence fetch (dev only)
      if (isDebug()) {
        console.log('[EvidenceLoop] fetch', {
          queryKey,
          resultCount: result ? 1 : 0,
        });
      }

      if (error) {
        console.error('Error fetching advisor preapproval:', error);
        return null;
      }

      return result;
    },
    enabled: Boolean(target && providerCode && courseCode),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Parse advisor result from evidence_notes
  const advisorResult = data?.evidence_notes
    ? extractAdvisorResult(data.evidence_notes)
    : null;

  // Calculate freshness
  const freshnessLabel = data?.outcome_date
    ? getEvidenceFreshnessLabel(data.outcome_date, 'advisor_preapproval')
    : null;

  return {
    data: data ?? null,
    isLoading,
    freshnessLabel,
    advisorResult,
  };
}

/**
 * Extract the advisor result type from evidence notes
 */
function extractAdvisorResult(notes: string): string | null {
  if (notes.includes('Approved as equivalent')) return 'approved_equivalent';
  if (notes.includes('Approved as elective')) return 'approved_elective';
  if (notes.includes('Not accepted')) return 'not_accepted';
  if (notes.includes('Conditional')) return 'conditional';
  return null;
}

/**
 * Get display label for advisor result
 */
export function getAdvisorResultLabel(result: string | null): string {
  switch (result) {
    case 'approved_equivalent':
      return 'Approved as equivalent';
    case 'approved_elective':
      return 'Approved as elective';
    case 'not_accepted':
      return 'Not accepted';
    case 'conditional':
      return 'Conditional approval';
    default:
      return 'Pre-approval on file';
  }
}
