// Deployment trigger: 2025-12-02T10:00:00Z
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
      { source_code: 'STUDY_COM', identifier: 'BUS_ETHICS', title: 'Business Ethics', credits_typical: 3, level: 300, subject_area: 'business', cost_usd: 199, duration_estimate_weeks: 6, exam_based: false, provider_url: 'https://study.com/' },
      { source_code: 'STUDY_COM', identifier: 'INT_BUS', title: 'International Business', credits_typical: 3, level: 300, subject_area: 'business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com/' },
      { source_code: 'STUDY_COM', identifier: 'SUPPLY_CHAIN', title: 'Supply Chain Management', credits_typical: 3, level: 300, subject_area: 'business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com/' },
      { source_code: 'STUDY_COM', identifier: 'BUS_COMM', title: 'Business Communication', credits_typical: 3, level: 200, subject_area: 'communication', cost_usd: 199, duration_estimate_weeks: 6, exam_based: false, provider_url: 'https://study.com/' },
      { source_code: 'STUDY_COM', identifier: 'LEADERSHIP', title: 'Leadership and Management', credits_typical: 3, level: 300, subject_area: 'business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com/' },
      { source_code: 'STUDY_COM', identifier: 'ECOMMERCE', title: 'E-Commerce', credits_typical: 3, level: 300, subject_area: 'business', cost_usd: 199, duration_estimate_weeks: 6, exam_based: false, provider_url: 'https://study.com/' },
    ];

    const { error: altCreditsError } = await supabase
      .from('alt_credits')
      .upsert(altCredits, { onConflict: 'source_code,identifier' });

    if (altCreditsError) throw new Error(`Alt credits upsert failed: ${altCreditsError.message}`);
    response.tables.alt_credits = { inserted: altCredits.length, updated: 0, skipped: 0 };

    // ============================================================
    // STEP 6: Get all alt_credit IDs for equivalency mapping
    // ============================================================
    console.log('[optimizer-seed-tesu] Step 6: Fetching alt_credit IDs for equivalency mapping...');
    const { data: altCreditIds, error: idsError } = await supabase
      .from('alt_credits')
      .select('id, source_code, identifier');

    if (idsError) throw new Error(`Failed to fetch alt_credit IDs: ${idsError.message}`);
    
    const idMap: Record<string, string> = {};
    altCreditIds?.forEach((ac: any) => {
      idMap[`${ac.source_code}_${ac.identifier}`] = ac.id;
    });

    // ============================================================
    // STEP 7: Seed cross_institution_equivalencies (50 mappings)
    // ============================================================
    console.log('[optimizer-seed-tesu] Step 7: Seeding cross_institution_equivalencies...');
    const equivalencies = [
      // Gen-Ed: Written Communication
      { alt_key: 'CLEP_COMP', course_code: 'ENC-101-102', course_name: 'English Composition I & II', credits: 6, level: 100, gened: 'WRITTEN_COMM', area: 'gened' },
      { alt_key: 'SOPHIA_ENG_COMP1', course_code: 'ENC-101', course_name: 'English Composition I', credits: 3, level: 100, gened: 'WRITTEN_COMM', area: 'gened' },
      { alt_key: 'SOPHIA_ENG_COMP2', course_code: 'ENC-102', course_name: 'English Composition II', credits: 3, level: 100, gened: 'WRITTEN_COMM', area: 'gened' },
      { alt_key: 'CLEP_COMP_MOD', course_code: 'ENC-101', course_name: 'English Composition I', credits: 3, level: 100, gened: 'WRITTEN_COMM', area: 'gened' },
      
      // Gen-Ed: Oral Communication
      { alt_key: 'SOPHIA_PUBLIC_SPEAK', course_code: 'COM-101', course_name: 'Public Speaking', credits: 3, level: 100, gened: 'ORAL_COMM', area: 'gened' },
      
      // Gen-Ed: Quantitative
      { alt_key: 'CLEP_ALGEBRA', course_code: 'MAT-121', course_name: 'College Algebra', credits: 3, level: 100, gened: 'QUANTITATIVE', area: 'gened' },
      { alt_key: 'SOPHIA_COLLEGE_ALG', course_code: 'MAT-121', course_name: 'College Algebra', credits: 3, level: 100, gened: 'QUANTITATIVE', area: 'gened' },
      { alt_key: 'CLEP_PRECALC', course_code: 'MAT-129', course_name: 'Precalculus', credits: 3, level: 100, gened: 'QUANTITATIVE', area: 'gened' },
      { alt_key: 'DSST_BUS_MATH', course_code: 'MAT-115', course_name: 'Business Math', credits: 3, level: 100, gened: 'QUANTITATIVE', area: 'gened' },
      { alt_key: 'SOPHIA_INTRO_STATS', course_code: 'STA-201', course_name: 'Introduction to Statistics', credits: 3, level: 200, gened: 'QUANTITATIVE', area: 'gened' },
      
      // Gen-Ed: Humanities
      { alt_key: 'CLEP_HUMANITIES', course_code: 'HUM-101-102', course_name: 'Humanities I & II', credits: 6, level: 100, gened: 'HUMANITIES', area: 'gened' },
      { alt_key: 'SOPHIA_ART_HISTORY', course_code: 'ART-101', course_name: 'Art History I', credits: 3, level: 100, gened: 'HUMANITIES', area: 'gened' },
      { alt_key: 'SOPHIA_ETHICS', course_code: 'PHI-102', course_name: 'Introduction to Ethics', credits: 3, level: 100, gened: 'HUMANITIES', area: 'gened' },
      
      // Gen-Ed: Social Sciences
      { alt_key: 'CLEP_PSYCH', course_code: 'PSY-101', course_name: 'Introduction to Psychology', credits: 3, level: 100, gened: 'SOCIAL_SCIENCE', area: 'gened' },
      { alt_key: 'SOPHIA_INTRO_PSYCH', course_code: 'PSY-101', course_name: 'Introduction to Psychology', credits: 3, level: 100, gened: 'SOCIAL_SCIENCE', area: 'gened' },
      { alt_key: 'CLEP_SOCIO', course_code: 'SOC-101', course_name: 'Introduction to Sociology', credits: 3, level: 100, gened: 'SOCIAL_SCIENCE', area: 'gened' },
      { alt_key: 'SOPHIA_INTRO_SOCIO', course_code: 'SOC-101', course_name: 'Introduction to Sociology', credits: 3, level: 100, gened: 'SOCIAL_SCIENCE', area: 'gened' },
      { alt_key: 'CLEP_US_HIST1', course_code: 'HIS-111', course_name: 'US History I', credits: 3, level: 100, gened: 'SOCIAL_SCIENCE', area: 'gened' },
      { alt_key: 'CLEP_US_HIST2', course_code: 'HIS-112', course_name: 'US History II', credits: 3, level: 100, gened: 'SOCIAL_SCIENCE', area: 'gened' },
      { alt_key: 'SOPHIA_MACRO_ECON', course_code: 'ECO-111', course_name: 'Macroeconomics', credits: 3, level: 200, gened: 'SOCIAL_SCIENCE', area: 'gened' },
      { alt_key: 'SOPHIA_MICRO_ECON', course_code: 'ECO-112', course_name: 'Microeconomics', credits: 3, level: 200, gened: 'SOCIAL_SCIENCE', area: 'gened' },
      
      // Gen-Ed: Natural Sciences
      { alt_key: 'CLEP_BIOLOGY', course_code: 'BIO-101-102', course_name: 'Biology I & II', credits: 6, level: 100, gened: 'NATURAL_SCIENCE', area: 'gened' },
      { alt_key: 'CLEP_NAT_SCI', course_code: 'SCI-101-102', course_name: 'Natural Sciences I & II', credits: 6, level: 100, gened: 'NATURAL_SCIENCE', area: 'gened' },
      { alt_key: 'SOPHIA_ENV_SCI', course_code: 'ENV-101', course_name: 'Environmental Science', credits: 3, level: 100, gened: 'NATURAL_SCIENCE', area: 'gened' },
      
      // Gen-Ed: Civic & Global
      { alt_key: 'DSST_BUS_ETHICS', course_code: 'PHI-386', course_name: 'Business Ethics', credits: 3, level: 300, gened: 'CIVIC_GLOBAL', area: 'gened' },
      { alt_key: 'STUDY_COM_BUS_ETHICS', course_code: 'PHI-386', course_name: 'Business Ethics', credits: 3, level: 300, gened: 'CIVIC_GLOBAL', area: 'gened' },
      { alt_key: 'STUDY_COM_INT_BUS', course_code: 'BUS-380', course_name: 'International Business', credits: 3, level: 300, gened: 'CIVIC_GLOBAL', area: 'gened' },
      
      // Major: Business Core (Lower)
      { alt_key: 'SOPHIA_INTRO_BUS', course_code: 'BUS-101', course_name: 'Introduction to Business', credits: 3, level: 100, gened: null, area: 'major' },
      { alt_key: 'DSST_INTRO_BUS', course_code: 'BUS-101', course_name: 'Introduction to Business', credits: 3, level: 100, gened: null, area: 'major' },
      { alt_key: 'CLEP_PRINCIPLES_MGMT', course_code: 'MAN-211', course_name: 'Principles of Management', credits: 3, level: 200, gened: null, area: 'major' },
      { alt_key: 'CLEP_PRINCIPLES_MKT', course_code: 'MKT-211', course_name: 'Principles of Marketing', credits: 3, level: 200, gened: null, area: 'major' },
      { alt_key: 'CLEP_BUS_LAW', course_code: 'LAW-201', course_name: 'Business Law', credits: 3, level: 200, gened: null, area: 'major' },
      { alt_key: 'DSST_SUPERVISION', course_code: 'MAN-201', course_name: 'Principles of Supervision', credits: 3, level: 200, gened: null, area: 'major' },
      
      // Major: Business Core (Upper - 300/400 level)
      { alt_key: 'STUDY_COM_FIN_ACCT', course_code: 'ACC-301', course_name: 'Financial Accounting', credits: 3, level: 300, gened: null, area: 'major' },
      { alt_key: 'STUDY_COM_MGRL_ACCT', course_code: 'ACC-302', course_name: 'Managerial Accounting', credits: 3, level: 300, gened: null, area: 'major' },
      { alt_key: 'DSST_ORG_BEH', course_code: 'MAN-311', course_name: 'Organizational Behavior', credits: 3, level: 300, gened: null, area: 'major' },
      { alt_key: 'DSST_HR_MGMT', course_code: 'MAN-321', course_name: 'Human Resource Management', credits: 3, level: 300, gened: null, area: 'major' },
      { alt_key: 'DSST_PRINCIPLES_FIN', course_code: 'FIN-301', course_name: 'Principles of Finance', credits: 3, level: 300, gened: null, area: 'major' },
      { alt_key: 'DSST_MONEY_BANK', course_code: 'FIN-311', course_name: 'Money and Banking', credits: 3, level: 300, gened: null, area: 'major' },
      { alt_key: 'DSST_MIS', course_code: 'CIS-301', course_name: 'Management Information Systems', credits: 3, level: 300, gened: null, area: 'major' },
      { alt_key: 'SOPHIA_PROJECT_MGMT', course_code: 'MAN-331', course_name: 'Project Management', credits: 3, level: 300, gened: null, area: 'major' },
      { alt_key: 'STUDY_COM_OPS_MGMT', course_code: 'MAN-341', course_name: 'Operations Management', credits: 3, level: 300, gened: null, area: 'major' },
      { alt_key: 'STUDY_COM_BUS_STRATEGY', course_code: 'MAN-401', course_name: 'Business Strategy', credits: 3, level: 400, gened: null, area: 'major' },
      { alt_key: 'STUDY_COM_SUPPLY_CHAIN', course_code: 'MAN-351', course_name: 'Supply Chain Management', credits: 3, level: 300, gened: null, area: 'major' },
      { alt_key: 'STUDY_COM_LEADERSHIP', course_code: 'MAN-361', course_name: 'Leadership and Management', credits: 3, level: 300, gened: null, area: 'major' },
      { alt_key: 'STUDY_COM_ECOMMERCE', course_code: 'MKT-371', course_name: 'E-Commerce', credits: 3, level: 300, gened: null, area: 'major' },
      
      // Electives & Communication
      { alt_key: 'DSST_PERSONAL_FIN', course_code: 'FIN-201', course_name: 'Personal Finance', credits: 3, level: 200, gened: null, area: 'elective' },
      { alt_key: 'SOPHIA_COMM', course_code: 'COM-201', course_name: 'Business Communication', credits: 3, level: 200, gened: null, area: 'elective' },
      { alt_key: 'STUDY_COM_BUS_COMM', course_code: 'COM-201', course_name: 'Business Communication', credits: 3, level: 200, gened: null, area: 'elective' },
      { alt_key: 'CLEP_CALCULUS', course_code: 'MAT-231', course_name: 'Calculus I', credits: 4, level: 200, gened: null, area: 'elective' },
    ];

    const equivalencyRows = equivalencies
      .filter(eq => idMap[eq.alt_key])
      .map(eq => ({
        alt_credit_id: idMap[eq.alt_key],
        institution_id: tesuId,
        institutional_course_code: eq.course_code,
        institutional_course_name: eq.course_name,
        credits_awarded: eq.credits,
        level: eq.level,
        gened_category_code: eq.gened,
        requirement_area: eq.area,
        confidence: 1.0,
        source_documentation: 'https://www.tesu.edu/degree-completion/transfer',
        last_verified_date: '2024-01-15',
      }));

    const { error: equivError } = await supabase
      .from('cross_institution_equivalencies')
      .upsert(equivalencyRows, { onConflict: 'alt_credit_id,institution_id,institutional_course_code' });

    if (equivError) throw new Error(`Equivalencies upsert failed: ${equivError.message}`);
    response.tables.cross_institution_equivalencies = { inserted: equivalencyRows.length, updated: 0, skipped: 0 };

    // ============================================================
    // STEP 8: Seed degree_templates (TESU BSBA Cheapest template)
    // ============================================================
    console.log('[optimizer-seed-tesu] Step 8: Seeding degree_templates...');
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
        terms: [
          {
            id: 'term-1',
            label: 'Term 1: Foundation',
            slots: [
              { id: 'slot-1-1', kind: 'required', requirementArea: 'gened', label: 'English Composition I', credits: 3, genedCategory: 'WRITTEN_COMM' },
              { id: 'slot-1-2', kind: 'required', requirementArea: 'gened', label: 'English Composition II', credits: 3, genedCategory: 'WRITTEN_COMM' },
              { id: 'slot-1-3', kind: 'required', requirementArea: 'gened', label: 'Public Speaking', credits: 3, genedCategory: 'ORAL_COMM' },
              { id: 'slot-1-4', kind: 'required', requirementArea: 'gened', label: 'College Algebra', credits: 3, genedCategory: 'QUANTITATIVE' },
            ]
          },
          {
            id: 'term-2',
            label: 'Term 2: Core Gen-Ed',
            slots: [
              { id: 'slot-2-1', kind: 'required', requirementArea: 'gened', label: 'Psychology', credits: 3, genedCategory: 'SOCIAL_SCIENCE' },
              { id: 'slot-2-2', kind: 'required', requirementArea: 'gened', label: 'Sociology', credits: 3, genedCategory: 'SOCIAL_SCIENCE' },
              { id: 'slot-2-3', kind: 'required', requirementArea: 'gened', label: 'Humanities Elective', credits: 3, genedCategory: 'HUMANITIES' },
              { id: 'slot-2-4', kind: 'required', requirementArea: 'gened', label: 'Ethics', credits: 3, genedCategory: 'HUMANITIES' },
            ]
          },
          {
            id: 'term-3',
            label: 'Term 3: Business Foundation',
            slots: [
              { id: 'slot-3-1', kind: 'required', requirementArea: 'major', label: 'Introduction to Business', credits: 3 },
              { id: 'slot-3-2', kind: 'required', requirementArea: 'major', label: 'Principles of Management', credits: 3 },
              { id: 'slot-3-3', kind: 'required', requirementArea: 'major', label: 'Principles of Marketing', credits: 3 },
              { id: 'slot-3-4', kind: 'required', requirementArea: 'major', label: 'Business Law', credits: 3 },
            ]
          },
          {
            id: 'term-4',
            label: 'Term 4: Business Core',
            slots: [
              { id: 'slot-4-1', kind: 'required', requirementArea: 'major', label: 'Financial Accounting', credits: 3 },
              { id: 'slot-4-2', kind: 'required', requirementArea: 'major', label: 'Managerial Accounting', credits: 3 },
              { id: 'slot-4-3', kind: 'required', requirementArea: 'major', label: 'Principles of Finance', credits: 3 },
              { id: 'slot-4-4', kind: 'required', requirementArea: 'major', label: 'Statistics', credits: 3 },
            ]
          },
          {
            id: 'term-5',
            label: 'Term 5: Advanced Business',
            slots: [
              { id: 'slot-5-1', kind: 'required', requirementArea: 'major', label: 'Organizational Behavior', credits: 3 },
              { id: 'slot-5-2', kind: 'required', requirementArea: 'major', label: 'Human Resource Management', credits: 3 },
              { id: 'slot-5-3', kind: 'required', requirementArea: 'major', label: 'Operations Management', credits: 3 },
              { id: 'slot-5-4', kind: 'required', requirementArea: 'major', label: 'Management Information Systems', credits: 3 },
            ]
          },
          {
            id: 'term-6',
            label: 'Term 6: Capstone',
            slots: [
              { id: 'slot-6-1', kind: 'required', requirementArea: 'major', label: 'Business Strategy', credits: 3 },
              { id: 'slot-6-2', kind: 'required', requirementArea: 'gened', label: 'Natural Science', credits: 3, genedCategory: 'NATURAL_SCIENCE' },
              { id: 'slot-6-3', kind: 'required', requirementArea: 'gened', label: 'Global Awareness', credits: 3, genedCategory: 'CIVIC_GLOBAL' },
              { id: 'slot-6-4', kind: 'required', requirementArea: 'capstone', label: 'Senior Capstone', credits: 3 },
            ]
          },
        ],
        policies: {
          totalCredits: 120,
          residencyMin: 15,
          upperDivisionMin: 30,
          genedCredits: 39,
          majorCredits: 45,
          electiveCredits: 36,
        }
      }
    };

    const { error: templateError } = await supabase
      .from('degree_templates')
      .upsert(bsbaTemplate, { onConflict: 'id' });

    if (templateError) throw new Error(`Degree template upsert failed: ${templateError.message}`);
    response.tables.degree_templates = { inserted: 1, updated: 0, skipped: 0 };

    // ============================================================
    // SUCCESS
    // ============================================================
    console.log('[optimizer-seed-tesu] ✅ All TESU data seeded successfully!');
    response.success = true;

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[optimizer-seed-tesu] ❌ Error:', error);
    response.error = error instanceof Error ? error.message : 'Unknown error';
    
    return new Response(
      JSON.stringify(response),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
