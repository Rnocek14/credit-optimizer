// Deployment trigger: 2025-12-02T22:30:00Z – force redeploy for optimizer seeding fix
import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TableStatus {
  inserted: number;
  updated: number;
  skipped: number;
}

interface SeedResponse {
  jobName: string;
  success: boolean;
  tables: Record<string, TableStatus>;
  wguInstitutionId?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const response: SeedResponse = {
    jobName: 'seed-wgu',
    success: false,
    tables: {},
  };

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } },
    );

    console.log('[optimizer-seed-wgu] Starting WGU data seeding...');

    // 1) WGU institution
    console.log('[optimizer-seed-wgu] Upserting WGU institution...');
    const { data: wguData, error: wguError } = await supabase
      .from('institutions')
      .upsert(
        {
          code: 'WGU',
          name: 'Western Governors University',
          type: 'university',
          website_url: 'https://www.wgu.edu',
          accreditation_level: 'Regional',
          reputation_score: 80,
          verification_status: 'verified',
          metadata: {},
        },
        { onConflict: 'code' },
      )
      .select()
      .single();

    if (wguError) {
      throw new Error(`WGU institution upsert failed: ${wguError.message}`);
    }

    const wguId = wguData.id;
    response.wguInstitutionId = wguId;
    console.log('[optimizer-seed-wgu] WGU institution ID:', wguId);

    // 2) institution_credit_limits
    console.log('[optimizer-seed-wgu] Seeding institution_credit_limits...');
    const creditLimits = [
      {
        institution_id: wguId,
        limit_type: 'total_credits',
        credit_value: 120,
        provider_code: null,
        notes: 'Standard bachelor degree requirement',
      },
      {
        institution_id: wguId,
        limit_type: 'min_residency',
        credit_value: 30,
        provider_code: null,
        notes: 'Approximate WGU in-house credit expectation (capstone, key courses)',
      },
      {
        institution_id: wguId,
        limit_type: 'total_transfer',
        credit_value: 90,
        provider_code: null,
        notes: 'Approximate max transfer credits',
      },
      {
        institution_id: wguId,
        limit_type: 'alt_credit_max',
        credit_value: 90,
        provider_code: null,
        notes: 'Max ACE/NCCRS credits that can be applied (approx)',
      },
      {
        institution_id: wguId,
        limit_type: 'min_ra_credit',
        credit_value: 30,
        provider_code: null,
        notes: 'Minimum regionally-accredited credits across the degree',
      },
    ];

    {
      const { error: limitsError } = await supabase
        .from('institution_credit_limits')
        .upsert(creditLimits, {
          onConflict: 'institution_id,limit_type,provider_code',
        });

      if (limitsError) {
        throw new Error(`WGU credit limits upsert failed: ${limitsError.message}`);
      }

      response.tables.institution_credit_limits = {
        inserted: creditLimits.length,
        updated: 0,
        skipped: 0,
      };
    }

    // 3) gened_frameworks
    console.log('[optimizer-seed-wgu] Seeding gened_frameworks...');
    {
      const { error: frameworkError } = await supabase.from('gened_frameworks').upsert(
        {
          institution_id: wguId,
          framework_name: 'WGU Foundational Requirements',
          framework_code: 'WGU-GENED-30',
          total_credits: 30,
          description:
            'Approximate WGU foundational/general education distribution (communication, humanities, social science, natural science, math).',
        },
        { onConflict: 'institution_id,framework_code' },
      );

      if (frameworkError) {
        throw new Error(`WGU gen-ed framework upsert failed: ${frameworkError.message}`);
      }

      response.tables.gened_frameworks = {
        inserted: 1,
        updated: 0,
        skipped: 0,
      };
    }

    // 4) gened_categories
    console.log('[optimizer-seed-wgu] Seeding gened_categories...');
    const genedCategories = [
      {
        institution_id: wguId,
        category_code: 'WRITTEN_COMM',
        category_name: 'Written Communication',
        credits_required: 6,
        description: 'English composition sequence or equivalent',
        display_order: 1,
        min_grade: 'C',
      },
      {
        institution_id: wguId,
        category_code: 'HUMANITIES',
        category_name: 'Humanities',
        credits_required: 6,
        description: 'Arts, literature, philosophy, etc.',
        display_order: 2,
        min_grade: 'C',
      },
      {
        institution_id: wguId,
        category_code: 'SOCIAL_SCIENCE',
        category_name: 'Social Sciences',
        credits_required: 6,
        description: 'Social and behavioral sciences distribution',
        display_order: 3,
        min_grade: 'C',
      },
      {
        institution_id: wguId,
        category_code: 'NAT_SCI_MATH',
        category_name: 'Natural Science / Math',
        credits_required: 9,
        description: 'Science and math distribution',
        display_order: 4,
        min_grade: 'C',
      },
      {
        institution_id: wguId,
        category_code: 'INFO_LITERACY',
        category_name: 'Information Literacy',
        credits_required: 3,
        description: 'Information literacy / research skills',
        display_order: 5,
        min_grade: 'C',
      },
    ];

    {
      const { error: categoriesError } = await supabase
        .from('gened_categories')
        .upsert(genedCategories, { onConflict: 'institution_id,category_code' });

      if (categoriesError) {
        throw new Error(`WGU gen-ed categories upsert failed: ${categoriesError.message}`);
      }

      response.tables.gened_categories = {
        inserted: genedCategories.length,
        updated: 0,
        skipped: 0,
      };
    }

    // 5) degree_templates – simple BS IT template scaffold
    console.log('[optimizer-seed-wgu] Seeding degree_templates...');
    const bsTemplate = {
      id: 'WGU-BS-IT-CHEAPEST-V1',
      institution_id: wguId,
      institution_code: 'WGU',
      program_code: 'BS-IT',
      program_name: 'Bachelor of Science in Information Technology',
      track_type: 'cheapest',
      total_credits: 120,
      estimated_cost: 11000,
      estimated_duration_months: 24,
      catalog_year: '2024-2025',
      template_data: {
        version: '1.0',
        programCode: 'BS-IT',
        trackType: 'cheapest',
        totalCredits: 120,
        terms: [
          {
            id: 'wgu-term-1',
            label: 'Term 1: Foundations',
            slots: [
              { slotId: 'wgu-t1-s1', kind: 'gened', requirementArea: 'WRITTEN_COMM', minCredits: 3 },
              { slotId: 'wgu-t1-s2', kind: 'gened', requirementArea: 'NAT_SCI_MATH', minCredits: 3 },
              { slotId: 'wgu-t1-s3', kind: 'major', requirementArea: 'IT_FOUNDATION', minCredits: 3 },
              { slotId: 'wgu-t1-s4', kind: 'elective', requirementArea: 'FREE_ELECTIVE', minCredits: 3 },
            ],
          },
          {
            id: 'wgu-term-2',
            label: 'Term 2: Core IT + GenEd',
            slots: [
              { slotId: 'wgu-t2-s1', kind: 'major', requirementArea: 'IT_CORE', minCredits: 3 },
              { slotId: 'wgu-t2-s2', kind: 'major', requirementArea: 'IT_CORE', minCredits: 3 },
              { slotId: 'wgu-t2-s3', kind: 'gened', requirementArea: 'HUMANITIES', minCredits: 3 },
              { slotId: 'wgu-t2-s4', kind: 'gened', requirementArea: 'SOCIAL_SCIENCE', minCredits: 3 },
            ],
          },
          {
            id: 'wgu-term-3',
            label: 'Term 3: Advanced IT',
            slots: [
              { slotId: 'wgu-t3-s1', kind: 'major', requirementArea: 'IT_ADVANCED', minCredits: 3 },
              { slotId: 'wgu-t3-s2', kind: 'major', requirementArea: 'IT_ADVANCED', minCredits: 3 },
              { slotId: 'wgu-t3-s3', kind: 'elective', requirementArea: 'FREE_ELECTIVE', minCredits: 3 },
              { slotId: 'wgu-t3-s4', kind: 'elective', requirementArea: 'FREE_ELECTIVE', minCredits: 3 },
            ],
          },
          {
            id: 'wgu-term-4',
            label: 'Term 4: Capstone & Wrap-Up',
            slots: [
              { slotId: 'wgu-t4-s1', kind: 'capstone', requirementArea: 'CAPSTONE', minCredits: 3 },
              { slotId: 'wgu-t4-s2', kind: 'major', requirementArea: 'IT_CORE', minCredits: 3 },
              { slotId: 'wgu-t4-s3', kind: 'elective', requirementArea: 'FREE_ELECTIVE', minCredits: 3 },
              { slotId: 'wgu-t4-s4', kind: 'elective', requirementArea: 'FREE_ELECTIVE', minCredits: 3 },
            ],
          },
        ],
        policies: {
          totalCredits: 120,
          genedCredits: 30,
          majorCredits: 45,
          electiveCredits: 45,
        },
      },
    };

    {
      const { error: templateError } = await supabase
        .from('degree_templates')
        .upsert(bsTemplate, { onConflict: 'id' });

      if (templateError) {
        throw new Error(`WGU degree template upsert failed: ${templateError.message}`);
      }

      response.tables.degree_templates = {
        inserted: 1,
        updated: 0,
        skipped: 0,
      };
    }

    response.success = true;
    console.log('[optimizer-seed-wgu] ✅ WGU data seeded successfully');

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[optimizer-seed-wgu] ❌ Error:', err);
    response.error = err instanceof Error ? err.message : 'Unknown error';

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
