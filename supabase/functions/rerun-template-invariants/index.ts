/**
 * Rerun Template Invariants Edge Function
 * 
 * Admin-only endpoint to re-evaluate invariants for a specific template
 * and write a new snapshot to the audit trail.
 * 
 * POST /rerun-template-invariants
 * Body: { template_id: string, reason?: string, dry_run?: boolean }
 * 
 * Rate limited: rejects if same template rerun within last 30 seconds.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { 
  checkTemplateInvariants, 
  normalizePolicyData,
  type TemplateItem,
  type RawPolicyPack,
} from '../_shared/creditInvariantChecker.ts';
import { 
  writeInvariantDecisionSnapshot,
  deriveInvariantDecision,
  INVARIANT_VERSION,
  buildSnapshotEffectiveConfig,
} from '../_shared/invariantDecisionSnapshot.ts';
import { 
  fetchInstitutionOverridesBase,
  computeEffectiveThreshold,
  DEFAULT_INVARIANT_CONFIG,
  type EffectiveInvariantConfig,
} from '../_shared/institutionOverrides.ts';

// ============================================
// CORS
// ============================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'no-store',
};

// ============================================
// TYPES
// ============================================

interface RerunRequest {
  template_id: string;
  reason?: string;
  dry_run?: boolean;
}

interface RerunResponse {
  template_id: string;
  snapshot_id?: string;
  decision: 'pass' | 'warn' | 'block';
  violation_codes: string[];
  invariant_version: string;
  created_at?: string;
  dry_run: boolean;
}

// ============================================
// RATE LIMIT (DB-based)
// ============================================

const RATE_LIMIT_SECONDS = 30;

/**
 * Check if template was manually rerun within last 30 seconds (DB-based rate limit).
 * 
 * Discriminator: job_id IS NULL
 * - Worker-generated snapshots always have job_id set (the generation job ID)
 * - Manual reruns always have job_id = null
 * 
 * This ensures normal generation runs don't block admin reruns.
 */
async function isRateLimited(supabase: any, templateId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('invariant_decision_snapshots')
    .select('created_at')
    .eq('template_id', templateId)
    .is('job_id', null) // Only rate-limit manual reruns (job_id=null), not worker snapshots
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return false;

  const lastRunTime = new Date(data.created_at).getTime();
  const now = Date.now();
  return (now - lastRunTime) < (RATE_LIMIT_SECONDS * 1000);
}

// ============================================
// TEMPLATE EXTRACTION
// ============================================

interface TemplateJsonTerm {
  slots?: Array<{
    courseCode?: string;
    slotId?: string;
    credits?: number;
    minCredits?: number;
    source?: string;
    level?: string;
    kind?: string;
    preferred?: {
      courseCode?: string;
      type?: string;
      sourceCode?: string;
    };
  }>;
}

function extractTemplateItems(templateJson: unknown): TemplateItem[] {
  const data = templateJson as { terms?: TemplateJsonTerm[] };
  if (!data?.terms) return [];

  return data.terms.flatMap((term) =>
    (term.slots || []).map((slot) => {
      // Handle both worker format (direct) and seeder format (preferred object)
      const courseCode = slot.courseCode || slot.preferred?.courseCode || slot.slotId;
      const credits = slot.credits ?? slot.minCredits ?? 3;
      const source = slot.source || 
        (slot.preferred?.type === 'alt_credit' 
          ? (slot.preferred?.sourceCode?.toLowerCase() || 'alt') 
          : 'resident');
      
      return {
        course_code: courseCode,
        credits,
        source,
        is_upper_division: slot.level === 'upper' || slot.level === '400',
        is_capstone: slot.kind === 'capstone',
        kind: slot.kind,
        level: slot.level,
      };
    })
  );
}

// ============================================
// HANDLER
// ============================================

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    // Auth: get user from token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error(`[rerun-template-invariants] Auth error: ${userError?.message}`);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin check via user_roles table
    const { data: roleRow, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (roleError) {
      console.error(`[rerun-template-invariants] Role check error: ${roleError.message}`);
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin role' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!roleRow) {
      return new Response(
        JSON.stringify({ error: 'Forbidden: Admin role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    let body: RerunRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { template_id, reason, dry_run } = body;
    const isDryRun = dry_run === true;

    if (!template_id || typeof template_id !== 'string') {
      return new Response(
        JSON.stringify({ error: 'template_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Service client for writes (created early for rate limit check)
    const supabaseService = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Rate limit check (DB-based - works across instances)
    const rateLimited = await isRateLimited(supabaseService, template_id);
    if (rateLimited) {
      return new Response(
        JSON.stringify({ error: 'Rate limited: please wait 30 seconds between reruns for the same template' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[rerun-template-invariants] Admin ${user.email} rerunning for template ${template_id} (dry_run=${isDryRun})${reason ? ` reason: ${reason}` : ''}`);

    // Load template from program_templates
    const { data: template, error: templateError } = await supabaseService
      .from('program_templates')
      .select('id, institution_code, program_slug, program_catalog_id, track, template_json')
      .eq('id', template_id)
      .maybeSingle();

    if (templateError) {
      console.error(`[rerun-template-invariants] Template fetch error: ${templateError.message}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch template' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!template) {
      return new Response(
        JSON.stringify({ error: 'Template not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract template items for invariant checking
    const items = extractTemplateItems(template.template_json);
    
    if (items.length === 0) {
      console.warn(`[rerun-template-invariants] No items extracted from template ${template_id}`);
    }

    // Fetch institution overrides
    const invariantConfigBase = await fetchInstitutionOverridesBase(
      supabaseService,
      template.institution_code
    );

    // Determine template status - try to get from latest snapshot or default to pending_review
    const { data: latestSnapshot } = await supabaseService
      .from('invariant_decision_snapshots')
      .select('template_status')
      .eq('template_id', template_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const templateStatus = latestSnapshot?.template_status || 'pending_review';
    const effectiveWarnThreshold = computeEffectiveThreshold(invariantConfigBase, templateStatus);

    // Build policy data (basic - we don't have full policy pack access here)
    const invariantPolicy = normalizePolicyData({
      degree_credit_total: 120, // Default - could be enhanced by loading from program_catalog
    } as RawPolicyPack);

    // Run invariant check
    const invariantReport = checkTemplateInvariants({
      template_id,
      template_table: 'program_templates',
      institution_code: template.institution_code,
      program_code: template.program_slug,
      policy_data: invariantPolicy,
      items,
      mode: 'warn_only',
      template_status: templateStatus,
      unknown_credits_warn_threshold: effectiveWarnThreshold,
      unknown_credits_active_hard_zero: invariantConfigBase.unknownCreditsActiveHardZero,
    });

    // Compute decision and violation codes
    const allViolations = [...invariantReport.errors, ...invariantReport.warnings];
    const decision = deriveInvariantDecision(allViolations);
    const violationCodes = allViolations.map(v => v.type);

    console.log(`[rerun-template-invariants] Result: decision=${decision}, violations=${violationCodes.length}`);

    // Response without snapshot write (dry run or actual)
    const response: RerunResponse = {
      template_id,
      decision,
      violation_codes: violationCodes,
      invariant_version: INVARIANT_VERSION,
      dry_run: isDryRun,
    };

    if (!isDryRun) {
      // Write snapshot
      const snapshotEffectiveConfig = buildSnapshotEffectiveConfig(invariantConfigBase, effectiveWarnThreshold);
      
      // Insert snapshot directly (not upsert) to create new record with new timestamp
      const { data: newSnapshot, error: writeError } = await supabaseService
        .from('invariant_decision_snapshots')
        .insert({
          job_id: null, // Rerun doesn't have an associated job
          template_id,
          institution_code: template.institution_code,
          program_catalog_id: template.program_catalog_id ?? null,
          track: template.track ?? null,
          template_status: templateStatus,
          invariant_version: INVARIANT_VERSION,
          effective_config: snapshotEffectiveConfig,
          decision,
          violation_codes: violationCodes,
          data_source: 'real', // Mark as real, not seeded
        })
        .select('id, created_at')
        .single();

      if (writeError) {
        console.error(`[rerun-template-invariants] Snapshot write error: ${writeError.message}`);
        // Still return result even if snapshot write fails
        return new Response(
          JSON.stringify({ 
            ...response, 
            warning: 'Invariants evaluated but snapshot write failed',
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      response.snapshot_id = newSnapshot.id;
      response.created_at = newSnapshot.created_at;

      console.log(`[rerun-template-invariants] Wrote snapshot ${newSnapshot.id} for template ${template_id}`);
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[rerun-template-invariants] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
