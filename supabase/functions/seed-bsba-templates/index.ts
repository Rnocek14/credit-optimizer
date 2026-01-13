// BSBA Template Seeder v1 - Creates BSBA templates for COSC and WGU
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

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
}

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

// School-specific policy configurations
const SCHOOL_POLICIES: Record<string, {
  residencyCredits: number;
  maxTransferCredits: number;
  maxAltCredits: number;
  estimatedCost: { standard: number; alt_max: number };
  estimatedDuration: { standard: number; alt_max: number };
}> = {
  COSC: {
    residencyCredits: 6,
    maxTransferCredits: 114,
    maxAltCredits: 90,
    estimatedCost: { standard: 12000, alt_max: 8500 },
    estimatedDuration: { standard: 24, alt_max: 18 },
  },
  WGU: {
    residencyCredits: 0,
    maxTransferCredits: 90,
    maxAltCredits: 90,
    estimatedCost: { standard: 15000, alt_max: 10000 },
    estimatedDuration: { standard: 24, alt_max: 12 },
  },
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const results: Record<string, { inserted: number; error?: string }> = {};

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    console.log('[seed-bsba-templates] Starting BSBA template seeding for COSC + WGU...');

    const schoolCodes = ['COSC', 'WGU'];
    const trackTypes: ('standard' | 'alt_max')[] = ['standard', 'alt_max'];

    for (const code of schoolCodes) {
      console.log(`[seed-bsba-templates] Processing ${code}...`);

      // Get institution ID
      const { data: inst, error: instError } = await supabase
        .from('institutions')
        .select('id')
        .eq('code', code)
        .single();

      if (instError || !inst) {
        results[code] = { inserted: 0, error: `Institution not found: ${instError?.message}` };
        continue;
      }

      const policies = SCHOOL_POLICIES[code];
      if (!policies) {
        results[code] = { inserted: 0, error: 'No policy config for school' };
        continue;
      }

      let insertedCount = 0;

      for (const trackType of trackTypes) {
        const templateId = `${code}-BSBA-${trackType.toUpperCase()}-V1`;
        const terms = createBsbaTerms(trackType);

        const templateData: TemplateData = {
          version: '1.0',
          programCode: 'BSBA',
          trackType,
          totalCredits: 120,
          terms,
          policies: {
            totalCredits: 120,
            genedCredits: 30,
            majorCredits: 54,
            electiveCredits: 36,
            upperDivisionTotal: 30,
            residencyCredits: policies.residencyCredits,
            maxTransferCredits: policies.maxTransferCredits,
            maxAltCredits: policies.maxAltCredits,
          },
        };

        const template = {
          id: templateId,
          institution_id: inst.id,
          institution_code: code,
          program_code: 'BSBA',
          program_name: 'Bachelor of Science in Business Administration',
          track_type: trackType,
          total_credits: 120,
          estimated_cost: policies.estimatedCost[trackType],
          estimated_duration_months: policies.estimatedDuration[trackType],
          catalog_year: '2024-2025',
          template_data: templateData,
          notes: `${trackType === 'alt_max' ? 'Maximizes alt-credit usage' : 'Standard institutional path'}`,
        };

        const { error: upsertError } = await supabase
          .from('degree_templates')
          .upsert(template, {
            onConflict: 'institution_code,program_code,track_type',
          });

        if (upsertError) {
          console.error(`[seed-bsba-templates] Error upserting ${templateId}:`, upsertError);
          results[`${code}-${trackType}`] = { inserted: 0, error: upsertError.message };
        } else {
          console.log(`[seed-bsba-templates] ✅ Upserted ${templateId}`);
          insertedCount++;
        }
      }

      results[code] = { inserted: insertedCount };
    }

    console.log('[seed-bsba-templates] ✅ BSBA template seeding complete');

    return new Response(
      JSON.stringify({
        success: true,
        jobName: 'seed-bsba-templates',
        results,
        summary: {
          templatesCreated: Object.values(results).reduce((sum, r) => sum + r.inserted, 0),
          schools: schoolCodes,
          tracks: trackTypes,
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
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
