// =============================================================================
// TRANSFER-SCRAPER-VALIDATE - Confidence Scoring & Rule Publishing
// =============================================================================
// This Edge Function validates extracted policies and writes to final tables.
//
// Key behaviors:
// - Accepts extraction results (from transfer-scraper-extract)
// - Applies formal confidence thresholds: ≥85 auto, 60-84 review, <60 hold
// - Checks for conflicts with existing rules
// - Writes approved policies to institution_policy_packs
// - Writes approved provider rules to credit_transfer_rules
// - Creates transfer_evidence records for audit trail
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// -----------------------------------------------------------------------------
// TYPE DEFINITIONS
// -----------------------------------------------------------------------------

interface ValidationRequest {
  scrape_job_id?: string;
  extraction_result?: ExtractionResult;
  force_action?: 'approve' | 'reject'; // For manual override
  reviewer_id?: string;
  reviewer_notes?: string;
}

interface ExtractionResult {
  policy_pack: PolicyPack | null;
  provider_rules: ProviderRule[];
  confidence: ConfidenceBreakdown;
  total_score: number;
  action: 'auto_approve' | 'human_review' | 'hold';
  extraction_notes: string[];
}

interface PolicyPack {
  institution: string;
  academic_year: string;
  residency_policy: Record<string, unknown>;
  transfer_credit_limits: Record<string, unknown>;
  credit_sources_accepted: Record<string, unknown>;
  institutional_course_requirements: Record<string, unknown>;
  upper_level_requirements: Record<string, unknown>;
  policy_effective_dates: {
    effective_start: string | null;
    effective_end?: string | null;
  };
}

interface ProviderRule {
  provider_name: string;
  provider_type: 'course' | 'exam' | 'portfolio';
  acceptance_status: 'accepted' | 'accepted_with_limits' | 'not_accepted';
  credit_constraints?: {
    max_credits?: number;
    counts_toward_ace_limit?: boolean;
    counts_as_ra_credit?: boolean;
  };
  conditions?: string[];
}

interface ConfidenceBreakdown {
  source_authority: number;
  language_certainty: number;
  cross_source_agreement: number;
  recency: number;
  structural_consistency: number;
  ai_certainty: number;
}

interface ValidationResult {
  success: boolean;
  action_taken: 'approved' | 'pending_review' | 'held' | 'rejected';
  policy_pack_id?: string;
  provider_rule_ids?: string[];
  conflicts?: ConflictReport[];
  message: string;
}

interface ConflictReport {
  type: 'policy_exists' | 'rule_conflict' | 'value_mismatch';
  existing_id: string;
  field: string;
  existing_value: unknown;
  new_value: unknown;
  resolution: 'supersede' | 'skip' | 'manual_review';
}

// -----------------------------------------------------------------------------
// CONFLICT DETECTION
// -----------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
async function detectPolicyConflicts(
  supabase: any,
  policyPack: PolicyPack
): Promise<ConflictReport[]> {
  const conflicts: ConflictReport[] = [];

  // Check for existing active policy pack
  const { data: existing } = await supabase
    .from('institution_policy_packs')
    .select('*')
    .eq('institution', policyPack.institution)
    .eq('academic_year', policyPack.academic_year)
    .eq('status', 'active')
    .single();

  if (existing) {
    // Compare key fields
    const existingPolicy = existing.policy_json as Record<string, unknown>;
    
    // Check residency
    const existingResidency = (existingPolicy.residency_policy as Record<string, unknown>)?.min_institutional_credits;
    const newResidency = policyPack.residency_policy.min_institutional_credits;
    if (existingResidency !== newResidency && existingResidency != null && newResidency != null) {
      conflicts.push({
        type: 'value_mismatch',
        existing_id: existing.id,
        field: 'residency_policy.min_institutional_credits',
        existing_value: existingResidency,
        new_value: newResidency,
        resolution: 'manual_review',
      });
    }

    // Check ACE/NCCRS limit
    const existingAceLimit = (existingPolicy.transfer_credit_limits as Record<string, unknown>)?.max_ace_nccrs_credits;
    const newAceLimit = (policyPack.transfer_credit_limits as Record<string, unknown>)?.max_ace_nccrs_credits;
    if (existingAceLimit !== newAceLimit && existingAceLimit != null && newAceLimit != null) {
      conflicts.push({
        type: 'value_mismatch',
        existing_id: existing.id,
        field: 'transfer_credit_limits.max_ace_nccrs_credits',
        existing_value: existingAceLimit,
        new_value: newAceLimit,
        resolution: 'manual_review',
      });
    }

    // If no value mismatches, we can supersede
    if (conflicts.length === 0) {
      conflicts.push({
        type: 'policy_exists',
        existing_id: existing.id,
        field: 'entire_policy',
        existing_value: existing.updated_at,
        new_value: new Date().toISOString(),
        resolution: 'supersede',
      });
    }
  }

  return conflicts;
}

// deno-lint-ignore no-explicit-any
async function detectProviderRuleConflicts(
  supabase: any,
  institution: string,
  providerRules: ProviderRule[]
): Promise<ConflictReport[]> {
  const conflicts: ConflictReport[] = [];

  for (const rule of providerRules) {
    // Check for existing provider acceptance rule
    const { data: existing } = await supabase
      .from('credit_transfer_rules')
      .select('*')
      .eq('target_institution', institution)
      .eq('source_institution', rule.provider_name)
      .eq('rule_type', 'provider_acceptance')
      .eq('status', 'active')
      .single();

    if (existing) {
      const existingPayload = existing.rule_payload as Record<string, unknown>;
      if (existingPayload?.acceptance_status !== rule.acceptance_status) {
        conflicts.push({
          type: 'rule_conflict',
          existing_id: existing.id,
          field: 'acceptance_status',
          existing_value: existingPayload?.acceptance_status,
          new_value: rule.acceptance_status,
          resolution: 'manual_review',
        });
      }
    }
  }

  return conflicts;
}

// -----------------------------------------------------------------------------
// PUBLISHING FUNCTIONS
// -----------------------------------------------------------------------------

// deno-lint-ignore no-explicit-any
async function publishPolicyPack(
  supabase: any,
  policyPack: PolicyPack,
  confidence: ConfidenceBreakdown,
  totalScore: number,
  scrapeJobId: string | null,
  status: 'draft' | 'active'
): Promise<string> {
  // First, supersede any existing active policy
  await supabase
    .from('institution_policy_packs')
    .update({ status: 'superseded' })
    .eq('institution', policyPack.institution)
    .eq('academic_year', policyPack.academic_year)
    .eq('status', 'active');

  // Insert new policy pack
  const { data, error } = await supabase
    .from('institution_policy_packs')
    .insert({
      institution: policyPack.institution,
      academic_year: policyPack.academic_year,
      degree_level: 'undergraduate',
      policy_json: policyPack,
      confidence_score: totalScore,
      last_verified_at: new Date().toISOString(),
      verification_source: 'transfer-scraper-extract',
      status,
      effective_start: policyPack.policy_effective_dates.effective_start,
      effective_end: policyPack.policy_effective_dates.effective_end,
      source_scrape_ids: scrapeJobId ? [scrapeJobId] : [],
    })
    .select('id')
    .single();

  if (error) throw new Error(`Failed to insert policy pack: ${error.message}`);
  return data.id;
}

// deno-lint-ignore no-explicit-any
async function publishProviderRules(
  supabase: any,
  institution: string,
  providerRules: ProviderRule[],
  confidence: ConfidenceBreakdown,
  totalScore: number,
  status: 'draft' | 'active'
): Promise<string[]> {
  const insertedIds: string[] = [];

  for (const rule of providerRules) {
    // Deprecate existing rule if any
    await supabase
      .from('credit_transfer_rules')
      .update({ status: 'deprecated' })
      .eq('target_institution', institution)
      .eq('source_institution', rule.provider_name)
      .eq('rule_type', 'provider_acceptance')
      .eq('status', 'active');

    // Insert new rule
    const { data, error } = await supabase
      .from('credit_transfer_rules')
      .insert({
        source_institution: rule.provider_name,
        target_institution: institution,
        rule_type: 'provider_acceptance',
        acceptance_status: rule.acceptance_status === 'not_accepted' ? 'rejected' : 'accepted',
        rule_payload: {
          provider_type: rule.provider_type,
          acceptance_status: rule.acceptance_status,
          credit_constraints: rule.credit_constraints,
          conditions: rule.conditions,
        },
        confidence: totalScore / 100, // Normalize to 0-1
        last_verified_at: new Date().toISOString(),
        verification_source: 'transfer-scraper-extract',
        status,
      })
      .select('id')
      .single();

    if (error) {
      console.error(`Failed to insert provider rule for ${rule.provider_name}:`, error);
      continue;
    }

    insertedIds.push(data.id);
  }

  return insertedIds;
}

// deno-lint-ignore no-explicit-any
async function createEvidence(
  supabase: any,
  policyPackId: string | null,
  ruleIds: string[],
  scrapeJobId: string | null
): Promise<void> {
  if (!scrapeJobId) return;

  // Get the source URL from the scrape job
  const { data: job } = await supabase
    .from('scrape_jobs')
    .select('url')
    .eq('id', scrapeJobId)
    .single();

  const evidenceRecords = [];

  if (policyPackId) {
    evidenceRecords.push({
      policy_pack_id: policyPackId,
      evidence_type: 'url',
      evidence_url: job?.url,
      evidence_data: { scrape_job_id: scrapeJobId },
      captured_by: 'system',
    });
  }

  for (const ruleId of ruleIds) {
    evidenceRecords.push({
      rule_id: ruleId,
      evidence_type: 'url',
      evidence_url: job?.url,
      evidence_data: { scrape_job_id: scrapeJobId },
      captured_by: 'system',
    });
  }

  if (evidenceRecords.length > 0) {
    await supabase.from('transfer_evidence').insert(evidenceRecords);
  }
}

// -----------------------------------------------------------------------------
// MAIN HANDLER
// -----------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const body: ValidationRequest = await req.json();
    const { scrape_job_id, extraction_result, force_action, reviewer_id, reviewer_notes } = body;

    // Get extraction result
    let result: ExtractionResult;
    
    if (extraction_result) {
      result = extraction_result;
    } else if (scrape_job_id) {
      // Load from scraped_content
      const { data: content, error } = await supabase
        .from('scraped_content')
        .select('ai_extracted_data')
        .eq('scrape_job_id', scrape_job_id)
        .maybeSingle();

      if (error || !content?.ai_extracted_data) {
        return new Response(
          JSON.stringify({ error: 'No extraction data found', details: error }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      result = content.ai_extracted_data as ExtractionResult;
    } else {
      return new Response(
        JSON.stringify({ error: 'Either scrape_job_id or extraction_result is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine action
    let action = result.action;
    if (force_action === 'approve') action = 'auto_approve';
    if (force_action === 'reject') {
      return new Response(
        JSON.stringify({
          success: true,
          action_taken: 'rejected',
          message: `Rejected by ${reviewer_id || 'system'}. Notes: ${reviewer_notes || 'None'}`,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Detect conflicts
    const policyConflicts = result.policy_pack 
      ? await detectPolicyConflicts(supabase, result.policy_pack)
      : [];
    
    const providerConflicts = result.policy_pack
      ? await detectProviderRuleConflicts(supabase, result.policy_pack.institution, result.provider_rules)
      : [];

    const allConflicts = [...policyConflicts, ...providerConflicts];
    const hasManualReviewConflicts = allConflicts.some(c => c.resolution === 'manual_review');

    // If conflicts require manual review and we're not force-approving, hold
    if (hasManualReviewConflicts && action !== 'auto_approve') {
      action = 'human_review';
    }

    // Execute based on action
    let validationResult: ValidationResult;

    switch (action) {
      case 'auto_approve': {
        if (!result.policy_pack) {
          validationResult = {
            success: false,
            action_taken: 'held',
            message: 'No policy pack to approve',
          };
          break;
        }

        // Always insert as draft first (GATE -1 blocks INSERT-as-active)
        // High-confidence packs are marked for quick human promotion
        const policyPackId = await publishPolicyPack(
          supabase,
          result.policy_pack,
          result.confidence,
          result.total_score,
          scrape_job_id || null,
          'draft'  // Always draft - activation requires human/GT validation
        );

        const providerRuleIds = await publishProviderRules(
          supabase,
          result.policy_pack.institution,
          result.provider_rules,
          result.confidence,
          result.total_score,
          'draft'  // Always draft
        );

        await createEvidence(supabase, policyPackId, providerRuleIds, scrape_job_id || null);

        validationResult = {
          success: true,
          action_taken: 'approved',
          policy_pack_id: policyPackId,
          provider_rule_ids: providerRuleIds,
          conflicts: allConflicts,
          message: `Auto-approved with score ${result.total_score}. Created ${providerRuleIds.length} provider rules.`,
        };
        break;
      }

      case 'human_review': {
        if (!result.policy_pack) {
          validationResult = {
            success: false,
            action_taken: 'held',
            message: 'No policy pack for review',
          };
          break;
        }

        // Publish with draft status
        const policyPackId = await publishPolicyPack(
          supabase,
          result.policy_pack,
          result.confidence,
          result.total_score,
          scrape_job_id || null,
          'draft'
        );

        const providerRuleIds = await publishProviderRules(
          supabase,
          result.policy_pack.institution,
          result.provider_rules,
          result.confidence,
          result.total_score,
          'draft'
        );

        await createEvidence(supabase, policyPackId, providerRuleIds, scrape_job_id || null);

        validationResult = {
          success: true,
          action_taken: 'pending_review',
          policy_pack_id: policyPackId,
          provider_rule_ids: providerRuleIds,
          conflicts: allConflicts,
          message: `Pending review with score ${result.total_score}. ${allConflicts.length} conflicts detected.`,
        };
        break;
      }

      case 'hold':
      default: {
        validationResult = {
          success: true,
          action_taken: 'held',
          conflicts: allConflicts,
          message: `Held due to low confidence (${result.total_score}). Manual extraction recommended.`,
        };
        break;
      }
    }

    return new Response(
      JSON.stringify(validationResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Validation error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
