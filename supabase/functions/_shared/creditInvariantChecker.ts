/**
 * Credit Invariant Checker v1.1
 * 
 * Deterministic post-generation validation that ensures templates are internally consistent.
 * Runs after any template is generated/updated and produces:
 * - PASS / FAIL status
 * - Typed invariant violations (machine readable)
 * - Human-readable summary
 * - Stored audit record for regression tracking
 * 
 * v1.1 FIXES:
 * - Unknown sources now error (don't fake residency)
 * - Missing caps under known bucket mode are errors
 * - Shared policy normalizer
 * - Robust capstone detection
 * - Canonical provider code normalization
 * - would_fail_strict flag for warn_only mode
 */

// ============================================================================
// Types
// ============================================================================

export type InvariantSeverity = 'error' | 'warning';

export type InvariantType =
  // Hard invariants (v1)
  | 'INV_TOTAL_CREDITS_MISMATCH'
  | 'INV_RESIDENCY_NOT_MET'
  | 'INV_BUCKET_MODE_UNKNOWN'
  | 'INV_COMBINED_CAP_EXCEEDED'
  | 'INV_ALT_CAP_EXCEEDED'
  | 'INV_TRANSFER_CAP_EXCEEDED'
  | 'INV_PROVIDER_CAP_EXCEEDED'
  | 'INV_UPPER_DIVISION_NOT_MET'
  | 'INV_CAPSTONE_NOT_IN_RESIDENCE'
  // v1.1 new errors
  | 'INV_UNKNOWN_SOURCE'
  | 'INV_POLICY_MISSING_COMBINED_CAP'
  | 'INV_POLICY_MISSING_ALT_CAP'
  // v1.1 warnings
  | 'INV_DUPLICATE_EQUIVALENCY'
  | 'INV_PREREQUISITES_UNMET'
  | 'INV_GENED_INCOMPLETE';

export interface InvariantViolation {
  type: InvariantType;
  severity: InvariantSeverity;
  message: string;
  metrics?: Record<string, unknown>;
  affectedCourses?: string[];
}

export type BucketMode = 'separate' | 'combined' | 'unknown';

export interface ComputedMetrics {
  totalCredits: number;
  residentCredits: number;
  transferCredits: number;
  altCredits: number;
  unknownCredits: number; // v1.1: track unknown sources
  upperDivisionCredits: number;
  byProvider: Record<string, number>;
  bucketMode: BucketMode;
  unknownSources: string[]; // v1.1: list of unknown source values
}

export interface InvariantReport {
  ok: boolean;
  would_fail_strict: boolean; // v1.1: true if would fail in strict mode
  errors: InvariantViolation[];
  warnings: InvariantViolation[];
  summary: string;
  computed: ComputedMetrics;
}

export interface PolicyData {
  degree_credit_total?: number;
  residency_credits?: number;
  max_alt_credits?: number;
  max_transfer_credits?: number;
  max_combined_transfer_alt?: number;
  bucket_mode?: 'separate' | 'combined';
  upper_division_min?: number;
  capstone_in_residence?: boolean;
  provider_caps?: Record<string, number>;
  credit_allowance?: number;
}

/**
 * Raw policy pack shape from the database (before normalization)
 */
export interface RawPolicyPack {
  residency_credits?: number;
  max_transfer_credits?: number;
  max_alt_credit?: number; // Note: singular
  max_ace_nccrs_credits?: number;
  total_credits?: number;
  degree_credit_total?: number;
  transfer_alt_bucket_mode?: 'separate' | 'combined' | 'unknown';
  max_transfer_alt_combined_credits?: number;
  upper_division_min?: number;
  capstone_in_residence?: boolean;
  provider_caps?: Record<string, number>;
  [key: string]: unknown;
}

export interface TemplateItem {
  course_id?: string;
  course_code?: string;
  credits: number;
  source: string;
  provider?: string;
  is_upper_division?: boolean;
  is_capstone?: boolean;
  // v1.1: additional fields for robust detection
  kind?: string;
  requirementArea?: string;
  level?: string | number;
  courseNumber?: number;
  equivalency_group?: string;
  prerequisites?: string[];
}

export interface InvariantCheckInput {
  template_id: string;
  template_table: 'degree_templates' | 'program_templates';
  institution_code: string;
  program_code?: string;
  policy_data: PolicyData;
  items: TemplateItem[];
  mode: 'strict' | 'warn_only';
}

// ============================================================================
// Canonical Provider Codes
// ============================================================================

const PROVIDER_ALIASES: Record<string, string> = {
  // CLEP
  'clep': 'clep',
  'college_level_examination_program': 'clep',
  // Sophia
  'sophia': 'sophia',
  'sophia_learning': 'sophia',
  // Study.com
  'studycom': 'studycom',
  'study.com': 'studycom',
  'study_com': 'studycom',
  'sdc': 'studycom',
  // Saylor
  'saylor': 'saylor',
  'saylor_academy': 'saylor',
  // Portage
  'portage': 'portage',
  'portage_learning': 'portage',
  // StraighterLine
  'straighterline': 'straighterline',
  'straighter_line': 'straighterline',
  'sl': 'straighterline',
  // DSST
  'dsst': 'dsst',
  'dantes': 'dsst',
  // ACE
  'ace': 'ace',
  // Generic alt
  'alt': 'alt',
  'alt_credit': 'alt',
};

const KNOWN_ALT_PROVIDERS = new Set([
  'clep', 'sophia', 'studycom', 'saylor', 'portage', 'straighterline', 'dsst', 'ace', 'alt'
]);

/**
 * Normalize provider code to canonical form
 */
export function normalizeProviderCode(provider: string): string {
  const lower = provider.toLowerCase().replace(/[\s-]/g, '_');
  return PROVIDER_ALIASES[lower] || lower;
}

// ============================================================================
// Source Classification (v1.1: strict unknown handling)
// ============================================================================

type SourceClassification = {
  type: 'resident' | 'transfer' | 'alt';
  isUnknown: false;
} | {
  type: 'unknown';
  isUnknown: true;
  originalValue: string;
};

function classifySource(source: string, provider?: string): SourceClassification {
  const lower = source.toLowerCase();
  
  // Explicit resident
  if (lower === 'resident' || lower === 'institutional' || lower === 'institutional_course') {
    return { type: 'resident', isUnknown: false };
  }
  
  // Explicit transfer
  if (lower === 'transfer') {
    return { type: 'transfer', isUnknown: false };
  }
  
  // Check if source is a known alt provider
  const normalizedSource = normalizeProviderCode(source);
  if (KNOWN_ALT_PROVIDERS.has(normalizedSource)) {
    return { type: 'alt', isUnknown: false };
  }
  
  // Check if provider field indicates alt
  if (provider) {
    const normalizedProvider = normalizeProviderCode(provider);
    if (KNOWN_ALT_PROVIDERS.has(normalizedProvider)) {
      return { type: 'alt', isUnknown: false };
    }
  }
  
  // Alt credit type
  if (lower === 'alt' || lower === 'alt_credit') {
    return { type: 'alt', isUnknown: false };
  }
  
  // UNKNOWN - do NOT default to resident (that's the bug we're fixing)
  return { type: 'unknown', isUnknown: true, originalValue: source };
}

// ============================================================================
// Capstone Detection (v1.1: robust shared logic)
// ============================================================================

const CAPSTONE_PATTERN = /\bcapstone\b/i;

/**
 * Robust capstone detection - matches your improved logic
 */
export function isCapstone(item: TemplateItem): boolean {
  // Explicit flag
  if (item.is_capstone === true) return true;
  
  // Kind field
  if (item.kind?.toLowerCase() === 'capstone') return true;
  
  // Requirement area
  if (item.requirementArea?.toUpperCase().includes('CAPSTONE')) return true;
  
  // Course code pattern
  if (item.course_code && CAPSTONE_PATTERN.test(item.course_code)) return true;
  if (item.course_id && CAPSTONE_PATTERN.test(item.course_id)) return true;
  
  return false;
}

// ============================================================================
// Upper Division Detection (v1.1: only reliable indicators)
// ============================================================================

/**
 * Upper division detection - only when reliable indicator exists
 */
export function isUpperDivision(item: TemplateItem): boolean {
  // Explicit flag (most reliable)
  if (item.is_upper_division === true) return true;
  
  // Explicit level field
  if (item.level !== undefined) {
    const levelNum = typeof item.level === 'number' ? item.level : parseInt(String(item.level), 10);
    if (!isNaN(levelNum) && levelNum >= 300) return true;
    if (typeof item.level === 'string') {
      const lower = item.level.toLowerCase();
      if (lower === 'upper' || lower === '300' || lower === '400') return true;
    }
  }
  
  // Course number (if provided)
  if (item.courseNumber !== undefined && item.courseNumber >= 300) return true;
  
  // Extract number from course code (conservative: only if clearly 300+)
  if (item.course_code) {
    const match = item.course_code.match(/(\d{3,4})/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= 300 && num < 1000) return true;
    }
  }
  
  // DO NOT use kind === 'major' or requirementArea.includes('UPPER') - too unreliable
  return false;
}

// ============================================================================
// Policy Normalizer (v1.1: single source of truth)
// ============================================================================

/**
 * Normalize raw policy pack to invariant PolicyData
 * This ensures consistent field names across all callers
 */
export function normalizePolicyData(raw: RawPolicyPack): PolicyData {
  // Determine bucket mode
  let bucket_mode: 'separate' | 'combined' | undefined;
  if (raw.transfer_alt_bucket_mode === 'combined' || raw.max_transfer_alt_combined_credits !== undefined) {
    bucket_mode = 'combined';
  } else if (raw.transfer_alt_bucket_mode === 'separate' || raw.max_alt_credit !== undefined) {
    bucket_mode = 'separate';
  }
  
  return {
    degree_credit_total: raw.degree_credit_total ?? raw.total_credits,
    residency_credits: raw.residency_credits,
    max_alt_credits: raw.max_alt_credit, // Note: map singular to plural
    max_transfer_credits: raw.max_transfer_credits,
    max_combined_transfer_alt: raw.max_transfer_alt_combined_credits,
    bucket_mode,
    upper_division_min: raw.upper_division_min,
    capstone_in_residence: raw.capstone_in_residence,
    provider_caps: raw.provider_caps,
  };
}

// ============================================================================
// Compute Metrics (v1.1: tracks unknown sources)
// ============================================================================

function computeMetrics(items: TemplateItem[], policy: PolicyData): ComputedMetrics {
  let totalCredits = 0;
  let residentCredits = 0;
  let transferCredits = 0;
  let altCredits = 0;
  let unknownCredits = 0;
  let upperDivisionCredits = 0;
  const byProvider: Record<string, number> = {};
  const unknownSources: string[] = [];

  for (const item of items) {
    const credits = item.credits || 0;
    totalCredits += credits;

    const classification = classifySource(item.source, item.provider);
    
    if (classification.isUnknown) {
      unknownCredits += credits;
      if (!unknownSources.includes(classification.originalValue)) {
        unknownSources.push(classification.originalValue);
      }
      // Treat unknown as transfer for metric purposes (not resident!)
      transferCredits += credits;
    } else {
      switch (classification.type) {
        case 'resident':
          residentCredits += credits;
          break;
        case 'transfer':
          transferCredits += credits;
          break;
        case 'alt':
          altCredits += credits;
          break;
      }
    }

    // Use robust upper division detection
    if (isUpperDivision(item)) {
      upperDivisionCredits += credits;
    }

    // Normalize provider code for consistent tracking
    const providerCode = item.provider 
      ? normalizeProviderCode(item.provider)
      : (classification.type === 'alt' && !classification.isUnknown) 
        ? normalizeProviderCode(item.source) 
        : null;
        
    if (providerCode && KNOWN_ALT_PROVIDERS.has(providerCode)) {
      byProvider[providerCode] = (byProvider[providerCode] || 0) + credits;
    }
  }

  // Determine bucket mode
  let bucketMode: BucketMode = 'unknown';
  if (policy.bucket_mode) {
    bucketMode = policy.bucket_mode;
  } else if (policy.max_combined_transfer_alt !== undefined) {
    bucketMode = 'combined';
  } else if (policy.max_alt_credits !== undefined || policy.max_transfer_credits !== undefined) {
    bucketMode = 'separate';
  }

  return {
    totalCredits,
    residentCredits,
    transferCredits,
    altCredits,
    unknownCredits,
    upperDivisionCredits,
    byProvider,
    bucketMode,
    unknownSources,
  };
}

// ============================================================================
// Invariant Checkers
// ============================================================================

function checkUnknownSources(computed: ComputedMetrics): InvariantViolation | null {
  if (computed.unknownCredits > 0) {
    return {
      type: 'INV_UNKNOWN_SOURCE',
      severity: 'error',
      message: `${computed.unknownCredits} credits have unknown source type (${computed.unknownSources.join(', ')})`,
      metrics: {
        unknownCredits: computed.unknownCredits,
        unknownSources: computed.unknownSources,
      },
    };
  }
  return null;
}

function checkTotalCredits(
  computed: ComputedMetrics,
  policy: PolicyData
): InvariantViolation | null {
  const required = policy.degree_credit_total;
  if (required === undefined) return null;

  const allowance = policy.credit_allowance || 0;
  const maxAllowed = required + allowance;
  const minAllowed = required;

  if (computed.totalCredits < minAllowed) {
    return {
      type: 'INV_TOTAL_CREDITS_MISMATCH',
      severity: 'error',
      message: `Total credits (${computed.totalCredits}) is below required (${required})`,
      metrics: {
        actual: computed.totalCredits,
        required,
        difference: required - computed.totalCredits,
      },
    };
  }

  if (computed.totalCredits > maxAllowed) {
    return {
      type: 'INV_TOTAL_CREDITS_MISMATCH',
      severity: 'error',
      message: `Total credits (${computed.totalCredits}) exceeds allowed maximum (${maxAllowed})`,
      metrics: {
        actual: computed.totalCredits,
        required,
        allowance,
        maxAllowed,
        excess: computed.totalCredits - maxAllowed,
      },
    };
  }

  return null;
}

function checkResidency(
  computed: ComputedMetrics,
  policy: PolicyData
): InvariantViolation | null {
  const minResidency = policy.residency_credits;
  if (minResidency === undefined) return null;

  if (computed.residentCredits < minResidency) {
    return {
      type: 'INV_RESIDENCY_NOT_MET',
      severity: 'error',
      message: `Resident credits (${computed.residentCredits}) is below minimum (${minResidency})`,
      metrics: {
        actual: computed.residentCredits,
        required: minResidency,
        shortfall: minResidency - computed.residentCredits,
      },
    };
  }

  return null;
}

function checkBucketMode(
  computed: ComputedMetrics,
  policy: PolicyData
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];

  if (computed.bucketMode === 'unknown') {
    violations.push({
      type: 'INV_BUCKET_MODE_UNKNOWN',
      severity: 'error',
      message: 'Bucket mode could not be determined from policy data',
      metrics: { bucketMode: 'unknown' },
    });
    return violations;
  }

  if (computed.bucketMode === 'combined') {
    const maxCombined = policy.max_combined_transfer_alt;
    // v1.1: Missing cap is an error when bucket mode is known
    if (maxCombined === undefined) {
      violations.push({
        type: 'INV_POLICY_MISSING_COMBINED_CAP',
        severity: 'error',
        message: 'Combined bucket mode set but max_combined_transfer_alt cap is missing',
        metrics: { bucketMode: 'combined' },
      });
    } else {
      const combinedTotal = computed.transferCredits + computed.altCredits;
      if (combinedTotal > maxCombined) {
        violations.push({
          type: 'INV_COMBINED_CAP_EXCEEDED',
          severity: 'error',
          message: `Combined transfer+alt credits (${combinedTotal}) exceeds cap (${maxCombined})`,
          metrics: {
            transferCredits: computed.transferCredits,
            altCredits: computed.altCredits,
            combinedTotal,
            cap: maxCombined,
            excess: combinedTotal - maxCombined,
          },
        });
      }
    }
  }

  if (computed.bucketMode === 'separate') {
    // v1.1: Missing alt cap is an error when bucket mode is separate
    if (policy.max_alt_credits === undefined) {
      violations.push({
        type: 'INV_POLICY_MISSING_ALT_CAP',
        severity: 'error',
        message: 'Separate bucket mode set but max_alt_credits cap is missing',
        metrics: { bucketMode: 'separate' },
      });
    } else if (computed.altCredits > policy.max_alt_credits) {
      violations.push({
        type: 'INV_ALT_CAP_EXCEEDED',
        severity: 'error',
        message: `Alt credits (${computed.altCredits}) exceeds cap (${policy.max_alt_credits})`,
        metrics: {
          actual: computed.altCredits,
          cap: policy.max_alt_credits,
          excess: computed.altCredits - policy.max_alt_credits,
        },
      });
    }

    // Transfer cap (optional - not all institutions define this)
    if (policy.max_transfer_credits !== undefined) {
      if (computed.transferCredits > policy.max_transfer_credits) {
        violations.push({
          type: 'INV_TRANSFER_CAP_EXCEEDED',
          severity: 'error',
          message: `Transfer credits (${computed.transferCredits}) exceeds cap (${policy.max_transfer_credits})`,
          metrics: {
            actual: computed.transferCredits,
            cap: policy.max_transfer_credits,
            excess: computed.transferCredits - policy.max_transfer_credits,
          },
        });
      }
    }
  }

  return violations;
}

function checkProviderCaps(
  computed: ComputedMetrics,
  policy: PolicyData
): InvariantViolation[] {
  const violations: InvariantViolation[] = [];
  const caps = policy.provider_caps;
  if (!caps) return violations;

  for (const [provider, cap] of Object.entries(caps)) {
    // v1.1: Normalize provider code for consistent matching
    const normalizedProvider = normalizeProviderCode(provider);
    const actual = computed.byProvider[normalizedProvider] || 0;
    if (actual > cap) {
      violations.push({
        type: 'INV_PROVIDER_CAP_EXCEEDED',
        severity: 'error',
        message: `Provider ${provider} credits (${actual}) exceeds cap (${cap})`,
        metrics: {
          provider,
          normalizedProvider,
          actual,
          cap,
          excess: actual - cap,
        },
      });
    }
  }

  return violations;
}

function checkUpperDivision(
  computed: ComputedMetrics,
  policy: PolicyData
): InvariantViolation | null {
  const minUpperDiv = policy.upper_division_min;
  if (minUpperDiv === undefined) return null;

  if (computed.upperDivisionCredits < minUpperDiv) {
    return {
      type: 'INV_UPPER_DIVISION_NOT_MET',
      severity: 'error',
      message: `Upper division credits (${computed.upperDivisionCredits}) is below minimum (${minUpperDiv})`,
      metrics: {
        actual: computed.upperDivisionCredits,
        required: minUpperDiv,
        shortfall: minUpperDiv - computed.upperDivisionCredits,
      },
    };
  }

  return null;
}

function checkCapstoneInResidence(
  items: TemplateItem[],
  policy: PolicyData
): InvariantViolation | null {
  if (!policy.capstone_in_residence) return null;

  // v1.1: Use robust capstone detection
  const capstones = items.filter(isCapstone);
  if (capstones.length === 0) {
    return null;
  }

  const nonResidentCapstones = capstones.filter((item) => {
    const classification = classifySource(item.source, item.provider);
    return classification.isUnknown || classification.type !== 'resident';
  });

  if (nonResidentCapstones.length > 0) {
    return {
      type: 'INV_CAPSTONE_NOT_IN_RESIDENCE',
      severity: 'error',
      message: `Capstone course(s) must be taken in residence but ${nonResidentCapstones.length} are not`,
      affectedCourses: nonResidentCapstones.map(
        (c) => c.course_id || c.course_code || 'unknown'
      ),
      metrics: {
        totalCapstones: capstones.length,
        nonResidentCount: nonResidentCapstones.length,
      },
    };
  }

  return null;
}

function checkDuplicateEquivalencies(
  items: TemplateItem[]
): InvariantViolation | null {
  const seen = new Map<string, number>();
  
  for (const item of items) {
    if (item.equivalency_group) {
      seen.set(item.equivalency_group, (seen.get(item.equivalency_group) || 0) + 1);
    }
  }

  const duplicates = Array.from(seen.entries())
    .filter(([_, count]) => count > 1)
    .map(([group, count]) => ({ group, count }));

  if (duplicates.length > 0) {
    return {
      type: 'INV_DUPLICATE_EQUIVALENCY',
      severity: 'warning',
      message: `${duplicates.length} equivalency group(s) appear multiple times`,
      metrics: { duplicates },
    };
  }

  return null;
}

// ============================================================================
// Main Checker
// ============================================================================

export function checkTemplateInvariants(input: InvariantCheckInput): InvariantReport {
  const { policy_data, items, mode } = input;
  
  const strictErrors: InvariantViolation[] = [];
  const warnings: InvariantViolation[] = [];

  // Compute metrics from items
  const computed = computeMetrics(items, policy_data);

  // Run all invariant checks
  const checks = [
    checkUnknownSources(computed), // v1.1: New check
    checkTotalCredits(computed, policy_data),
    checkResidency(computed, policy_data),
    ...checkBucketMode(computed, policy_data),
    ...checkProviderCaps(computed, policy_data),
    checkUpperDivision(computed, policy_data),
    checkCapstoneInResidence(items, policy_data),
    checkDuplicateEquivalencies(items),
  ];

  // Categorize violations
  for (const violation of checks) {
    if (!violation) continue;
    
    if (violation.severity === 'error') {
      strictErrors.push(violation);
    } else {
      warnings.push(violation);
    }
  }

  // v1.1: Track what would fail in strict mode
  const would_fail_strict = strictErrors.length > 0;
  
  // In warn_only mode, demote errors to warnings
  const errors = mode === 'strict' ? strictErrors : [];
  if (mode === 'warn_only') {
    warnings.push(...strictErrors.map(e => ({ ...e, severity: 'warning' as const })));
  }

  const ok = errors.length === 0;
  
  // Build summary
  const summaryParts: string[] = [];
  if (ok) {
    summaryParts.push(would_fail_strict ? 'PASS (warn_only)' : 'PASS');
  } else {
    summaryParts.push(`FAIL (${errors.length} error${errors.length !== 1 ? 's' : ''})`);
  }
  if (warnings.length > 0) {
    summaryParts.push(`${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`);
  }
  summaryParts.push(`${computed.totalCredits} credits`);
  summaryParts.push(`mode=${computed.bucketMode}`);

  return {
    ok,
    would_fail_strict,
    errors,
    warnings,
    summary: summaryParts.join(' | '),
    computed,
  };
}

// ============================================================================
// Database Persistence
// ============================================================================

export interface AuditRecordInput {
  template_id: string;
  template_table: 'degree_templates' | 'program_templates';
  institution_code: string;
  program_code?: string;
  run_source: 'seeder' | 'worker' | 'manual' | 'cron';
  report: InvariantReport;
}

export function buildAuditRecord(input: AuditRecordInput) {
  return {
    template_id: input.template_id,
    template_table: input.template_table,
    institution_code: input.institution_code,
    program_code: input.program_code,
    run_source: input.run_source,
    ok: input.report.ok,
    errors: input.report.errors,
    warnings: input.report.warnings,
    computed: {
      ...input.report.computed,
      would_fail_strict: input.report.would_fail_strict,
    },
    summary: input.report.summary,
  };
}

/**
 * Determines the appropriate template status based on invariant report
 */
export function getTemplateStatusFromReport(
  report: InvariantReport,
  currentPolicyStatus: string
): { status: string; gate_reason: string } {
  if (!report.ok) {
    const topError = report.errors[0];
    return {
      status: 'pending_review',
      gate_reason: `Invariant check failed: ${topError?.message || 'Unknown error'}`,
    };
  }

  // If invariants pass but policy_status wasn't green, keep pending
  if (currentPolicyStatus !== 'green') {
    return {
      status: 'pending_review',
      gate_reason: `Policy status is ${currentPolicyStatus}, awaiting policy verification`,
    };
  }

  return {
    status: 'active',
    gate_reason: 'Policy verified and invariants passed',
  };
}
