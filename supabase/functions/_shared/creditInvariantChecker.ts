/**
 * Credit Invariant Checker v1
 * 
 * Deterministic post-generation validation that ensures templates are internally consistent.
 * Runs after any template is generated/updated and produces:
 * - PASS / FAIL status
 * - Typed invariant violations (machine readable)
 * - Human-readable summary
 * - Stored audit record for regression tracking
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
  upperDivisionCredits: number;
  byProvider: Record<string, number>;
  bucketMode: BucketMode;
}

export interface InvariantReport {
  ok: boolean;
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
  credit_allowance?: number; // explicit over-allocation allowed
}

export interface TemplateItem {
  course_id?: string;
  course_code?: string;
  credits: number;
  source: 'resident' | 'transfer' | 'alt' | 'clep' | 'sophia' | 'saylor' | 'studycom' | 'portage' | 'straighterline' | string;
  provider?: string;
  is_upper_division?: boolean;
  is_capstone?: boolean;
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
// Helper Functions
// ============================================================================

function normalizeSource(source: string): 'resident' | 'transfer' | 'alt' {
  const altProviders = ['clep', 'sophia', 'saylor', 'studycom', 'portage', 'straighterline', 'alt'];
  if (source === 'resident') return 'resident';
  if (source === 'transfer') return 'transfer';
  if (altProviders.includes(source.toLowerCase())) return 'alt';
  // Default unknown sources to resident (conservative)
  return 'resident';
}

function getProviderCode(item: TemplateItem): string | null {
  if (item.provider) return item.provider.toLowerCase();
  const knownProviders = ['clep', 'sophia', 'saylor', 'studycom', 'portage', 'straighterline'];
  if (knownProviders.includes(item.source.toLowerCase())) {
    return item.source.toLowerCase();
  }
  return null;
}

function computeMetrics(items: TemplateItem[], policy: PolicyData): ComputedMetrics {
  let totalCredits = 0;
  let residentCredits = 0;
  let transferCredits = 0;
  let altCredits = 0;
  let upperDivisionCredits = 0;
  const byProvider: Record<string, number> = {};

  for (const item of items) {
    const credits = item.credits || 0;
    totalCredits += credits;

    const normalized = normalizeSource(item.source);
    if (normalized === 'resident') {
      residentCredits += credits;
    } else if (normalized === 'transfer') {
      transferCredits += credits;
    } else if (normalized === 'alt') {
      altCredits += credits;
    }

    if (item.is_upper_division) {
      upperDivisionCredits += credits;
    }

    const provider = getProviderCode(item);
    if (provider) {
      byProvider[provider] = (byProvider[provider] || 0) + credits;
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
    upperDivisionCredits,
    byProvider,
    bucketMode,
  };
}

// ============================================================================
// Invariant Checkers
// ============================================================================

function checkTotalCredits(
  computed: ComputedMetrics,
  policy: PolicyData
): InvariantViolation | null {
  const required = policy.degree_credit_total;
  if (required === undefined) return null;

  const allowance = policy.credit_allowance || 0;
  const maxAllowed = required + allowance;
  const minAllowed = required; // Under is always bad

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
    if (maxCombined !== undefined) {
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
    // Check alt cap
    if (policy.max_alt_credits !== undefined) {
      if (computed.altCredits > policy.max_alt_credits) {
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
    }

    // Check transfer cap
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
    const actual = computed.byProvider[provider.toLowerCase()] || 0;
    if (actual > cap) {
      violations.push({
        type: 'INV_PROVIDER_CAP_EXCEEDED',
        severity: 'error',
        message: `Provider ${provider} credits (${actual}) exceeds cap (${cap})`,
        metrics: {
          provider,
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

  const capstones = items.filter((item) => item.is_capstone);
  if (capstones.length === 0) {
    // No capstone found - might be a warning depending on context
    return null;
  }

  const nonResidentCapstones = capstones.filter(
    (item) => normalizeSource(item.source) !== 'resident'
  );

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
  
  const errors: InvariantViolation[] = [];
  const warnings: InvariantViolation[] = [];

  // Compute metrics from items
  const computed = computeMetrics(items, policy_data);

  // Run all invariant checks
  const checks = [
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
      errors.push(violation);
    } else {
      warnings.push(violation);
    }
  }

  // In warn_only mode, demote errors to warnings
  if (mode === 'warn_only') {
    warnings.push(...errors.map(e => ({ ...e, severity: 'warning' as const })));
    errors.length = 0;
  }

  const ok = errors.length === 0;
  
  // Build summary
  const summaryParts: string[] = [];
  if (ok) {
    summaryParts.push('PASS');
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
    computed: input.report.computed,
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
