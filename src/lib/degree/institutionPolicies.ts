/**
 * Central Institution Policy Service
 * 
 * Single source of truth for all institution transfer/graduation policies.
 * Replaces scattered hardcoded values across the codebase.
 * 
 * VERIFIED POLICY VALUES from official sources:
 * - TESU: 2025-2026 Catalog + Official FAQ pages (verified Jan 2025)
 * - Others: Pending canonical verification
 * 
 * Key Design Decisions:
 * 1. COMBINED noncollegiate pool (not fake per-provider caps)
 * 2. Row-based policy model (field-level, not wide table)
 * 3. Confidence scores for unverified values
 * 4. Evidence URLs for audit trail
 */

export type InstitutionCode = 'TESU' | 'WGU' | 'UMGC' | 'COSC' | 'SNHU';

export type ResidencyVariant = 'standard' | 'military' | 'accelerate';

export interface ResidencyOption {
  variant: ResidencyVariant;
  credits: number;
  fee?: number;
  notes?: string;
}

export interface RequiredCourse {
  code: string;
  name: string;
  credits: number;
  notes?: string;
}

export interface NoncollegiatePool {
  maxCreditsBachelor: number;
  maxCreditsAssociate: number;
  includedProviders: string[];
  verbatimPolicy?: string;
  sourceUrl?: string;
}

export interface GenEdRequirements {
  WRITTEN_COMM: number;
  ORAL_COMM: number;
  QUANTITATIVE: number;
  HUMANITIES: number;
  SOCIAL_SCIENCE: number;
  NATURAL_SCIENCE: number;
  CIVIC_GLOBAL: number;
}

export interface InstitutionPolicy {
  code: InstitutionCode;
  name: string;
  catalogYear: string;
  
  // Core degree requirements
  totalCreditsBachelor: number;
  totalCreditsAssociate: number;
  
  // Transfer limits
  maxCommunityCollege: number;
  
  // IMPORTANT: max_transfer_total is NOT enforced for TESU until canonical confirmation
  // Current sources are marketing-adjacent (tesu.edu/why-tesu/generous-credit-transfer)
  maxTransferTotal?: number; // null = not enforced
  maxTransferTotalConfidence: number; // 0-100
  
  // Noncollegiate pool (COMBINED - not per-provider!)
  noncollegiatePool: NoncollegiatePool;
  
  // Residency options
  residencyOptions: ResidencyOption[];
  
  // Required residence courses
  requiredResidenceCourses: RequiredCourse[];
  
  // Upper division requirements
  upperDivisionAreaOfStudyMin: number;
  upperDivisionTotalMin?: number;
  
  // Grade requirements
  minGradeAreaOfStudy: string;
  minGradeEnglishComp: string;
  minGradeGeneral: string;
  
  // Gen-ed requirements
  genEdRequirements: GenEdRequirements;
  
  // Metadata
  verifiedAt?: string;
  verifiedBy?: string;
  notes?: string;
  evidenceUrls: string[];
  
  // Confidence (0-100): 95+ = canonical, 75-94 = needs confirmation, <75 = unverified
  overallConfidence: number;
}

/**
 * TESU Gold Baseline - Verified from official sources
 * 
 * Sources:
 * - SmartCatalog 2025-2026: https://tesu.smartcatalogiq.com/en/current/undergraduate-catalog
 * - Transfer Policy FAQ: https://www.tesu.edu/admissions/faqs/transfer-credits.php
 * - Residency FAQ: https://www.tesu.edu/admissions/faqs/credit-hour-residency.php
 * - Transfer Credits Page: https://www.tesu.edu/student-resources/transfer-credits
 */
const TESU_POLICY: InstitutionPolicy = {
  code: 'TESU',
  name: 'Thomas Edison State University',
  catalogYear: '2025-2026',
  
  totalCreditsBachelor: 120,
  totalCreditsAssociate: 60,
  
  maxCommunityCollege: 90,
  
  // NOT enforced - marketing page says 105/114, but no canonical policy source
  maxTransferTotal: undefined,
  maxTransferTotalConfidence: 70,
  
  noncollegiatePool: {
    maxCreditsBachelor: 90,
    maxCreditsAssociate: 45,
    includedProviders: ['ACE', 'NCCRS', 'CLEP', 'DSST', 'AP', 'SOPHIA', 'STUDYCOM', 'TECEP'],
    verbatimPolicy: 'Effective Jan. 1, 2021, the University accepts a maximum of 90 undergraduate credits for a baccalaureate degree and 45 semester hours for an associate degree from noncollegiate providers regardless of the source of the credit.',
    sourceUrl: 'https://www.tesu.edu/admissions/faqs/transfer-credits.php',
  },
  
  residencyOptions: [
    { 
      variant: 'standard', 
      credits: 15, 
      notes: 'Per Credit Tuition Plan: 15 TESU credits via Online, Guided Study, or e-Pack courses' 
    },
    { 
      variant: 'military', 
      credits: 24, 
      notes: 'Military Degree Completion Program: 24 credits for bachelor\'s, 12 for associate' 
    },
    { 
      variant: 'accelerate', 
      credits: 6, 
      fee: 3400, 
      notes: 'Edison Accelerate: $3,400 fee waives 15-credit residency, only SOS-1100 + Capstone required' 
    },
  ],
  
  requiredResidenceCourses: [
    { code: 'SOS-1100', name: 'Fact, Fiction, or Fake? Information Literacy Today', credits: 3 },
    { code: 'CAPSTONE', name: 'Program-specific Capstone Course', credits: 3 },
  ],
  
  upperDivisionAreaOfStudyMin: 18,
  upperDivisionTotalMin: undefined, // TESU uses area-of-study only
  
  minGradeAreaOfStudy: 'C',
  minGradeEnglishComp: 'C',
  minGradeGeneral: 'D',
  
  genEdRequirements: {
    WRITTEN_COMM: 6,
    ORAL_COMM: 3,
    QUANTITATIVE: 3,
    HUMANITIES: 9,
    SOCIAL_SCIENCE: 9,
    NATURAL_SCIENCE: 6,
    CIVIC_GLOBAL: 3,
  },
  
  verifiedAt: '2025-01-07',
  verifiedBy: 'Deep Research + Manual Verification',
  notes: 'Highly transfer-friendly. Two required TESU courses (SOS-1100 + Capstone) cannot be transferred from any source.',
  evidenceUrls: [
    'https://tesu.smartcatalogiq.com/en/current/undergraduate-catalog/methods-of-learning-and-earning-credit/transfer-credit',
    'https://www.tesu.edu/admissions/faqs/transfer-credits.php',
    'https://www.tesu.edu/admissions/faqs/credit-hour-residency.php',
    'https://www.tesu.edu/student-resources/transfer-credits',
  ],
  
  overallConfidence: 95,
};

/**
 * Other institutions - PENDING canonical verification
 * Values are approximations based on secondary sources
 */
const WGU_POLICY: InstitutionPolicy = {
  code: 'WGU',
  name: 'Western Governors University',
  catalogYear: '2024-2025',
  
  totalCreditsBachelor: 120,
  totalCreditsAssociate: 60,
  
  maxCommunityCollege: 90,
  maxTransferTotal: 78,
  maxTransferTotalConfidence: 75,
  
  noncollegiatePool: {
    maxCreditsBachelor: 78,
    maxCreditsAssociate: 39,
    includedProviders: ['ACE', 'NCCRS', 'CLEP', 'DSST', 'AP'],
    // WGU does NOT accept Sophia or Study.com
  },
  
  residencyOptions: [
    { variant: 'standard', credits: 42, notes: 'Competency-based, 42 credits must be earned at WGU' },
  ],
  
  requiredResidenceCourses: [],
  
  upperDivisionAreaOfStudyMin: 0, // Competency-based, no traditional upper-div requirement
  
  minGradeAreaOfStudy: 'C',
  minGradeEnglishComp: 'C',
  minGradeGeneral: 'C',
  
  genEdRequirements: {
    WRITTEN_COMM: 6,
    ORAL_COMM: 0,
    QUANTITATIVE: 3,
    HUMANITIES: 6,
    SOCIAL_SCIENCE: 6,
    NATURAL_SCIENCE: 4,
    CIVIC_GLOBAL: 0,
  },
  
  notes: 'Competency-based subscription model ($3,985/6mo term). Self-paced acceleration possible.',
  evidenceUrls: [
    'https://www.wgu.edu/admissions/transfers.html',
  ],
  overallConfidence: 80,
};

const UMGC_POLICY: InstitutionPolicy = {
  code: 'UMGC',
  name: 'University of Maryland Global Campus',
  catalogYear: '2024-2025',
  
  totalCreditsBachelor: 120,
  totalCreditsAssociate: 60,
  
  maxCommunityCollege: 90,
  maxTransferTotal: 90,
  maxTransferTotalConfidence: 80,
  
  noncollegiatePool: {
    maxCreditsBachelor: 90,
    maxCreditsAssociate: 45,
    includedProviders: ['ACE', 'NCCRS', 'CLEP', 'DSST', 'AP', 'SOPHIA', 'STUDYCOM'],
  },
  
  residencyOptions: [
    { variant: 'standard', credits: 30, notes: 'Minimum 30 credits at UMGC' },
  ],
  
  requiredResidenceCourses: [],
  
  upperDivisionAreaOfStudyMin: 15,
  
  minGradeAreaOfStudy: 'C',
  minGradeEnglishComp: 'C',
  minGradeGeneral: 'D',
  
  genEdRequirements: {
    WRITTEN_COMM: 6,
    ORAL_COMM: 3,
    QUANTITATIVE: 3,
    HUMANITIES: 6,
    SOCIAL_SCIENCE: 6,
    NATURAL_SCIENCE: 7,
    CIVIC_GLOBAL: 0,
  },
  
  notes: 'Military-friendly, standard semester system. Per-credit tuition.',
  evidenceUrls: [],
  overallConfidence: 75,
};

const COSC_POLICY: InstitutionPolicy = {
  code: 'COSC',
  name: 'Charter Oak State College',
  catalogYear: '2024-2025',
  
  totalCreditsBachelor: 120,
  totalCreditsAssociate: 60,
  
  maxCommunityCollege: 90,
  maxTransferTotal: 90,
  maxTransferTotalConfidence: 75,
  
  noncollegiatePool: {
    maxCreditsBachelor: 90,
    maxCreditsAssociate: 45,
    includedProviders: ['ACE', 'NCCRS', 'CLEP', 'DSST', 'AP', 'SOPHIA', 'STUDYCOM'],
  },
  
  residencyOptions: [
    { variant: 'standard', credits: 30, notes: 'Minimum 30 credits at COSC' },
  ],
  
  requiredResidenceCourses: [],
  
  upperDivisionAreaOfStudyMin: 15,
  
  minGradeAreaOfStudy: 'C',
  minGradeEnglishComp: 'C',
  minGradeGeneral: 'D',
  
  genEdRequirements: {
    WRITTEN_COMM: 6,
    ORAL_COMM: 3,
    QUANTITATIVE: 3,
    HUMANITIES: 9,
    SOCIAL_SCIENCE: 9,
    NATURAL_SCIENCE: 6,
    CIVIC_GLOBAL: 3,
  },
  
  notes: 'Connecticut state college with flexible transfer policies and competency-based options.',
  evidenceUrls: [
    'https://www.charteroak.edu/catalog/current/academic_policies_regulations/course_transfer_policy.php',
  ],
  overallConfidence: 80,
};

const SNHU_POLICY: InstitutionPolicy = {
  code: 'SNHU',
  name: 'Southern New Hampshire University',
  catalogYear: '2024-2025',
  
  totalCreditsBachelor: 120,
  totalCreditsAssociate: 60,
  
  maxCommunityCollege: 90,
  maxTransferTotal: 90,
  maxTransferTotalConfidence: 75,
  
  noncollegiatePool: {
    maxCreditsBachelor: 90,
    maxCreditsAssociate: 45,
    includedProviders: ['ACE', 'NCCRS', 'CLEP', 'DSST', 'AP', 'SOPHIA', 'STUDYCOM'],
  },
  
  residencyOptions: [
    { variant: 'standard', credits: 30, notes: 'Minimum 30 credits at SNHU' },
  ],
  
  requiredResidenceCourses: [],
  
  upperDivisionAreaOfStudyMin: 30,
  
  minGradeAreaOfStudy: 'C',
  minGradeEnglishComp: 'C',
  minGradeGeneral: 'D',
  
  genEdRequirements: {
    WRITTEN_COMM: 6,
    ORAL_COMM: 3,
    QUANTITATIVE: 6,
    HUMANITIES: 6,
    SOCIAL_SCIENCE: 6,
    NATURAL_SCIENCE: 6,
    CIVIC_GLOBAL: 3,
  },
  
  notes: 'Large online university with competitive pricing.',
  evidenceUrls: [],
  overallConfidence: 70,
};

// Policy registry
const POLICIES: Record<InstitutionCode, InstitutionPolicy> = {
  TESU: TESU_POLICY,
  WGU: WGU_POLICY,
  UMGC: UMGC_POLICY,
  COSC: COSC_POLICY,
  SNHU: SNHU_POLICY,
};

// ============== Public API ==============

/**
 * Get institution policy by code
 * Returns undefined if not found
 */
export function getPolicy(code: string): InstitutionPolicy | undefined {
  return POLICIES[code as InstitutionCode];
}

/**
 * Get institution policy with explicit null if not found
 * 
 * IMPORTANT: Do NOT fall back to TESU - callers must handle null explicitly
 * This is a P1 safety fix to prevent silent misleading behavior
 * 
 * @deprecated Use getPolicy() instead and handle null cases explicitly
 */
export function getPolicyOrDefault(code: string): InstitutionPolicy | null {
  const policy = POLICIES[code as InstitutionCode];
  if (!policy) {
    console.warn(`[institutionPolicies] No policy found for "${code}" - returning null (do not assume TESU defaults)`);
    return null;
  }
  return policy;
}

/**
 * Get all available institution codes
 */
export function getAvailableInstitutions(): InstitutionCode[] {
  return Object.keys(POLICIES) as InstitutionCode[];
}

/**
 * Get residency credits for a specific variant
 */
export function getResidencyCredits(
  code: string, 
  variant: ResidencyVariant = 'standard'
): number {
  const policy = getPolicy(code);
  if (!policy) return 30; // Safe default
  
  const option = policy.residencyOptions.find(o => o.variant === variant);
  return option?.credits ?? policy.residencyOptions[0]?.credits ?? 30;
}

/**
 * Check if a provider is included in the noncollegiate pool
 */
export function isNoncollegiateProvider(code: string, providerCode: string): boolean {
  const policy = getPolicy(code);
  if (!policy) return false;
  
  return policy.noncollegiatePool.includedProviders.includes(providerCode.toUpperCase());
}

/**
 * Get the noncollegiate credit cap for a degree level
 */
export function getNoncollegiateCap(code: string, degreeLevel: 'bachelor' | 'associate' = 'bachelor'): number {
  const policy = getPolicy(code);
  if (!policy) return 90; // Safe default
  
  return degreeLevel === 'bachelor' 
    ? policy.noncollegiatePool.maxCreditsBachelor 
    : policy.noncollegiatePool.maxCreditsAssociate;
}

// ============== Legacy Compatibility ==============

/**
 * Legacy interface for backward compatibility with anchorPolicies.ts consumers
 */
export interface LegacyAnchorPolicy {
  partner_name: string;
  max_alt_credits: number;
  min_residency_credits: number;
  upper_division_min: number;
  notes?: string;
}

/**
 * Get policy in legacy format for backward compatibility
 * @deprecated Use getPolicy() instead
 */
export function getAnchorPolicy(code: string): LegacyAnchorPolicy | undefined {
  const policy = getPolicy(code);
  if (!policy) return undefined;
  
  return {
    partner_name: policy.name,
    max_alt_credits: policy.noncollegiatePool.maxCreditsBachelor,
    min_residency_credits: getResidencyCredits(code, 'standard'),
    upper_division_min: policy.upperDivisionAreaOfStudyMin,
    notes: policy.notes,
  };
}

// ============== Validation Helpers ==============

export interface ValidationIssue {
  type: 'error' | 'warning';
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Validate noncollegiate credits against COMBINED pool
 * This is the KEY FIX: no fake per-provider caps
 */
export function validateNoncollegiateCredits(
  institutionCode: string,
  creditsByProvider: Record<string, number>,
  degreeLevel: 'bachelor' | 'associate' = 'bachelor'
): ValidationIssue[] {
  const policy = getPolicy(institutionCode);
  if (!policy) return [];
  
  const issues: ValidationIssue[] = [];
  const { noncollegiatePool } = policy;
  const cap = degreeLevel === 'bachelor' 
    ? noncollegiatePool.maxCreditsBachelor 
    : noncollegiatePool.maxCreditsAssociate;
  
  // Calculate TOTAL noncollegiate credits
  let totalNoncollegiate = 0;
  for (const [provider, credits] of Object.entries(creditsByProvider)) {
    if (noncollegiatePool.includedProviders.includes(provider.toUpperCase())) {
      totalNoncollegiate += credits;
    }
  }
  
  if (totalNoncollegiate > cap) {
    issues.push({
      type: 'error',
      code: 'NONCOLLEGIATE_CAP_EXCEEDED',
      message: `Total noncollegiate credits (${totalNoncollegiate}) exceed ${institutionCode} maximum of ${cap}`,
      details: {
        total: totalNoncollegiate,
        cap,
        breakdown: creditsByProvider,
      },
    });
  }
  
  // Warning at 80% of cap
  if (totalNoncollegiate > cap * 0.8 && totalNoncollegiate <= cap) {
    issues.push({
      type: 'warning',
      code: 'NONCOLLEGIATE_CAP_APPROACHING',
      message: `Noncollegiate credits (${totalNoncollegiate}) approaching ${institutionCode} cap of ${cap}`,
      details: {
        total: totalNoncollegiate,
        cap,
        remaining: cap - totalNoncollegiate,
      },
    });
  }
  
  return issues;
}

/**
 * Validate residency requirements
 */
export function validateResidency(
  institutionCode: string,
  universityCredits: number,
  variant: ResidencyVariant = 'standard'
): ValidationIssue[] {
  const required = getResidencyCredits(institutionCode, variant);
  const issues: ValidationIssue[] = [];
  
  if (universityCredits < required) {
    issues.push({
      type: 'error',
      code: 'RESIDENCY_SHORTFALL',
      message: `Only ${universityCredits} ${institutionCode} credits, need ${required} for ${variant} residency`,
      details: {
        actual: universityCredits,
        required,
        shortfall: required - universityCredits,
        variant,
      },
    });
  }
  
  return issues;
}

/**
 * Validate upper-division requirements
 */
export function validateUpperDivision(
  institutionCode: string,
  upperDivCredits: number
): ValidationIssue[] {
  const policy = getPolicy(institutionCode);
  if (!policy) return [];
  
  const issues: ValidationIssue[] = [];
  const required = policy.upperDivisionAreaOfStudyMin;
  
  if (required > 0 && upperDivCredits < required) {
    issues.push({
      type: 'error',
      code: 'UPPER_DIV_SHORTFALL',
      message: `Only ${upperDivCredits} upper-division credits, need ${required}`,
      details: {
        actual: upperDivCredits,
        required,
        shortfall: required - upperDivCredits,
      },
    });
  }
  
  return issues;
}
