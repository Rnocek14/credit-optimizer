import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[Setup Check] Starting pre-flight checks...');
    
    const checks = {
      institutionsCodeColumn: false,
      tesuInstitution: false,
      altCreditsTable: false,
      equivalenciesTable: false,
      degreeTemplatesTable: false,
      genedFrameworksTable: false,
      genedCategoriesTable: false,
      institutionCreditLimitsTable: false,
    };

    const missingItems: string[] = [];

    // Check if institutions table has code column
    try {
      const { error } = await supabase
        .from('institutions')
        .select('code')
        .limit(1);
      
      checks.institutionsCodeColumn = !error;
      if (error) {
        missingItems.push('institutions.code column');
        console.log('[Setup Check] Missing: institutions.code column');
      }
    } catch (e) {
      checks.institutionsCodeColumn = false;
      missingItems.push('institutions.code column');
    }

    // Check for TESU institution
    if (checks.institutionsCodeColumn) {
      try {
        const { data, error } = await supabase
          .from('institutions')
          .select('id, code')
          .eq('code', 'TESU')
          .single();
        
        checks.tesuInstitution = !error && !!data;
        if (!checks.tesuInstitution) {
          missingItems.push('TESU institution record');
          console.log('[Setup Check] Missing: TESU institution');
        }
      } catch (e) {
        checks.tesuInstitution = false;
        missingItems.push('TESU institution record');
      }
    }

    // Check for each optimizer table
    const tables = [
      { key: 'altCreditsTable', name: 'alt_credits' },
      { key: 'equivalenciesTable', name: 'cross_institution_equivalencies' },
      { key: 'degreeTemplatesTable', name: 'degree_templates' },
      { key: 'genedFrameworksTable', name: 'gened_frameworks' },
      { key: 'genedCategoriesTable', name: 'gened_categories' },
      { key: 'institutionCreditLimitsTable', name: 'institution_credit_limits' },
    ];

    for (const table of tables) {
      try {
        const { error } = await supabase
          .from(table.name)
          .select('id')
          .limit(1);
        
        checks[table.key as keyof typeof checks] = !error;
        if (error) {
          missingItems.push(`${table.name} table`);
          console.log(`[Setup Check] Missing: ${table.name} table`);
        }
      } catch (e) {
        checks[table.key as keyof typeof checks] = false;
        missingItems.push(`${table.name} table`);
      }
    }

    const isReady = Object.values(checks).every(v => v);
    
    console.log('[Setup Check] Results:', { isReady, checks, missingItems });

    return new Response(
      JSON.stringify({
        isReady,
        checks,
        missingItems,
        message: isReady 
          ? 'All setup checks passed! Ready to seed data.' 
          : `Missing ${missingItems.length} item(s). Please run the setup SQL script first.`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Setup Check] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        isReady: false,
        error: errorMessage,
        message: 'Setup check failed. Please ensure you have run the SQL setup script.',
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
