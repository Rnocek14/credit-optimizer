// Deployment trigger: 2025-12-02T18:45:00Z
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

interface TableResult {
  inserted: number;
  updated: number;
  skipped: number;
}

interface SeedResponse {
  jobName: string;
  success: boolean;
  tables: Record<string, TableResult>;
  coscInstitutionId?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const response: SeedResponse = {
    jobName: 'seed-cosc',
    success: false,
    tables: {},
  };

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    console.log('[optimizer-seed-cosc] Starting COSC data seeding...');

    // ------------------------------------------------------------
    // STEP 1: Ensure COSC institution exists
    // ------------------------------------------------------------
    console.log('[optimizer-seed-cosc] Upserting COSC institution...');

    const { data: coscData, error: coscError } = await supabase
      .from('institutions')
      .upsert(
        {
          code: 'COSC',
          name: 'Charter Oak State College',
          type: 'university',
          website_url: 'https://www.charteroak.edu',
          accreditation_level: 'Regional',
          reputation_score: 80,
          verification_status: 'verified',
          metadata: {},
        },
        { onConflict: 'code' },
      )
      .select()
      .single();

    if (coscError) throw new Error(`COSC institution upsert failed: ${coscError.message}`);
    const coscId = coscData.id;
    response.coscInstitutionId = coscId;
    console.log('[optimizer-seed-cosc] COSC institution ID:', coscId);

    // ------------------------------------------------------------
    // STEP 2: institution_credit_limits
    // ------------------------------------------------------------
    console.log('[optimizer-seed-cosc] Seeding institution_credit_limits...');

    const creditLimits = [
      {
        institution_id: coscId,
        limit_type: 'total_credits',
        credit_value: 120,
        provider_code: null,
        notes: 'Standard bachelor degree requirement for COSC',
      },
      {
        institution_id: coscId,
        limit_type: 'min_residency',
        credit_value: 6,
        provider_code: null,
        notes: 'Cornerstone (3cr) + Capstone (3cr) in residence; non-waivable',
      },
      {
        institution_id: coscId,
        limit_type: 'total_transfer',
        credit_value: 114,
        provider_code: null,
        notes: 'Up to 114cr may be transferred in; 6cr must be cornerstone/capstone',
      },
      {
        institution_id: coscId,
        limit_type: 'alt_credit_max',
        credit_value: 90,
        provider_code: null,
        notes: 'Max 90 ACE/NCCRS credits from approved partners',
      },
      {
        institution_id: coscId,
        limit_type: 'min_ra_credit',
        credit_value: 30,
        provider_code: null,
        notes: 'At least 30cr must be RA credit across the degree',
      },
      {
        institution_id: coscId,
        limit_type: 'min_institution_credit',
        credit_value: 6,
        provider_code: null,
        notes: 'Minimum institutional credit = cornerstone + capstone',
      },
    ];

    const { error: limitsError } = await supabase
      .from('institution_credit_limits')
      .upsert(creditLimits, {
        onConflict: 'institution_id,limit_type,provider_code',
      });

    if (limitsError) throw new Error(`COSC credit limits upsert failed: ${limitsError.message}`);
    response.tables.institution_credit_limits = {
      inserted: creditLimits.length,
      updated: 0,
      skipped: 0,
    };

    // ------------------------------------------------------------
    // STEP 3: gened_frameworks (COSC 40-credit framework)
    // ------------------------------------------------------------
    console.log('[optimizer-seed-cosc] Seeding gened_frameworks...');

    const { error: frameworkError } = await supabase
      .from('gened_frameworks')
      .upsert(
        {
          institution_id: coscId,
          framework_name: 'COSC General Education Framework',
          framework_code: 'FRAMEWORK40',
          total_credits: 40,
          description:
            'Charter Oak State College ~40cr general education framework with Written/Oral Comm, Quantitative Reasoning, lab science, DEI, Digital Literacy, etc.',
        },
        { onConflict: 'institution_id,framework_code' },
      );

    if (frameworkError) throw new Error(`COSC gen-ed framework upsert failed: ${frameworkError.message}`);
    response.tables.gened_frameworks = { inserted: 1, updated: 0, skipped: 0 };

    // ------------------------------------------------------------
    // STEP 4: gened_categories (11 categories)
    // ------------------------------------------------------------
    console.log('[optimizer-seed-cosc] Seeding gened_categories...');

    const genedCategories = [
      {
        institution_id: coscId,
        category_code: 'WRITTEN_COMM',
        category_name: 'Written Communication',
        credits_required: 6,
        description: 'English Composition I & II or equivalent',
        display_order: 1,
        min_grade: 'C',
      },
      {
        institution_id: coscId,
        category_code: 'ORAL_COMM',
        category_name: 'Oral Communication',
        credits_required: 3,
        description: 'Public Speaking or communication course',
        display_order: 2,
        min_grade: 'C',
      },
      {
        institution_id: coscId,
        category_code: 'QUANT_REASON',
        category_name: 'Quantitative Reasoning',
        credits_required: 3,
        description: 'College-level math / statistics',
        display_order: 3,
        min_grade: 'C',
      },
      {
        institution_id: coscId,
        category_code: 'SCI_REASON_LAB',
        category_name: 'Scientific Reasoning (Lab)',
        credits_required: 4,
        description: '4-credit science with lab',
        display_order: 4,
        min_grade: 'C',
      },
      {
        institution_id: coscId,
        category_code: 'SCI_KNOWLEDGE',
        category_name: 'Scientific Knowledge',
        credits_required: 3,
        description: 'Non-lab science course',
        display_order: 5,
        min_grade: 'C',
      },
      {
        institution_id: coscId,
        category_code: 'INFO_LITERACY',
        category_name: 'Information Literacy',
        credits_required: 3,
        description: 'Information literacy / research skills',
        display_order: 6,
        min_grade: 'C',
      },
      {
        institution_id: coscId,
        category_code: 'SOC_BEHAV_SCI',
        category_name: 'Social/Behavioral Science',
        credits_required: 3,
        description: 'Psychology, Sociology, etc.',
        display_order: 7,
        min_grade: 'C',
      },
      {
        institution_id: coscId,
        category_code: 'ARTS_HUMANITIES',
        category_name: 'Arts/Humanities',
        credits_required: 3,
        description: 'Arts, literature, philosophy, etc.',
        display_order: 8,
        min_grade: 'C',
      },
      {
        institution_id: coscId,
        category_code: 'ETHICS_DEI',
        category_name: 'Ethics / DEI',
        credits_required: 3,
        description: 'Ethics, Diversity, Equity & Inclusion',
        display_order: 9,
        min_grade: 'C',
      },
      {
        institution_id: coscId,
        category_code: 'DIGITAL_LIT',
        category_name: 'Digital Literacy',
        credits_required: 3,
        description: 'Digital literacy / technology',
        display_order: 10,
        min_grade: 'C',
      },
      {
        institution_id: coscId,
        category_code: 'CRITICAL_THINK',
        category_name: 'Critical / Innovative Thinking',
        credits_required: 3,
        description: 'Critical thinking / innovation requirement',
        display_order: 11,
        min_grade: 'C',
      },
    ];

    const { error: categoriesError } = await supabase
      .from('gened_categories')
      .upsert(genedCategories, {
        onConflict: 'institution_id,category_code',
      });

    if (categoriesError) {
      throw new Error(`COSC gen-ed categories upsert failed: ${categoriesError.message}`);
    }
    response.tables.gened_categories = {
      inserted: genedCategories.length,
      updated: 0,
      skipped: 0,
    };

    // ------------------------------------------------------------
    // STEP 5: degree_templates (COSC BA General Studies template)
    // ------------------------------------------------------------
    console.log('[optimizer-seed-cosc] Seeding degree_templates...');

    const baTemplate = {
      id: 'COSC-BA-GS-CHEAPEST-V1',
      institution_id: coscId,
      institution_code: 'COSC',
      program_code: 'BA-GS',
      program_name: 'Bachelor of Arts in General Studies',
      track_type: 'cheapest',
      total_credits: 120,
      estimated_cost: 9000,
      estimated_duration_months: 18,
      catalog_year: '2024-2025',
      template_data: {
        version: '1.0',
        programCode: 'BA-GS',
        trackType: 'cheapest',
        totalCredits: 120,
        terms: [
          {
            id: 'term-1',
            label: 'Term 1: On-Ramp',
            slots: [
              {
                slotId: 't1-s1',
                kind: 'gened',
                requirementArea: 'WRITTEN_COMM',
                minCredits: 3,
                preferred: { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'ENG101' },
              },
              {
                slotId: 't1-s2',
                kind: 'gened',
                requirementArea: 'ORAL_COMM',
                minCredits: 3,
                preferred: { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'COMM101' },
              },
              {
                slotId: 't1-s3',
                kind: 'gened',
                requirementArea: 'QUANT_REASON',
                minCredits: 3,
                preferred: { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'MAT101' },
              },
              {
                slotId: 't1-s4',
                kind: 'gened',
                requirementArea: 'INFO_LITERACY',
                minCredits: 3,
                preferred: { type: 'institutional_course', courseCode: 'IDS-101' },
              },
            ],
          },
          {
            id: 'term-2',
            label: 'Term 2: GenEd & Social Science',
            slots: [
              {
                slotId: 't2-s1',
                kind: 'gened',
                requirementArea: 'WRITTEN_COMM',
                minCredits: 3,
                preferred: { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'ENG102' },
              },
              {
                slotId: 't2-s2',
                kind: 'gened',
                requirementArea: 'SOC_BEHAV_SCI',
                minCredits: 3,
                preferred: { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'SOC101' },
              },
              {
                slotId: 't2-s3',
                kind: 'gened',
                requirementArea: 'ARTS_HUMANITIES',
                minCredits: 3,
                preferred: { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'ART101' },
              },
              {
                slotId: 't2-s4',
                kind: 'gened',
                requirementArea: 'ETHICS_DEI',
                minCredits: 3,
                preferred: { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'PHIL101' },
              },
            ],
          },
          {
            id: 'term-3',
            label: 'Term 3: Science & Digital',
            slots: [
              {
                slotId: 't3-s1',
                kind: 'gened',
                requirementArea: 'SCI_REASON_LAB',
                minCredits: 4,
                preferred: { type: 'alt_credit', sourceCode: 'STUDY_COM', identifier: 'BIO101L' },
              },
              {
                slotId: 't3-s2',
                kind: 'gened',
                requirementArea: 'SCI_KNOWLEDGE',
                minCredits: 3,
                preferred: { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'ENV101' },
              },
              {
                slotId: 't3-s3',
                kind: 'gened',
                requirementArea: 'DIGITAL_LIT',
                minCredits: 3,
                preferred: { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'CS101' },
              },
              {
                slotId: 't3-s4',
                kind: 'gened',
                requirementArea: 'CRITICAL_THINK',
                minCredits: 3,
                preferred: { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'CRIT101' },
              },
            ],
          },
          {
            id: 'term-4',
            label: 'Term 4: Capstone',
            slots: [
              {
                slotId: 't4-s1',
                kind: 'capstone',
                requirementArea: 'CAPSTONE',
                minCredits: 3,
                preferred: { type: 'institutional_course', courseCode: 'IDS-402' },
              },
            ],
          },
        ],
        policies: {
          totalCredits: 120,
          genedCredits: 40,
          majorCredits: 36,
          electiveCredits: 14,
          upperDivisionTotal: 30,
          cornerstoneCredits: 3,
          capstoneCredits: 3,
        },
      },
    };

    const { error: templateError } = await supabase
      .from('degree_templates')
      .upsert(baTemplate, { onConflict: 'id' });

    if (templateError) throw new Error(`COSC degree template upsert failed: ${templateError.message}`);
    response.tables.degree_templates = { inserted: 1, updated: 0, skipped: 0 };

    // ------------------------------------------------------------
    // SUCCESS
    // ------------------------------------------------------------
    console.log('[optimizer-seed-cosc] ✅ COSC data seeded successfully');
    response.success = true;

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[optimizer-seed-cosc] ❌ Error:', err);
    response.error = err instanceof Error ? err.message : 'Unknown error';

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
