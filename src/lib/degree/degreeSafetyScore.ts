/**
 * Degree Safety Score (v1 - Conservative)
 * 
 * A simple, explainable score that never exceeds the weakest link.
 * 
 * Components:
 * - Accredited Associate Anchor: +40
 * - Policy verified: +25
 * - ≥80% courses have rules: +20
 * - ≥50% evidence-linked: +10
 * - Known provider bonus: +5
 */

export interface DegreeSafetyScoreComponents {
  accreditedAnchor: number;      // 0 or 40
  policyVerified: number;        // 0 or 25
  transferRulesFound: number;    // 0-20 scaled
  evidenceLinked: number;        // 0-10 scaled
  knownProviderBonus: number;    // 0 or 5
}

export interface DegreeSafetyScore {
  score: number;  // 0-100
  components: DegreeSafetyScoreComponents;
  riskBand: 'low' | 'medium' | 'high';
  recommendation: string;
  weakestLink?: string;
}

// Known providers with established track records
const KNOWN_PROVIDERS = new Set([
  'SOPHIA',
  'STUDYCOM', 
  'STUDY.COM',
  'STRAIGHTERLINE',
  'CLEP',
  'DSST',
  'AP',
  'TESU',
  'COSC',
  'WGU',
  'EXCELSIOR',
]);

// Schools with verified policy packs
const POLICY_VERIFIED_SCHOOLS = new Set([
  'TESU',
  'COSC',
  'WGU',
]);

// Schools with known AA/AS block transfer or single-institution completion
const ASSOCIATE_ANCHOR_SCHOOLS = new Set([
  'TESU',
  'COSC',
  'WGU',  // Single-institution - no transfer needed
]);

export interface DegreeSafetyInput {
  targetSchool: string;
  totalCourses: number;
  coursesWithRules: number;
  coursesWithEvidence: number;
  providers: string[];
  hasAssociatePathway?: boolean;
}

/**
 * Calculate the Degree Safety Score
 * 
 * Key principle: Score is capped by weakest link
 */
export function calculateDegreeSafetyScore(input: DegreeSafetyInput): DegreeSafetyScore {
  const {
    targetSchool,
    totalCourses,
    coursesWithRules,
    coursesWithEvidence,
    providers,
    hasAssociatePathway,
  } = input;

  const upperSchool = targetSchool?.toUpperCase() || '';
  
  // Component 1: Accredited Associate Anchor (+40)
  const hasAnchor = hasAssociatePathway || ASSOCIATE_ANCHOR_SCHOOLS.has(upperSchool);
  const accreditedAnchor = hasAnchor ? 40 : 0;

  // Component 2: Policy Verified (+25)
  const policyVerified = POLICY_VERIFIED_SCHOOLS.has(upperSchool) ? 25 : 0;

  // Component 3: Transfer Rules Found (0-20, scaled)
  const rulesPercent = totalCourses > 0 ? (coursesWithRules / totalCourses) * 100 : 0;
  let transferRulesFound = 0;
  if (rulesPercent >= 80) transferRulesFound = 20;
  else if (rulesPercent >= 60) transferRulesFound = 15;
  else if (rulesPercent >= 40) transferRulesFound = 10;
  else if (rulesPercent >= 20) transferRulesFound = 5;

  // Component 4: Evidence Linked (0-10, scaled)
  const evidencePercent = totalCourses > 0 ? (coursesWithEvidence / totalCourses) * 100 : 0;
  let evidenceLinked = 0;
  if (evidencePercent >= 50) evidenceLinked = 10;
  else if (evidencePercent >= 30) evidenceLinked = 7;
  else if (evidencePercent >= 10) evidenceLinked = 4;

  // Component 5: Known Provider Bonus (+5)
  const allKnown = providers.every(p => KNOWN_PROVIDERS.has(p.toUpperCase()));
  const knownProviderBonus = allKnown && providers.length > 0 ? 5 : 0;

  // Calculate raw score
  const components: DegreeSafetyScoreComponents = {
    accreditedAnchor,
    policyVerified,
    transferRulesFound,
    evidenceLinked,
    knownProviderBonus,
  };

  let rawScore = 
    accreditedAnchor +
    policyVerified +
    transferRulesFound +
    evidenceLinked +
    knownProviderBonus;

  // CRITICAL: Cap score by weakest link
  let weakestLink: string | undefined;
  
  // Single-institution paths don't need transfer rules
  const isSingleInstitution = ASSOCIATE_ANCHOR_SCHOOLS.has(upperSchool) && 
    providers.length === 1 && 
    providers[0]?.toUpperCase() === upperSchool;
  
  // If no rules found, cap at 40 (unless single-institution)
  if (coursesWithRules === 0 && totalCourses > 0 && !isSingleInstitution) {
    rawScore = Math.min(rawScore, 40);
    weakestLink = 'No transfer rules found';
  }
  
  // If <50% rules, cap at 60 (unless single-institution)
  if (rulesPercent < 50 && totalCourses > 0 && !isSingleInstitution) {
    rawScore = Math.min(rawScore, 60);
    weakestLink = weakestLink || `Only ${Math.round(rulesPercent)}% of courses have transfer rules`;
  }

  // If no policy verification, cap at 75
  if (!policyVerified) {
    rawScore = Math.min(rawScore, 75);
    weakestLink = weakestLink || 'Policy not verified for this school';
  }

  const score = Math.min(100, Math.max(0, rawScore));

  // Determine risk band
  let riskBand: 'low' | 'medium' | 'high';
  let recommendation: string;

  if (score >= 75) {
    riskBand = 'low';
    recommendation = 'Strong transfer confidence - proceed with standard verification';
  } else if (score >= 50) {
    riskBand = 'medium';
    recommendation = 'Good foundation - verify key courses before enrolling';
  } else {
    riskBand = 'high';
    recommendation = 'Research needed - confirm transfer acceptance with institution';
  }

  return {
    score,
    components,
    riskBand,
    recommendation,
    weakestLink,
  };
}

/**
 * Get display configuration for risk band
 */
export function getRiskBandConfig(riskBand: 'low' | 'medium' | 'high') {
  switch (riskBand) {
    case 'low':
      return {
        label: 'Low Risk',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        icon: 'shield-check' as const,
      };
    case 'medium':
      return {
        label: 'Medium Risk',
        color: 'text-amber-700',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        icon: 'alert-triangle' as const,
      };
    case 'high':
      return {
        label: 'High Risk',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        icon: 'alert-circle' as const,
      };
  }
}
