// Deployment trigger: 2025-12-02T22:30:00Z – force redeploy for optimizer seeding fix
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SeedResult {
  inserted: number;
  updated: number;
  skipped: number;
}

interface SeedResponse {
  jobName: string;
  success: boolean;
  tables: Record<string, SeedResult>;
  excelsiorInstitutionId?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const response: SeedResponse = {
    jobName: 'seed-excelsior',
    success: false,
    tables: {},
  };

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    console.log('[optimizer-seed-excelsior] Starting Excelsior data seeding...');

    // ============================================================
    // STEP 1: Ensure Excelsior institution exists
    // ============================================================
    console.log('[optimizer-seed-excelsior] Step 1: Upserting Excelsior institution...');
    const { data: excelsiorData, error: excelsiorError } = await supabase
      .from('institutions')
      .upsert({
        code: 'EXCELSIOR',
        name: 'Excelsior University',
        type: 'university',
        website_url: 'https://www.excelsior.edu',
        accreditation_level: 'Regional',
        reputation_score: 80,
        verification_status: 'verified',
        metadata: {}
      }, { onConflict: 'code' })
      .select()
      .single();

    if (excelsiorError) throw new Error(`Excelsior institution upsert failed: ${excelsiorError.message}`);
    const excelsiorId = excelsiorData.id;
    response.excelsiorInstitutionId = excelsiorId;
    console.log(`[optimizer-seed-excelsior] Excelsior institution ID: ${excelsiorId}`);

    // ============================================================
    // STEP 2: Seed institution_credit_limits (5 policies)
    // ============================================================
    console.log('[optimizer-seed-excelsior] Step 2: Seeding institution_credit_limits...');
    const creditLimits = [
      { institution_id: excelsiorId, limit_type: 'total_credits', credit_value: 120, provider_code: null, notes: 'Standard bachelor degree requirement' },
      { institution_id: excelsiorId, limit_type: 'min_residency', credit_value: 30, provider_code: null, notes: 'Minimum credits through Excelsior (inc. capstone)' },
      { institution_id: excelsiorId, limit_type: 'total_transfer', credit_value: 113, provider_code: null, notes: 'Max transfer credits (subject to policy)' },
      { institution_id: excelsiorId, limit_type: 'alt_credit_max', credit_value: 90, provider_code: null, notes: 'Max ACE/NCCRS alternative credits combined' },
      { institution_id: excelsiorId, limit_type: 'min_ra_credit', credit_value: 30, provider_code: null, notes: 'Min regionally-accredited credits across degree' },
    ];

    const { error: limitsError } = await supabase
      .from('institution_credit_limits')
      .upsert(creditLimits, { onConflict: 'institution_id,limit_type,provider_code' });

    if (limitsError) throw new Error(`Excelsior credit limits upsert failed: ${limitsError.message}`);
    response.tables.institution_credit_limits = { inserted: creditLimits.length, updated: 0, skipped: 0 };

    // ============================================================
    // STEP 3: Seed gened_frameworks (1 framework)
    // ============================================================
    console.log('[optimizer-seed-excelsior] Step 3: Seeding gened_frameworks...');
    const { error: frameworkError } = await supabase
      .from('gened_frameworks')
      .upsert({
        institution_id: excelsiorId,
        framework_name: 'Excelsior General Education',
        framework_code: 'EXC-GENED-36',
        total_credits: 36,
        description: 'Excelsior general education framework (written communication, humanities, social sciences, natural sciences, math).'
      }, { onConflict: 'institution_id,framework_code' });

    if (frameworkError) throw new Error(`Excelsior gen-ed framework upsert failed: ${frameworkError.message}`);
    response.tables.gened_frameworks = { inserted: 1, updated: 0, skipped: 0 };

    // ============================================================
    // STEP 4: Seed gened_categories (5 categories)
    // ============================================================
    console.log('[optimizer-seed-excelsior] Step 4: Seeding gened_categories...');
    const genedCategories = [
      { institution_id: excelsiorId, category_code: 'WRITTEN_COMM', category_name: 'Written Communication', credits_required: 6, description: 'Composition I & II or equivalent', display_order: 1, min_grade: 'C' },
      { institution_id: excelsiorId, category_code: 'HUMANITIES', category_name: 'Humanities', credits_required: 9, description: 'Humanities distribution requirement', display_order: 2, min_grade: 'C' },
      { institution_id: excelsiorId, category_code: 'SOCIAL_SCIENCE', category_name: 'Social Sciences', credits_required: 9, description: 'Social sciences distribution requirement', display_order: 3, min_grade: 'C' },
      { institution_id: excelsiorId, category_code: 'NAT_SCI_MATH', category_name: 'Natural Science / Math', credits_required: 9, description: 'Science and math distribution', display_order: 4, min_grade: 'C' },
      { institution_id: excelsiorId, category_code: 'INFO_LITERACY', category_name: 'Information Literacy', credits_required: 3, description: 'Information literacy / research skills', display_order: 5, min_grade: 'C' },
    ];

    const { error: categoriesError } = await supabase
      .from('gened_categories')
      .upsert(genedCategories, { onConflict: 'institution_id,category_code' });

    if (categoriesError) throw new Error(`Excelsior gen-ed categories upsert failed: ${categoriesError.message}`);
    response.tables.gened_categories = { inserted: genedCategories.length, updated: 0, skipped: 0 };

    // ============================================================
    // STEP 5: Seed degree_templates (1 BS template)
    // ============================================================
    console.log('[optimizer-seed-excelsior] Step 5: Seeding degree_templates...');
    const bsTemplate = {
      id: 'EXCELSIOR-BS-LS-CHEAPEST-V1',
      institution_id: excelsiorId,
      institution_code: 'EXCELSIOR',
      program_code: 'BS-LS',
      program_name: 'Bachelor of Science in Liberal Studies',
      track_type: 'cheapest',
      total_credits: 120,
      estimated_cost: 9000,
      estimated_duration_months: 18,
      catalog_year: '2024-2025',
      template_data: {
        version: '1.0',
        programCode: 'BS-LS',
        trackType: 'cheapest',
        totalCredits: 120,
        terms: [
          {
            id: 'ex-term-1',
            label: 'Term 1: Foundations',
            slots: [
              { slotId: 'ex-t1-s1', kind: 'gened', requirementArea: 'WRITTEN_COMM', minCredits: 3 },
              { slotId: 'ex-t1-s2', kind: 'gened', requirementArea: 'WRITTEN_COMM', minCredits: 3 },
              { slotId: 'ex-t1-s3', kind: 'gened', requirementArea: 'HUMANITIES', minCredits: 3 },
              { slotId: 'ex-t1-s4', kind: 'gened', requirementArea: 'SOCIAL_SCIENCE', minCredits: 3 },
            ],
          },
          {
            id: 'ex-term-2',
            label: 'Term 2: Quantitative & Science',
            slots: [
              { slotId: 'ex-t2-s1', kind: 'gened', requirementArea: 'NAT_SCI_MATH', minCredits: 3 },
              { slotId: 'ex-t2-s2', kind: 'gened', requirementArea: 'NAT_SCI_MATH', minCredits: 3 },
              { slotId: 'ex-t2-s3', kind: 'gened', requirementArea: 'INFO_LITERACY', minCredits: 3 },
              { slotId: 'ex-t2-s4', kind: 'elective', requirementArea: 'FREE_ELECTIVE', minCredits: 3 },
            ],
          },
          {
            id: 'ex-term-3',
            label: 'Term 3: Distribution',
            slots: [
              { slotId: 'ex-t3-s1', kind: 'gened', requirementArea: 'HUMANITIES', minCredits: 3 },
              { slotId: 'ex-t3-s2', kind: 'gened', requirementArea: 'HUMANITIES', minCredits: 3 },
              { slotId: 'ex-t3-s3', kind: 'gened', requirementArea: 'SOCIAL_SCIENCE', minCredits: 3 },
              { slotId: 'ex-t3-s4', kind: 'gened', requirementArea: 'SOCIAL_SCIENCE', minCredits: 3 },
            ],
          },
          {
            id: 'ex-term-4',
            label: 'Term 4: Science & Electives',
            slots: [
              { slotId: 'ex-t4-s1', kind: 'gened', requirementArea: 'NAT_SCI_MATH', minCredits: 3 },
              { slotId: 'ex-t4-s2', kind: 'elective', requirementArea: 'FREE_ELECTIVE', minCredits: 3 },
              { slotId: 'ex-t4-s3', kind: 'elective', requirementArea: 'FREE_ELECTIVE', minCredits: 3 },
              { slotId: 'ex-t4-s4', kind: 'elective', requirementArea: 'FREE_ELECTIVE', minCredits: 3 },
            ],
          },
        ],
        policies: {
          totalCredits: 120,
          genedCredits: 36,
          majorCredits: 30,
          electiveCredits: 54,
        },
      },
    };

    const { error: templateError } = await supabase
      .from('degree_templates')
      .upsert(bsTemplate, { onConflict: 'id' });

    if (templateError) throw new Error(`Excelsior degree template upsert failed: ${templateError.message}`);
    response.tables.degree_templates = { inserted: 1, updated: 0, skipped: 0 };

    // SUCCESS
    response.success = true;
    console.log('[optimizer-seed-excelsior] Seeding completed successfully:', response.tables);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[optimizer-seed-excelsior] Error:', err);
    response.error = err instanceof Error ? err.message : 'Unknown error';

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
