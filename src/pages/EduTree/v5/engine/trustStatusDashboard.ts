/**
 * Trust Status Dashboard
 * 
 * Comprehensive scan of the Truth & Trust Layer.
 * Outputs a one-page status report with SEV0/1/2 ratings.
 * 
 * SEV0 = Contract violation (cannot activate/select)
 * SEV1 = Staleness or missing provenance (should re-verify)
 * SEV2 = Claimability gap (can't claim "degree complete" for specific reason)
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  getMinUpperDivisionCredits, 
  getProvenanceUrl, 
  getProvenanceVerifiedAt,
  isProvenanceStale 
} from '../utils/policyFieldResolvers';

// ============================================================================
// Types
// ============================================================================

export interface TrustFinding {
  severity: 'SEV0' | 'SEV1' | 'SEV2';
  category: 'contract' | 'provenance' | 'claimability' | 'drift';
  institution: string;
  issue: string;
  fix: string;
}

export interface AnchorStatus {
  institution: string;
  status: 'active' | 'draft' | 'deprecated';
  bucketMode: string;
  isSelectable: boolean;
  blockedReason: string | null;
  daysSinceVerified: number | null;
  hasProvenanceUrl: boolean;
  hasMinUL: boolean;
  minUL: number | null;
  trustTier: 'A' | 'B' | 'C';
}

export interface TrustStatusReport {
  timestamp: string;
  executive: {
    totalActives: number;
    selectableActives: number;
    blockedActives: number;
    staleActives: number;
    tierACount: number;
    tierBCount: number;
    tierCCount: number;
    safeToScale: boolean;
    safeForDemo: boolean;
    safeToClaimDegree: boolean;
  };
  anchors: AnchorStatus[];
  findings: TrustFinding[];
  verdict: '✅ SAFE TO SCALE' | '⚠️ SAFE FOR DEMO ONLY' | '❌ NOT SAFE';
  blockers: string[];
}

// ============================================================================
// Core Logic
// ============================================================================

function computeBlockedReason(pack: any): string | null {
  const policyData = pack.policy_data || {};
  const bucketMode = policyData.transfer_alt_bucket_mode ?? 'unknown';
  
  // Gate 1: Unknown bucket mode
  if (!['separate', 'combined'].includes(bucketMode)) {
    return 'unknown_bucket_mode';
  }
  
  // Gate 2: Missing mode-specific caps
  if (bucketMode === 'separate' && policyData.max_alt_credit == null) {
    return 'missing_mode_caps';
  }
  if (bucketMode === 'combined' && policyData.max_transfer_alt_combined_credits == null) {
    return 'missing_mode_caps';
  }
  
  // Gate 3: Missing required fields
  if (
    policyData.residency_credits == null ||
    policyData.max_transfer_credits == null ||
    policyData.degree_credit_total == null ||
    policyData.capstone_in_residence == null ||
    policyData.grade_rules?.min_transfer_grade == null
  ) {
    return 'missing_fields';
  }
  
  // Gate 4: Missing provenance_verified_at
  const verifiedAt = getProvenanceVerifiedAt(policyData);
  if (!verifiedAt) {
    return 'missing_provenance_verified_at';
  }
  
  // Gate 5: Stale provenance
  if (isProvenanceStale(policyData, 180)) {
    return 'stale_provenance';
  }
  
  return null;
}

function computeTrustTier(pack: any): 'A' | 'B' | 'C' {
  const policyData = pack.policy_data || {};
  const hasUrl = !!getProvenanceUrl(policyData);
  const hasVerifiedAt = !!getProvenanceVerifiedAt(policyData);
  const isStale = isProvenanceStale(policyData, 180);
  const hasFieldProvenance = !!policyData.field_provenance;
  
  // Tier A: Field provenance + verified + fresh + official URL
  if (hasFieldProvenance && hasVerifiedAt && !isStale && hasUrl) {
    return 'A';
  }
  
  // Tier B: Pack-level provenance only (URL + verified_at + fresh)
  if (hasVerifiedAt && !isStale && hasUrl) {
    return 'B';
  }
  
  // Tier C: Missing critical provenance
  return 'C';
}

// ============================================================================
// Main Dashboard Function
// ============================================================================

export async function runTrustStatusDashboard(): Promise<TrustStatusReport> {
  const { data: packs, error } = await supabase
    .from('institution_policy_packs')
    .select('*')
    .order('institution');
  
  if (error) {
    throw new Error(`Failed to fetch policy packs: ${error.message}`);
  }
  
  const activePacks = packs?.filter(p => p.status === 'active') || [];
  const findings: TrustFinding[] = [];
  const anchors: AnchorStatus[] = [];
  
  let selectableCount = 0;
  let blockedCount = 0;
  let staleCount = 0;
  let tierA = 0;
  let tierB = 0;
  let tierC = 0;
  
  for (const pack of activePacks) {
    const policyData = pack.policy_data || {};
    const blockedReason = computeBlockedReason(pack);
    const trustTier = computeTrustTier(pack);
    const verifiedAt = getProvenanceVerifiedAt(policyData);
    const daysSince = verifiedAt 
      ? Math.floor((Date.now() - verifiedAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const minUL = getMinUpperDivisionCredits(policyData);
    
    const anchor: AnchorStatus = {
      institution: pack.institution,
      status: pack.status as 'active' | 'draft' | 'deprecated',
      bucketMode: (policyData as any).transfer_alt_bucket_mode ?? 'unknown',
      isSelectable: blockedReason === null,
      blockedReason,
      daysSinceVerified: daysSince,
      hasProvenanceUrl: !!getProvenanceUrl(policyData),
      hasMinUL: minUL !== null,
      minUL,
      trustTier,
    };
    anchors.push(anchor);
    
    if (blockedReason === null) {
      selectableCount++;
    } else {
      blockedCount++;
      
      // Map blocked reasons to findings
      const severity = blockedReason === 'stale_provenance' ? 'SEV1' : 'SEV0';
      findings.push({
        severity,
        category: 'contract',
        institution: pack.institution,
        issue: blockedReason,
        fix: getSuggestedFix(blockedReason),
      });
      
      if (blockedReason === 'stale_provenance') staleCount++;
    }
    
    // Check for SEV1: Missing provenance URL (auditability gap)
    if (!getProvenanceUrl(policyData)) {
      findings.push({
        severity: 'SEV1',
        category: 'provenance',
        institution: pack.institution,
        issue: 'missing_provenance_url',
        fix: 'Add provenance_url pointing to official catalog/policy page',
      });
    }
    
    // Check for SEV2: Missing UL (claimability gap)
    if (minUL === null) {
      findings.push({
        severity: 'SEV2',
        category: 'claimability',
        institution: pack.institution,
        issue: 'min_upper_division_credits not set',
        fix: 'Verify UL requirement from catalog and populate min_upper_division_credits',
      });
    }
    
    // Count tiers
    if (trustTier === 'A') tierA++;
    else if (trustTier === 'B') tierB++;
    else tierC++;
  }
  
  // Compute verdicts
  const hasSEV0 = findings.some(f => f.severity === 'SEV0');
  const hasSEV1 = findings.some(f => f.severity === 'SEV1');
  const hasSEV2 = findings.some(f => f.severity === 'SEV2');
  const allTierAorB = tierC === 0;
  
  const safeToScale = !hasSEV0 && !hasSEV1 && allTierAorB;
  const safeForDemo = !hasSEV0;
  const safeToClaimDegree = !hasSEV2;
  
  let verdict: TrustStatusReport['verdict'];
  const blockers: string[] = [];
  
  if (hasSEV0) {
    verdict = '❌ NOT SAFE';
    blockers.push('Active packs have contract violations (SEV0)');
  } else if (hasSEV1 || !allTierAorB) {
    verdict = '⚠️ SAFE FOR DEMO ONLY';
    if (hasSEV1) blockers.push('Missing provenance URLs or stale verification (SEV1)');
    if (!allTierAorB) blockers.push('Some packs are Tier C (missing critical provenance)');
  } else {
    verdict = '✅ SAFE TO SCALE';
  }
  
  if (hasSEV2) {
    blockers.push('Cannot claim "Degree Complete" - UL requirements unverified (SEV2)');
  }
  
  return {
    timestamp: new Date().toISOString(),
    executive: {
      totalActives: activePacks.length,
      selectableActives: selectableCount,
      blockedActives: blockedCount,
      staleActives: staleCount,
      tierACount: tierA,
      tierBCount: tierB,
      tierCCount: tierC,
      safeToScale,
      safeForDemo,
      safeToClaimDegree,
    },
    anchors,
    findings,
    verdict,
    blockers,
  };
}

function getSuggestedFix(reason: string): string {
  switch (reason) {
    case 'unknown_bucket_mode':
      return 'Set transfer_alt_bucket_mode to "separate" or "combined"';
    case 'missing_mode_caps':
      return 'Add max_alt_credit (for separate) or max_transfer_alt_combined_credits (for combined)';
    case 'missing_fields':
      return 'Populate required fields: residency_credits, max_transfer_credits, degree_credit_total, capstone_in_residence, grade_rules.min_transfer_grade';
    case 'missing_provenance_verified_at':
      return 'Set provenance_verified_at after verifying policy from official source';
    case 'stale_provenance':
      return 'Re-verify policy from official source and update provenance_verified_at';
    default:
      return 'Review and fix policy data';
  }
}

// ============================================================================
// Console Output Helper
// ============================================================================

export function printTrustStatusReport(report: TrustStatusReport): void {
  console.log('\n========================================');
  console.log('   TRUST STATUS DASHBOARD');
  console.log(`   Generated: ${report.timestamp}`);
  console.log('========================================\n');
  
  console.log('EXECUTIVE SUMMARY');
  console.log('─────────────────');
  console.log(`Active anchors:     ${report.executive.totalActives}`);
  console.log(`Selectable:         ${report.executive.selectableActives}`);
  console.log(`Blocked:            ${report.executive.blockedActives}`);
  console.log(`Stale:              ${report.executive.staleActives}`);
  console.log(`Tier A (audit-grade): ${report.executive.tierACount}`);
  console.log(`Tier B (pack-level):  ${report.executive.tierBCount}`);
  console.log(`Tier C (incomplete):  ${report.executive.tierCCount}`);
  console.log('');
  console.log(`Safe to Scale:       ${report.executive.safeToScale ? '✅' : '❌'}`);
  console.log(`Safe for Demo:       ${report.executive.safeForDemo ? '✅' : '❌'}`);
  console.log(`Can Claim Degree:    ${report.executive.safeToClaimDegree ? '✅' : '❌'}`);
  console.log('');
  
  console.log('ANCHOR STATUS');
  console.log('─────────────');
  for (const anchor of report.anchors) {
    const status = anchor.isSelectable ? '✅' : '❌';
    console.log(`${status} ${anchor.institution} | Tier ${anchor.trustTier} | ${anchor.bucketMode} | UL: ${anchor.minUL ?? 'null'} | URL: ${anchor.hasProvenanceUrl ? '✓' : '✗'}`);
  }
  console.log('');
  
  if (report.findings.length > 0) {
    console.log('FINDINGS');
    console.log('────────');
    for (const f of report.findings) {
      console.log(`[${f.severity}] ${f.institution}: ${f.issue}`);
      console.log(`       Fix: ${f.fix}`);
    }
    console.log('');
  }
  
  console.log('VERDICT');
  console.log('───────');
  console.log(report.verdict);
  if (report.blockers.length > 0) {
    console.log('Blockers:');
    for (const b of report.blockers) {
      console.log(`  • ${b}`);
    }
  }
  console.log('\n========================================\n');
}
