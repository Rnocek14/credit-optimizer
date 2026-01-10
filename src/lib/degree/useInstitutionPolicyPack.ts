/**
 * Hook to fetch institution policy pack from database
 * Falls back to static policies if no active pack exists
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getAnchorPolicy, type LegacyAnchorPolicy } from './institutionPolicies';

export interface PolicyPackRow {
  id: string;
  institution: string;
  status: string;
  policy_json: {
    transfer_limits?: {
      max_noncollegiate?: number;
      max_transfer_total?: number;
      max_community_college?: number;
    };
    residency_policy?: {
      min_institutional_credits?: number;
      required_courses?: string[];
    };
    degree_requirements?: {
      total_credits_bachelor?: number;
      upper_division_min?: number;
    };
  };
  confidence_score: number;
  created_at: string;
}

/**
 * Convert scraped policy pack to legacy anchor policy format
 */
function packToLegacyPolicy(pack: PolicyPackRow): LegacyAnchorPolicy {
  const json = pack.policy_json ?? {};
  
  return {
    partner_name: pack.institution,
    max_alt_credits: json.transfer_limits?.max_noncollegiate ?? 90,
    min_residency_credits: json.residency_policy?.min_institutional_credits ?? 30,
    upper_division_min: json.degree_requirements?.upper_division_min ?? 18,
    notes: `Scraped policy (confidence: ${pack.confidence_score}%)`,
  };
}

/**
 * Hook to fetch active policy pack for an institution
 * Falls back to static policy if no active pack exists
 */
export function useInstitutionPolicyPack(institutionCode?: string) {
  return useQuery({
    queryKey: ['institution-policy-pack', institutionCode],
    queryFn: async (): Promise<LegacyAnchorPolicy | undefined> => {
      if (!institutionCode) return undefined;

      // Try to fetch active pack from DB
      // @ts-ignore - table exists after scraper runs
      const { data, error } = await supabase
        .from('institution_policy_packs' as any)
        .select('*')
        .eq('institution', institutionCode)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Handle missing table gracefully (code 42P01)
      if (error) {
        if ((error as any)?.code === '42P01') {
          console.log('[useInstitutionPolicyPack] Table not found, using static policy');
          return getAnchorPolicy(institutionCode);
        }
        console.warn('[useInstitutionPolicyPack] Query error:', error);
        return getAnchorPolicy(institutionCode);
      }

      if (data) {
        console.log('[useInstitutionPolicyPack] Using scraped policy pack:', institutionCode);
        return packToLegacyPolicy(data as unknown as PolicyPackRow);
      }

      // Fallback to static
      console.log('[useInstitutionPolicyPack] No active pack, using static policy:', institutionCode);
      return getAnchorPolicy(institutionCode);
    },
    enabled: !!institutionCode,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Non-hook async function for use in queryFn contexts
 */
export async function fetchPolicyPackOrStatic(
  institutionCode: string
): Promise<LegacyAnchorPolicy | undefined> {
  if (!institutionCode) return undefined;

  try {
    // @ts-ignore
    const { data, error } = await supabase
      .from('institution_policy_packs' as any)
      .select('*')
      .eq('institution', institutionCode)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error && (error as any)?.code !== '42P01') {
      console.warn('[fetchPolicyPackOrStatic] Query error:', error);
    }

    if (data) {
      console.log('[fetchPolicyPackOrStatic] Using scraped pack:', institutionCode);
      return packToLegacyPolicy(data as unknown as PolicyPackRow);
    }
  } catch (err) {
    console.warn('[fetchPolicyPackOrStatic] Exception:', err);
  }

  // Fallback to static
  return getAnchorPolicy(institutionCode);
}
