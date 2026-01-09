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
  source: 'live_pack' | 'central_service' | 'fallback' | 'partial_finding';
  packId?: string;
  packScope?: string;
  verifiedAt?: string;
  evidenceUrl?: string;
  notes?: string;
  
  // Program-scoped status
  programScopedReason?: 'likely_program_scoped' | 'partial_caps_need_verification';
  isProgramScoped?: boolean;
  maxTransferVerified?: boolean;  // True if max_transfer has evidence
  maxTransferEvidenceUrl?: string;
  residencyVerified?: boolean;    // True if residency has evidence
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
    isProgramScoped: false,
    maxTransferVerified: false,
    residencyVerified: false,
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
    }

    // If we have a verified pack, use it
    if (data) {
      const packData = data as any;
      const policyData = packData.policy_data || {};
      const parsed = parsePolicyData(policyData);

      const hasRequiredValues = 
        parsed.residencyCredits !== null && 
        parsed.maxTransferCredits !== null;

      return {
        verified: hasRequiredValues,
        confidence: hasRequiredValues ? 95 : 75,
        institutionCode,
        institutionName: packData.institution || centralPolicy.name,
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
        isProgramScoped: false,
        maxTransferVerified: parsed.maxTransferCredits !== null,
        residencyVerified: parsed.residencyCredits !== null,
      };
    }

    // No live pack - check for partial findings (likely_program_scoped)
    const { data: findingData } = await supabase
      .from('policy_scan_findings')
      .select('*')
      .eq('institution', institutionCode)
      .in('reason', ['likely_program_scoped', 'partial_caps_need_verification'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (findingData) {
      const finding = findingData as any;
      const details = finding.details || {};
      const extractedValues = finding.extracted_values || {};
      const capsFound = details.caps_found || {};
      
      // Extract max_transfer - use parseNumber for robustness
      const maxTransferVal = extractedValues.max_transfer_credits;
      const maxTransferFromCaps = capsFound.max_transfer_credits;
      
      // Parse max_transfer from either extracted_values.value or caps_found
      const parseNum = (val: unknown): number | null => {
        if (val === null || val === undefined) return null;
        const num = typeof val === 'string' ? parseInt(val, 10) : Number(val);
        return isNaN(num) ? null : num;
      };
      const parsedMaxTransfer = maxTransferVal?.value 
        ? parseNum(maxTransferVal.value)
        : parseNum(maxTransferFromCaps);
      
      // Strict evidence check: must be an actual URL string
      const evidenceUrl = maxTransferVal?.evidence_url;
      const hasMaxTransferEvidence = 
        typeof evidenceUrl === 'string' && 
        evidenceUrl.startsWith('http');
      
      return {
        verified: false,
        confidence: finding.confidence_score || 60,
        institutionCode,
        institutionName: centralPolicy.name,
        // HARDENING: For program-scoped, use NaN sentinel - UI gates on isProgramScoped, not value
        residencyCredits: NaN,
        maxTransferCredits: parsedMaxTransfer ?? (centralPolicy.maxTransferTotal ?? 90),
        maxNoncollegiateCredits: getCentralNoncollegiateCap(institutionCode),
        upperDivisionMin: centralPolicy.upperDivisionAreaOfStudyMin,
        source: 'partial_finding',
        notes: `Program-scoped: ${details.recommendation || finding.reason}`,
        isProgramScoped: true,
        programScopedReason: finding.reason as 'likely_program_scoped' | 'partial_caps_need_verification',
        maxTransferVerified: hasMaxTransferEvidence,
        maxTransferEvidenceUrl: hasMaxTransferEvidence ? evidenceUrl : undefined,
        residencyVerified: false,
      };
    }

    return fallbackPolicy;
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
