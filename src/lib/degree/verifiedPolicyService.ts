/**
 * Verified Policy Service
 * 
 * Fetches institution policies from the live, verified database view.
 * Falls back to central service when no verified pack exists.
 * 
 * TRUST RULES:
 * 1. Only institution_policy_packs_live is considered authoritative
 * 2. If no live pack exists, return { verified: false } with fallback values
 * 3. UI must display "unverified" state when verified=false
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  getPolicyOrDefault, 
  getResidencyCredits as getCentralResidency,
  getNoncollegiateCap as getCentralNoncollegiateCap,
  type InstitutionPolicy 
} from './institutionPolicies';

export interface VerifiedPolicy {
  verified: boolean;
  confidence: number; // 0-100, 95+ = high confidence
  institutionCode: string;
  institutionName: string;
  
  // Core values
  residencyCredits: number;
  maxTransferCredits: number;
  maxNoncollegiateCredits: number;
  upperDivisionMin: number;
  
  // Metadata
  source: 'live_pack' | 'central_service' | 'fallback';
  packId?: string;
  packScope?: string;
  verifiedAt?: string;
  evidenceUrl?: string;
  notes?: string;
}

export interface VerifiedPolicyResult {
  policy: VerifiedPolicy;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Parse policy_data JSON from institution_policy_packs_live
 */
function parsePolicyData(policyData: Record<string, unknown>): {
  residencyCredits: number | null;
  maxTransferCredits: number | null;
  maxNoncollegiateCredits: number | null;
  upperDivisionMin: number | null;
} {
  const parseNumber = (val: unknown): number | null => {
    if (val === null || val === undefined) return null;
    const num = typeof val === 'string' ? parseInt(val, 10) : Number(val);
    return isNaN(num) ? null : num;
  };

  return {
    residencyCredits: parseNumber(policyData.residency_credits),
    maxTransferCredits: parseNumber(policyData.max_transfer_credits),
    maxNoncollegiateCredits: parseNumber(policyData.max_noncollegiate_credits),
    upperDivisionMin: parseNumber(policyData.upper_division_min),
  };
}

/**
 * Get verified policy for an institution
 * Returns verified=true only if a live pack exists with valid data
 */
export async function getVerifiedPolicy(
  institutionCode: string
): Promise<VerifiedPolicy> {
  const centralPolicy = getPolicyOrDefault(institutionCode);
  
  // Default fallback policy
  const fallbackPolicy: VerifiedPolicy = {
    verified: false,
    confidence: centralPolicy.overallConfidence,
    institutionCode,
    institutionName: centralPolicy.name,
    residencyCredits: getCentralResidency(institutionCode),
    maxTransferCredits: centralPolicy.maxTransferTotal ?? 90,
    maxNoncollegiateCredits: getCentralNoncollegiateCap(institutionCode),
    upperDivisionMin: centralPolicy.upperDivisionAreaOfStudyMin,
    source: 'central_service',
    notes: 'Using central service fallback - no verified pack available',
  };

  try {
    // Query the live view for verified packs
    const { data, error } = await supabase
      .from('institution_policy_packs_live' as any)
      .select('*')
      .eq('institution', institutionCode)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn(`[VerifiedPolicyService] Error fetching live pack for ${institutionCode}:`, error);
      return fallbackPolicy;
    }

    if (!data) {
      return fallbackPolicy;
    }

    // Parse the policy data
    const packData = data as any;
    const policyData = packData.policy_data || {};
    const parsed = parsePolicyData(policyData);

    // Only mark as verified if we have the critical values
    const hasRequiredValues = 
      parsed.residencyCredits !== null || 
      parsed.maxNoncollegiateCredits !== null;

    return {
      verified: hasRequiredValues,
      confidence: hasRequiredValues ? 95 : 75,
      institutionCode,
      institutionName: packData.institution || centralPolicy.name,
      
      // Use parsed values with central fallbacks
      residencyCredits: parsed.residencyCredits ?? getCentralResidency(institutionCode),
      maxTransferCredits: parsed.maxTransferCredits ?? (centralPolicy.maxTransferTotal ?? 90),
      maxNoncollegiateCredits: parsed.maxNoncollegiateCredits ?? getCentralNoncollegiateCap(institutionCode),
      upperDivisionMin: parsed.upperDivisionMin ?? centralPolicy.upperDivisionAreaOfStudyMin,
      
      source: 'live_pack',
      packId: packData.id,
      packScope: packData.pack_scope,
      verifiedAt: packData.created_at,
      evidenceUrl: policyData.evidence_url,
      notes: policyData.notes,
    };
  } catch (err) {
    console.error(`[VerifiedPolicyService] Exception fetching policy for ${institutionCode}:`, err);
    return fallbackPolicy;
  }
}

/**
 * Check if an institution has a verified policy pack
 * Lightweight check without fetching full policy data
 */
export async function hasVerifiedPolicy(institutionCode: string): Promise<boolean> {
  try {
    const { count, error } = await supabase
      .from('institution_policy_packs_live' as any)
      .select('id', { count: 'exact', head: true })
      .eq('institution', institutionCode)
      .eq('status', 'active');

    if (error) {
      console.warn(`[VerifiedPolicyService] Error checking verified status for ${institutionCode}:`, error);
      return false;
    }

    return (count ?? 0) > 0;
  } catch (err) {
    console.error(`[VerifiedPolicyService] Exception checking verified status for ${institutionCode}:`, err);
    return false;
  }
}

/**
 * Get all institutions with verified policies
 */
export async function getVerifiedInstitutions(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('institution_policy_packs_live' as any)
      .select('institution')
      .eq('status', 'active');

    if (error) {
      console.warn('[VerifiedPolicyService] Error fetching verified institutions:', error);
      return [];
    }

    // Deduplicate
    const institutions = new Set((data || []).map((d: any) => d.institution));
    return Array.from(institutions);
  } catch (err) {
    console.error('[VerifiedPolicyService] Exception fetching verified institutions:', err);
    return [];
  }
}
