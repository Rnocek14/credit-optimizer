import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TransferStatus } from '../components/TransferStatusBadge';
import { normalizeProviderCode, normalizeCourseCode } from '@/lib/providerNormalization';
import type { EvidenceTier } from '@/types/evidenceTiers';
import { classifyTier } from '@/lib/tieredSavingsCalculator';
import type { VerifiedPolicy } from '@/lib/degree/verifiedPolicyService';
import { isRuleStale } from '@/lib/transfer/ruleFreshness';

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
  last_verified_at?: string | null;
}

export interface TransferVerificationResult {
  courseCode: string;
  providerCode: string;
  status: TransferStatus;
  rule?: TransferRule;
  /**
   * True only when an actual credit_transfer_rules row backed this result.
   *
   * Coverage math MUST key on this rather than inferring from `status`.
   * Inferring is what previously pinned coverage at 100%: the no-rule path
   * returned a non-`unknown` status, and coverage counted anything that
   * wasn't `unknown` as covered.
   */
  hasRule: boolean;
  /**
   * True when the course is taken AT the target school (provider === target),
   * so no transfer rule is required or meaningful.
   */
  institutional: boolean;
  /**
   * True when a rule exists but was verified too long ago to stand behind.
   * Stale rules are downgraded to 'review' rather than hidden — see
   * `@/lib/transfer/ruleFreshness`.
   */
  isStale: boolean;
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
          hasRule: false,
          institutional: false,
          isStale: false,
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
          hasRule: false,
          institutional: false,
          isStale: false,
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
            hasRule: false,
            institutional: false,
            isStale: false,
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
          // No rule on file. Two genuinely different cases:
          //
          //  a) The course is taken AT the target school. Nothing transfers -
          //     it is native credit - so the absence of a rule is expected.
          //     This mirrors transferEngine.ts, which accepts institutional
          //     courses at confidence 1.0.
          //
          //  b) Everything else: we do not know. Say so.
          //
          // (b) used to run through a `getHeuristicStatus` fallback that
          // returned 'verified' for TESU/COSC/EXCELSIOR and 'elective' for the
          // alt-credit providers, purely from the provider code and without
          // consulting the target school at all. That turned "no data" into an
          // affirmative transfer claim rendered under a green Verified badge,
          // and pinned Transfer Verification Coverage at 100% by construction.
          // Users make five-figure decisions on this surface; an honest
          // "Unknown" is the only defensible output when the table is empty.
          const isInstitutional =
            normalizedProvider === normalizeProviderCode(targetSchool);

          return {
            courseCode: c.code,
            providerCode: c.providerCode,
            status: (isInstitutional ? 'verified' : 'unknown') as TransferStatus,
            hasRule: false,
            institutional: isInstitutional,
            isStale: false,
            tier: classifyTier(false, null, policy ?? null),
            confidence: null,
            evidenceUrl: null,
            ruleSource: null,
          };
        }

        // Map acceptance_status to TransferStatus, then age-gate it.
        //
        // A rule verified outside the freshness window describes the catalog
        // that was current when we captured it, not necessarily today's. It
        // still counts as "a rule exists" (hasRule stays true, so coverage is
        // unaffected), but it must not render as Verified — it drops to
        // 'review', which tells the user to reconfirm.
        const baseStatus: TransferStatus =
          rule.acceptance_status === 'accepted'
            ? 'verified'
            : rule.acceptance_status === 'elective'
            ? 'elective'
            : 'review';

        const stale = isRuleStale(rule.last_verified_at);
        const status: TransferStatus = stale ? 'review' : baseStatus;

        // Classify into evidence tier
        const tier = classifyTier(true, rule, policy ?? null);

        return {
          courseCode: c.code,
          providerCode: c.providerCode,
          status,
          rule,
          hasRule: true,
          institutional: false,
          isStale: stale,
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
