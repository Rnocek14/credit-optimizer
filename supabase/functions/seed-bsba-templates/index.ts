// BSBA Template Seeder v2 - Policy-driven template generation
// Reads from active institution_policy_packs instead of hardcoded values
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface SeedRequest {
  institution_code?: string;  // If provided, only seed this school
  program_code?: string;      // Default: 'BSBA'
  force_refresh?: boolean;    // Re-generate even if templates exist
}

interface PolicyData {
  residency_credits?: number;
  max_transfer_credits?: number;
  max_alt_credit?: number;
  max_ace_nccrs_credits?: number;
  total_credits?: number;
  [key: string]: unknown;
}

interface TemplateSlot {
  slotId: string;
  kind: 'gened' | 'major' | 'elective' | 'capstone';
  requirementArea: string;
  minCredits: number;
  preferred: { type: string; sourceCode?: string; identifier?: string; courseCode?: string };
  alternatives?: { type: string; sourceCode?: string; identifier?: string; courseCode?: string }[];
}

interface TemplateTerm {
  id: string;
  label: string;
  slots: TemplateSlot[];
}

interface TemplateData {
  version: string;
  programCode: string;
  trackType: string;
  totalCredits: number;
  terms: TemplateTerm[];
  policies: {
    totalCredits: number;
    genedCredits: number;
    majorCredits: number;
    electiveCredits: number;
    upperDivisionTotal: number;
    residencyCredits: number;
    maxTransferCredits: number;
    maxAltCredits: number;
  };
  sourcePolicyPackId?: string;
}

// Default policy values (fallback if pack doesn't have specific fields)
const DEFAULT_POLICIES = {
  residency_credits: 30,
  max_transfer_credits: 90,
  max_alt_credit: 60,
  total_credits: 120,
};

// Estimated costs/duration based on track type (can be overridden by pack data)
const TRACK_ESTIMATES = {
  standard: { costMultiplier: 1.0, durationMonths: 24 },
  alt_max: { costMultiplier: 0.6, durationMonths: 15 },
};

// Base cost per credit (rough estimate, varies by school)
const BASE_COST_PER_CREDIT = 100;

// BSBA Term structure (shared across schools, adapted per track)
function createBsbaTerms(trackType: 'standard' | 'alt_max'): TemplateTerm[] {
  const isAltMax = trackType === 'alt_max';
  
  return [
    {
      id: 'y1-t1',
      label: 'Year 1 - Fall',
      slots: [
        {
          slotId: 'gened-written-1',
          kind: 'gened',
          requirementArea: 'WRITTEN_COMM',
          minCredits: 3,
          preferred: isAltMax 
            ? { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'college-composition' }
            : { type: 'institutional_course', courseCode: 'ENG-101' },
          alternatives: isAltMax 
            ? [{ type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'ENG101' }]
            : [{ type: 'alt_credit', sourceCode: 'CLEP', identifier: 'college-composition' }],
        },
        {
          slotId: 'gened-math-1',
          kind: 'gened',
          requirementArea: 'QUANTITATIVE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'college-algebra' }
            : { type: 'institutional_course', courseCode: 'MAT-101' },
          alternatives: isAltMax
            ? [{ type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'MAT101' }]
            : [{ type: 'alt_credit', sourceCode: 'CLEP', identifier: 'college-algebra' }],
        },
        {
          slotId: 'bus-intro-1',
          kind: 'major',
          requirementArea: 'BUS_CORE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'BUS100' }
            : { type: 'institutional_course', courseCode: 'BUS-101' },
        },
        {
          slotId: 'gened-psych-1',
          kind: 'gened',
          requirementArea: 'SOCIAL_SCIENCE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'intro-psychology' }
            : { type: 'institutional_course', courseCode: 'PSY-101' },
        },
      ],
    },
    {
      id: 'y1-t2',
      label: 'Year 1 - Spring',
      slots: [
        {
          slotId: 'gened-written-2',
          kind: 'gened',
          requirementArea: 'WRITTEN_COMM',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'ENG102' }
            : { type: 'institutional_course', courseCode: 'ENG-102' },
        },
        {
          slotId: 'bus-acct-1',
          kind: 'major',
          requirementArea: 'BUS_CORE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'financial-accounting' }
            : { type: 'institutional_course', courseCode: 'ACC-201' },
        },
        {
          slotId: 'bus-econ-micro',
          kind: 'major',
          requirementArea: 'BUS_CORE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'microeconomics' }
            : { type: 'institutional_course', courseCode: 'ECO-201' },
        },
        {
          slotId: 'gened-humanities-1',
          kind: 'gened',
          requirementArea: 'HUMANITIES',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'HUM101' }
            : { type: 'institutional_course', courseCode: 'HUM-101' },
        },
      ],
    },
    {
      id: 'y2-t1',
      label: 'Year 2 - Fall',
      slots: [
        {
          slotId: 'bus-acct-2',
          kind: 'major',
          requirementArea: 'BUS_CORE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'ACC202' }
            : { type: 'institutional_course', courseCode: 'ACC-202' },
        },
        {
          slotId: 'bus-econ-macro',
          kind: 'major',
          requirementArea: 'BUS_CORE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'macroeconomics' }
            : { type: 'institutional_course', courseCode: 'ECO-202' },
        },
        {
          slotId: 'bus-stats',
          kind: 'major',
          requirementArea: 'BUS_CORE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'STAT101' }
            : { type: 'institutional_course', courseCode: 'STA-201' },
        },
        {
          slotId: 'gened-science-1',
          kind: 'gened',
          requirementArea: 'NATURAL_SCIENCE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'SCI101' }
            : { type: 'institutional_course', courseCode: 'SCI-101' },
        },
      ],
    },
    {
      id: 'y2-t2',
      label: 'Year 2 - Spring',
      slots: [
        {
          slotId: 'bus-law',
          kind: 'major',
          requirementArea: 'BUS_CORE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'business-law' }
            : { type: 'institutional_course', courseCode: 'LAW-201' },
        },
        {
          slotId: 'bus-mgmt',
          kind: 'major',
          requirementArea: 'BUS_CORE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'principles-management' }
            : { type: 'institutional_course', courseCode: 'MGT-301' },
        },
        {
          slotId: 'bus-mkt',
          kind: 'major',
          requirementArea: 'BUS_CORE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'principles-marketing' }
            : { type: 'institutional_course', courseCode: 'MKT-301' },
        },
        {
          slotId: 'elective-1',
          kind: 'elective',
          requirementArea: 'FREE_ELECTIVE',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'ELEC100' }
            : { type: 'institutional_course', courseCode: 'ELEC-100' },
        },
      ],
    },
    {
      id: 'y3-t1',
      label: 'Year 3 - Fall',
      slots: [
        {
          slotId: 'bus-finance',
          kind: 'major',
          requirementArea: 'UPPER_BUSINESS',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'FIN-301' },
        },
        {
          slotId: 'bus-ops',
          kind: 'major',
          requirementArea: 'UPPER_BUSINESS',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'OPS-301' },
        },
        {
          slotId: 'bus-ethics',
          kind: 'major',
          requirementArea: 'UPPER_BUSINESS',
          minCredits: 3,
          preferred: isAltMax
            ? { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'ETH301' }
            : { type: 'institutional_course', courseCode: 'ETH-301' },
        },
        {
          slotId: 'elective-2',
          kind: 'elective',
          requirementArea: 'FREE_ELECTIVE',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'ELEC-200' },
        },
      ],
    },
    {
      id: 'y3-t2',
      label: 'Year 3 - Spring',
      slots: [
        {
          slotId: 'bus-hr',
          kind: 'major',
          requirementArea: 'UPPER_BUSINESS',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'HRM-301' },
        },
        {
          slotId: 'bus-info-sys',
          kind: 'major',
          requirementArea: 'UPPER_BUSINESS',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'MIS-301' },
        },
        {
          slotId: 'elective-3',
          kind: 'elective',
          requirementArea: 'FREE_ELECTIVE',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'ELEC-300' },
        },
        {
          slotId: 'elective-4',
          kind: 'elective',
          requirementArea: 'FREE_ELECTIVE',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'ELEC-301' },
        },
      ],
    },
    {
      id: 'y4-t1',
      label: 'Year 4 - Fall',
      slots: [
        {
          slotId: 'bus-strategy',
          kind: 'major',
          requirementArea: 'UPPER_BUSINESS',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'STR-401' },
        },
        {
          slotId: 'bus-intl',
          kind: 'major',
          requirementArea: 'UPPER_BUSINESS',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'IBS-401' },
        },
        {
          slotId: 'elective-5',
          kind: 'elective',
          requirementArea: 'FREE_ELECTIVE',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'ELEC-400' },
        },
        {
          slotId: 'elective-6',
          kind: 'elective',
          requirementArea: 'FREE_ELECTIVE',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'ELEC-401' },
        },
      ],
    },
    {
      id: 'y4-t2',
      label: 'Year 4 - Spring',
      slots: [
        {
          slotId: 'capstone',
          kind: 'capstone',
          requirementArea: 'CAPSTONE',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'CAP-499' },
        },
        {
          slotId: 'elective-7',
          kind: 'elective',
          requirementArea: 'FREE_ELECTIVE',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'ELEC-402' },
        },
        {
          slotId: 'elective-8',
          kind: 'elective',
          requirementArea: 'FREE_ELECTIVE',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'ELEC-403' },
        },
        {
          slotId: 'elective-9',
          kind: 'elective',
          requirementArea: 'FREE_ELECTIVE',
          minCredits: 3,
          preferred: { type: 'institutional_course', courseCode: 'ELEC-404' },
        },
      ],
    },
  ];
}

// Generate templates for a single institution using its policy pack
async function generateTemplatesFromPack(
  supabase: ReturnType<typeof createClient>,
  institutionCode: string,
  institutionId: string,
  policyData: PolicyData,
  packId: string,
  programCode: string = 'BSBA'
): Promise<{ standard?: string; altMax?: string; errors: string[] }> {
  const errors: string[] = [];
  const trackTypes: ('standard' | 'alt_max')[] = ['standard', 'alt_max'];
  const results: { standard?: string; altMax?: string } = {};

  // Extract policy limits with fallbacks
  const residencyCredits = policyData.residency_credits ?? DEFAULT_POLICIES.residency_credits;
  const maxTransferCredits = policyData.max_transfer_credits ?? DEFAULT_POLICIES.max_transfer_credits;
  const maxAltCredits = policyData.max_alt_credit ?? policyData.max_ace_nccrs_credits ?? DEFAULT_POLICIES.max_alt_credit;
  const totalCredits = policyData.total_credits ?? DEFAULT_POLICIES.total_credits;

  for (const trackType of trackTypes) {
    const templateId = `${institutionCode}-${programCode}-${trackType.toUpperCase()}-V2`;
    const terms = createBsbaTerms(trackType);
    const estimates = TRACK_ESTIMATES[trackType];

    const templateData: TemplateData = {
      version: '2.0',
      programCode,
      trackType,
      totalCredits,
      terms,
      policies: {
        totalCredits,
        genedCredits: 30,
        majorCredits: 54,
        electiveCredits: 36,
        upperDivisionTotal: 30,
        residencyCredits,
        maxTransferCredits,
        maxAltCredits,
      },
      sourcePolicyPackId: packId,
    };

    // Calculate estimated cost based on policy data
    const estimatedCost = Math.round(totalCredits * BASE_COST_PER_CREDIT * estimates.costMultiplier);

    const template = {
      id: templateId,
      institution_id: institutionId,
      institution_code: institutionCode,
      program_code: programCode,
      program_name: `Bachelor of Science in Business Administration`,
      track_type: trackType,
      total_credits: totalCredits,
      estimated_cost: estimatedCost,
      estimated_duration_months: estimates.durationMonths,
      catalog_year: '2024-2025',
      template_data: templateData,
      notes: `${trackType === 'alt_max' ? 'Maximizes alt-credit usage' : 'Standard institutional path'} - Generated from policy pack ${packId.slice(0, 8)}`,
    };

    const { error: upsertError } = await supabase
      .from('degree_templates')
      .upsert(template, {
        onConflict: 'institution_code,program_code,track_type',
      });

    if (upsertError) {
      console.error(`[seed-bsba-templates] Error upserting ${templateId}:`, upsertError);
      errors.push(`${trackType}: ${upsertError.message}`);
    } else {
      console.log(`[seed-bsba-templates] ✅ Upserted ${templateId}`);
      if (trackType === 'standard') results.standard = templateId;
      else results.altMax = templateId;
    }
  }

  return { ...results, errors };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const results: Record<string, { 
    inserted: number; 
    templates?: { standard?: string; altMax?: string };
    source: 'policy_pack' | 'fallback';
    error?: string 
  }> = {};

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    // Parse request body
    let body: SeedRequest = {};
    try {
      body = await req.json();
    } catch {
      // No body or invalid JSON - use defaults
    }

    const { institution_code, program_code = 'BSBA', force_refresh = false } = body;

    console.log(`[seed-bsba-templates] Starting policy-driven template generation...`);
    console.log(`[seed-bsba-templates] Params: institution_code=${institution_code || 'all'}, program_code=${program_code}, force_refresh=${force_refresh}`);

    // Query active policy packs
    let packsQuery = supabase
      .from('institution_policy_packs')
      .select('id, institution, policy_data, confidence_score')
      .eq('status', 'active');

    if (institution_code) {
      packsQuery = packsQuery.eq('institution', institution_code);
    }

    const { data: activePacks, error: packsError } = await packsQuery;

    if (packsError) {
      throw new Error(`Failed to fetch active policy packs: ${packsError.message}`);
    }

    console.log(`[seed-bsba-templates] Found ${activePacks?.length || 0} active policy pack(s)`);

    if (!activePacks || activePacks.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          jobName: 'seed-bsba-templates',
          results: {},
          summary: {
            templatesCreated: 0,
            message: institution_code 
              ? `No active policy pack found for ${institution_code}` 
              : 'No active policy packs found',
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Process each active pack
    for (const pack of activePacks) {
      const code = pack.institution;
      console.log(`[seed-bsba-templates] Processing ${code} (pack ${pack.id.slice(0, 8)})...`);

      // Get institution ID
      const { data: inst, error: instError } = await supabase
        .from('institutions')
        .select('id')
        .eq('code', code)
        .single();

      if (instError || !inst) {
        results[code] = { 
          inserted: 0, 
          source: 'policy_pack',
          error: `Institution not found: ${instError?.message}` 
        };
        continue;
      }

      // Extract policy_data (handle both direct object and nested structures)
      const policyData: PolicyData = typeof pack.policy_data === 'object' && pack.policy_data !== null
        ? pack.policy_data as PolicyData
        : {};

      console.log(`[seed-bsba-templates] Policy data for ${code}:`, JSON.stringify(policyData).slice(0, 200));

      // Generate templates from pack
      const genResult = await generateTemplatesFromPack(
        supabase,
        code,
        inst.id,
        policyData,
        pack.id,
        program_code
      );

      const insertedCount = (genResult.standard ? 1 : 0) + (genResult.altMax ? 1 : 0);
      
      results[code] = {
        inserted: insertedCount,
        templates: { standard: genResult.standard, altMax: genResult.altMax },
        source: 'policy_pack',
        error: genResult.errors.length > 0 ? genResult.errors.join('; ') : undefined,
      };

      // Log template generation event
      await supabase.from('policy_refresh_events').insert({
        event_type: 'templates_generated',
        institution_code: code,
        metadata: {
          program_code,
          tracks_generated: ['standard', 'alt_max'].filter(t => 
            t === 'standard' ? genResult.standard : genResult.altMax
          ),
          source_pack_id: pack.id,
          policy_confidence: pack.confidence_score,
          template_ids: [genResult.standard, genResult.altMax].filter(Boolean),
        },
      }).then(({ error }) => {
        if (error) console.warn(`[seed-bsba-templates] Failed to log event for ${code}:`, error.message);
      });
    }

    const totalCreated = Object.values(results).reduce((sum, r) => sum + r.inserted, 0);
    console.log(`[seed-bsba-templates] ✅ Complete. Created ${totalCreated} template(s)`);

    return new Response(
      JSON.stringify({
        success: true,
        jobName: 'seed-bsba-templates',
        results,
        summary: {
          templatesCreated: totalCreated,
          institutionsProcessed: Object.keys(results).length,
          programCode: program_code,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('[seed-bsba-templates] ❌ Error:', err);
    return new Response(
      JSON.stringify({
        success: false,
        jobName: 'seed-bsba-templates',
        error: err instanceof Error ? err.message : 'Unknown error',
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
