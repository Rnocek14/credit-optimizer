import { supabase } from "@/integrations/supabase/client";

export type PlanViolationSeverity = "block" | "warn" | "info";

export interface PlanViolation {
  severity: PlanViolationSeverity;
  code: string;
  scope_key: string;
  message: string;
  details: Record<string, unknown>;
  requirement_block_id?: string | null;
  requirement_id?: string | null;
  course_id?: string | null;
  provider_code?: string | null;
}

export interface PlanTotals {
  total: number;
  institutional: number;
  transfer: number;
  alt: number;
  upper_division?: number;
}

export interface ProgramInfo {
  id: string;
  name?: string;
  total_credits?: number;
  residency_min?: number;
  alt_credit_cap?: number;
  transfer_max?: number;
}

export interface PlanInvariantResult {
  ok: boolean;
  violations: PlanViolation[];
  totals: PlanTotals;
  program?: ProgramInfo;
}

/**
 * Fetch plan invariant validation results
 * @param planId - The plan ID to validate
 * @param persist - Whether to persist violations to the database (default: true)
 */
export async function fetchPlanInvariants(
  planId: string,
  persist = true
): Promise<PlanInvariantResult> {
  const { data, error } = await supabase.rpc("plan_invariant_checks", {
    p_plan_id: planId,
    p_persist: persist,
  });

  if (error) {
    console.error("[planValidation] fetchPlanInvariants error:", error);
    throw error;
  }

  // Cast the JSON response to our expected shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = data as any;

  // Ensure we return a valid structure even if RPC returns minimal data
  return {
    ok: result?.ok ?? false,
    violations: result?.violations ?? [],
    totals: result?.totals ?? { total: 0, institutional: 0, transfer: 0, alt: 0 },
    program: result?.program,
  };
}

export interface EligibleCourse {
  course_id: string;
  title: string;
  credits: number;
  provider_code: string | null;
  cri_score: number;
  eligibility: {
    transfer_accepted?: boolean;
    provider_allowed?: boolean;
    within_alt_cap?: boolean;
    within_transfer_cap?: boolean;
    fits_upper_div?: boolean;
  };
  explain: string[];
  score: number;
}

export interface RequirementEligibilityResult {
  block_id: string;
  block_title: string;
  rule_type: string;
  k?: number | null;
  credits_needed?: number | null;
  eligible_courses: EligibleCourse[];
  caps?: {
    alt_remaining?: number;
    transfer_remaining?: number;
  };
}

/**
 * Fetch eligible courses for a specific requirement block
 * @param planId - The plan ID
 * @param blockId - The requirement block ID
 */
export async function fetchRequirementEligibility(
  planId: string,
  blockId: string
): Promise<RequirementEligibilityResult> {
  const { data, error } = await supabase.rpc("requirement_eligibility", {
    p_plan_id: planId,
    p_block_id: blockId,
  });

  if (error) {
    console.error("[planValidation] fetchRequirementEligibility error:", error);
    throw error;
  }

  // Cast the JSON response to our expected shape
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = data as any;

  return {
    block_id: result?.block_id ?? blockId,
    block_title: result?.block_title ?? "Unknown Block",
    rule_type: result?.rule_type ?? "ALL",
    k: result?.k,
    credits_needed: result?.credits_needed,
    eligible_courses: result?.eligible_courses ?? [],
    caps: result?.caps,
  };
}

/**
 * Helper to get violation counts by severity
 */
export function getViolationCounts(violations: PlanViolation[]) {
  return {
    blocks: violations.filter((v) => v.severity === "block").length,
    warns: violations.filter((v) => v.severity === "warn").length,
    infos: violations.filter((v) => v.severity === "info").length,
  };
}

/**
 * Helper to group violations by requirement block
 */
export function groupViolationsByBlock(violations: PlanViolation[]) {
  const grouped: Record<string, PlanViolation[]> = {
    plan: [], // Plan-level violations (no block/requirement)
  };

  for (const v of violations) {
    // Group by requirement_id first, then requirement_block_id, then plan
    const key = v.requirement_id ?? v.requirement_block_id ?? "plan";
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(v);
  }

  return grouped;
}

/**
 * Check if a specific block has any incomplete violations
 */
/**
 * Check if a specific block/requirement has any incomplete violations
 * Works with both requirement_id and requirement_block_id for compatibility
 */
export function isBlockIncomplete(
  violations: PlanViolation[],
  blockId: string
): boolean {
  return violations.some(
    (v) =>
      v.code === "BLOCK_INCOMPLETE" && 
      (v.requirement_id === blockId || v.requirement_block_id === blockId)
  );
}

/**
 * Get the worst severity for a plan
 */
export function getWorstSeverity(
  violations: PlanViolation[]
): PlanViolationSeverity | "ok" {
  if (violations.some((v) => v.severity === "block")) return "block";
  if (violations.some((v) => v.severity === "warn")) return "warn";
  if (violations.some((v) => v.severity === "info")) return "info";
  return "ok";
}
