import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TransferStatus } from '../components/TransferStatusBadge';

export interface TransferRule {
  id: string;
  source_institution: string;
  source_course_code: string;
  target_institution: string;
  target_course_code: string | null;
  acceptance_status: 'accepted' | 'elective' | 'rejected';
  rule_source?: string | null;
  confidence?: number | null;
  evidence_url?: string | null;
}

export interface TransferVerificationResult {
  courseCode: string;
  providerCode: string;
  status: TransferStatus;
  rule?: TransferRule;
}

/**
 * Hook to batch-verify transfer status for multiple courses
 */
export function useTransferVerification(
  courses: Array<{ code: string; providerCode?: string | null }>,
  targetSchool?: string
) {
  return useQuery({
    queryKey: ['transfer-verification', courses, targetSchool],
    retry: 1,
    queryFn: async () => {
      if (!targetSchool || courses.length === 0) {
        return courses.map(c => ({
          courseCode: c.code,
          providerCode: c.providerCode || '',
          status: 'unknown' as TransferStatus,
        }));
      }

      // Extract unique course-provider pairs
      const pairs = courses
        .filter(c => c.providerCode)
        .map(c => ({
          provider: c.providerCode!.toUpperCase(),
          course: c.code,
        }));

      if (pairs.length === 0) {
        return courses.map(c => ({
          courseCode: c.code,
          providerCode: c.providerCode || '',
          status: 'unknown' as TransferStatus,
        }));
      }

      // Query transfer rules for all pairs at once
      const { data: rules, error } = await supabase
        .from('credit_transfer_rules' as any)
        .select('*')
        .eq('target_institution', targetSchool.toUpperCase())
        .in(
          'source_institution',
          Array.from(new Set(pairs.map(p => p.provider)))
        )
        .in(
          'source_course_code',
          Array.from(new Set(pairs.map(p => p.course)))
        );

      if (error && error.code !== 'PGRST116') {
        console.error('Transfer verification error:', error);
      }

      const rulesMap = new Map<string, TransferRule>();
      (rules || []).forEach((rule: any) => {
        const key = `${rule.source_institution}:${rule.source_course_code}`;
        rulesMap.set(key, rule as TransferRule);
      });

      // Map results
      return courses.map(c => {
        if (!c.providerCode) {
          return {
            courseCode: c.code,
            providerCode: '',
            status: 'unknown' as TransferStatus,
          };
        }

        const key = `${c.providerCode.toUpperCase()}:${c.code}`;
        const rule = rulesMap.get(key);

        if (!rule) {
          // No rule found - provider-specific heuristics
          const status = getHeuristicStatus(c.providerCode);
          return {
            courseCode: c.code,
            providerCode: c.providerCode,
            status,
          };
        }

        // Map acceptance_status to TransferStatus
        const status: TransferStatus =
          rule.acceptance_status === 'accepted'
            ? 'verified'
            : rule.acceptance_status === 'elective'
            ? 'elective'
            : 'review';

        return {
          courseCode: c.code,
          providerCode: c.providerCode,
          status,
          rule,
        };
      });
    },
    enabled: !!targetSchool && courses.length > 0,
    staleTime: 60_000, // 1 minute
  });
}

/**
 * Heuristic fallback when no explicit rule exists
 */
function getHeuristicStatus(providerCode: string): TransferStatus {
  const code = providerCode.toUpperCase();
  
  // Regionally accredited universities - likely to transfer
  if (code === 'TESU' || code === 'COSC' || code === 'EXCELSIOR') {
    return 'verified';
  }
  
  // Known ACE-recommended providers
  if (code === 'SOPHIA' || code === 'STUDYCOM' || code === 'CLEP') {
    return 'elective';
  }
  
  // Everything else requires review
  return 'review';
}

/**
 * Hook to verify transfer status for a single course
 */
export function useSingleTransferVerification(
  courseCode?: string,
  providerCode?: string,
  targetSchool?: string
) {
  const courses = courseCode && providerCode 
    ? [{ code: courseCode, providerCode }] 
    : [];

  const result = useTransferVerification(courses, targetSchool);

  return {
    ...result,
    data: result.data?.[0],
  };
}
