/**
 * Transfer Coverage Scoring
 * Computes what % of template courses have verified transfer rules
 */

export interface TransferCoverageBreakdown {
  totalPairs: number;           // courses with providerCode present (excludes anchor residency)
  coveredPairs: number;         // has a rule match -> status != unknown
  uncoveredPairs: number;       // status == unknown
  coveragePercent: number;      // rounded integer 0-100
  byProvider: Record<string, { 
    total: number; 
    covered: number; 
    percent: number;
  }>;
}

export type CoverageLevel = 'high' | 'medium' | 'low' | 'none';

/**
 * Determine coverage level based on percentage
 */
export function getCoverageLevel(percent: number): CoverageLevel {
  if (percent >= 80) return 'high';
  if (percent >= 50) return 'medium';
  if (percent > 0) return 'low';
  return 'none';
}

/**
 * Get Tailwind classes for coverage level badge
 */
export function getCoverageBadgeClasses(level: CoverageLevel): string {
  switch (level) {
    case 'high':
      return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
    case 'medium':
      return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
    case 'low':
      return 'bg-orange-500/10 text-orange-700 border-orange-500/30';
    case 'none':
      return 'bg-muted text-muted-foreground border-muted';
  }
}

/**
 * Compute transfer coverage from verification results
 * @param verifications - Array of verification results from useTransferVerification
 * @param anchorSchool - The anchor school (to exclude residency courses)
 */
export function computeTransferCoverage(
  verifications: Array<{ 
    providerCode: string; 
    status: string;
    courseCode?: string;
  }>,
  anchorSchool?: string
): TransferCoverageBreakdown {
  const byProvider: Record<string, { total: number; covered: number; percent: number }> = {};
  
  let totalPairs = 0;
  let coveredPairs = 0;
  
  for (const v of verifications) {
    // Skip if no provider code
    if (!v.providerCode) continue;
    
    // Skip anchor school residency courses (they don't need transfer verification)
    const normalizedProvider = v.providerCode.toUpperCase();
    if (anchorSchool && normalizedProvider === anchorSchool.toUpperCase()) continue;
    
    // Initialize provider bucket
    if (!byProvider[normalizedProvider]) {
      byProvider[normalizedProvider] = { total: 0, covered: 0, percent: 0 };
    }
    
    totalPairs++;
    byProvider[normalizedProvider].total++;
    
    // Covered = any status that isn't 'unknown'
    // Includes: verified, elective, review (which means we have a rule, even if conditional)
    const isCovered = v.status !== 'unknown';
    
    if (isCovered) {
      coveredPairs++;
      byProvider[normalizedProvider].covered++;
    }
  }
  
  // Calculate percentages
  const coveragePercent = totalPairs > 0 
    ? Math.round((coveredPairs / totalPairs) * 100) 
    : 0;
    
  for (const key of Object.keys(byProvider)) {
    const p = byProvider[key];
    p.percent = p.total > 0 ? Math.round((p.covered / p.total) * 100) : 0;
  }
  
  return {
    totalPairs,
    coveredPairs,
    uncoveredPairs: totalPairs - coveredPairs,
    coveragePercent,
    byProvider,
  };
}
