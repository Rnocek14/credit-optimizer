import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false
        }
      }
    )

    console.log('Starting marketplace seeding...');

    // 1. Insert Providers
    const { data: providersData, error: providersError } = await supabaseClient
      .from('providers')
      .upsert([
        {
          name: 'Arizona State University Online',
          type: 'university',
          accreditation: 'Higher Learning Commission',
          country: 'US',
          website_url: 'https://asuonline.asu.edu'
        },
        {
          name: 'Coursera',
          type: 'mooc',
          country: 'US',
          website_url: 'https://coursera.org'
        },
        {
          name: 'edX',
          type: 'mooc',
          country: 'US',
          website_url: 'https://edx.org'
        },
        {
          name: 'Sophia Learning',
          type: 'mooc',
          country: 'US',
          website_url: 'https://sophia.org'
        },
        {
          name: 'Study.com',
          type: 'mooc',
          country: 'US',
          website_url: 'https://study.com'
        },
        {
          name: 'CLEP',
          type: 'testing_center',
          accreditation: 'College Board',
          country: 'US',
          website_url: 'https://clep.collegeboard.org'
        },
        {
          name: 'App Academy',
          type: 'bootcamp',
          country: 'US',
          website_url: 'https://appacademy.io'
        }
      ], { onConflict: 'name' })
      .select();

    if (providersError) {
      console.error('Error inserting providers:', providersError);
      throw providersError;
    }

    console.log(`Inserted ${providersData.length} providers`);

    // Get provider IDs for reference
    const providerMap = new Map(providersData.map(p => [p.name, p.id]));

    // 2. Insert Marketplace Courses
    const coursesData = [
      // ASU Online Courses
      {
        provider_id: providerMap.get('Arizona State University Online'),
        code: 'MAT142',
        title: 'College Mathematics',
        description: 'Fundamental mathematical concepts for college students',
        credits: 3,
        level: 100,
        modality: 'online',
        duration_weeks: 16,
        cost_usd: 2400,
        start_dates: ['2025-01-15', '2025-03-15', '2025-08-15'],
        skill_tags: ['mathematics', 'algebra', 'statistics'],
        cri_score: 75,
        instructor_rating: 4.2,
        completion_rate: 0.82
      },
      {
        provider_id: providerMap.get('Arizona State University Online'),
        code: 'CSE110',
        title: 'Introduction to Programming',
        description: 'Programming fundamentals using Java',
        credits: 3,
        level: 100,
        modality: 'online',
        duration_weeks: 16,
        cost_usd: 2400,
        start_dates: ['2025-01-15', '2025-08-15'],
        skill_tags: ['programming', 'java', 'algorithms'],
        cri_score: 88,
        instructor_rating: 4.5,
        completion_rate: 0.78
      },
      {
        provider_id: providerMap.get('Arizona State University Online'),
        code: 'ENG101',
        title: 'First-Year Composition',
        description: 'Academic writing and critical thinking',
        credits: 3,
        level: 100,
        modality: 'online',
        duration_weeks: 16,
        cost_usd: 2400,
        start_dates: ['2025-01-15', '2025-03-15', '2025-08-15'],
        skill_tags: ['writing', 'communication', 'critical-thinking'],
        cri_score: 65,
        instructor_rating: 4.0,
        completion_rate: 0.85
      },

      // Coursera Courses
      {
        provider_id: providerMap.get('Coursera'),
        code: 'CS50',
        title: 'Introduction to Computer Science',
        description: 'Harvard\'s introduction to programming',
        credits: 3,
        level: 100,
        modality: 'online',
        duration_weeks: 12,
        cost_usd: 399,
        start_dates: ['2025-01-01', '2025-02-01', '2025-03-01'],
        skill_tags: ['programming', 'c', 'python', 'computer-science'],
        cri_score: 92,
        instructor_rating: 4.8,
        completion_rate: 0.72
      },
      {
        provider_id: providerMap.get('Coursera'),
        code: 'CALC1',
        title: 'Calculus I',
        description: 'University of Pennsylvania calculus course',
        credits: 4,
        level: 100,
        modality: 'online',
        duration_weeks: 16,
        cost_usd: 499,
        start_dates: ['2025-01-15', '2025-06-15'],
        skill_tags: ['calculus', 'mathematics', 'derivatives'],
        cri_score: 78,
        instructor_rating: 4.3,
        completion_rate: 0.68
      },

      // edX Courses
      {
        provider_id: providerMap.get('edX'),
        code: 'MIT6001',
        title: 'Introduction to Computer Science and Programming',
        description: 'MIT\'s programming fundamentals course',
        credits: 3,
        level: 100,
        modality: 'online',
        duration_weeks: 14,
        cost_usd: 299,
        start_dates: ['2025-02-01', '2025-09-01'],
        skill_tags: ['programming', 'python', 'algorithms'],
        cri_score: 90,
        instructor_rating: 4.7,
        completion_rate: 0.74
      },
      {
        provider_id: providerMap.get('edX'),
        code: 'STATS101',
        title: 'Introduction to Statistics',
        description: 'Berkeley statistical methods course',
        credits: 3,
        level: 100,
        modality: 'online',
        duration_weeks: 12,
        cost_usd: 249,
        start_dates: ['2025-01-20', '2025-05-20'],
        skill_tags: ['statistics', 'data-analysis', 'probability'],
        cri_score: 82,
        instructor_rating: 4.4,
        completion_rate: 0.79
      },

      // Sophia Learning Courses (Low cost, fast)
      {
        provider_id: providerMap.get('Sophia Learning'),
        code: 'MATH1001',
        title: 'College Algebra',
        description: 'Self-paced algebra course',
        credits: 3,
        level: 100,
        modality: 'online',
        duration_weeks: 4,
        cost_usd: 199,
        start_dates: ['2025-01-01'],
        skill_tags: ['algebra', 'mathematics'],
        cri_score: 70,
        instructor_rating: 4.1,
        completion_rate: 0.88
      },
      {
        provider_id: providerMap.get('Sophia Learning'),
        code: 'ENG1002',
        title: 'English Composition',
        description: 'Writing fundamentals course',
        credits: 3,
        level: 100,
        modality: 'online',
        duration_weeks: 6,
        cost_usd: 199,
        start_dates: ['2025-01-01'],
        skill_tags: ['writing', 'communication'],
        cri_score: 68,
        instructor_rating: 3.9,
        completion_rate: 0.86
      },

      // Study.com Courses
      {
        provider_id: providerMap.get('Study.com'),
        code: 'CS101',
        title: 'Computer Science 101',
        description: 'Programming basics and computer fundamentals',
        credits: 3,
        level: 100,
        modality: 'online',
        duration_weeks: 8,
        cost_usd: 299,
        start_dates: ['2025-01-01'],
        skill_tags: ['programming', 'computer-science'],
        cri_score: 76,
        instructor_rating: 4.0,
        completion_rate: 0.81
      },

      // CLEP Exams
      {
        provider_id: providerMap.get('CLEP'),
        code: 'CLEP-CALC',
        title: 'Calculus CLEP Exam',
        description: 'CLEP exam for calculus credit',
        credits: 4,
        level: 100,
        modality: 'in_person',
        duration_weeks: 1,
        cost_usd: 89,
        start_dates: ['2025-01-01'],
        skill_tags: ['calculus', 'mathematics'],
        cri_score: 85,
        instructor_rating: null,
        completion_rate: 0.65
      },
      {
        provider_id: providerMap.get('CLEP'),
        code: 'CLEP-COMP',
        title: 'College Composition CLEP Exam',
        description: 'CLEP exam for English composition credit',
        credits: 6,
        level: 100,
        modality: 'in_person',
        duration_weeks: 1,
        cost_usd: 89,
        start_dates: ['2025-01-01'],
        skill_tags: ['writing', 'communication'],
        cri_score: 72,
        instructor_rating: null,
        completion_rate: 0.71
      },

      // App Academy (Bootcamp)
      {
        provider_id: providerMap.get('App Academy'),
        code: 'WEB-DEV',
        title: 'Full Stack Web Development',
        description: 'Intensive coding bootcamp',
        credits: 12,
        level: 200,
        modality: 'hybrid',
        duration_weeks: 24,
        cost_usd: 17000,
        start_dates: ['2025-02-01', '2025-06-01'],
        skill_tags: ['javascript', 'react', 'node', 'databases'],
        cri_score: 95,
        instructor_rating: 4.6,
        completion_rate: 0.89
      }
    ];

    const { data: insertedCourses, error: coursesError } = await supabaseClient
      .from('marketplace_courses')
      .upsert(coursesData, { onConflict: 'provider_id,code' })
      .select();

    if (coursesError) {
      console.error('Error inserting courses:', coursesError);
      throw coursesError;
    }

    console.log(`Inserted ${insertedCourses.length} courses`);

    // 3. Create Equivalence Groups
    const equivalenceGroups = [
      {
        name: 'College Mathematics/Algebra',
        description: 'Courses that satisfy college-level mathematics requirements'
      },
      {
        name: 'Introduction to Programming',
        description: 'First programming courses in any language'
      },
      {
        name: 'English Composition',
        description: 'First-year writing courses'
      },
      {
        name: 'Calculus I',
        description: 'First semester calculus courses'
      }
    ];

    const { data: groups, error: groupsError } = await supabaseClient
      .from('equivalence_groups')
      .upsert(equivalenceGroups, { onConflict: 'name' })
      .select();

    if (groupsError) {
      console.error('Error inserting equivalence groups:', groupsError);
      throw groupsError;
    }

    console.log(`Inserted ${groups.length} equivalence groups`);

    // 4. Create Program Requirements (CS and IT Year 1-2)
    const programRequirements = [
      // BS Computer Science Requirements
      {
        program_id: 'bs_cs',
        track_id: null,
        year: 1,
        category: 'gened',
        name: 'College Mathematics',
        description: 'Foundational mathematics requirement',
        credits_required: 3,
        min_select: 1,
        max_select: 1
      },
      {
        program_id: 'bs_cs',
        track_id: null,
        year: 1,
        category: 'core',
        name: 'Introduction to Programming',
        description: 'First programming course',
        credits_required: 3,
        min_select: 1,
        max_select: 1
      },
      {
        program_id: 'bs_cs',
        track_id: null,
        year: 1,
        category: 'gened',
        name: 'English Composition',
        description: 'First-year writing requirement',
        credits_required: 3,
        min_select: 1,
        max_select: 1
      },
      {
        program_id: 'bs_cs',
        track_id: null,
        year: 2,
        category: 'core',
        name: 'Calculus I',
        description: 'First semester calculus',
        credits_required: 4,
        min_select: 1,
        max_select: 1
      },

      // BS Information Technology Requirements
      {
        program_id: 'bs_it',
        track_id: null,
        year: 1,
        category: 'gened',
        name: 'College Mathematics',
        description: 'Foundational mathematics requirement',
        credits_required: 3,
        min_select: 1,
        max_select: 1
      },
      {
        program_id: 'bs_it',
        track_id: null,
        year: 1,
        category: 'core',
        name: 'Introduction to Programming',
        description: 'Programming fundamentals',
        credits_required: 3,
        min_select: 1,
        max_select: 1
      },
      {
        program_id: 'bs_it',
        track_id: null,
        year: 1,
        category: 'gened',
        name: 'English Composition',
        description: 'First-year writing requirement',
        credits_required: 3,
        min_select: 1,
        max_select: 1
      }
    ];

    const { data: requirements, error: requirementsError } = await supabaseClient
      .from('program_requirements')
      .upsert(programRequirements, { onConflict: 'program_id,track_id,name' })
      .select();

    if (requirementsError) {
      console.error('Error inserting program requirements:', requirementsError);
      throw requirementsError;
    }

    console.log(`Inserted ${requirements.length} program requirements`);

    // 5. Link courses to requirements via requirement_options
    const courseMap = new Map(insertedCourses.map(c => [c.code, c.id]));
    const reqMap = new Map(requirements.map(r => [`${r.program_id}-${r.name}`, r.id]));

    const requirementOptions = [
      // Math requirement options
      { requirement_id: reqMap.get('bs_cs-College Mathematics'), option_kind: 'course', option_ref_id: courseMap.get('MAT142'), credits_awarded: 3 },
      { requirement_id: reqMap.get('bs_cs-College Mathematics'), option_kind: 'course', option_ref_id: courseMap.get('MATH1001'), credits_awarded: 3 },
      { requirement_id: reqMap.get('bs_it-College Mathematics'), option_kind: 'course', option_ref_id: courseMap.get('MAT142'), credits_awarded: 3 },
      { requirement_id: reqMap.get('bs_it-College Mathematics'), option_kind: 'course', option_ref_id: courseMap.get('MATH1001'), credits_awarded: 3 },

      // Programming requirement options
      { requirement_id: reqMap.get('bs_cs-Introduction to Programming'), option_kind: 'course', option_ref_id: courseMap.get('CSE110'), credits_awarded: 3 },
      { requirement_id: reqMap.get('bs_cs-Introduction to Programming'), option_kind: 'course', option_ref_id: courseMap.get('CS50'), credits_awarded: 3 },
      { requirement_id: reqMap.get('bs_cs-Introduction to Programming'), option_kind: 'course', option_ref_id: courseMap.get('MIT6001'), credits_awarded: 3 },
      { requirement_id: reqMap.get('bs_cs-Introduction to Programming'), option_kind: 'course', option_ref_id: courseMap.get('CS101'), credits_awarded: 3 },
      { requirement_id: reqMap.get('bs_it-Introduction to Programming'), option_kind: 'course', option_ref_id: courseMap.get('CSE110'), credits_awarded: 3 },
      { requirement_id: reqMap.get('bs_it-Introduction to Programming'), option_kind: 'course', option_ref_id: courseMap.get('CS50'), credits_awarded: 3 },
      { requirement_id: reqMap.get('bs_it-Introduction to Programming'), option_kind: 'course', option_ref_id: courseMap.get('MIT6001'), credits_awarded: 3 },

      // English requirement options
      { requirement_id: reqMap.get('bs_cs-English Composition'), option_kind: 'course', option_ref_id: courseMap.get('ENG101'), credits_awarded: 3 },
      { requirement_id: reqMap.get('bs_cs-English Composition'), option_kind: 'course', option_ref_id: courseMap.get('ENG1002'), credits_awarded: 3 },
      { requirement_id: reqMap.get('bs_cs-English Composition'), option_kind: 'exam', option_ref_id: courseMap.get('CLEP-COMP'), credits_awarded: 6 },
      { requirement_id: reqMap.get('bs_it-English Composition'), option_kind: 'course', option_ref_id: courseMap.get('ENG101'), credits_awarded: 3 },
      { requirement_id: reqMap.get('bs_it-English Composition'), option_kind: 'course', option_ref_id: courseMap.get('ENG1002'), credits_awarded: 3 },
      { requirement_id: reqMap.get('bs_it-English Composition'), option_kind: 'exam', option_ref_id: courseMap.get('CLEP-COMP'), credits_awarded: 6 },

      // Calculus requirement options (CS only)
      { requirement_id: reqMap.get('bs_cs-Calculus I'), option_kind: 'course', option_ref_id: courseMap.get('CALC1'), credits_awarded: 4 },
      { requirement_id: reqMap.get('bs_cs-Calculus I'), option_kind: 'exam', option_ref_id: courseMap.get('CLEP-CALC'), credits_awarded: 4 }
    ].filter(option => option.requirement_id && option.option_ref_id);

    const { data: options, error: optionsError } = await supabaseClient
      .from('requirement_options')
      .upsert(requirementOptions)
      .select();

    if (optionsError) {
      console.error('Error inserting requirement options:', optionsError);
      throw optionsError;
    }

    console.log(`Inserted ${options.length} requirement options`);

    // 6. Add Transfer Rules
    const transferRules = [
      {
        to_program_id: 'bs_cs',
        rule_kind: 'transfer_max',
        value: 90,
        description: 'Maximum 90 transfer credits allowed'
      },
      {
        to_program_id: 'bs_cs',
        rule_kind: 'residency_min',
        value: 30,
        description: 'Minimum 30 credits must be taken at home institution'
      },
      {
        to_program_id: 'bs_it',
        rule_kind: 'transfer_max',
        value: 90,
        description: 'Maximum 90 transfer credits allowed'
      },
      {
        to_program_id: 'bs_it',
        rule_kind: 'residency_min',
        value: 30,
        description: 'Minimum 30 credits must be taken at home institution'
      }
    ];

    const { data: rules, error: rulesError } = await supabaseClient
      .from('transfer_rules')
      .upsert(transferRules, { onConflict: 'to_program_id,rule_kind' })
      .select();

    if (rulesError) {
      console.error('Error inserting transfer rules:', rulesError);
      throw rulesError;
    }

    console.log(`Inserted ${rules.length} transfer rules`);

    const summary = {
      success: true,
      message: 'Marketplace seeded successfully',
      data: {
        providers: providersData.length,
        courses: insertedCourses.length,
        equivalence_groups: groups.length,
        program_requirements: requirements.length,
        requirement_options: options.length,
        transfer_rules: rules.length
      }
    };

    console.log('Seeding completed:', summary);

    return new Response(
      JSON.stringify(summary),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in seed-marketplace function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});