import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TransferStatus } from '../components/TransferStatusBadge';
import { normalizeProviderCode, normalizeCourseCode } from '@/lib/providerNormalization';
import type { EvidenceTier } from '@/types/evidenceTiers';
import { classifyTier } from '@/lib/tieredSavingsCalculator';
import type { VerifiedPolicy } from '@/lib/degree/verifiedPolicyService';

// Re-export for convenience
export { normalizeProviderCode, normalizeCourseCode } from '@/lib/providerNormalization';

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
  // Evidence tier info
  tier: EvidenceTier;
  confidence: number | null;
  evidenceUrl: string | null;
  ruleSource: string | null;
}

/**
 * Hook to batch-verify transfer status for multiple courses
 * Now includes evidence tier classification
 */
export function useTransferVerification(
  courses: Array<{ code: string; providerCode?: string | null; credits?: number; costUsd?: number }>,
  targetSchool?: string,
  policy?: VerifiedPolicy | null
) {
  return useQuery({
    queryKey: ['transfer-verification', courses, targetSchool, policy?.verified],
    retry: 1,
    queryFn: async () => {
      if (!targetSchool || courses.length === 0) {
        return courses.map(c => ({
          courseCode: c.code,
          providerCode: c.providerCode || '',
          status: 'unknown' as TransferStatus,
          tier: 'C' as EvidenceTier,
          confidence: null,
          evidenceUrl: null,
          ruleSource: null,
        }));
      }

      // Extract unique course-provider pairs with normalized provider AND course codes
      const pairs = courses
        .filter(c => c.providerCode)
        .map(c => ({
          provider: normalizeProviderCode(c.providerCode!),
          course: normalizeCourseCode(c.code), // Normalize course code for DB lookup
          originalCourse: c.code,
          originalProvider: c.providerCode!,
        }));

      if (pairs.length === 0) {
        return courses.map(c => ({
          courseCode: c.code,
          providerCode: c.providerCode || '',
          status: 'unknown' as TransferStatus,
          tier: 'C' as EvidenceTier,
          confidence: null,
          evidenceUrl: null,
          ruleSource: null,
        }));
      }

      // Query transfer rules using normalized columns for deterministic, index-optimized joins
      const { data: rules, error } = await supabase
        .from('credit_transfer_rules' as any)
        .select('*')
        .eq('target_institution_norm', targetSchool.toUpperCase())
        .in(
          'source_institution_norm',
          Array.from(new Set(pairs.map(p => p.provider)))
        )
        .in(
          'source_course_code_norm',
          Array.from(new Set(pairs.map(p => p.course.toLowerCase())))
        );

      if (error && error.code !== 'PGRST116') {
        console.error('Transfer verification error:', error);
      }

      // Debug: Log query details in development
      if (import.meta.env.DEV) {
        const uniqueProviders = Array.from(new Set(pairs.map(p => p.provider)));
        const uniqueCourses = Array.from(new Set(pairs.map(p => p.course)));
        console.debug('[TransferVerification] Query:', {
          targetSchool: targetSchool.toUpperCase(),
          providers: uniqueProviders,
          courseCodes: uniqueCourses.slice(0, 10), // First 10 for brevity
          totalPairs: pairs.length,
          rulesFound: (rules || []).length,
        });
      }

      // Build map using normalized columns for consistent lookups
      const rulesMap = new Map<string, TransferRule>();
      (rules || []).forEach((rule: any) => {
        // Use _norm columns for the key to match our query
        const key = `${rule.source_institution_norm || rule.source_institution?.toUpperCase()}:${rule.source_course_code_norm || rule.source_course_code?.toLowerCase()}`;
        rulesMap.set(key, rule as TransferRule);
      });

      // Dev-only: Log missing rules to distinguish data gaps from normalization bugs
      if (import.meta.env.DEV) {
        const missing = pairs
          .map(p => `${p.provider}:${p.course}`)
          .filter(k => !rulesMap.has(k));

        if (missing.length) {
          console.debug(
            '[TransferVerification] Missing %d/%d rules. Sample:', 
            missing.length, 
            pairs.length, 
            missing.slice(0, 10)
          );
        }
      }

      // Map results using normalized provider codes for lookup
      return courses.map(c => {
        if (!c.providerCode) {
          return {
            courseCode: c.code,
            providerCode: '',
            status: 'unknown' as TransferStatus,
            tier: 'C' as EvidenceTier,
            confidence: null,
            evidenceUrl: null,
            ruleSource: null,
          };
        }

        // Use normalized values for map lookup (matching the key format)
        const normalizedProvider = normalizeProviderCode(c.providerCode);
        const normalizedCourse = normalizeCourseCode(c.code).toLowerCase();
        const key = `${normalizedProvider}:${normalizedCourse}`;
        const rule = rulesMap.get(key);

        if (!rule) {
          // No rule found - provider-specific heuristics
          const status = getHeuristicStatus(c.providerCode);
          const tier = classifyTier(false, null, policy ?? null);
          
          return {
            courseCode: c.code,
            providerCode: c.providerCode,
            status,
            tier,
            confidence: null,
            evidenceUrl: null,
            ruleSource: null,
          };
        }

        // Map acceptance_status to TransferStatus
        const status: TransferStatus =
          rule.acceptance_status === 'accepted'
            ? 'verified'
            : rule.acceptance_status === 'elective'
            ? 'elective'
            : 'review';

        // Classify into evidence tier
        const tier = classifyTier(true, rule, policy ?? null);

        return {
          courseCode: c.code,
          providerCode: c.providerCode,
          status,
          rule,
          tier,
          confidence: rule.confidence ?? null,
          evidenceUrl: rule.evidence_url ?? null,
          ruleSource: rule.rule_source ?? null,
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
  const code = normalizeProviderCode(providerCode);
  
  // Regionally accredited universities - likely to transfer
  if (code === 'TESU' || code === 'COSC' || code === 'EXCELSIOR') {
    return 'verified';
  }
  
  // Known ACE-recommended providers
  if (code === 'SOPHIA' || code === 'STUDYCOM' || code === 'STRAIGHTERLINE' || code === 'CLEP') {
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
  targetSchool?: string,
  policy?: VerifiedPolicy | null
) {
  const courses = courseCode && providerCode 
    ? [{ code: courseCode, providerCode }] 
    : [];

  const result = useTransferVerification(courses, targetSchool, policy);

  return {
    ...result,
    data: result.data?.[0],
  };
}
