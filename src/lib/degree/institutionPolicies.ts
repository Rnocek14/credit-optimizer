/**
 * Central Institution Policy Service
 *
 * Single source of truth for all institution transfer/graduation policies.
 * Replaces scattered hardcoded values across the codebase.
 *
 * RECONCILED AGAINST GROUND TRUTH (2026-09-15)
 * --------------------------------------------
 * These constants are cross-checked against the committed
 * `institution_policy_ground_truth` rows transcribed in ./policyGroundTruth.ts.
 * `__tests__/policyGroundTruthReconciliation.test.ts` FAILS THE BUILD if the
 * two disagree. Do not change a number here without changing ground truth (and
 * its migration) in the same commit, or the test will stop you — which is the
 * point: before this existed, COSC read 90 transfer / 30 residency here against
 * 114 / 6 in ground truth, and WGU's alt-credit cap read 78 here against 45 in
 * ground truth, with nothing detecting either contradiction.
 *
 * VERIFICATION STATUS per institution:
 * - TESU:  catalog-verified (manual_verification, smartcatalogiq)
 * - COSC:  catalog-verified (manual_verification, charteroak.edu catalog)
 * - SNHU:  AI-extracted then human-reviewed
 * - WGU:   seeded row, corroborated by a human_override policy pack — re-verify
 * - UMGC:  NO ground-truth row exists. Values are unverified approximations.
 *
 * Every value here predates the 2026-2027 catalog year. Schools revise transfer
 * policy annually, so "verified" means "was true when checked", not "is true".
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
  /**
   * Providers the institution documents that it does NOT accept.
   *
   * Distinct from "absent from includedProviders", which only means we have no
   * record either way. Conflating the two is how 90 Sophia credits at WGU
   * scored zero against the cap and raised no issue at all: the validator
   * summed only allowlisted providers and silently dropped everything else.
   */
  excludedProviders?: string[];
  verbatimPolicy?: string;
  sourceUrl?: string;
}

/**
 * Alt-credit sources that count against a noncollegiate pool.
 *
 * Used to tell "this provider is not accepted / not mapped" apart from "this
 * is a college and therefore not this validator's concern". Institution codes
 * (TESU, COSC, WGU, EXCELSIOR) are deliberately absent.
 */
export const ALT_CREDIT_PROVIDERS: readonly string[] = [
  'SOPHIA', 'STUDYCOM', 'STRAIGHTERLINE', 'CLEP', 'DSST', 'AP',
  'SAYLOR', 'ACE', 'NCCRS', 'TECEP', 'MODERNSTATES',
];

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

  // Reconciled 2026-09-15 with ground truth (20260109033526,
  // manual_verification against the official SmartCatalog): "117 max transfer
  // from 4-year, 90 max from 2-year or ACE/NCCRS". Previously left undefined
  // (= unenforced) on the grounds that only marketing pages cited 105/114.
  // The catalog is not a marketing page, and leaving a ceiling unenforced errs
  // toward over-promising, so it is now enforced at the catalog figure.
  // The 90 ACE/NCCRS sub-ceiling is carried by noncollegiatePool below.
  maxTransferTotal: 117,
  maxTransferTotalConfidence: 90,
  
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
  // Reconciled 2026-09-15. Was 78 with no cited source, against
  // max_transfer_credits=90 in ground truth (20260111183654) AND
  // policy_data.max_transfer_credits=90 in the WGU policy pack, whose
  // field_provenance marks it source='human_override' with the WGU transfer
  // page as source_url.
  maxTransferTotal: 90,
  maxTransferTotalConfidence: 75,

  noncollegiatePool: {
    // Was 78 — the single worst number in the file. Ground truth records
    // max_ace_nccrs_credits=45 and the pack records max_alt_credit=45. A
    // 33-credit overstatement on the cap that decides how much alt-credit a
    // student buys, rendered behind a 95%-confidence "Verified" badge.
    maxCreditsBachelor: 45,
    // No ground-truth figure for the associate cap. Half the bachelor cap is
    // the convention elsewhere in this file (TESU/COSC 90/45); rounded DOWN
    // because guessing high on a ceiling is the direction that costs a student
    // money.
    maxCreditsAssociate: 22,
    includedProviders: ['ACE', 'NCCRS', 'CLEP', 'DSST', 'AP'],
    // Documented exclusions — previously only a code comment, so the validator
    // could not act on it.
    excludedProviders: ['SOPHIA', 'STUDYCOM'],
    sourceUrl: 'https://www.wgu.edu/admissions/transferring-credits.html',
  },

  residencyOptions: [
    // Was 42, uncited. Ground truth and the human_override pack both say 24.
    { variant: 'standard', credits: 24, notes: 'Competency-based; 24 credits must be earned at WGU' },
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
  
  notes:
    'Competency-based subscription model. Reconciled 2026-09-15 against ground truth + ' +
    'policy pack; the ground-truth row is verified_by=system, so re-verify against the live ' +
    'WGU catalog before treating these as canonical.',
  evidenceUrls: [
    'https://www.wgu.edu/admissions/transferring-credits.html',
  ],
  // Lowered from 80: the corroborating ground-truth row is a seed, not a
  // catalog verification. Two records agreeing is not the same as one record
  // being checked.
  overallConfidence: 70,
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
  
  notes:
    'Military-friendly, standard semester system. WARNING: no institution_policy_ground_truth ' +
    'row exists for UMGC, so none of these numbers is corroborated by anything. The residency ' +
    'figure is the same placeholder 30 that COSC carried before reconciliation. Treat as ' +
    'unverified and do not present to users as policy.',
  evidenceUrls: [],
  // Lowered from 75: nothing corroborates these values at all.
  overallConfidence: 50,
};

const COSC_POLICY: InstitutionPolicy = {
  code: 'COSC',
  name: 'Charter Oak State College',
  catalogYear: '2024-2025',
  
  totalCreditsBachelor: 120,
  totalCreditsAssociate: 60,
  
  maxCommunityCollege: 90,
  // Reconciled 2026-09-15 with ground truth (20260109044935,
  // manual_verification against the Charter Oak catalog): max transfer is
  // total_credits_required - residency_credits = 120 - 6 = 114. Was 90.
  maxTransferTotal: 114,
  maxTransferTotalConfidence: 90,

  noncollegiatePool: {
    maxCreditsBachelor: 90,
    maxCreditsAssociate: 45,
    includedProviders: ['ACE', 'NCCRS', 'CLEP', 'DSST', 'AP', 'SOPHIA', 'STUDYCOM'],
    sourceUrl:
      'https://www.charteroak.edu/catalog/current/degree-requirements/undergraduate-academic-policies/',
  },

  residencyOptions: [
    // Was 30 — the same placeholder "Minimum 30 credits at X" carried by UMGC
    // and SNHU, i.e. a template default rather than a researched value. The
    // catalog-verified figure is 6: Cornerstone (3cr) and Capstone (3cr) must
    // be earned at COSC and cannot be transferred. Charter Oak really is that
    // transfer-friendly, which is why it appears in the guides.
    { variant: 'standard', credits: 6, notes: 'Cornerstone (3cr) + Capstone (3cr) must be earned at COSC' },
  ],

  requiredResidenceCourses: [
    { code: 'CORNERSTONE', name: 'Cornerstone Seminar', credits: 3, notes: 'Required for all degrees; cannot be transferred' },
    { code: 'CAPSTONE', name: 'Program Capstone', credits: 3, notes: "Required for bachelor's; cannot be transferred" },
  ],

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

  notes:
    'Connecticut state college with unusually liberal transfer: only Cornerstone + Capstone ' +
    'must be earned in residence. Reconciled 2026-09-15 against catalog-verified ground truth.',
  evidenceUrls: [
    'https://www.charteroak.edu/catalog/current/degree-requirements/undergraduate-academic-policies/',
  ],
  overallConfidence: 90,
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
 * True when we hold an actual policy for this institution.
 *
 * Gate on this before showing a user any cap, residency figure or cost that
 * depends on institutional policy. The getters below return placeholders for
 * unknown institutions so existing callers keep compiling; those placeholders
 * are not policy and must never be rendered as though they were.
 */
export function hasPolicy(code: string): boolean {
  return Boolean(POLICIES[code as InstitutionCode]);
}

/**
 * Get residency credits for a specific variant
 */
export function getResidencyCredits(
  code: string, 
  variant: ResidencyVariant = 'standard'
): number {
  const policy = getPolicy(code);
  if (!policy) {
    // 30 is a guess, not a policy. It is kept only because several callers
    // cannot yet handle a null, and it is the higher (more conservative)
    // residency figure among the institutions on file. Callers that can make a
    // real decision should check `hasPolicy()` first rather than relying on it.
    console.warn(
      `[institutionPolicies] No policy for "${code}" — returning placeholder residency 30. ` +
      `This is NOT ${code}'s policy. Gate on hasPolicy() instead.`
    );
    return 30;
  }
  
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
  if (!policy) {
    // As above: a placeholder, not a policy. 90 is also the MOST permissive
    // cap on file, so relying on it over-promises. Gate on hasPolicy().
    console.warn(
      `[institutionPolicies] No policy for "${code}" — returning placeholder alt-credit cap 90. ` +
      `This is NOT ${code}'s policy. Gate on hasPolicy() instead.`
    );
    return 90;
  }
  
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

  // FAIL CLOSED. Returning [] for an unknown institution reads downstream as
  // "validated, no problems found" — the single most dangerous response this
  // function can give, because it is indistinguishable from a clean plan.
  if (!policy) {
    return [{
      type: 'error',
      code: 'UNKNOWN_INSTITUTION',
      message: `No policy on file for "${institutionCode}" — cannot validate transfer caps`,
      details: { institutionCode, availableInstitutions: getAvailableInstitutions() },
    }];
  }

  const issues: ValidationIssue[] = [];
  const { noncollegiatePool } = policy;
  const cap = degreeLevel === 'bachelor' 
    ? noncollegiatePool.maxCreditsBachelor 
    : noncollegiatePool.maxCreditsAssociate;

  const included = noncollegiatePool.includedProviders.map((p) => p.toUpperCase());
  const excluded = (noncollegiatePool.excludedProviders ?? []).map((p) => p.toUpperCase());

  // Calculate TOTAL noncollegiate credits.
  //
  // Previously this summed ONLY allowlisted providers and dropped everything
  // else on the floor, so 90 Sophia credits aimed at WGU — a school this file
  // records as not accepting Sophia — contributed 0 and raised no issue. The
  // plan looked valid right up until the registrar rejected it.
  let totalNoncollegiate = 0;
  for (const [provider, credits] of Object.entries(creditsByProvider)) {
    if (credits <= 0) continue;
    const code = provider.toUpperCase();

    if (included.includes(code)) {
      totalNoncollegiate += credits;
      continue;
    }

    if (excluded.includes(code)) {
      issues.push({
        type: 'error',
        code: 'PROVIDER_NOT_ACCEPTED',
        message: `${institutionCode} does not accept ${code} credit (${credits} credits in this plan)`,
        details: { provider: code, credits, institutionCode },
      });
      continue;
    }

    // A known alt-credit source that this institution neither allows nor
    // refuses on record. We do not know, so we say we do not know rather than
    // quietly scoring it zero.
    if (ALT_CREDIT_PROVIDERS.includes(code)) {
      issues.push({
        type: 'warning',
        code: 'PROVIDER_NOT_MAPPED',
        message: `No record of whether ${institutionCode} accepts ${code} credit — confirm before enrolling (${credits} credits)`,
        details: { provider: code, credits, institutionCode },
      });
      continue;
    }

    // Anything else is treated as a collegiate/institutional source, which
    // this function does not govern.
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
  if (!policy) {
    // Fail closed, as in validateNoncollegiateCredits: [] means "checked, all
    // good", which is not something we can say about an institution we have no
    // policy for.
    return [{
      type: 'error',
      code: 'UNKNOWN_INSTITUTION',
      message: `No policy on file for "${institutionCode}" — cannot validate upper-division requirement`,
      details: { institutionCode },
    }];
  }
  
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
