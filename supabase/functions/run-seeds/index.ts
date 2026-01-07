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

    console.log('🌱 Starting seed process for transfer rules...');

    // Verify schema matches expected structure
    const { data: schemaTest, error: checkError } = await supabaseAdmin
      .from('credit_transfer_rules')
      .select('id')
      .limit(0);

    if (checkError) {
      console.error('❌ Schema verification failed:', checkError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Schema error detected',
          details: checkError.message,
          hint: 'Table may not exist or has incorrect schema. Run migrations first.'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Comprehensive transfer rules for decentralized degrees
    const transferRules = [
      // =====================================================================
      // SOPHIA LEARNING → TESU (General Education) - ACE Credit verified
      // =====================================================================
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ENG-COMP-I-II', target_institution: 'TESU', target_course_code: 'ENG-101', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-US-HIST-I', target_institution: 'TESU', target_course_code: 'HIS-113', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-US-HIST-II', target_institution: 'TESU', target_course_code: 'HIS-114', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-COLLEGE-ALG', target_institution: 'TESU', target_course_code: 'MAT-121', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-STATISTICS', target_institution: 'TESU', target_course_code: 'STA-201', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-ETHICS', target_institution: 'TESU', target_course_code: 'PHI-384', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ART-HIST-I', target_institution: 'TESU', target_course_code: 'ART-101', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ART-HIST-II', target_institution: 'TESU', target_course_code: 'ART-102', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-PHILO', target_institution: 'TESU', target_course_code: 'PHI-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-PSYCH', target_institution: 'TESU', target_course_code: 'PSY-101', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-SOC', target_institution: 'TESU', target_course_code: 'SOC-101', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-MACROECONOMICS', target_institution: 'TESU', target_course_code: 'ECO-212', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-MICROECONOMICS', target_institution: 'TESU', target_course_code: 'ECO-211', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-HUMAN-BIO', target_institution: 'TESU', target_course_code: 'BIO-101', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-ENV-SCI', target_institution: 'TESU', target_course_code: 'ENV-101', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-INTRO-CHEM', target_institution: 'TESU', target_course_code: 'CHE-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
      { source_institution: 'SOPHIA', source_course_code: 'SOPHIA-PUBLIC-SPEAK', target_institution: 'TESU', target_course_code: 'COM-209', acceptance_status: 'accepted', rule_source: 'ACE Credit / Sophia Pathway', confidence: 0.95, evidence_url: 'https://www.tesu.edu/transfer-credit' },
      
      // =====================================================================
      // STUDY.COM → TESU (CS Core & Upper Division) - ACE Credit verified
      // =====================================================================
      // Lower Division CS Core (100-200 level)
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-INTRO-CS', target_institution: 'TESU', target_course_code: 'COS-101', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-PYTHON', target_institution: 'TESU', target_course_code: 'COS-161', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-JAVA-PROG', target_institution: 'TESU', target_course_code: 'COS-162', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-DATA-STRUCT', target_institution: 'TESU', target_course_code: 'COS-265', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-COMP-ARCH', target_institution: 'TESU', target_course_code: 'COS-231', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      
      // Math Core
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-CALC-I', target_institution: 'TESU', target_course_code: 'MAT-231', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-CALC-II', target_institution: 'TESU', target_course_code: 'MAT-232', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-DISCRETE-MATH', target_institution: 'TESU', target_course_code: 'MAT-210', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-LINEAR-ALG', target_institution: 'TESU', target_course_code: 'MAT-250', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-PROB-STATS', target_institution: 'TESU', target_course_code: 'STA-215', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      
      // Upper Division CS Core (300+ level) - Critical for graduation
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-ALGORITHMS', target_institution: 'TESU', target_course_code: 'COS-331', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-OS', target_institution: 'TESU', target_course_code: 'COS-341', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-DATABASE', target_institution: 'TESU', target_course_code: 'COS-350', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-NET-FUND', target_institution: 'TESU', target_course_code: 'COS-360', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-SOFTWARE-ENG', target_institution: 'TESU', target_course_code: 'COS-421', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-THEORY-COMP', target_institution: 'TESU', target_course_code: 'COS-311', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-INFO-SEC', target_institution: 'TESU', target_course_code: 'COS-340', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-AI-ML', target_institution: 'TESU', target_course_code: 'COS-470', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-WEB-DEV', target_institution: 'TESU', target_course_code: 'COS-310', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      
      // CS Electives (accepted as general electives)
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-CLOUD-COMP', target_institution: 'TESU', target_course_code: null, acceptance_status: 'elective', rule_source: 'ACE Credit', confidence: 0.85, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-MOBILE-DEV', target_institution: 'TESU', target_course_code: null, acceptance_status: 'elective', rule_source: 'ACE Credit', confidence: 0.85, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-DEVOPS', target_institution: 'TESU', target_course_code: null, acceptance_status: 'elective', rule_source: 'ACE Credit', confidence: 0.85, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      
      // =====================================================================
      // STUDY.COM → TESU (Business Core) - for BSBA templates
      // =====================================================================
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-PRIN-MGMT', target_institution: 'TESU', target_course_code: 'MAN-321', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-PRIN-MKT', target_institution: 'TESU', target_course_code: 'MAR-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-FIN-ACCT', target_institution: 'TESU', target_course_code: 'ACC-102', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-MGT-ACCT', target_institution: 'TESU', target_course_code: 'ACC-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-MICRO-ECON', target_institution: 'TESU', target_course_code: 'ECO-211', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-MACRO-ECON', target_institution: 'TESU', target_course_code: 'ECO-212', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-INFO-SYS', target_institution: 'TESU', target_course_code: 'CIS-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.92, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-BUS-ETH', target_institution: 'TESU', target_course_code: 'BUS-331', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-CORP-FIN', target_institution: 'TESU', target_course_code: 'FIN-321', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-BUS-LAW', target_institution: 'TESU', target_course_code: 'BUS-311', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-HR-MGMT', target_institution: 'TESU', target_course_code: 'HRM-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-PROJ-MGMT', target_institution: 'TESU', target_course_code: 'MAN-341', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-SUPPLY-CHAIN', target_institution: 'TESU', target_course_code: 'OPM-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-BUS-ANALYTICS', target_institution: 'TESU', target_course_code: 'BUS-351', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.90, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-ENTREPRENEUR', target_institution: 'TESU', target_course_code: 'ENT-301', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-DIGITAL-MKT', target_institution: 'TESU', target_course_code: 'MAR-331', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-CONSUMER-BEH', target_institution: 'TESU', target_course_code: 'MAR-321', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-RESEARCH-METH', target_institution: 'TESU', target_course_code: 'BUS-401', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      { source_institution: 'STUDYCOM', source_course_code: 'SDC-DATA-DECISIONS', target_institution: 'TESU', target_course_code: 'BUS-411', acceptance_status: 'accepted', rule_source: 'ACE Credit', confidence: 0.88, evidence_url: 'https://study.com/college/school/thomas-edison-state-university.html' },
      
      // =====================================================================
      // TESU INSTITUTIONAL COURSES (Residency Credits)
      // =====================================================================
      { source_institution: 'TESU', source_course_code: 'TESU-CS-CAPSTONE', target_institution: 'TESU', target_course_code: 'COS-495', acceptance_status: 'accepted', rule_source: 'Institutional', confidence: 1.00, evidence_url: 'https://www.tesu.edu/cs' },
      { source_institution: 'TESU', source_course_code: 'TESU-CS-ETHICS', target_institution: 'TESU', target_course_code: 'COS-420', acceptance_status: 'accepted', rule_source: 'Institutional', confidence: 1.00, evidence_url: 'https://www.tesu.edu/cs' },
      { source_institution: 'TESU', source_course_code: 'TESU-SR-SEMINAR', target_institution: 'TESU', target_course_code: 'LIB-495', acceptance_status: 'accepted', rule_source: 'Institutional', confidence: 1.00, evidence_url: 'https://www.tesu.edu' },
      { source_institution: 'TESU', source_course_code: 'TESU-TECH-WRITING', target_institution: 'TESU', target_course_code: 'ENG-321', acceptance_status: 'accepted', rule_source: 'Institutional', confidence: 1.00, evidence_url: 'https://www.tesu.edu' },
      { source_institution: 'TESU', source_course_code: 'TESU-PROJ-MGMT', target_institution: 'TESU', target_course_code: 'MAN-375', acceptance_status: 'accepted', rule_source: 'Institutional', confidence: 1.00, evidence_url: 'https://www.tesu.edu' },
      
      // =====================================================================
      // CLEP EXAMS → TESU (Testing Credit)
      // =====================================================================
      { source_institution: 'CLEP', source_course_code: 'CLEP-COLLEGE-COMP', target_institution: 'TESU', target_course_code: 'ENG-101', acceptance_status: 'accepted', rule_source: 'CLEP Equivalency', confidence: 1.00, evidence_url: 'https://www.tesu.edu/clep' },
      { source_institution: 'CLEP', source_course_code: 'CLEP-CALCULUS', target_institution: 'TESU', target_course_code: 'MAT-231', acceptance_status: 'accepted', rule_source: 'CLEP Equivalency', confidence: 1.00, evidence_url: 'https://www.tesu.edu/clep' },
      { source_institution: 'CLEP', source_course_code: 'CLEP-PSYCH', target_institution: 'TESU', target_course_code: 'PSY-101', acceptance_status: 'accepted', rule_source: 'CLEP Equivalency', confidence: 1.00, evidence_url: 'https://www.tesu.edu/clep' },
      { source_institution: 'CLEP', source_course_code: 'CLEP-SOCIOLOGY', target_institution: 'TESU', target_course_code: 'SOC-101', acceptance_status: 'accepted', rule_source: 'CLEP Equivalency', confidence: 1.00, evidence_url: 'https://www.tesu.edu/clep' },
      { source_institution: 'CLEP', source_course_code: 'CLEP-INFO-SYS', target_institution: 'TESU', target_course_code: 'CIS-211', acceptance_status: 'accepted', rule_source: 'CLEP Equivalency', confidence: 1.00, evidence_url: 'https://www.tesu.edu/clep' },
      { source_institution: 'CLEP', source_course_code: 'CLEP-MACRO-ECON', target_institution: 'TESU', target_course_code: 'ECO-212', acceptance_status: 'accepted', rule_source: 'CLEP Equivalency', confidence: 1.00, evidence_url: 'https://www.tesu.edu/clep' },
      { source_institution: 'CLEP', source_course_code: 'CLEP-MICRO-ECON', target_institution: 'TESU', target_course_code: 'ECO-211', acceptance_status: 'accepted', rule_source: 'CLEP Equivalency', confidence: 1.00, evidence_url: 'https://www.tesu.edu/clep' },
    ];

    // Use upsert to handle existing records - update if exists, insert if not
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const rule of transferRules) {
      const { data, error } = await supabaseAdmin
        .from('credit_transfer_rules')
        .upsert(rule, {
          onConflict: 'source_institution,source_course_code,target_institution',
          ignoreDuplicates: false
        })
        .select();

      if (error) {
        // If upsert fails due to missing constraint, try insert
        const { error: insertError } = await supabaseAdmin
          .from('credit_transfer_rules')
          .insert(rule);
        
        if (insertError) {
          console.warn(`⚠️ Failed to insert rule ${rule.source_course_code}:`, insertError.message);
          errors++;
        } else {
          inserted++;
        }
      } else {
        // Upsert succeeded
        if (data && data.length > 0) {
          updated++;
        } else {
          inserted++;
        }
      }
    }

    console.log(`✅ Seed complete: ${inserted} inserted, ${updated} updated, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Seeded ${transferRules.length} transfer rules`,
        stats: {
          total: transferRules.length,
          inserted,
          updated,
          errors
        }
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
