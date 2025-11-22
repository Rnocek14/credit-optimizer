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

    console.log('[Optimizer Seeder] Starting seed process...');

    // Get TESU institution ID
    const { data: institution, error: instError } = await supabase
      .from('institutions')
      .select('id')
      .eq('code', 'TESU')
      .single();

    if (instError || !institution) {
      throw new Error('TESU institution not found');
    }

    const tesuId = institution.id;
    console.log('[Optimizer Seeder] TESU institution ID:', tesuId);

    // ============================================================================
    // SEED ALT_CREDITS (50 courses)
    // ============================================================================
    const altCredits = [
      // CLEP Exams (15 courses)
      { source_code: 'CLEP', identifier: 'COMP', title: 'College Composition', credits_typical: 6, level: 100, subject_area: 'English', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
      { source_code: 'CLEP', identifier: 'COMP_MOD', title: 'College Composition Modular', credits_typical: 3, level: 100, subject_area: 'English', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
      { source_code: 'CLEP', identifier: 'AMERLIT', title: 'American Literature', credits_typical: 3, level: 200, subject_area: 'Literature', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
      { source_code: 'CLEP', identifier: 'HUMLIT', title: 'Humanities', credits_typical: 3, level: 100, subject_area: 'Humanities', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
      { source_code: 'CLEP', identifier: 'COLALG', title: 'College Algebra', credits_typical: 3, level: 100, subject_area: 'Mathematics', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
      { source_code: 'CLEP', identifier: 'CALCULUS', title: 'Calculus', credits_typical: 3, level: 100, subject_area: 'Mathematics', cost_usd: 95, duration_estimate_weeks: 6, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
      { source_code: 'CLEP', identifier: 'FINACCT', title: 'Financial Accounting', credits_typical: 3, level: 200, subject_area: 'Accounting', cost_usd: 95, duration_estimate_weeks: 6, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
      { source_code: 'CLEP', identifier: 'INFOSYS', title: 'Information Systems', credits_typical: 3, level: 200, subject_area: 'Business', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
      { source_code: 'CLEP', identifier: 'INTROMGT', title: 'Principles of Management', credits_typical: 3, level: 200, subject_area: 'Business', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
      { source_code: 'CLEP', identifier: 'INTROMKT', title: 'Principles of Marketing', credits_typical: 3, level: 200, subject_area: 'Business', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
      { source_code: 'CLEP', identifier: 'MICROECON', title: 'Principles of Microeconomics', credits_typical: 3, level: 200, subject_area: 'Economics', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
      { source_code: 'CLEP', identifier: 'MACROECON', title: 'Principles of Macroeconomics', credits_typical: 3, level: 200, subject_area: 'Economics', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
      { source_code: 'CLEP', identifier: 'INTROPSYCH', title: 'Introductory Psychology', credits_typical: 3, level: 100, subject_area: 'Psychology', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
      { source_code: 'CLEP', identifier: 'INTROSOC', title: 'Introductory Sociology', credits_typical: 3, level: 100, subject_area: 'Sociology', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },
      { source_code: 'CLEP', identifier: 'USHIST1', title: 'History of the United States I', credits_typical: 3, level: 100, subject_area: 'History', cost_usd: 95, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://clep.collegeboard.org' },

      // DSST Exams (10 courses)
      { source_code: 'DSST', identifier: 'BUS_ETHICS', title: 'Business Ethics and Society', credits_typical: 3, level: 200, subject_area: 'Business', cost_usd: 100, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://getcollegecredit.com' },
      { source_code: 'DSST', identifier: 'ORG_BEH', title: 'Organizational Behavior', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 100, duration_estimate_weeks: 5, exam_based: true, provider_url: 'https://getcollegecredit.com' },
      { source_code: 'DSST', identifier: 'BUS_MATH', title: 'Business Mathematics', credits_typical: 3, level: 200, subject_area: 'Mathematics', cost_usd: 100, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://getcollegecredit.com' },
      { source_code: 'DSST', identifier: 'HRM', title: 'Human Resource Management', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 100, duration_estimate_weeks: 5, exam_based: true, provider_url: 'https://getcollegecredit.com' },
      { source_code: 'DSST', identifier: 'PROJ_MGT', title: 'Introduction to Project Management', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 100, duration_estimate_weeks: 5, exam_based: true, provider_url: 'https://getcollegecredit.com' },
      { source_code: 'DSST', identifier: 'MIS', title: 'Management Information Systems', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 100, duration_estimate_weeks: 5, exam_based: true, provider_url: 'https://getcollegecredit.com' },
      { source_code: 'DSST', identifier: 'BUS_LAW', title: 'Business Law II', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 100, duration_estimate_weeks: 5, exam_based: true, provider_url: 'https://getcollegecredit.com' },
      { source_code: 'DSST', identifier: 'ENV_SCI', title: 'Environmental Science', credits_typical: 3, level: 200, subject_area: 'Science', cost_usd: 100, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://getcollegecredit.com' },
      { source_code: 'DSST', identifier: 'FUND_COUNS', title: 'Fundamentals of Counseling', credits_typical: 3, level: 200, subject_area: 'Psychology', cost_usd: 100, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://getcollegecredit.com' },
      { source_code: 'DSST', identifier: 'ETHICS_AMER', title: 'Ethics in America', credits_typical: 3, level: 200, subject_area: 'Philosophy', cost_usd: 100, duration_estimate_weeks: 4, exam_based: true, provider_url: 'https://getcollegecredit.com' },

      // Sophia Learning (15 courses)
      { source_code: 'SOPHIA', identifier: 'ENGLISH_COMP_1', title: 'English Composition I', credits_typical: 3, level: 100, subject_area: 'English', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },
      { source_code: 'SOPHIA', identifier: 'ENGLISH_COMP_2', title: 'English Composition II', credits_typical: 3, level: 100, subject_area: 'English', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },
      { source_code: 'SOPHIA', identifier: 'PUBLIC_SPEAKING', title: 'Public Speaking', credits_typical: 3, level: 100, subject_area: 'Communication', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },
      { source_code: 'SOPHIA', identifier: 'COLLEGE_ALGEBRA', title: 'College Algebra', credits_typical: 3, level: 100, subject_area: 'Mathematics', cost_usd: 99, duration_estimate_weeks: 3, exam_based: false, provider_url: 'https://sophia.org' },
      { source_code: 'SOPHIA', identifier: 'STATISTICS', title: 'Introduction to Statistics', credits_typical: 3, level: 200, subject_area: 'Mathematics', cost_usd: 99, duration_estimate_weeks: 3, exam_based: false, provider_url: 'https://sophia.org' },
      { source_code: 'SOPHIA', identifier: 'MICROECON', title: 'Microeconomics', credits_typical: 3, level: 200, subject_area: 'Economics', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },
      { source_code: 'SOPHIA', identifier: 'MACROECON', title: 'Macroeconomics', credits_typical: 3, level: 200, subject_area: 'Economics', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },
      { source_code: 'SOPHIA', identifier: 'ACCOUNTING_1', title: 'Financial Accounting', credits_typical: 3, level: 200, subject_area: 'Accounting', cost_usd: 99, duration_estimate_weeks: 3, exam_based: false, provider_url: 'https://sophia.org' },
      { source_code: 'SOPHIA', identifier: 'INTRO_BUS', title: 'Introduction to Business', credits_typical: 3, level: 100, subject_area: 'Business', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },
      { source_code: 'SOPHIA', identifier: 'INTRO_MGMT', title: 'Introduction to Management', credits_typical: 3, level: 200, subject_area: 'Business', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },
      { source_code: 'SOPHIA', identifier: 'INTRO_PSYCH', title: 'Introduction to Psychology', credits_typical: 3, level: 100, subject_area: 'Psychology', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },
      { source_code: 'SOPHIA', identifier: 'INTRO_SOC', title: 'Introduction to Sociology', credits_typical: 3, level: 100, subject_area: 'Sociology', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },
      { source_code: 'SOPHIA', identifier: 'ENV_SCIENCE', title: 'Environmental Science', credits_typical: 3, level: 200, subject_area: 'Science', cost_usd: 99, duration_estimate_weeks: 3, exam_based: false, provider_url: 'https://sophia.org' },
      { source_code: 'SOPHIA', identifier: 'ETHICS', title: 'Introduction to Ethics', credits_typical: 3, level: 200, subject_area: 'Philosophy', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },
      { source_code: 'SOPHIA', identifier: 'US_HIST_1', title: 'U.S. History I', credits_typical: 3, level: 100, subject_area: 'History', cost_usd: 99, duration_estimate_weeks: 2, exam_based: false, provider_url: 'https://sophia.org' },

      // Study.com (10 courses)
      { source_code: 'STUDY_COM', identifier: 'BUS312', title: 'Advanced Operations Management', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com' },
      { source_code: 'STUDY_COM', identifier: 'BUS303', title: 'Strategic Management', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com' },
      { source_code: 'STUDY_COM', identifier: 'BUS306', title: 'Marketing Research', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com' },
      { source_code: 'STUDY_COM', identifier: 'BUS308', title: 'Globalization and International Management', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com' },
      { source_code: 'STUDY_COM', identifier: 'BUS311', title: 'Organizational Communications', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com' },
      { source_code: 'STUDY_COM', identifier: 'BUS304', title: 'Leading Organizational Change', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com' },
      { source_code: 'STUDY_COM', identifier: 'BUS305', title: 'Corporate Finance', credits_typical: 3, level: 300, subject_area: 'Finance', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com' },
      { source_code: 'STUDY_COM', identifier: 'BUS307', title: 'Operations Management', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com' },
      { source_code: 'STUDY_COM', identifier: 'BUS309', title: 'Digital Marketing', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com' },
      { source_code: 'STUDY_COM', identifier: 'BUS310', title: 'Business Analytics', credits_typical: 3, level: 300, subject_area: 'Business', cost_usd: 199, duration_estimate_weeks: 8, exam_based: false, provider_url: 'https://study.com' },
    ];

    console.log('[Optimizer Seeder] Inserting alt_credits...');
    const { data: insertedCredits, error: creditsError } = await supabase
      .from('alt_credits')
      .upsert(altCredits, { onConflict: 'source_code,identifier' })
      .select('id, source_code, identifier');

    if (creditsError) throw creditsError;
    console.log(`[Optimizer Seeder] Inserted ${insertedCredits?.length || 0} alt credits`);

    // ============================================================================
    // SEED EQUIVALENCIES (50 mappings to TESU)
    // ============================================================================
    const equivalencies = insertedCredits?.map((credit, idx) => {
      const baseMapping = {
        alt_credit_id: credit.id,
        institution_id: tesuId,
        confidence: 1.0,
        requirement_area: 'gened' as const,
        last_verified_date: '2024-01-01',
        source_documentation: 'TESU Transfer Evaluation Guide 2024',
      };

      // Map to appropriate TESU courses and gened categories
      if (credit.identifier.includes('COMP') || credit.identifier.includes('ENGLISH')) {
        return { ...baseMapping, institutional_course_code: 'ENG-101', institutional_course_name: 'English Composition', credits_awarded: 3, level: 100, gened_category_code: 'WRITTEN_COMM' };
      } else if (credit.identifier.includes('PUBLIC_SPEAKING')) {
        return { ...baseMapping, institutional_course_code: 'COM-209', institutional_course_name: 'Public Speaking', credits_awarded: 3, level: 200, gened_category_code: 'ORAL_COMM' };
      } else if (credit.identifier.includes('ALGEBRA') || credit.identifier.includes('CALCULUS')) {
        return { ...baseMapping, institutional_course_code: 'MAT-121', institutional_course_name: 'College Algebra', credits_awarded: 3, level: 100, gened_category_code: 'QUANTITATIVE' };
      } else if (credit.identifier.includes('STATISTICS') || credit.identifier.includes('MATH')) {
        return { ...baseMapping, institutional_course_code: 'MAT-201', institutional_course_name: 'Statistics', credits_awarded: 3, level: 200, gened_category_code: 'QUANTITATIVE' };
      } else if (credit.identifier.includes('LIT') || credit.identifier.includes('HUM') || credit.identifier.includes('ETHICS')) {
        return { ...baseMapping, institutional_course_code: 'HUM-211', institutional_course_name: 'Humanities Elective', credits_awarded: 3, level: 200, gened_category_code: 'HUMANITIES' };
      } else if (credit.identifier.includes('PSYCH') || credit.identifier.includes('SOC') || credit.identifier.includes('HIST')) {
        return { ...baseMapping, institutional_course_code: 'SSC-201', institutional_course_name: 'Social Science Elective', credits_awarded: 3, level: 200, gened_category_code: 'SOCIAL_SCIENCE' };
      } else if (credit.identifier.includes('ECON')) {
        return { ...baseMapping, institutional_course_code: 'ECO-211', institutional_course_name: 'Microeconomics', credits_awarded: 3, level: 200, gened_category_code: 'SOCIAL_SCIENCE', requirement_area: 'major' as const };
      } else if (credit.identifier.includes('ENV') || credit.identifier.includes('SCI')) {
        return { ...baseMapping, institutional_course_code: 'NSC-201', institutional_course_name: 'Natural Science Elective', credits_awarded: 3, level: 200, gened_category_code: 'NATURAL_SCIENCE' };
      } else if (credit.identifier.includes('ACCT') || credit.identifier.includes('ACCOUNTING')) {
        return { ...baseMapping, institutional_course_code: 'ACC-201', institutional_course_name: 'Financial Accounting', credits_awarded: 3, level: 200, requirement_area: 'major' as const };
      } else {
        return { ...baseMapping, institutional_course_code: `BUS-${300 + idx}`, institutional_course_name: 'Business Elective', credits_awarded: 3, level: 300, requirement_area: 'major' as const };
      }
    }) || [];

    console.log('[Optimizer Seeder] Inserting equivalencies...');
    const { error: equivError } = await supabase
      .from('cross_institution_equivalencies')
      .upsert(equivalencies, { onConflict: 'alt_credit_id,institution_id,institutional_course_code' });

    if (equivError) throw equivError;
    console.log(`[Optimizer Seeder] Inserted ${equivalencies.length} equivalencies`);

    // ============================================================================
    // SEED DEGREE TEMPLATE
    // ============================================================================
    const degreeTemplate = {
      id: 'tesu-bsba-cheapest-v1',
      institution_id: tesuId,
      institution_code: 'TESU',
      program_code: 'BSBA',
      program_name: 'Bachelor of Science in Business Administration',
      track_type: 'cheapest',
      total_credits: 120,
      estimated_cost: 8500,
      estimated_duration_months: 18,
      catalog_year: '2024-2025',
      policy_last_verified: '2024-01-01',
      template_data: {
        general_education: {
          written_communication: { credits: 6, category_code: 'WRITTEN_COMM' },
          oral_communication: { credits: 3, category_code: 'ORAL_COMM' },
          quantitative: { credits: 3, category_code: 'QUANTITATIVE' },
          humanities: { credits: 9, category_code: 'HUMANITIES' },
          social_sciences: { credits: 9, category_code: 'SOCIAL_SCIENCE' },
          natural_sciences: { credits: 6, category_code: 'NATURAL_SCIENCE' },
          civic_global: { credits: 3, category_code: 'CIVIC_GLOBAL' },
        },
        major_requirements: {
          core_courses: [
            { code: 'BUS-200', name: 'Principles of Management', credits: 3, level: 200 },
            { code: 'BUS-210', name: 'Principles of Marketing', credits: 3, level: 200 },
            { code: 'ACC-201', name: 'Financial Accounting', credits: 3, level: 200 },
            { code: 'ECO-211', name: 'Microeconomics', credits: 3, level: 200 },
            { code: 'ECO-212', name: 'Macroeconomics', credits: 3, level: 200 },
          ],
          upper_division: [
            { code: 'BUS-312', name: 'Operations Management', credits: 3, level: 300 },
            { code: 'BUS-303', name: 'Strategic Management', credits: 3, level: 300 },
            { code: 'BUS-306', name: 'Marketing Research', credits: 3, level: 300 },
          ],
        },
        electives: { free_electives: 60 },
      },
      notes: 'Optimized for lowest cost using alternative credit sources',
    };

    console.log('[Optimizer Seeder] Inserting degree template...');
    const { error: templateError } = await supabase
      .from('degree_templates')
      .upsert(degreeTemplate, { onConflict: 'id' });

    if (templateError) throw templateError;
    console.log('[Optimizer Seeder] Degree template inserted');

    const summary = {
      success: true,
      message: 'Optimizer data seeded successfully',
      counts: {
        alt_credits: altCredits.length,
        equivalencies: equivalencies.length,
        degree_templates: 1,
      },
    };

    console.log('[Optimizer Seeder] Complete:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Optimizer Seeder] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
