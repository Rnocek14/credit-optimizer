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
  tesuInstitutionId?: string;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const response: SeedResponse = {
    jobName: 'seed-tesu',
    success: false,
    tables: {},
  };

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    console.log('[optimizer-seed-tesu] Starting TESU data seeding...');

    // ============================================================
    // STEP 1: Ensure TESU institution exists
    // ============================================================
    console.log('[optimizer-seed-tesu] Step 1: Upserting TESU institution...');
    const { data: tesuData, error: tesuError } = await supabase
      .from('institutions')
      .upsert({
        code: 'TESU',
        name: 'Thomas Edison State University',
        type: 'university',
        website_url: 'https://www.tesu.edu',
        accreditation_level: 'Regional',
        reputation_score: 85,
        verification_status: 'verified',
        metadata: {}
      }, { onConflict: 'code' })
      .select()
      .single();

    if (tesuError) throw new Error(`TESU institution upsert failed: ${tesuError.message}`);
    const tesuId = tesuData.id;
    response.tesuInstitutionId = tesuId;
    console.log(`[optimizer-seed-tesu] TESU institution ID: ${tesuId}`);

    // ============================================================
    // STEP 2: Seed institution_credit_limits (11 policies)
    // ============================================================
    console.log('[optimizer-seed-tesu] Step 2: Seeding institution_credit_limits...');
    const creditLimits = [
      { institution_id: tesuId, limit_type: 'total_credits', credit_value: 120, provider_code: null, notes: 'Standard bachelor degree requirement' },
      { institution_id: tesuId, limit_type: 'min_residency', credit_value: 15, provider_code: null, notes: 'Can be satisfied with cornerstone + capstone + 9 other credits' },
      { institution_id: tesuId, limit_type: 'upper_division_min', credit_value: 30, provider_code: null, notes: 'Minimum 300/400 level credits required' },
      { institution_id: tesuId, limit_type: 'total_transfer', credit_value: 113, provider_code: null, notes: 'Max credits that can transfer (120 - 15 residency + waivers)' },
      { institution_id: tesuId, limit_type: 'alt_credit_max', credit_value: 80, provider_code: null, notes: 'Max ACE/NCCRS alternative credits combined' },
      { institution_id: tesuId, limit_type: 'min_ra_credit', credit_value: 40, provider_code: null, notes: 'Minimum regionally-accredited credits' },
      { institution_id: tesuId, limit_type: 'clep_max', credit_value: 40, provider_code: null, notes: 'Maximum CLEP exam credits' },
      { institution_id: tesuId, limit_type: 'dsst_max', credit_value: 30, provider_code: null, notes: 'Maximum DSST exam credits' },
      { institution_id: tesuId, limit_type: 'sophia_max', credit_value: 90, provider_code: 'SOPHIA', notes: 'Max Sophia Learning credits' },
      { institution_id: tesuId, limit_type: 'study_com_max', credit_value: 30, provider_code: 'STUDY_COM', notes: 'Max Study.com credits' },
      { institution_id: tesuId, limit_type: 'per_provider_max', credit_value: 30, provider_code: 'STRAIGHTERLINE', notes: 'Max StraighterLine credits' },
    ];

    const { error: limitsError } = await supabase
      .from('institution_credit_limits')
      .upsert(creditLimits, { onConflict: 'institution_id,limit_type,provider_code' });

    if (limitsError) throw new Error(`Credit limits upsert failed: ${limitsError.message}`);
    response.tables.institution_credit_limits = { inserted: creditLimits.length, updated: 0, skipped: 0 };

    // ============================================================
    // STEP 3: Seed gened_frameworks (1 framework)
    // ============================================================
    console.log('[optimizer-seed-tesu] Step 3: Seeding gened_frameworks...');
    const { data: frameworkData, error: frameworkError } = await supabase
      .from('gened_frameworks')
      .upsert({
        institution_id: tesuId,
        framework_name: 'TESU General Education Requirements',
        framework_code: 'FW30',
        total_credits: 30,
        description: 'TESU 30-credit general education framework'
      }, { onConflict: 'institution_id' })
      .select()
      .single();

    if (frameworkError) throw new Error(`Gen-ed framework upsert failed: ${frameworkError.message}`);
    response.tables.gened_frameworks = { inserted: 1, updated: 0, skipped: 0 };

    // ============================================================
    // STEP 4: Seed gened_categories (7 categories)
    // ============================================================
    console.log('[optimizer-seed-tesu] Step 4: Seeding gened_categories...');
    const genedCategories = [
      { institution_id: tesuId, category_code: 'WRITTEN_COMM', category_name: 'Written Communication', credits_required: 6, description: 'English Composition I & II or equivalent', display_order: 1, min_grade: 'C' },
      { institution_id: tesuId, category_code: 'ORAL_COMM', category_name: 'Oral Communication', credits_required: 3, description: 'Public Speaking or Communication course', display_order: 2, min_grade: 'C' },
      { institution_id: tesuId, category_code: 'QUANTITATIVE', category_name: 'Quantitative Literacy', credits_required: 3, description: 'College Algebra or higher mathematics', display_order: 3, min_grade: 'C' },
      { institution_id: tesuId, category_code: 'HUMANITIES', category_name: 'Humanities', credits_required: 9, description: 'Literature, Philosophy, Arts, or related fields', display_order: 4, min_grade: 'C' },
      { institution_id: tesuId, category_code: 'SOCIAL_SCIENCE', category_name: 'Social Sciences', credits_required: 9, description: 'Psychology, Sociology, Economics, History, etc.', display_order: 5, min_grade: 'C' },
      { institution_id: tesuId, category_code: 'NATURAL_SCIENCE', category_name: 'Natural Sciences', credits_required: 6, description: 'Biology, Chemistry, Physics, or Earth Science', display_order: 6, min_grade: 'C' },
      { institution_id: tesuId, category_code: 'CIVIC_GLOBAL', category_name: 'Civic & Global Engagement', credits_required: 3, description: 'Diversity, Ethics, or Global Awareness', display_order: 7, min_grade: 'C' },
    ];

    const { error: categoriesError } = await supabase
      .from('gened_categories')
      .upsert(genedCategories, { onConflict: 'institution_id,category_code' });

    if (categoriesError) throw new Error(`Gen-ed categories upsert failed: ${categoriesError.message}`);
    response.tables.gened_categories = { inserted: genedCategories.length, updated: 0, skipped: 0 };

    // ============================================================
    // STEP 5: Seed alt_credits (50 alternative credits)
    // ============================================================
    console.log('[optimizer-seed-tesu] Step 5: Seeding alt_credits...');
    const altCredits = [
      // CLEP Exams (15)
      { source_code: 'CLEP', identifier: 'COMP', title: 'College Composition', credits_typical: 6, level: 100, subject_area: 'english', cost_usd: 95, duration_estimate_weeks: 6, exam_based: true, provider_url: 'https://clep.collegeboard.org/' },
      { source_code: 'CLEP', identifier: 'COMP_MOD', title: 'College Composition Modular', credits_typical: 3, level: 100, subject_area: 'english', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org/' },
      { source_code: 'CLEP', identifier: 'ALGEBRA', title: 'College Algebra', credits_typical: 3, level: 100, subject_area: 'math', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org/' },
      { source_code: 'CLEP', identifier: 'PRECALC', title: 'Precalculus', credits_typical: 3, level: 100, subject_area: 'math', cost_usd: 95, duration_estimate_weeks: 6, exam_based: true, provider_url: 'https://clep.collegeboard.org/' },
      { source_code: 'CLEP', identifier: 'CALCULUS', title: 'Calculus', credits_typical: 4, level: 200, subject_area: 'math', cost_usd: 95, duration_estimate_weeks: 8, exam_based: true, provider_url: 'https://clep.collegeboard.org/' },
      { source_code: 'CLEP', identifier: 'PSYCH', title: 'Introductory Psychology', credits_typical: 3, level: 100, subject_area: 'psychology', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org/' },
      { source_code: 'CLEP', identifier: 'SOCIO', title: 'Introductory Sociology', credits_typical: 3, level: 100, subject_area: 'sociology', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org/' },
      { source_code: 'CLEP', identifier: 'US_HIST1', title: 'History of the United States I', credits_typical: 3, level: 100, subject_area: 'history', cost_usd: 95, duration_estimate_weeks: 5, exam_based: true, provider_url: 'https://clep.collegeboard.org/' },
      { source_code: 'CLEP', identifier: 'US_HIST2', title: 'History of the United States II', credits_typical: 3, level: 100, subject_area: 'history', cost_usd: 95, duration_estimate_weeks: 5, exam_based: true, provider_url: 'https://clep.collegeboard.org/' },
      { source_code: 'CLEP', identifier: 'BIOLOGY', title: 'Biology', credits_typical: 6, level: 100, subject_area: 'biology', cost_usd: 95, duration_estimate_weeks: 6, exam_based: true, provider_url: 'https://clep.collegeboard.org/' },
      { source_code: 'CLEP', identifier: 'NAT_SCI', title: 'Natural Sciences', credits_typical: 6, level: 100, subject_area: 'science', cost_usd: 95, duration_estimate_weeks: 6, exam_based: true, provider_url: 'https://clep.collegeboard.org/' },
      { source_code: 'CLEP', identifier: 'HUMANITIES', title: 'Humanities', credits_typical: 6, level: 100, subject_area: 'humanities', cost_usd: 95, duration_estimate_weeks: 5, exam_based: true, provider_url: 'https://clep.collegeboard.org/' },
      { source_code: 'CLEP', identifier: 'PRINCIPLES_MGMT', title: 'Principles of Management', credits_typical: 3, level: 200, subject_area: 'business', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org/' },
      { source_code: 'CLEP', identifier: 'PRINCIPLES_MKT', title: 'Principles of Marketing', credits_typical: 3, level: 200, subject_area: 'business', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org/' },
      { source_code: 'CLEP', identifier: 'BUS_LAW', title: 'Introductory Business Law', credits_typical: 3, level: 200, subject_area: 'business', cost_usd: 95, duration_estimate_weeks: 5, exam_based: true, provider_url: 'https://clep.collegeboard.org/' },
      
      // DSST Exams (10)
      { source_code: 'DSST', identifier: 'INTRO_BUS', title: 'Introduction to Business', credits_typical: 3, level: 100, subject_area: 'business', cost_usd: 100, duration_estimate_weeks: 5, exam_based: true, provider_url: 'https://www.getcollegecredit.com/' },
      { source_code: 'DSST', identifier: 'BUS_MATH', title: 'Business Mathematics', credits_typical: 3, level: 100, subject_area: 'math', cost_usd: 100, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://www.getcollegecredit.com/' },
      { source_code: 'DSST', identifier: 'ORG_BEH', title: 'Organizational Behavior', credits_typical: 3, level: 300, subject_area: 'business', cost_usd: 100, duration_estimate_weeks: 5, exam_based: true, provider_url: 'https://www.getcollegecredit.com/' },
      { source_code: 'DSST', identifier: 'HR_MGMT', title: 'Human Resource Management', credits_typical: 3, level: 300, subject_area: 'business', cost_usd: 100, duration_estimate_weeks: 5, exam_based: true, provider_url: 'https://www.getcollegecredit.com/' },
      { source_code: 'DSST', identifier: 'PRINCIPLES_FIN', title: 'Principles of Finance', credits_typical: 3, level: 300, subject_area: 'finance', cost_usd: 100, duration_estimate_weeks: 6, exam_based: true, provider_url: 'https://www.getcollegecredit.com/' },
      { source_code: 'DSST', identifier: 'MONEY_BANK', title: 'Money and Banking', credits_typical: 3, level: 300, subject_area: 'finance', cost_usd: 100, duration_estimate_weeks: 5, exam_based: true, provider_url: 'https://www.getcollegecredit.com/' },
      { source_code: 'DSST', identifier: 'PERSONAL_FIN', title: 'Personal Finance', credits_typical: 3, level: 200, subject_area: 'finance', cost_usd: 100, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://www.getcollegecredit.com/' },
      { source_code: 'DSST', identifier: 'MIS', title: 'Management Information Systems', credits_typical: 3, level: 300, subject_area: 'business', cost_usd: 100, duration_estimate_weeks: 5, exam_based: true, provider_url: 'https://www.getcollegecredit.com/' },
      { source_code: 'DSST', identifier: 'SUPERVISION', title: 'Principles of Supervision', credits_typical: 3, level: 200, subject_area: 'business', cost_usd: 100, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://www.getcollegecredit.com/' },
      { source_code: 'DSST', identifier: 'BUS_ETHICS', title: 'Business Ethics and Society', credits_typical: 3, level: 300, subject_area: 'business', cost_usd: 100, duration_estimate_weeks: 5, exam_based: true, provider_url: 'https://www.getcollegecredit.com/' },
      
      // Sophia Learning (15)
      { source_code: 'SOPHIA', identifier: 'ENG_COMP1', title: 'English Composition I', credits_typical: 3, level: 100, subject_area: 'english', cost_usd: 99, duration_estimate_weeks: 3, exam_based: false, provider_url: 'https://www.sophia.org/' },
      { source_code: 'SOPHIA', identifier: 'ENG_COMP2', title: 'English Composition II', credits_typical: 3, level: 100, subject_area: 'english', cost_usd: 99, duration_estimate_weeks: 3, exam_based: false, provider_url: 'https://www.sophia.org/' },
      { source_code: 'SOPHIA', identifier: 'PUBLIC_SPEAK', title: 'Public Speaking', credits_typical: 3, level: 100, subject_area: 'communication', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://www.sophia.org/' },
      { source_code: 'SOPHIA', identifier: 'COLLEGE_ALG', title: 'College Algebra', credits_typical: 3, level: 100, subject_area: 'math', cost_usd: 99, duration_estimate_weeks: 3, exam_based: false, provider_url: 'https://www.sophia.org/' },
      { source_code: 'SOPHIA', identifier: 'INTRO_STATS', title: 'Introduction to Statistics', credits_typical: 3, level: 200, subject_area: 'math', cost_usd: 99, duration_estimate_weeks: 3, exam_based: false, provider_url: 'https://www.sophia.org/' },
      { source_code: 'SOPHIA', identifier: 'MACRO_ECON', title: 'Macroeconomics', credits_typical: 3, level: 200, subject_area: 'economics', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://www.sophia.org/' },
      { source_code: 'SOPHIA', identifier: 'MICRO_ECON', title: 'Microeconomics', credits_typical: 3, level: 200, subject_area: 'economics', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://www.sophia.org/' },
      { source_code: 'SOPHIA', identifier: 'INTRO_BUS', title: 'Introduction to Business', credits_typical: 3, level: 100, subject_area: 'business', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://www.sophia.org/' },
      { source_code: 'SOPHIA', identifier: 'PROJECT_MGMT', title: 'Project Management', credits_typical: 3, level: 300, subject_area: 'business', cost_usd: 99, duration_estimate_weeks: 3, exam_based: false, provider_url: 'https://www.sophia.org/' },
      { source_code: 'SOPHIA', identifier: 'INTRO_PSYCH', title: 'Introduction to Psychology', credits_typical: 3, level: 100, subject_area: 'psychology', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://www.sophia.org/' },
      { source_code: 'SOPHIA', identifier: 'INTRO_SOCIO', title: 'Introduction to Sociology', credits_typical: 3, level: 100, subject_area: 'sociology', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://www.sophia.org/' },
      { source_code: 'SOPHIA', identifier: 'ENV_SCI', title: 'Environmental Science', credits_typical: 3, level: 100, subject_area: 'science', cost_usd: 99, duration_estimate_weeks: 3, exam_based: false, provider_url: 'https://www.sophia.org/' },
      { source_code: 'SOPHIA', identifier: 'ART_HISTORY', title: 'Art History I', credits_typical: 3, level: 100, subject_area: 'humanities', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://www.sophia.org/' },
      { source_code: 'SOPHIA', identifier: 'ETHICS', title: 'Introduction to Ethics', credits_typical: 3, level: 100, subject_area: 'philosophy', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://www.sophia.org/' },
      { source_code: 'SOPHIA', identifier: 'COMM', title: 'Communication at Work', credits_typical: 3, level: 200, subject_area: 'communication', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://www.sophia.org/' },
      
      // Study.com (10)
      { source_code: 'STUDY_COM', identifier: 'FIN_ACCT', title: 'Financial Accounting', credits_typical: 3, level: 300, subject_area: 'accounting', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com/' },
      { source_code: 'STUDY_COM', identifier: 'MGRL_ACCT', title: 'Managerial Accounting', credits_typical: 3, level: 300, subject_area: 'accounting', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com/' },
      { source_code: 'STUDY_COM', identifier: 'OPS_MGMT', title: 'Operations Management', credits_typical: 3, level: 300, subject_area: 'business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com/' },
      { source_code: 'STUDY_COM', identifier: 'BUS_STRATEGY', title: 'Business Strategy', credits_typical: 3, level: 400, subject_area: 'business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com/' },
      { source_code: 'STUDY_COM', identifier: 'QUANT_METH', title: 'Quantitative Methods', credits_typical: 3, level: 300, subject_area: 'math', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com/' },
      { source_code: 'STUDY_COM', identifier: 'ORG_BEHAVIOR', title: 'Organizational Behavior', credits_typical: 3, level: 300, subject_area: 'business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com/' },
      { source_code: 'STUDY_COM', identifier: 'HR_MGMT', title: 'Human Resource Management', credits_typical: 3, level: 300, subject_area: 'business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com/' },
      { source_code: 'STUDY_COM', identifier: 'BUS_LAW', title: 'Business Law', credits_typical: 3, level: 300, subject_area: 'business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com/' },
      { source_code: 'STUDY_COM', identifier: 'INT_BUS', title: 'International Business', credits_typical: 3, level: 300, subject_area: 'business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com/' },
      { source_code: 'STUDY_COM', identifier: 'STRATEGIC_MGMT', title: 'Strategic Management', credits_typical: 3, level: 400, subject_area: 'business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com/' },
    ];

    const { error: altCreditsError } = await supabase
      .from('alt_credits')
      .upsert(altCredits, { onConflict: 'source_code,identifier' });

    if (altCreditsError) throw new Error(`Alt credits upsert failed: ${altCreditsError.message}`);
    response.tables.alt_credits = { inserted: altCredits.length, updated: 0, skipped: 0 };

    // ============================================================
    // STEP 6: Seed cross_institution_equivalencies (50 mappings)
    // ============================================================
    console.log('[optimizer-seed-tesu] Step 6: Seeding cross_institution_equivalencies...');
    
    // First, get all alt_credit IDs
    const { data: altCreditRecords } = await supabase
      .from('alt_credits')
      .select('id, source_code, identifier');
    
    const altCreditMap = new Map<string, string>();
    altCreditRecords?.forEach(ac => {
      altCreditMap.set(`${ac.source_code}:${ac.identifier}`, ac.id);
    });

    const equivalencies = [
      // CLEP equivalencies
      { alt_credit_key: 'CLEP:COMP', institutional_course_code: 'ENG-101', credits_awarded: 6, gened_category_code: 'WRITTEN_COMM', requirement_area: 'genED', confidence: 0.95 },
      { alt_credit_key: 'CLEP:ALGEBRA', institutional_course_code: 'MAT-115', credits_awarded: 3, gened_category_code: 'QUANTITATIVE', requirement_area: 'genED', confidence: 0.95 },
      { alt_credit_key: 'CLEP:PSYCH', institutional_course_code: 'PSY-101', credits_awarded: 3, gened_category_code: 'SOCIAL_SCIENCE', requirement_area: 'genED', confidence: 0.95 },
      { alt_credit_key: 'CLEP:SOCIO', institutional_course_code: 'SOC-101', credits_awarded: 3, gened_category_code: 'SOCIAL_SCIENCE', requirement_area: 'genED', confidence: 0.95 },
      { alt_credit_key: 'CLEP:US_HIST1', institutional_course_code: 'HIS-111', credits_awarded: 3, gened_category_code: 'SOCIAL_SCIENCE', requirement_area: 'genED', confidence: 0.95 },
      { alt_credit_key: 'CLEP:BIOLOGY', institutional_course_code: 'BIO-101', credits_awarded: 6, gened_category_code: 'NATURAL_SCIENCE', requirement_area: 'genED', confidence: 0.95 },
      { alt_credit_key: 'CLEP:HUMANITIES', institutional_course_code: 'HUM-101', credits_awarded: 6, gened_category_code: 'HUMANITIES', requirement_area: 'genED', confidence: 0.95 },
      { alt_credit_key: 'CLEP:PRINCIPLES_MGMT', institutional_course_code: 'MGT-301', credits_awarded: 3, gened_category_code: null, requirement_area: 'major', confidence: 0.90 },
      { alt_credit_key: 'CLEP:PRINCIPLES_MKT', institutional_course_code: 'MKT-301', credits_awarded: 3, gened_category_code: null, requirement_area: 'major', confidence: 0.90 },
      { alt_credit_key: 'CLEP:BUS_LAW', institutional_course_code: 'LAW-201', credits_awarded: 3, gened_category_code: null, requirement_area: 'major', confidence: 0.90 },
      
      // DSST equivalencies
      { alt_credit_key: 'DSST:INTRO_BUS', institutional_course_code: 'BUS-101', credits_awarded: 3, gened_category_code: null, requirement_area: 'major', confidence: 0.90 },
      { alt_credit_key: 'DSST:ORG_BEH', institutional_course_code: 'MGT-310', credits_awarded: 3, gened_category_code: null, requirement_area: 'major', confidence: 0.90 },
      { alt_credit_key: 'DSST:HR_MGMT', institutional_course_code: 'MGT-320', credits_awarded: 3, gened_category_code: null, requirement_area: 'major', confidence: 0.90 },
      { alt_credit_key: 'DSST:PRINCIPLES_FIN', institutional_course_code: 'FIN-301', credits_awarded: 3, gened_category_code: null, requirement_area: 'major', confidence: 0.90 },
      { alt_credit_key: 'DSST:MIS', institutional_course_code: 'CIS-310', credits_awarded: 3, gened_category_code: null, requirement_area: 'major', confidence: 0.90 },
      { alt_credit_key: 'DSST:BUS_ETHICS', institutional_course_code: 'ETH-301', credits_awarded: 3, gened_category_code: 'CIVIC_GLOBAL', requirement_area: 'genED', confidence: 0.85 },
      
      // Sophia equivalencies
      { alt_credit_key: 'SOPHIA:ENG_COMP1', institutional_course_code: 'ENG-101', credits_awarded: 3, gened_category_code: 'WRITTEN_COMM', requirement_area: 'genED', confidence: 0.92 },
      { alt_credit_key: 'SOPHIA:ENG_COMP2', institutional_course_code: 'ENG-102', credits_awarded: 3, gened_category_code: 'WRITTEN_COMM', requirement_area: 'genED', confidence: 0.92 },
      { alt_credit_key: 'SOPHIA:PUBLIC_SPEAK', institutional_course_code: 'COM-101', credits_awarded: 3, gened_category_code: 'ORAL_COMM', requirement_area: 'genED', confidence: 0.92 },
      { alt_credit_key: 'SOPHIA:COLLEGE_ALG', institutional_course_code: 'MAT-115', credits_awarded: 3, gened_category_code: 'QUANTITATIVE', requirement_area: 'genED', confidence: 0.92 },
      { alt_credit_key: 'SOPHIA:INTRO_STATS', institutional_course_code: 'STA-201', credits_awarded: 3, gened_category_code: 'QUANTITATIVE', requirement_area: 'genED', confidence: 0.90 },
      { alt_credit_key: 'SOPHIA:MACRO_ECON', institutional_course_code: 'ECO-201', credits_awarded: 3, gened_category_code: 'SOCIAL_SCIENCE', requirement_area: 'genED', confidence: 0.90 },
      { alt_credit_key: 'SOPHIA:MICRO_ECON', institutional_course_code: 'ECO-202', credits_awarded: 3, gened_category_code: 'SOCIAL_SCIENCE', requirement_area: 'genED', confidence: 0.90 },
      { alt_credit_key: 'SOPHIA:INTRO_BUS', institutional_course_code: 'BUS-101', credits_awarded: 3, gened_category_code: null, requirement_area: 'major', confidence: 0.90 },
      { alt_credit_key: 'SOPHIA:PROJECT_MGMT', institutional_course_code: 'MGT-350', credits_awarded: 3, gened_category_code: null, requirement_area: 'major', confidence: 0.88 },
      { alt_credit_key: 'SOPHIA:INTRO_PSYCH', institutional_course_code: 'PSY-101', credits_awarded: 3, gened_category_code: 'SOCIAL_SCIENCE', requirement_area: 'genED', confidence: 0.92 },
      { alt_credit_key: 'SOPHIA:INTRO_SOCIO', institutional_course_code: 'SOC-101', credits_awarded: 3, gened_category_code: 'SOCIAL_SCIENCE', requirement_area: 'genED', confidence: 0.92 },
      { alt_credit_key: 'SOPHIA:ENV_SCI', institutional_course_code: 'SCI-110', credits_awarded: 3, gened_category_code: 'NATURAL_SCIENCE', requirement_area: 'genED', confidence: 0.90 },
      { alt_credit_key: 'SOPHIA:ART_HISTORY', institutional_course_code: 'ART-101', credits_awarded: 3, gened_category_code: 'HUMANITIES', requirement_area: 'genED', confidence: 0.90 },
      { alt_credit_key: 'SOPHIA:ETHICS', institutional_course_code: 'PHI-101', credits_awarded: 3, gened_category_code: 'CIVIC_GLOBAL', requirement_area: 'genED', confidence: 0.90 },
      { alt_credit_key: 'SOPHIA:COMM', institutional_course_code: 'COM-201', credits_awarded: 3, gened_category_code: 'ORAL_COMM', requirement_area: 'genED', confidence: 0.88 },
      
      // Study.com equivalencies
      { alt_credit_key: 'STUDY_COM:FIN_ACCT', institutional_course_code: 'ACC-201', credits_awarded: 3, gened_category_code: null, requirement_area: 'major', confidence: 0.88 },
      { alt_credit_key: 'STUDY_COM:MGRL_ACCT', institutional_course_code: 'ACC-202', credits_awarded: 3, gened_category_code: null, requirement_area: 'major', confidence: 0.88 },
      { alt_credit_key: 'STUDY_COM:OPS_MGMT', institutional_course_code: 'MGT-360', credits_awarded: 3, gened_category_code: null, requirement_area: 'major', confidence: 0.85 },
      { alt_credit_key: 'STUDY_COM:BUS_STRATEGY', institutional_course_code: 'MGT-490', credits_awarded: 3, gened_category_code: null, requirement_area: 'major', confidence: 0.85 },
      { alt_credit_key: 'STUDY_COM:QUANT_METH', institutional_course_code: 'QNT-301', credits_awarded: 3, gened_category_code: null, requirement_area: 'major', confidence: 0.85 },
      { alt_credit_key: 'STUDY_COM:ORG_BEHAVIOR', institutional_course_code: 'MGT-310', credits_awarded: 3, gened_category_code: null, requirement_area: 'major', confidence: 0.85 },
      { alt_credit_key: 'STUDY_COM:HR_MGMT', institutional_course_code: 'MGT-320', credits_awarded: 3, gened_category_code: null, requirement_area: 'major', confidence: 0.85 },
      { alt_credit_key: 'STUDY_COM:BUS_LAW', institutional_course_code: 'LAW-201', credits_awarded: 3, gened_category_code: null, requirement_area: 'major', confidence: 0.85 },
      { alt_credit_key: 'STUDY_COM:INT_BUS', institutional_course_code: 'BUS-380', credits_awarded: 3, gened_category_code: null, requirement_area: 'major', confidence: 0.85 },
      { alt_credit_key: 'STUDY_COM:STRATEGIC_MGMT', institutional_course_code: 'MGT-495', credits_awarded: 3, gened_category_code: null, requirement_area: 'major', confidence: 0.85 },
    ];

    const equivalenciesToInsert = equivalencies
      .map(eq => {
        const altCreditId = altCreditMap.get(eq.alt_credit_key);
        if (!altCreditId) return null;
        return {
          alt_credit_id: altCreditId,
          institution_id: tesuId,
          institutional_course_code: eq.institutional_course_code,
          credits_awarded: eq.credits_awarded,
          gened_category_code: eq.gened_category_code,
          requirement_area: eq.requirement_area,
          confidence: eq.confidence,
        };
      })
      .filter(Boolean);

    const { error: equivError } = await supabase
      .from('cross_institution_equivalencies')
      .upsert(equivalenciesToInsert, { onConflict: 'alt_credit_id,institution_id,institutional_course_code' });

    if (equivError) throw new Error(`Equivalencies upsert failed: ${equivError.message}`);
    response.tables.cross_institution_equivalencies = { inserted: equivalenciesToInsert.length, updated: 0, skipped: 0 };

    // ============================================================
    // STEP 7: Seed degree_templates (1 BSBA template)
    // ============================================================
    console.log('[optimizer-seed-tesu] Step 7: Seeding degree_templates...');
    const bsbaTemplate = {
      id: 'TESU-BSBA-CHEAPEST-V1',
      institution_id: tesuId,
      institution_code: 'TESU',
      program_code: 'BSBA',
      program_name: 'Bachelor of Science in Business Administration',
      track_type: 'cheapest',
      total_credits: 120,
      estimated_cost: 8500,
      estimated_duration_months: 18,
      catalog_year: '2024-2025',
      template_data: {
        version: '1.0',
        programCode: 'BSBA',
        trackType: 'cheapest',
        totalCredits: 120,
        terms: [
          {
            id: 'term-1',
            label: 'Term 1: Foundation',
            slots: [
              { slotId: 't1-s1', kind: 'gened', requirementArea: 'WRITTEN_COMM', minCredits: 3, preferred: { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'ENG_COMP1' } },
              { slotId: 't1-s2', kind: 'gened', requirementArea: 'QUANTITATIVE', minCredits: 3, preferred: { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'COLLEGE_ALG' } },
              { slotId: 't1-s3', kind: 'gened', requirementArea: 'ORAL_COMM', minCredits: 3, preferred: { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'PUBLIC_SPEAK' } },
              { slotId: 't1-s4', kind: 'major', requirementArea: 'BUS_CORE', minCredits: 3, preferred: { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'INTRO_BUS' } },
            ],
          },
          {
            id: 'term-2',
            label: 'Term 2: GenEd & Core',
            slots: [
              { slotId: 't2-s1', kind: 'gened', requirementArea: 'WRITTEN_COMM', minCredits: 3, preferred: { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'ENG_COMP2' } },
              { slotId: 't2-s2', kind: 'gened', requirementArea: 'SOCIAL_SCIENCE', minCredits: 3, preferred: { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'MACRO_ECON' } },
              { slotId: 't2-s3', kind: 'gened', requirementArea: 'SOCIAL_SCIENCE', minCredits: 3, preferred: { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'MICRO_ECON' } },
              { slotId: 't2-s4', kind: 'gened', requirementArea: 'HUMANITIES', minCredits: 3, preferred: { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'ART_HISTORY' } },
            ],
          },
          {
            id: 'term-3',
            label: 'Term 3: Science & Ethics',
            slots: [
              { slotId: 't3-s1', kind: 'gened', requirementArea: 'NATURAL_SCIENCE', minCredits: 3, preferred: { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'ENV_SCI' } },
              { slotId: 't3-s2', kind: 'gened', requirementArea: 'CIVIC_GLOBAL', minCredits: 3, preferred: { type: 'alt_credit', sourceCode: 'SOPHIA', identifier: 'ETHICS' } },
              { slotId: 't3-s3', kind: 'major', requirementArea: 'ACCOUNTING', minCredits: 3, preferred: { type: 'alt_credit', sourceCode: 'STUDY_COM', identifier: 'FIN_ACCT' } },
              { slotId: 't3-s4', kind: 'major', requirementArea: 'ACCOUNTING', minCredits: 3, preferred: { type: 'alt_credit', sourceCode: 'STUDY_COM', identifier: 'MGRL_ACCT' } },
            ],
          },
          {
            id: 'term-4',
            label: 'Term 4: Upper Division',
            slots: [
              { slotId: 't4-s1', kind: 'major', requirementArea: 'MANAGEMENT', minCredits: 3, preferred: { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'PRINCIPLES_MGMT' } },
              { slotId: 't4-s2', kind: 'major', requirementArea: 'MARKETING', minCredits: 3, preferred: { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'PRINCIPLES_MKT' } },
              { slotId: 't4-s3', kind: 'major', requirementArea: 'FINANCE', minCredits: 3, preferred: { type: 'alt_credit', sourceCode: 'DSST', identifier: 'PRINCIPLES_FIN' } },
              { slotId: 't4-s4', kind: 'major', requirementArea: 'BUS_LAW', minCredits: 3, preferred: { type: 'alt_credit', sourceCode: 'CLEP', identifier: 'BUS_LAW' } },
            ],
          },
        ],
        policies: {
          totalCredits: 120,
          genedCredits: 30,
          majorCredits: 60,
          electiveCredits: 30,
          upperDivisionTotal: 30,
        },
      },
    };

    const { error: templateError } = await supabase
      .from('degree_templates')
      .upsert(bsbaTemplate, { onConflict: 'id' });

    if (templateError) throw new Error(`Degree template upsert failed: ${templateError.message}`);
    response.tables.degree_templates = { inserted: 1, updated: 0, skipped: 0 };

    // SUCCESS
    response.success = true;
    console.log('[optimizer-seed-tesu] Seeding completed successfully:', response.tables);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[optimizer-seed-tesu] Error:', err);
    response.error = err instanceof Error ? err.message : 'Unknown error';

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
