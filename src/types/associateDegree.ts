/**
 * Associate Degree Anchor Types
 * 
 * Phase 2A: Associate degrees as "transfer compression artifacts"
 * 
 * Key insight: AA/AS degrees reduce N uncertain transfer edges 
 * into 1 stable block-transfer edge.
 */

/**
 * Types of associate degree credentials
 */
export type AssociateCredentialType = 'AA' | 'AS' | 'AAS' | 'AAB' | 'AGS';

/**
 * Accreditation types for source institutions
 */
export type AccreditationType = 
  | 'regional'      // Most valuable - accepted almost everywhere
  | 'national'      // Accepted at some schools
  | 'programmatic'  // Specialized programs only
  | 'unaccredited'; // Not recommended

/**
 * How the target school accepts the associate degree
 */
export type AcceptanceType =
  | 'block_transfer'    // Full credit block accepted
  | 'gen_ed_waiver'     // Gen ed requirements waived
  | 'junior_standing'   // Admitted as junior (60+ credits)
  | 'case_by_case'      // Evaluated individually
  | 'not_accepted';     // Degree not recognized

/**
 * Associate degree articulation record
 * Maps to future degree_level_articulations table
 */
export interface AssociateDegreeArticulation {
  id: string;
  
  // Source credential
  sourceCredential: AssociateCredentialType;
  sourceAccreditation: AccreditationType;
  sourceInstitution?: string;  // Specific school, or null for "any regionally accredited"
  
  // Target institution
  targetInstitution: string;
  targetProgram?: string;  // Specific program, or null for general admission
  
  // Acceptance terms
  acceptanceType: AcceptanceType;
  maxCreditsAccepted: number;
  genEdWaived: boolean;
  residencyRemaining: number;
  
  // Conditions and notes
  conditions?: string[];
  notes?: string;
  
  // Evidence
  evidenceUrl?: string;
  evidenceType?: string;
  confidence: number;
  
  // Validity
  effectiveFrom?: Date;
  effectiveTo?: Date;
  lastVerified?: Date;
}

/**
 * Known associate degree articulations (static data for Phase 2A)
 * Will be moved to database table in Phase 2B
 */
export const KNOWN_ASSOCIATE_ARTICULATIONS: Omit<AssociateDegreeArticulation, 'id'>[] = [
  // TESU - Very transfer-friendly
  {
    sourceCredential: 'AA',
    sourceAccreditation: 'regional',
    targetInstitution: 'TESU',
    acceptanceType: 'block_transfer',
    maxCreditsAccepted: 60,
    genEdWaived: true,
    residencyRemaining: 30,
    conditions: ['Must be from regionally accredited institution'],
    evidenceUrl: 'https://www.tesu.edu/transfer-credit',
    evidenceType: 'policy_page',
    confidence: 0.95,
    notes: 'TESU is one of the most transfer-friendly schools. Gen ed typically waived with completed AA/AS.',
  },
  {
    sourceCredential: 'AS',
    sourceAccreditation: 'regional',
    targetInstitution: 'TESU',
    acceptanceType: 'block_transfer',
    maxCreditsAccepted: 60,
    genEdWaived: true,
    residencyRemaining: 30,
    conditions: ['Must be from regionally accredited institution'],
    evidenceUrl: 'https://www.tesu.edu/transfer-credit',
    evidenceType: 'policy_page',
    confidence: 0.95,
  },
  
  // COSC (Charter Oak) - Also very transfer-friendly
  {
    sourceCredential: 'AA',
    sourceAccreditation: 'regional',
    targetInstitution: 'COSC',
    acceptanceType: 'gen_ed_waiver',
    maxCreditsAccepted: 60,
    genEdWaived: true,
    residencyRemaining: 9,  // Only 9 credits residency!
    conditions: ['From regionally accredited institution'],
    evidenceUrl: 'https://www.charteroak.edu/catalog/current/academic_policies_regulations/course_transfer_policy.php',
    evidenceType: 'policy_page',
    confidence: 0.92,
    notes: 'COSC requires only 9 credits residency - ideal for transfer students.',
  },
  {
    sourceCredential: 'AS',
    sourceAccreditation: 'regional',
    targetInstitution: 'COSC',
    acceptanceType: 'gen_ed_waiver',
    maxCreditsAccepted: 60,
    genEdWaived: true,
    residencyRemaining: 9,
    conditions: ['From regionally accredited institution'],
    evidenceUrl: 'https://www.charteroak.edu/catalog/current/academic_policies_regulations/course_transfer_policy.php',
    evidenceType: 'policy_page',
    confidence: 0.92,
  },
  
  // WGU - Competency-based, more complex evaluation
  {
    sourceCredential: 'AA',
    sourceAccreditation: 'regional',
    targetInstitution: 'WGU',
    acceptanceType: 'case_by_case',
    maxCreditsAccepted: 90,  // WGU can accept up to 90 transfer credits
    genEdWaived: false,  // Depends on program
    residencyRemaining: 30,
    conditions: [
      'Evaluated per competency alignment',
      'Some programs have specific requirements',
    ],
    evidenceUrl: 'https://www.wgu.edu/admissions/transfers.html',
    evidenceType: 'policy_page',
    confidence: 0.80,
    notes: 'WGU uses competency-based evaluation. Transfer credits depend on alignment with program outcomes.',
  },
];

/**
 * Get articulation for a specific school
 */
export function getAssociateArticulation(
  targetSchool: string,
  credentialType?: AssociateCredentialType
): AssociateDegreeArticulation | null {
  const upperSchool = targetSchool.toUpperCase();
  
  const match = KNOWN_ASSOCIATE_ARTICULATIONS.find(a => 
    a.targetInstitution.toUpperCase() === upperSchool &&
    (!credentialType || a.sourceCredential === credentialType)
  );
  
  if (!match) return null;
  
  return {
    ...match,
    id: `${match.sourceCredential}-${match.targetInstitution}`.toLowerCase(),
  };
}

/**
 * Check if a school has known associate degree acceptance
 */
export function hasAssociateAnchor(targetSchool: string): boolean {
  const upperSchool = targetSchool.toUpperCase();
  return KNOWN_ASSOCIATE_ARTICULATIONS.some(
    a => a.targetInstitution.toUpperCase() === upperSchool &&
         a.acceptanceType !== 'not_accepted'
  );
}

/**
 * Get summary of associate anchor benefits
 */
export function getAssociateAnchorSummary(targetSchool: string): {
  available: boolean;
  maxCredits: number;
  genEdWaived: boolean;
  residencyRequired: number;
  description: string;
} | null {
  const articulation = getAssociateArticulation(targetSchool);
  
  if (!articulation) {
    return null;
  }
  
  const benefits: string[] = [];
  
  if (articulation.genEdWaived) {
    benefits.push('Gen ed requirements waived');
  }
  
  benefits.push(`Up to ${articulation.maxCreditsAccepted} credits accepted`);
  benefits.push(`Only ${articulation.residencyRemaining} credits residency required`);
  
  return {
    available: true,
    maxCredits: articulation.maxCreditsAccepted,
    genEdWaived: articulation.genEdWaived,
    residencyRequired: articulation.residencyRemaining,
    description: benefits.join('. ') + '.',
  };
}
