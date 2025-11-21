import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0?target=deno';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    console.log('🌱 Starting seed process...');

    // Check if seeds already applied by checking if any transfer rules exist
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('credit_transfer_rules')
      .select('id')
      .limit(1);

    if (checkError) {
      console.error('Error checking existing seeds:', checkError);
      throw checkError;
    }

    if (existing && existing.length > 0) {
      console.log('ℹ️ Seeds already applied');
      return new Response(
        JSON.stringify({
          alreadySeeded: true,
          message: 'Transfer rules already exist in database'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Apply seeds using batch insert
    const transferRules = [
      // Year 1: General Education - Sophia courses
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ENG-COMP-I-II', target_institution: 'TESU', target_course_code: 'ENG-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-US-HIST-I', target_institution: 'TESU', target_course_code: 'HIS-113', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-COLLEGE-ALG', target_institution: 'TESU', target_course_code: 'MAT-121', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-ETHICS', target_institution: 'TESU', target_course_code: 'PHI-384', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ART-HIST-I', target_institution: 'TESU', target_course_code: 'ART-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-PSYCH', target_institution: 'TESU', target_course_code: 'PSY-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-SOC', target_institution: 'TESU', target_course_code: 'SOC-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-HUMAN-BIO', target_institution: 'TESU', target_course_code: 'BIO-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ENV-SCI', target_institution: 'TESU', target_course_code: 'ENV-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-PUBLIC-SPEAK', target_institution: 'TESU', target_course_code: 'COM-209', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95 },
      
      // Year 2: Business Core - Study.com courses
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-PRIN-MGMT', target_institution: 'TESU', target_course_code: 'MAN-321', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-PRIN-MKT', target_institution: 'TESU', target_course_code: 'MAR-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-FIN-ACCT', target_institution: 'TESU', target_course_code: 'ACC-102', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-MGT-ACCT', target_institution: 'TESU', target_course_code: 'ACC-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-MICRO-ECON', target_institution: 'TESU', target_course_code: 'ECO-211', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-MACRO-ECON', target_institution: 'TESU', target_course_code: 'ECO-212', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-INFO-SYS', target_institution: 'TESU', target_course_code: 'CIS-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92 },
      
      // Year 3: Upper Division Business - Study.com courses
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-BUS-ETH', target_institution: 'TESU', target_course_code: 'BUS-331', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-CORP-FIN', target_institution: 'TESU', target_course_code: 'FIN-321', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-BUS-LAW', target_institution: 'TESU', target_course_code: 'BUS-311', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-HR-MGMT', target_institution: 'TESU', target_course_code: 'HRM-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-PROJ-MGMT', target_institution: 'TESU', target_course_code: 'MAN-341', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-SUPPLY-CHAIN', target_institution: 'TESU', target_course_code: 'OPM-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-BUS-ANALYTICS', target_institution: 'TESU', target_course_code: 'BUS-351', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90 },
      
      // Year 4: Business Electives - Study.com courses
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-ENTREPRENEUR', target_institution: 'TESU', target_course_code: 'ENT-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88 },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-DIGITAL-MKT', target_institution: 'TESU', target_course_code: 'MAR-331', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88 },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-CONSUMER-BEH', target_institution: 'TESU', target_course_code: 'MAR-321', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88 },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-RESEARCH-METH', target_institution: 'TESU', target_course_code: 'BUS-401', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88 },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-DATA-DECISIONS', target_institution: 'TESU', target_course_code: 'BUS-411', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88 }
    ];

    const { error: insertError } = await supabaseAdmin
      .from('credit_transfer_rules')
      .insert(transferRules);

    if (insertError) {
      console.error('Error inserting transfer rules:', insertError);
      throw insertError;
    }

    console.log(`✅ Successfully seeded ${transferRules.length} transfer rules`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully seeded ${transferRules.length} transfer rules`,
        count: transferRules.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Seed error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: 'Failed to apply database seeds'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
