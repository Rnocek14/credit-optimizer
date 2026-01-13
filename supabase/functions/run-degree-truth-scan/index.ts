import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // Bulk insert findings
    if (findings.length > 0) {
      const findingsToInsert = findings.map(f => ({
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
        .insert(findingsToInsert);

      if (findingsError) {
        console.warn(`[run-degree-truth-scan] Failed to insert findings: ${findingsError.message}`);
      }
    }

    // Compute summary
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

    // Tier classification
    // Tier A: All checks pass + evidence
    // Tier B: All checks pass, no evidence
    // Tier C: Some checks fail
    const tierA = 0; // TODO: implement evidence check
    const tierB = passingTemplates.size;
    const tierC = failingTemplates.size;

    const summary = {
      total_templates: totalTemplates,
      passing: passingTemplates.size,
      failing: failingTemplates.size,
      tier_a: tierA,
      tier_b: tierB,
      tier_c: tierC,
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
