import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkV1InstitutionScope } from '../_shared/policyGate.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScanRequest {
  institution_code?: string;
  program_code?: string;
  auto_fix?: boolean;
  created_by?: string;
}

interface CheckResult {
  template_id: string;
  institution_code: string;
  program_code: string;
  check_name: string;
  check_category: string;
  status: 'pass' | 'fail' | 'warn';
  details: Record<string, unknown>;
  auto_fixable: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } },
  );

  try {
    let body: ScanRequest = {};
    try {
      body = await req.json();
    } catch {
      // No body - use defaults
    }

    const { institution_code, program_code = 'BSBA', auto_fix = false, created_by = 'manual' } = body;

    // V1 SCOPE ENFORCEMENT: If specific institution provided, verify it's allowed
    if (institution_code) {
      const scopeCheck = checkV1InstitutionScope(institution_code);
      if (!scopeCheck.allowed) {
        console.warn(`[run-degree-truth-scan] V1 scope block: ${scopeCheck.reason}`);
        return new Response(
          JSON.stringify({ error: 'INSTITUTION_NOT_IN_V1_SCOPE', message: scopeCheck.reason }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log(`[run-degree-truth-scan] Starting scan: institution=${institution_code || 'all'}, program=${program_code}, auto_fix=${auto_fix}`);

    // Create audit run record
    const { data: runData, error: runError } = await supabase
      .from('audit_runs')
      .insert({
        run_type: institution_code ? 'single_school' : 'full',
        scope: { institution_code, program_code },
        status: 'running',
        created_by,
        template_version: 'v3',
        catalog_year: '2024-2025',
      })
      .select()
      .single();

    if (runError || !runData) {
      throw new Error(`Failed to create audit run: ${runError?.message}`);
    }

    const runId = runData.id;
    const findings: CheckResult[] = [];

    // Fetch all templates in scope
    let templatesQuery = supabase
      .from('degree_templates')
      .select('id, institution_code, program_code, track_type, total_credits, template_data');
    
    if (institution_code) {
      templatesQuery = templatesQuery.eq('institution_code', institution_code);
    }
    if (program_code) {
      templatesQuery = templatesQuery.eq('program_code', program_code);
    }

    const { data: templates, error: templatesError } = await templatesQuery;

    if (templatesError) {
      throw new Error(`Failed to fetch templates: ${templatesError.message}`);
    }

    console.log(`[run-degree-truth-scan] Found ${templates?.length || 0} templates to scan`);

    // Build template ID list for scoped queries
    const templateIds = (templates || []).map(t => t.id);

    // ============= CHECK 1: Baseline Coverage (scoped to template IDs) =============
    const { data: baselines } = await supabase
      .from('template_baseline_snapshots')
      .select('template_id')
      .in('template_id', templateIds.length > 0 ? templateIds : ['__none__']);

    const baselineTemplateIds = new Set((baselines || []).map(b => b.template_id));

    // ============= CHECK 2: Cost Snapshot Coverage (scoped to template IDs) =============
    const { data: costSnapshots } = await supabase
      .from('template_cost_snapshots')
      .select('template_id')
      .in('template_id', templateIds.length > 0 ? templateIds : ['__none__']);

    const costTemplateIds = new Set((costSnapshots || []).map(c => c.template_id));

    // ============= CHECK 3: Policy Pack Coverage (FIXED: use 'institution' column) =============
    const { data: policyPacks } = await supabase
      .from('institution_policy_packs')
      .select('institution, id, policy_data')
      .eq('status', 'active');

    // Map institution -> { id, policy_data } for cap/residency lookups
    interface PolicyPackData {
      id: string;
      policy_data: { max_alt_credit?: number; residency_credits?: number } | null;
    }
    const policyPackMap = new Map<string, PolicyPackData>(
      (policyPacks || []).map(p => [p.institution, { id: p.id, policy_data: p.policy_data }])
    );

    // ============= CHECK 4: Pricing Pack Coverage =============
    const { data: pricingPacks } = await supabase
      .from('institution_pricing_packs')
      .select('institution_code, id')
      .eq('status', 'active');

    const pricingPackMap = new Map((pricingPacks || []).map(p => [p.institution_code, p.id]));

    // Run checks for each template
    for (const template of templates || []) {
      const templateId = template.id;
      const instCode = template.institution_code;
      const progCode = template.program_code;
      const trackType = template.track_type;
      const templateData = template.template_data as Record<string, unknown>;

      // Check 1: baseline_exists
      const hasBaseline = baselineTemplateIds.has(templateId);
      findings.push({
        template_id: templateId,
        institution_code: instCode,
        program_code: progCode,
        check_name: 'baseline_exists',
        check_category: 'coverage',
        status: hasBaseline ? 'pass' : 'fail',
        details: { has_baseline: hasBaseline },
        auto_fixable: true,
      });

      // Auto-fix: generate baseline if missing
      if (!hasBaseline && auto_fix && pricingPackMap.has(instCode)) {
        console.log(`[run-degree-truth-scan] Auto-fixing baseline for ${templateId}`);
        const { data: baselineResult } = await supabase.rpc('compute_template_baseline', {
          p_template_id: templateId,
          p_institution_code: instCode,
          p_program_code: progCode,
          p_total_credits: template.total_credits || 120,
        });

        if (baselineResult && baselineResult.length > 0) {
          const baseline = baselineResult[0];
          await supabase.from('template_baseline_snapshots').insert({
            template_id: templateId,
            institution_code: instCode,
            program_code: progCode,
            baseline_cost_usd: baseline.baseline_cost_usd,
            baseline_weeks: baseline.baseline_weeks,
            baseline_status: baseline.baseline_status,
            inputs: baseline.inputs,
            source_description: baseline.source_description,
          });
          findings[findings.length - 1].details = { ...findings[findings.length - 1].details, auto_fixed: true };
        }
      }

      // Check 2: cost_exists
      const hasCost = costTemplateIds.has(templateId);
      findings.push({
        template_id: templateId,
        institution_code: instCode,
        program_code: progCode,
        check_name: 'cost_exists',
        check_category: 'coverage',
        status: hasCost ? 'pass' : 'fail',
        details: { has_cost: hasCost },
        auto_fixable: true,
      });

      // Check 3: policy_pack_exists (FIXED: use policyPackMap with 'institution' key)
      const policyPack = policyPackMap.get(instCode);
      const hasPolicy = !!policyPack;
      findings.push({
        template_id: templateId,
        institution_code: instCode,
        program_code: progCode,
        check_name: 'policy_pack_exists',
        check_category: 'coverage',
        status: hasPolicy ? 'pass' : 'fail',
        details: { has_policy_pack: hasPolicy, policy_pack_id: policyPack?.id },
        auto_fixable: false,
      });

      // Check 4: pricing_pack_exists
      const hasPricing = pricingPackMap.has(instCode);
      findings.push({
        template_id: templateId,
        institution_code: instCode,
        program_code: progCode,
        check_name: 'pricing_pack_exists',
        check_category: 'coverage',
        status: hasPricing ? 'pass' : 'fail',
        details: { has_pricing_pack: hasPricing, pricing_pack_id: pricingPackMap.get(instCode) },
        auto_fixable: false,
      });

      // Check 5: cap_compliance (FIXED: use policy-driven cap, track-aware)
      if (templateData && typeof templateData === 'object') {
        let altCredits = 0;
        const terms = (templateData as { terms?: unknown[] }).terms || [];
        for (const term of terms) {
          const slots = (term as { slots?: unknown[] }).slots || [];
          for (const slot of slots) {
            const slotData = slot as { preferred?: { type?: string }; minCredits?: number };
            if (slotData.preferred?.type === 'alt_credit') {
              altCredits += slotData.minCredits || 3;
            }
          }
        }
        
        // Get cap from policy pack (institution-specific)
        const maxAltCredits = policyPack?.policy_data?.max_alt_credit ?? null;
        
        // Only apply cap check to alt_max tracks; standard tracks have enforced caps already
        if (trackType === 'alt_max' || trackType === 'cheapest') {
          if (maxAltCredits === null) {
            // No policy pack - can't evaluate cap, WARN instead of FAIL
            findings.push({
              template_id: templateId,
              institution_code: instCode,
              program_code: progCode,
              check_name: 'cap_compliance',
              check_category: 'correctness',
              status: 'warn',
              details: { alt_credits: altCredits, max_allowed: null, reason: 'no_policy_pack' },
              auto_fixable: false,
            });
          } else {
            const capCompliant = altCredits <= maxAltCredits;
            findings.push({
              template_id: templateId,
              institution_code: instCode,
              program_code: progCode,
              check_name: 'cap_compliance',
              check_category: 'correctness',
              status: capCompliant ? 'pass' : 'fail',
              details: { alt_credits: altCredits, max_allowed: maxAltCredits },
              auto_fixable: false,
            });
          }
        } else {
          // Standard tracks: always pass cap (enforceAltCap already applied)
          findings.push({
            template_id: templateId,
            institution_code: instCode,
            program_code: progCode,
            check_name: 'cap_compliance',
            check_category: 'correctness',
            status: 'pass',
            details: { alt_credits: altCredits, track_type: trackType, note: 'standard_track_enforced' },
            auto_fixable: false,
          });
        }

        // Check 6: residency_compliance (institutional credits >= residency requirement)
        const residencyRequired = policyPack?.policy_data?.residency_credits ?? null;
        let institutionalCredits = 0;
        for (const term of terms) {
          const slots = (term as { slots?: unknown[] }).slots || [];
          for (const slot of slots) {
            const slotData = slot as { preferred?: { type?: string }; minCredits?: number };
            if (slotData.preferred?.type === 'institutional_course') {
              institutionalCredits += slotData.minCredits || 3;
            }
          }
        }

        if (residencyRequired === null) {
          findings.push({
            template_id: templateId,
            institution_code: instCode,
            program_code: progCode,
            check_name: 'residency_compliance',
            check_category: 'correctness',
            status: 'warn',
            details: { institutional_credits: institutionalCredits, residency_required: null, reason: 'no_policy_pack' },
            auto_fixable: false,
          });
        } else {
          const residencyCompliant = institutionalCredits >= residencyRequired;
          findings.push({
            template_id: templateId,
            institution_code: instCode,
            program_code: progCode,
            check_name: 'residency_compliance',
            check_category: 'correctness',
            status: residencyCompliant ? 'pass' : 'fail',
            details: { institutional_credits: institutionalCredits, residency_required: residencyRequired },
            auto_fixable: false,
          });
        }
      }
    }

    // ============= TRANSFER TRUTH CHECKS (Using optimized RPC) =============
    console.log(`[run-degree-truth-scan] Running transfer truth checks via RPC...`);

    interface TransferSlot {
      template_id: string;
      institution_code: string;
      program_code: string;
      slot_id: string;
      requirement_area: string;
      provider_norm: string;
      course_norm: string;
      status_bucket: string;
      placement_missing: boolean;
    }

    let transferSlots: TransferSlot[] = [];

    // Try the optimized RPC first
    const { data: rpcResults, error: rpcError } = await supabase.rpc('get_transfer_truth_slots', {
      p_program_code: program_code,
      p_institution_code: institution_code || null,
    });

    if (!rpcError && rpcResults && rpcResults.length > 0) {
      console.log(`[run-degree-truth-scan] RPC returned ${rpcResults.length} slots`);
      transferSlots = rpcResults as TransferSlot[];
    } else {
      // Fallback: inline extraction with proper batching
      console.log(`[run-degree-truth-scan] Using inline fallback (RPC error: ${rpcError?.message || 'no results'})`);
      
      // Extract alt slots from templates we already fetched
      const altSlotList: Array<{
        template_id: string;
        institution_code: string;
        program_code: string;
        slot_id: string;
        requirement_area: string;
        provider_norm: string;
        course_norm: string;
      }> = [];

      for (const template of templates || []) {
        const templateData = template.template_data as { terms?: Array<{ slots?: unknown[] }> };
        const terms = templateData?.terms || [];
        for (const term of terms) {
          const slots = term.slots || [];
          for (const slot of slots) {
            const s = slot as {
              slotId?: string;
              requirementArea?: string;
              preferred?: { type?: string; sourceCode?: string; identifier?: string };
            };
            if (s.preferred?.type === 'alt_credit') {
              altSlotList.push({
                template_id: template.id,
                institution_code: template.institution_code,
                program_code: template.program_code,
                slot_id: s.slotId || 'unknown',
                requirement_area: s.requirementArea || 'unknown',
                provider_norm: (s.preferred.sourceCode || '').toUpperCase(),
                course_norm: (s.preferred.identifier || '').toLowerCase(),
              });
            }
          }
        }
      }

      // Batch fetch rules with proper filtering (include course_norm in chunks)
      if (altSlotList.length > 0) {
        // Group by (target, provider) for efficient batched lookups
        const groupedByTargetProvider = new Map<string, Set<string>>();
        for (const s of altSlotList) {
          const key = `${s.institution_code}|${s.provider_norm}`;
          if (!groupedByTargetProvider.has(key)) {
            groupedByTargetProvider.set(key, new Set());
          }
          groupedByTargetProvider.get(key)!.add(s.course_norm);
        }

        // Fetch rules in batches (by target+provider pair, with course_norm filtering)
        const ruleMap = new Map<string, { acceptance_status: string; target_course_code: string | null }>();
        
        for (const [targetProvider, courseSet] of groupedByTargetProvider) {
          const [target, provider] = targetProvider.split('|');
          const courses = [...courseSet];
          
          // Chunk courses if too many (500 per batch)
          const CHUNK_SIZE = 500;
          for (let i = 0; i < courses.length; i += CHUNK_SIZE) {
            const chunk = courses.slice(i, i + CHUNK_SIZE);
            
            const { data: ruleRows } = await supabase
              .from('credit_transfer_rules')
              .select('source_course_code_norm, acceptance_status, target_course_code')
              .eq('target_institution_norm', target)
              .eq('source_institution_norm', provider)
              .in('source_course_code_norm', chunk);

            for (const r of ruleRows || []) {
              const key = `${target}|${provider}|${r.source_course_code_norm}`;
              ruleMap.set(key, { 
                acceptance_status: r.acceptance_status, 
                target_course_code: r.target_course_code 
              });
            }
          }
        }

        // Classify each slot
        for (const slot of altSlotList) {
          const key = `${slot.institution_code}|${slot.provider_norm}|${slot.course_norm}`;
          const rule = ruleMap.get(key);

          let status_bucket: string;
          let placement_missing = false;

          if (!rule) {
            status_bucket = 'missing';
          } else {
            const status = rule.acceptance_status || '';
            if (/deny|reject|not accept/i.test(status)) {
              status_bucket = 'denied';
            } else if (/review|unknown|verify/i.test(status)) {
              status_bucket = 'needs_review';
            } else if (/elective/i.test(status)) {
              status_bucket = 'elective_only';
            } else if (/accept/i.test(status)) {
              status_bucket = 'accepted';
              if (!rule.target_course_code || rule.target_course_code.trim() === '') {
                placement_missing = true;
              }
            } else {
              status_bucket = 'other';
            }
          }

          transferSlots.push({
            ...slot,
            status_bucket,
            placement_missing,
          });
        }
      }
    }

    console.log(`[run-degree-truth-scan] Analyzed ${transferSlots.length} alt slots for transfer truth`);

    // Aggregate by template
    const transferByTemplate = new Map<string, {
      institution_code: string;
      program_code: string;
      missing: TransferSlot[];
      non_accepted: TransferSlot[];
      placement_missing: TransferSlot[];
      total_slots: number;
    }>();

    for (const slot of transferSlots) {
      if (!transferByTemplate.has(slot.template_id)) {
        transferByTemplate.set(slot.template_id, {
          institution_code: slot.institution_code,
          program_code: slot.program_code,
          missing: [],
          non_accepted: [],
          placement_missing: [],
          total_slots: 0,
        });
      }
      const entry = transferByTemplate.get(slot.template_id)!;
      entry.total_slots++;

      if (slot.status_bucket === 'missing') {
        entry.missing.push(slot);
      } else if (['denied', 'needs_review', 'elective_only', 'other'].includes(slot.status_bucket)) {
        entry.non_accepted.push(slot);
      }
      if (slot.placement_missing) {
        entry.placement_missing.push(slot);
      }
    }

    // Generate transfer truth findings for each template
    for (const [templateId, data] of transferByTemplate) {
      // Check 7: transfer_rule_coverage
      findings.push({
        template_id: templateId,
        institution_code: data.institution_code,
        program_code: data.program_code,
        check_name: 'transfer_rule_coverage',
        check_category: 'correctness',
        status: data.missing.length === 0 ? 'pass' : 'fail',
        details: {
          total_alt_slots: data.total_slots,
          missing_rule_count: data.missing.length,
          example_missing: data.missing.slice(0, 10).map(s => ({
            slot_id: s.slot_id,
            provider: s.provider_norm,
            course: s.course_norm,
            requirement_area: s.requirement_area,
          })),
        },
        auto_fixable: false,
      });

      // Check 8: transfer_acceptance
      findings.push({
        template_id: templateId,
        institution_code: data.institution_code,
        program_code: data.program_code,
        check_name: 'transfer_acceptance',
        check_category: 'correctness',
        status: data.non_accepted.length === 0 ? 'pass' : 'fail',
        details: {
          non_accepted_count: data.non_accepted.length,
          breakdown: {
            denied: data.non_accepted.filter(s => s.status_bucket === 'denied').length,
            needs_review: data.non_accepted.filter(s => s.status_bucket === 'needs_review').length,
            elective_only: data.non_accepted.filter(s => s.status_bucket === 'elective_only').length,
            other: data.non_accepted.filter(s => s.status_bucket === 'other').length,
          },
          example_non_accepted: data.non_accepted.slice(0, 10).map(s => ({
            slot_id: s.slot_id,
            provider: s.provider_norm,
            course: s.course_norm,
            status_bucket: s.status_bucket,
          })),
        },
        auto_fixable: false,
      });

      // Check 9: placement_mapping
      findings.push({
        template_id: templateId,
        institution_code: data.institution_code,
        program_code: data.program_code,
        check_name: 'placement_mapping',
        check_category: 'correctness',
        status: data.placement_missing.length === 0 ? 'pass' : 'fail',
        details: {
          placement_missing_count: data.placement_missing.length,
          example_missing_target: data.placement_missing.slice(0, 10).map(s => ({
            slot_id: s.slot_id,
            provider: s.provider_norm,
            course: s.course_norm,
          })),
        },
        auto_fixable: false,
      });
    }

    // For templates with NO alt slots, mark transfer checks as pass (nothing to check)
    for (const template of templates || []) {
      if (!transferByTemplate.has(template.id)) {
        findings.push({
          template_id: template.id,
          institution_code: template.institution_code,
          program_code: template.program_code,
          check_name: 'transfer_rule_coverage',
          check_category: 'correctness',
          status: 'pass',
          details: { total_alt_slots: 0, coverage_pct: null, note: 'no_alt_slots' },
          auto_fixable: false,
        });
        findings.push({
          template_id: template.id,
          institution_code: template.institution_code,
          program_code: template.program_code,
          check_name: 'transfer_acceptance',
          check_category: 'correctness',
          status: 'pass',
          details: { non_accepted_count: 0, note: 'no_alt_slots' },
          auto_fixable: false,
        });
        findings.push({
          template_id: template.id,
          institution_code: template.institution_code,
          program_code: template.program_code,
          check_name: 'placement_mapping',
          check_category: 'correctness',
          status: 'pass',
          details: { placement_missing_count: 0, note: 'no_alt_slots' },
          auto_fixable: false,
        });
        // Note: evidence_coverage finding is added later in the evidence check section
      }
    }

    console.log(`[run-degree-truth-scan] Transfer truth checks complete`);

    // ============= CHECK 10: Evidence Coverage (per template) =============
    // Fetch evidence_url for all accepted rules in scope
    console.log(`[run-degree-truth-scan] Running evidence coverage check...`);

    // Build list of accepted (target, provider, course) tuples that need evidence check
    const acceptedTuples: Array<{
      template_id: string;
      institution_code: string;
      program_code: string;
      provider_norm: string;
      course_norm: string;
    }> = [];

    for (const slot of transferSlots) {
      if (slot.status_bucket === 'accepted') {
        acceptedTuples.push({
          template_id: slot.template_id,
          institution_code: slot.institution_code,
          program_code: slot.program_code,
          provider_norm: slot.provider_norm,
          course_norm: slot.course_norm,
        });
      }
    }

    // Fetch evidence_url for accepted rules (batched by target+provider for efficiency)
    const evidenceMap = new Map<string, boolean>();
    
    if (acceptedTuples.length > 0) {
      // Group by (target, provider) -> set of courses for tight batching
      const byTargetProvider = new Map<string, Set<string>>();
      for (const t of acceptedTuples) {
        const key = `${t.institution_code}|${t.provider_norm}`;
        if (!byTargetProvider.has(key)) {
          byTargetProvider.set(key, new Set());
        }
        byTargetProvider.get(key)!.add(t.course_norm);
      }

      // Fetch evidence per (target, provider) group with chunked courses
      for (const [targetProvider, courseSet] of byTargetProvider) {
        const [target, provider] = targetProvider.split('|');
        const courses = [...courseSet];
        
        const CHUNK_SIZE = 500;
        for (let i = 0; i < courses.length; i += CHUNK_SIZE) {
          const chunk = courses.slice(i, i + CHUNK_SIZE);
          
          const { data: evidenceRows } = await supabase
            .from('credit_transfer_rules')
            .select('source_course_code_norm, evidence_url')
            .eq('target_institution_norm', target)
            .eq('source_institution_norm', provider)
            .in('source_course_code_norm', chunk);

          for (const r of evidenceRows || []) {
            const key = `${target}|${provider}|${r.source_course_code_norm}`;
            const hasEvidence = !!(r.evidence_url && r.evidence_url.trim().length > 0);
            evidenceMap.set(key, hasEvidence);
          }
        }
      }
    }

    // Aggregate evidence by template
    const evidenceByTemplate = new Map<string, {
      institution_code: string;
      program_code: string;
      accepted_total: number;
      with_evidence: number;
      missing_evidence: Array<{ provider: string; course: string }>;
    }>();

    for (const tuple of acceptedTuples) {
      if (!evidenceByTemplate.has(tuple.template_id)) {
        evidenceByTemplate.set(tuple.template_id, {
          institution_code: tuple.institution_code,
          program_code: tuple.program_code,
          accepted_total: 0,
          with_evidence: 0,
          missing_evidence: [],
        });
      }
      const entry = evidenceByTemplate.get(tuple.template_id)!;
      entry.accepted_total++;

      const key = `${tuple.institution_code}|${tuple.provider_norm}|${tuple.course_norm}`;
      const hasEvidence = evidenceMap.get(key) ?? false;
      
      if (hasEvidence) {
        entry.with_evidence++;
      } else {
        if (entry.missing_evidence.length < 10) {
          entry.missing_evidence.push({ provider: tuple.provider_norm, course: tuple.course_norm });
        }
      }
    }

    // Tier A threshold (configurable)
    const TIER_A_EVIDENCE_THRESHOLD = 0.20; // 20%

    // Generate evidence coverage findings for ALL templates (not just those with accepted alt slots)
    const templateEvidencePct = new Map<string, number | null>();
    let templatesWithAcceptedAltSlots = 0;

    // First: handle templates that have accepted alt slots
    for (const [templateId, data] of evidenceByTemplate) {
      templatesWithAcceptedAltSlots++;
      const pct = data.accepted_total > 0 ? data.with_evidence / data.accepted_total : null;
      templateEvidencePct.set(templateId, pct);

      // Status logic:
      // - accepted_total = 0: pass (nothing to evidence)
      // - pct >= threshold: pass (Tier A ready)
      // - pct < threshold: warn (needs more evidence)
      let status: 'pass' | 'warn' | 'fail';
      if (data.accepted_total === 0) {
        status = 'pass';
      } else if (pct !== null && pct >= TIER_A_EVIDENCE_THRESHOLD) {
        status = 'pass';
      } else {
        status = 'warn';
      }
      
      findings.push({
        template_id: templateId,
        institution_code: data.institution_code,
        program_code: data.program_code,
        check_name: 'evidence_coverage',
        check_category: 'provenance',
        status,
        details: {
          accepted_total: data.accepted_total,
          with_evidence: data.with_evidence,
          evidence_pct: pct !== null ? Math.round(pct * 100) : null,
          threshold_pct: TIER_A_EVIDENCE_THRESHOLD * 100,
          examples_missing_evidence: data.missing_evidence,
        },
        auto_fixable: false,
      });
    }

    // Second: handle templates NOT in evidenceByTemplate (no accepted alt slots)
    // This ensures every template gets an evidence_coverage finding
    for (const template of templates || []) {
      if (!evidenceByTemplate.has(template.id)) {
        // Template has no accepted alt slots - check if it has any alt slots at all
        const hasAnyAltSlots = transferByTemplate.has(template.id);
        const note = hasAnyAltSlots ? 'no_accepted_alt_slots' : 'no_alt_slots';
        
        templateEvidencePct.set(template.id, null); // Tier B (no evidence to measure)
        
        findings.push({
          template_id: template.id,
          institution_code: template.institution_code,
          program_code: template.program_code,
          check_name: 'evidence_coverage',
          check_category: 'provenance',
          status: 'pass',
          details: {
            accepted_total: 0,
            with_evidence: 0,
            evidence_pct: null,
            threshold_pct: TIER_A_EVIDENCE_THRESHOLD * 100,
            note,
          },
          auto_fixable: false,
        });
      }
    }

    console.log(`[run-degree-truth-scan] Evidence coverage check complete (${templatesWithAcceptedAltSlots} templates with accepted alt slots)`);

    // ============= AUTO-QUEUE EVIDENCE JOBS =============
    // Collect all tuples missing evidence and queue them for backfill
    const missingEvidenceTuples: Array<{
      target_institution_norm: string;
      source_institution_norm: string;
      source_course_code_norm: string;
    }> = [];

    for (const [, data] of evidenceByTemplate) {
      for (const missing of data.missing_evidence) {
        // Use uppercase norms to match credit_transfer_rules table format
        missingEvidenceTuples.push({
          target_institution_norm: data.institution_code.toUpperCase(),
          source_institution_norm: missing.provider.toUpperCase(),
          source_course_code_norm: missing.course, // course codes stay lowercase
        });
      }
    }

    // Dedupe and limit (prevent queue explosion)
    const MAX_EVIDENCE_JOBS_PER_SCAN = 100;
    const uniqueTuples = new Map<string, typeof missingEvidenceTuples[0]>();
    for (const tuple of missingEvidenceTuples) {
      const key = `${tuple.target_institution_norm}|${tuple.source_institution_norm}|${tuple.source_course_code_norm}`;
      if (!uniqueTuples.has(key)) {
        uniqueTuples.set(key, tuple);
      }
    }

    const tuplesToQueue = [...uniqueTuples.values()].slice(0, MAX_EVIDENCE_JOBS_PER_SCAN);

    if (tuplesToQueue.length > 0) {
      console.log(`[run-degree-truth-scan] Queueing ${tuplesToQueue.length} evidence jobs (${uniqueTuples.size} unique tuples, capped at ${MAX_EVIDENCE_JOBS_PER_SCAN})`);

      // Upsert evidence jobs (ignore conflicts - jobs may already exist)
      const jobsToInsert = tuplesToQueue.map(t => ({
        target_institution_norm: t.target_institution_norm,
        source_institution_norm: t.source_institution_norm,
        source_course_code_norm: t.source_course_code_norm,
        status: 'queued',
      }));

      const { error: queueError } = await supabase
        .from('evidence_jobs')
        .upsert(jobsToInsert, {
          onConflict: 'target_institution_norm,source_institution_norm,source_course_code_norm',
          ignoreDuplicates: true, // Don't update existing jobs
        });

      if (queueError) {
        console.warn(`[run-degree-truth-scan] Failed to queue evidence jobs: ${queueError.message}`);
      }
    }

    // Bulk upsert findings (idempotent per run - uses unique constraint on run_id, template_id, check_name)
    if (findings.length > 0) {
      const findingsToUpsert = findings.map(f => ({
        run_id: runId,
        template_id: f.template_id,
        institution_code: f.institution_code,
        program_code: f.program_code,
        check_name: f.check_name,
        check_category: f.check_category,
        status: f.status,
        details: f.details,
        auto_fixable: f.auto_fixable,
      }));

      const { error: findingsError } = await supabase
        .from('audit_findings')
        .upsert(findingsToUpsert, {
          onConflict: 'run_id,template_id,check_name',
          ignoreDuplicates: false, // Update on conflict
        });

      if (findingsError) {
        console.warn(`[run-degree-truth-scan] Failed to upsert findings: ${findingsError.message}`);
      }
    }

    // Compute summary with proper tiering
    const totalTemplates = templates?.length || 0;
    const passingTemplates = new Set<string>();
    const failingTemplates = new Set<string>();
    const checkCounts: Record<string, { pass: number; fail: number; warn: number }> = {};

    for (const f of findings) {
      if (!checkCounts[f.check_name]) {
        checkCounts[f.check_name] = { pass: 0, fail: 0, warn: 0 };
      }
      checkCounts[f.check_name][f.status]++;

      if (f.status === 'fail') {
        failingTemplates.add(f.template_id);
      }
    }

    // Templates that have no failures are passing
    for (const t of templates || []) {
      if (!failingTemplates.has(t.id)) {
        passingTemplates.add(t.id);
      }
    }

    // ============= TIER CLASSIFICATION =============
    // Tier logic is explicit and consistent:
    //   - Tier C: Any correctness/coverage check has status='fail'
    //   - Tier B: No failures (WARN allowed), but evidence_pct < threshold OR null
    //   - Tier A: No failures (WARN allowed) AND evidence_pct >= threshold
    // 
    // Note: WARN status (e.g., evidence_coverage: warn) does NOT disqualify from Tier A/B.
    // Only FAIL status causes demotion to Tier C.
    let tierA = 0;
    let tierB = 0;
    const tierC = failingTemplates.size;

    for (const tid of passingTemplates) {
      const evPct = templateEvidencePct.get(tid);
      // Tier A requires non-null evidence AND >= threshold
      if (evPct !== null && evPct !== undefined && evPct >= TIER_A_EVIDENCE_THRESHOLD) {
        tierA++;
      } else {
        // Tier B: passes correctness but insufficient/missing evidence
        tierB++;
      }
    }

    // ============= EVIDENCE KPI SUMMARY =============
    // Aggregate evidence metrics across all templates for single KPI tracking
    let acceptedAltSlotsTotal = 0;
    let acceptedAltSlotsWithEvidenceTotal = 0;
    
    for (const f of findings) {
      if (f.check_name === 'evidence_coverage' && f.details) {
        const details = f.details as { accepted_total?: number; with_evidence?: number };
        acceptedAltSlotsTotal += details.accepted_total || 0;
        acceptedAltSlotsWithEvidenceTotal += details.with_evidence || 0;
      }
    }
    
    const acceptedAltSlotsEvidencePctOverall = acceptedAltSlotsTotal > 0
      ? Math.round((acceptedAltSlotsWithEvidenceTotal / acceptedAltSlotsTotal) * 100)
      : null;

    // Compute total alt slots for summary
    let totalAltSlots = 0;
    let templatesWithAltSlots = 0;
    for (const [, data] of transferByTemplate) {
      totalAltSlots += data.total_slots;
      templatesWithAltSlots++;
    }

    const summary = {
      total_templates: totalTemplates,
      passing: passingTemplates.size,
      failing: failingTemplates.size,
      tier_a: tierA,
      tier_b: tierB,
      tier_c: tierC,
      tier_a_threshold_pct: TIER_A_EVIDENCE_THRESHOLD * 100,
      // Alt slot metrics
      total_alt_slots: totalAltSlots,
      templates_with_alt_slots: templatesWithAltSlots,
      templates_with_accepted_alt_slots: templatesWithAcceptedAltSlots,
      // Evidence KPIs (for tracking progress toward Tier A)
      accepted_alt_slots_total: acceptedAltSlotsTotal,
      accepted_alt_slots_with_evidence_total: acceptedAltSlotsWithEvidenceTotal,
      accepted_alt_slots_evidence_pct_overall: acceptedAltSlotsEvidencePctOverall,
      // Check breakdown
      check_breakdown: checkCounts,
      auto_fix_enabled: auto_fix,
    };

    // Update audit run with summary
    await supabase
      .from('audit_runs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        summary,
      })
      .eq('id', runId);

    console.log(`[run-degree-truth-scan] Scan complete: ${passingTemplates.size} passing, ${failingTemplates.size} failing`);

    // Build top blockers
    const topBlockers = Object.entries(checkCounts)
      .map(([check, counts]) => ({ check, fail_count: counts.fail }))
      .filter(b => b.fail_count > 0)
      .sort((a, b) => b.fail_count - a.fail_count);

    // Build failing templates list
    const failingTemplatesList = [...failingTemplates].map(tid => {
      const templateFindings = findings.filter(f => f.template_id === tid && f.status === 'fail');
      return {
        template_id: tid,
        institution_code: templateFindings[0]?.institution_code || 'unknown',
        failing_checks: templateFindings.map(f => f.check_name),
        suggested_fix: templateFindings.some(f => f.auto_fixable)
          ? 'Re-run with auto_fix=true'
          : 'Manual intervention required',
      };
    });

    return new Response(
      JSON.stringify({
        success: true,
        run_id: runId,
        summary,
        top_blockers: topBlockers,
        failing_templates: failingTemplatesList,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[run-degree-truth-scan] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
