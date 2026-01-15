/**
 * Institution Readiness Report Generator
 * 
 * Generates a comprehensive report of all institutions' readiness
 * for scaled template generation. This is the "dashboard data" that
 * powers the scale-readiness audit.
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  computePolicyCompleteness, 
  type PolicyCompletenessResult,
  type PolicyStatus,
  COMPLETENESS_THRESHOLDS,
} from './policyCompletenessScore';

// ============================================================================
// Types
// ============================================================================

export interface InstitutionReadiness {
  /** Institution code (e.g., 'TESU', 'WGU') */
  code: string;
  /** Traffic-light status */
  status: PolicyStatus;
  /** Completeness score 0-100 */
  completenessScore: number;
  /** Whether an active policy pack exists */
  hasActivePack: boolean;
  /** Policy pack ID if exists */
  packId?: string;
  /** Whether ground truth exists */
  hasGroundTruth: boolean;
  /** Whether templates are buildable */
  templatesBuildable: boolean;
  /** Number of buildable templates */
  buildableTemplateCount: number;
  /** List of issues blocking buildability */
  issues: string[];
  /** Actionable recommendations */
  recommendations: string[];
  /** Last updated timestamp */
  lastUpdated?: string;
}

export interface ReadinessSummary {
  green: number;
  yellow: number;
  red: number;
  total: number;
  totalTemplates: number;
  buildableTemplates: number;
  scaleReadyPercentage: number;
}

export interface InstitutionReadinessReport {
  /** Report generation timestamp */
  timestamp: string;
  /** Summary statistics */
  summary: ReadinessSummary;
  /** Individual institution reports */
  institutions: InstitutionReadiness[];
  /** Institutions sorted by status (red first for attention) */
  prioritizedInstitutions: InstitutionReadiness[];
}

// ============================================================================
// Report Generation
// ============================================================================

/**
 * Generate a complete readiness report for all institutions.
 */
export async function generateReadinessReport(): Promise<InstitutionReadinessReport> {
  const timestamp = new Date().toISOString();
  
  // Fetch all policy packs
  const { data: policyPacks, error: packsError } = await supabase
    .from('institution_policy_packs')
    .select('id, institution, status, policy_data, field_provenance, updated_at, academic_year')
    .order('institution');
  
  if (packsError) {
    console.error('Failed to fetch policy packs:', packsError);
    throw new Error(`Failed to fetch policy packs: ${packsError.message}`);
  }
  
  // Fetch ground truth entries
  const { data: groundTruths, error: gtError } = await supabase
    .from('institution_policy_ground_truth')
    .select('institution');
  
  if (gtError) {
    console.error('Failed to fetch ground truth:', gtError);
  }
  
  const groundTruthSet = new Set(
    (groundTruths || []).map(gt => gt.institution.toUpperCase())
  );
  
  // Group packs by institution (prefer active packs)
  const institutionPacks = new Map<string, typeof policyPacks[0]>();
  for (const pack of policyPacks || []) {
    const code = pack.institution.toUpperCase();
    const existing = institutionPacks.get(code);
    
    // Prefer active packs, then most recently updated
    if (!existing || 
        (pack.status === 'active' && existing.status !== 'active') ||
        (pack.status === existing.status && pack.updated_at > existing.updated_at)) {
      institutionPacks.set(code, pack);
    }
  }
  
  // Generate readiness for each institution
  const institutions: InstitutionReadiness[] = [];
  
  for (const [code, pack] of institutionPacks) {
    const hasGroundTruth = groundTruthSet.has(code);
    const policyData = (pack.policy_data as Record<string, unknown>) || {};
    const fieldProvenance = (pack.field_provenance as Record<string, { source?: string }>) || {};
    
    // Compute completeness
    const completeness = computePolicyCompleteness(
      policyData,
      code,
      'bachelor', // Default to bachelor for report
      hasGroundTruth,
      fieldProvenance
    );
    
    // Determine buildability
    const templatesBuildable = completeness.status !== 'red';
    
    institutions.push({
      code,
      status: completeness.status,
      completenessScore: completeness.score,
      hasActivePack: pack.status === 'active',
      packId: pack.id,
      hasGroundTruth,
      templatesBuildable,
      buildableTemplateCount: templatesBuildable ? 1 : 0, // Simplified for now
      issues: completeness.missingCritical,
      recommendations: completeness.recommendations,
      lastUpdated: pack.updated_at,
    });
  }
  
  // Calculate summary
  const summary: ReadinessSummary = {
    green: institutions.filter(i => i.status === 'green').length,
    yellow: institutions.filter(i => i.status === 'yellow').length,
    red: institutions.filter(i => i.status === 'red').length,
    total: institutions.length,
    totalTemplates: institutions.length, // Simplified
    buildableTemplates: institutions.filter(i => i.templatesBuildable).length,
    scaleReadyPercentage: institutions.length > 0
      ? Math.round((institutions.filter(i => i.status === 'green').length / institutions.length) * 100)
      : 0,
  };
  
  // Prioritize: Red first (needs attention), then Yellow, then Green
  const prioritizedInstitutions = [...institutions].sort((a, b) => {
    const statusOrder = { red: 0, yellow: 1, green: 2 };
    return statusOrder[a.status] - statusOrder[b.status];
  });
  
  return {
    timestamp,
    summary,
    institutions,
    prioritizedInstitutions,
  };
}

/**
 * Generate readiness for a single institution.
 */
export async function getInstitutionReadiness(
  institutionCode: string
): Promise<InstitutionReadiness | null> {
  const code = institutionCode.toUpperCase();
  
  // Fetch active policy pack
  const { data: pack, error: packError } = await supabase
    .from('institution_policy_packs')
    .select('id, institution, status, policy_data, field_provenance, updated_at')
    .eq('institution', code)
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (packError) {
    console.error('Failed to fetch policy pack:', packError);
    return null;
  }
  
  if (!pack) {
    return {
      code,
      status: 'red',
      completenessScore: 0,
      hasActivePack: false,
      hasGroundTruth: false,
      templatesBuildable: false,
      buildableTemplateCount: 0,
      issues: ['No active policy pack found'],
      recommendations: ['Create and activate a policy pack for this institution'],
    };
  }
  
  // Check ground truth
  const { data: gt } = await supabase
    .from('institution_policy_ground_truth')
    .select('institution')
    .ilike('institution', code)
    .limit(1)
    .maybeSingle();
  
  const hasGroundTruth = !!gt;
  const policyData = (pack.policy_data as Record<string, unknown>) || {};
  const fieldProvenance = (pack.field_provenance as Record<string, { source?: string }>) || {};
  
  const completeness = computePolicyCompleteness(
    policyData,
    code,
    'bachelor',
    hasGroundTruth,
    fieldProvenance
  );
  
  const templatesBuildable = completeness.status !== 'red';
  
  return {
    code,
    status: completeness.status,
    completenessScore: completeness.score,
    hasActivePack: pack.status === 'active',
    packId: pack.id,
    hasGroundTruth,
    templatesBuildable,
    buildableTemplateCount: templatesBuildable ? 1 : 0,
    issues: completeness.missingCritical,
    recommendations: completeness.recommendations,
    lastUpdated: pack.updated_at,
  };
}

/**
 * Check if an institution meets the minimum threshold for template generation.
 * Used by the template promotion gate.
 */
export function meetsTemplateGenerationThreshold(
  readiness: InstitutionReadiness
): { allowed: boolean; reason?: string } {
  if (readiness.status === 'red') {
    return {
      allowed: false,
      reason: `Institution ${readiness.code} has status RED (${readiness.completenessScore}%). Issues: ${readiness.issues.join(', ')}`,
    };
  }
  
  if (!readiness.hasActivePack) {
    return {
      allowed: false,
      reason: `Institution ${readiness.code} has no active policy pack`,
    };
  }
  
  return { allowed: true };
}

/**
 * Validate that all Green institutions haven't regressed.
 * Used by CI tests.
 */
export async function validateNoGreenRegression(
  previousGreenInstitutions: string[]
): Promise<{ passed: boolean; regressions: string[] }> {
  const report = await generateReadinessReport();
  const regressions: string[] = [];
  
  for (const code of previousGreenInstitutions) {
    const institution = report.institutions.find(
      i => i.code.toUpperCase() === code.toUpperCase()
    );
    
    if (!institution) {
      regressions.push(`${code}: No longer in report`);
    } else if (institution.status !== 'green') {
      regressions.push(
        `${code}: Regressed from green to ${institution.status} (${institution.completenessScore}%)`
      );
    }
  }
  
  return {
    passed: regressions.length === 0,
    regressions,
  };
}
