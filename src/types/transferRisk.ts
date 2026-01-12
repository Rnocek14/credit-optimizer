/**
 * Transfer Risk Classification System
 * 
 * Phase 1: Decision Transparency
 * "Here is what we know, here is what we don't, here is the risk."
 * 
 * This replaces binary verified/unverified with explicit risk bands.
 */

/**
 * Transfer Risk Classes (ordered by certainty)
 * 
 * guaranteed: Articulation agreement OR precedent ≥95% OR evidence_type='equivalency_table'
 * high_confidence: Policy acceptance + evidence + confidence ≥0.85
 * conditional: Rule exists but needs verification (confidence 0.7-0.84)
 * exploratory: No rule OR low confidence - proceed with caution
 */
export type TransferRiskClass = 
  | 'guaranteed'
  | 'high_confidence'
  | 'conditional'
  | 'exploratory';

/**
 * Risk class metadata for UI display
 */
export const RISK_CLASS_CONFIG: Record<TransferRiskClass, {
  label: string;
  shortLabel: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
  icon: 'shield-check' | 'check-circle' | 'alert-triangle' | 'help-circle';
}> = {
  guaranteed: {
    label: 'Guaranteed Transfer',
    shortLabel: 'Guaranteed',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Backed by articulation agreement or strong precedent',
    icon: 'shield-check',
  },
  high_confidence: {
    label: 'High Confidence',
    shortLabel: 'High',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Policy-verified with evidence',
    icon: 'check-circle',
  },
  conditional: {
    label: 'Conditional',
    shortLabel: 'Conditional',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    description: 'Rule exists but verification recommended',
    icon: 'alert-triangle',
  },
  exploratory: {
    label: 'Needs Research',
    shortLabel: 'Research',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    description: 'Limited data - confirm with institution',
    icon: 'help-circle',
  },
};

/**
 * Bounded downside calculation
 * Shows users the worst-case scenario explicitly
 */
export interface BoundedDownside {
  creditsAtRisk: number;
  costAtRisk: number;
  worstCaseDescription: string;
}

/**
 * Full transfer risk assessment for a course or pathway
 */
export interface TransferRiskAssessment {
  riskClass: TransferRiskClass;
  evidenceSources: string[];
  boundedDownside: BoundedDownside;
  suggestedAction?: string;
}

/**
 * Classify a transfer rule into a risk class
 * Based on evidence quality and confidence
 */
export function classifyTransferRisk(
  hasRule: boolean,
  confidence: number | null | undefined,
  evidenceUrl: string | null | undefined,
  evidenceType: string | null | undefined,
  acceptanceStatus: string | null | undefined
): TransferRiskClass {
  // No rule = exploratory
  if (!hasRule) {
    return 'exploratory';
  }

  const conf = confidence ?? 0;
  const hasEvidence = Boolean(evidenceUrl && evidenceUrl.trim());
  
  // Guaranteed: equivalency table OR very high confidence with evidence
  if (
    evidenceType === 'equivalency_table' ||
    evidenceType === 'articulation_agreement' ||
    (conf >= 0.95 && hasEvidence)
  ) {
    return 'guaranteed';
  }

  // High confidence: policy acceptance + evidence + confidence ≥0.85
  if (
    conf >= 0.85 &&
    hasEvidence &&
    (acceptanceStatus === 'accepted' || acceptanceStatus === 'elective')
  ) {
    return 'high_confidence';
  }

  // Conditional: rule exists with moderate confidence
  if (conf >= 0.70) {
    return 'conditional';
  }

  // Low confidence rule = still exploratory
  return 'exploratory';
}

/**
 * Calculate aggregate risk class for a set of courses
 * Uses weighted approach - not simple average
 */
export function calculateAggregateRiskClass(
  riskClasses: TransferRiskClass[]
): TransferRiskClass {
  if (riskClasses.length === 0) return 'exploratory';

  const counts = {
    guaranteed: 0,
    high_confidence: 0,
    conditional: 0,
    exploratory: 0,
  };

  riskClasses.forEach(rc => counts[rc]++);

  const total = riskClasses.length;
  const highQuality = counts.guaranteed + counts.high_confidence;
  const highQualityPercent = (highQuality / total) * 100;
  const exploratoryPercent = (counts.exploratory / total) * 100;

  // If >20% exploratory, overall is conditional at best
  if (exploratoryPercent > 20) {
    return counts.exploratory > total * 0.5 ? 'exploratory' : 'conditional';
  }

  // If ≥80% guaranteed/high_confidence
  if (highQualityPercent >= 80) {
    return counts.guaranteed > counts.high_confidence ? 'guaranteed' : 'high_confidence';
  }

  // If ≥50% guaranteed/high_confidence
  if (highQualityPercent >= 50) {
    return 'high_confidence';
  }

  return 'conditional';
}

/**
 * Calculate bounded downside for a pathway
 */
export function calculateBoundedDownside(
  courses: Array<{
    credits: number;
    cost: number;
    riskClass: TransferRiskClass;
  }>
): BoundedDownside {
  // Only courses that are conditional or exploratory are "at risk"
  const atRiskCourses = courses.filter(
    c => c.riskClass === 'conditional' || c.riskClass === 'exploratory'
  );

  const creditsAtRisk = atRiskCourses.reduce((sum, c) => sum + c.credits, 0);
  const costAtRisk = atRiskCourses.reduce((sum, c) => sum + c.cost, 0);

  let worstCaseDescription: string;
  if (creditsAtRisk === 0) {
    worstCaseDescription = 'All courses have verified transfer paths';
  } else if (creditsAtRisk <= 6) {
    worstCaseDescription = `Minor risk: ${creditsAtRisk} credits may need verification`;
  } else if (creditsAtRisk <= 15) {
    worstCaseDescription = `Moderate risk: Up to ${creditsAtRisk} credits could transfer as elective or require petition`;
  } else {
    worstCaseDescription = `Significant research needed: ${creditsAtRisk} credits lack strong transfer evidence`;
  }

  return {
    creditsAtRisk,
    costAtRisk,
    worstCaseDescription,
  };
}
