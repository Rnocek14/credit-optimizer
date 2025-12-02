// Deployment trigger: 2025-12-02T18:45:00Z
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🌱 Starting V5 marketplace seeding...');

    // Phase 1: Seed Providers
    console.log('📦 Phase 1: Seeding providers...');
    const { data: providers, error: providerError } = await supabase
      .from('providers')
      .upsert([
        { provider_code: 'TESU', name: 'Thomas Edison State University', type: 'university', accreditation: 'Middle States', country: 'US', website_url: 'https://tesu.edu', active: true, reputation_score: 85, ace_approved: true, nccrs_approved: false },
        { provider_code: 'WGU', name: 'Western Governors University', type: 'university', accreditation: 'NWCCU', country: 'US', website_url: 'https://wgu.edu', active: true, reputation_score: 82, ace_approved: false, nccrs_approved: false },
        { provider_code: 'EXCU', name: 'Excelsior University', type: 'university', accreditation: 'Middle States', country: 'US', website_url: 'https://excelsior.edu', active: true, reputation_score: 83, ace_approved: true, nccrs_approved: false },
        { provider_code: 'UMPI', name: 'University of Maine at Presque Isle', type: 'university', accreditation: 'NECHE', country: 'US', website_url: 'https://umpi.edu', active: true, reputation_score: 78, ace_approved: false, nccrs_approved: false },
        { provider_code: 'SNHU', name: 'Southern New Hampshire University', type: 'university', accreditation: 'NECHE', country: 'US', website_url: 'https://snhu.edu', active: true, reputation_score: 80, ace_approved: false, nccrs_approved: false },
        { provider_code: 'SOPHIA', name: 'Sophia Learning', type: 'mooc', accreditation: 'ACE Approved', country: 'US', website_url: 'https://sophia.org', active: true, reputation_score: 75, ace_approved: true, nccrs_approved: false },
        { provider_code: 'STUDY', name: 'Study.com', type: 'mooc', accreditation: 'ACE Approved', country: 'US', website_url: 'https://study.com', active: true, reputation_score: 77, ace_approved: true, nccrs_approved: true },
        { provider_code: 'STRAIGHTERLINE', name: 'StraighterLine', type: 'mooc', accreditation: 'ACE Approved', country: 'US', website_url: 'https://straighterline.com', active: true, reputation_score: 75, ace_approved: true, nccrs_approved: false },
        { provider_code: 'CLEP', name: 'College Board CLEP', type: 'testing_center', accreditation: 'ACE Approved', country: 'US', website_url: 'https://clep.collegeboard.org', active: true, reputation_score: 90, ace_approved: true, nccrs_approved: false },
        { provider_code: 'COURSERA', name: 'Coursera', type: 'mooc', accreditation: 'Various', country: 'US', website_url: 'https://coursera.org', active: true, reputation_score: 70, ace_approved: false, nccrs_approved: false },
        { provider_code: 'EDX', name: 'edX', type: 'mooc', accreditation: 'Various', country: 'US', website_url: 'https://edx.org', active: true, reputation_score: 72, ace_approved: false, nccrs_approved: false },
      ], { onConflict: 'provider_code' })
      .select();

    if (providerError) throw providerError;
    console.log(`✅ Seeded ${providers?.length || 0} providers`);

    // Get provider IDs for marketplace courses
    const { data: providerList } = await supabase.from('providers').select('id, provider_code');
    const providerMap = new Map(providerList?.map(p => [p.provider_code, p.id]) || []);

    // Phase 2: Seed Marketplace Courses
    console.log('📚 Phase 2: Seeding marketplace courses...');
    const courses = [
      // SOPHIA courses
      { code: 'SOPH-ENG-COMP', title: 'English Composition I', credits: 3, cost_usd: 99, duration_weeks: 4, cri_score: 0.85, level: 100, subject_area: 'english', provider_code: 'SOPHIA' },
      { code: 'SOPH-COLLEGE-ALG', title: 'College Algebra', credits: 3, cost_usd: 99, duration_weeks: 4, cri_score: 0.82, level: 100, subject_area: 'mathematics', provider_code: 'SOPHIA' },
      { code: 'SOPH-INTRO-STATS', title: 'Introduction to Statistics', credits: 3, cost_usd: 99, duration_weeks: 4, cri_score: 0.80, level: 100, subject_area: 'mathematics', provider_code: 'SOPHIA' },
      { code: 'SOPH-INTRO-PYTHON', title: 'Introduction to Python Programming', credits: 3, cost_usd: 99, duration_weeks: 4, cri_score: 0.79, level: 100, subject_area: 'computer_science', provider_code: 'SOPHIA' },
      
      // Study.com courses
      { code: 'STUDY-COLLEGE-ALG', title: 'College Algebra', credits: 3, cost_usd: 199, duration_weeks: 6, cri_score: 0.78, level: 100, subject_area: 'mathematics', provider_code: 'STUDY' },
      { code: 'STUDY-ENG-COMP', title: 'English Composition I', credits: 3, cost_usd: 199, duration_weeks: 6, cri_score: 0.76, level: 100, subject_area: 'english', provider_code: 'STUDY' },
      { code: 'STUDY-INTRO-CS', title: 'Introduction to Computer Science', credits: 3, cost_usd: 199, duration_weeks: 6, cri_score: 0.75, level: 100, subject_area: 'computer_science', provider_code: 'STUDY' },
      { code: 'STUDY-INTRO-PROG', title: 'Introduction to Programming', credits: 3, cost_usd: 199, duration_weeks: 6, cri_score: 0.77, level: 100, subject_area: 'computer_science', provider_code: 'STUDY' },
      { code: 'STUDY-DATA-STRUCT', title: 'Data Structures', credits: 3, cost_usd: 199, duration_weeks: 8, cri_score: 0.74, level: 200, subject_area: 'computer_science', provider_code: 'STUDY' },
      { code: 'STUDY-ALGORITHMS', title: 'Algorithms', credits: 3, cost_usd: 199, duration_weeks: 8, cri_score: 0.76, level: 200, subject_area: 'computer_science', provider_code: 'STUDY' },
      
      // CLEP exams
      { code: 'CLEP-COLLEGE-ALG', title: 'College Algebra CLEP', credits: 3, cost_usd: 89, duration_weeks: 0, cri_score: 0.92, level: 100, subject_area: 'mathematics', provider_code: 'CLEP' },
      { code: 'CLEP-ENG-COMP', title: 'College Composition CLEP', credits: 6, cost_usd: 89, duration_weeks: 0, cri_score: 0.94, level: 100, subject_area: 'english', provider_code: 'CLEP' },
      
      // TESU institutional
      { code: 'ENG-101', title: 'English Composition I', credits: 3, cost_usd: 1800, duration_weeks: 15, cri_score: 1.0, level: 100, subject_area: 'english', provider_code: 'TESU' },
      { code: 'MAT-121', title: 'College Algebra', credits: 3, cost_usd: 1800, duration_weeks: 15, cri_score: 1.0, level: 100, subject_area: 'mathematics', provider_code: 'TESU' },
      { code: 'CMP-101', title: 'Introduction to Computer Science', credits: 3, cost_usd: 1800, duration_weeks: 15, cri_score: 1.0, level: 100, subject_area: 'computer_science', provider_code: 'TESU' },
      { code: 'CMP-221', title: 'Data Structures & Algorithms', credits: 3, cost_usd: 1800, duration_weeks: 15, cri_score: 1.0, level: 200, subject_area: 'computer_science', provider_code: 'TESU' },
      
      // WGU institutional
      { code: 'C191', title: 'Operating Systems for Programmers', credits: 3, cost_usd: 3625, duration_weeks: 12, cri_score: 1.0, level: 200, subject_area: 'computer_science', provider_code: 'WGU' },
      { code: 'C949', title: 'Data Structures and Algorithms I', credits: 4, cost_usd: 3625, duration_weeks: 12, cri_score: 1.0, level: 200, subject_area: 'computer_science', provider_code: 'WGU' },
      
      // EXCU institutional
      { code: 'ENG-105', title: 'English Composition', credits: 3, cost_usd: 1200, duration_weeks: 15, cri_score: 1.0, level: 100, subject_area: 'english', provider_code: 'EXCU' },
      { code: 'MAT-1105', title: 'College Algebra', credits: 3, cost_usd: 1200, duration_weeks: 15, cri_score: 1.0, level: 100, subject_area: 'mathematics', provider_code: 'EXCU' },
      { code: 'CIS-101', title: 'Introduction to Computing', credits: 3, cost_usd: 1200, duration_weeks: 15, cri_score: 1.0, level: 100, subject_area: 'computer_science', provider_code: 'EXCU' },
      
      // MOOCs
      { code: 'COURSERA-PYTHON', title: 'Python for Everybody', credits: 3, cost_usd: 49, duration_weeks: 8, cri_score: 0.68, level: 100, subject_area: 'computer_science', provider_code: 'COURSERA' },
      { code: 'EDX-DATA-SCI', title: 'Introduction to Data Science', credits: 3, cost_usd: 99, duration_weeks: 10, cri_score: 0.70, level: 200, subject_area: 'computer_science', provider_code: 'EDX' },
    ];

    const coursesWithProviderIds = courses.map(c => ({
      ...c,
      provider_id: providerMap.get(c.provider_code),
    })).filter(c => c.provider_id);

    const { data: marketplaceCourses, error: courseError } = await supabase
      .from('marketplace_courses')
      .upsert(coursesWithProviderIds, { onConflict: 'code,provider_id' })
      .select();

    if (courseError) throw courseError;
    console.log(`✅ Seeded ${marketplaceCourses?.length || 0} marketplace courses`);

    // Phase 3: Link requirement_options to marketplace_courses
    console.log('🔗 Phase 3: Linking requirements to courses...');
    const { data: requirements } = await supabase
      .from('program_requirements')
      .select('id, slug, title');

    const { data: allCourses } = await supabase
      .from('marketplace_courses')
      .select('id, code, provider_id, providers!inner(provider_code)');

    const courseMap = new Map(
      allCourses?.map(c => [`${(c.providers as any).provider_code}:${c.code}`, c.id]) || []
    );

    const optionsToInsert: Array<{ requirement_id: string; course_id: string; is_primary_option: boolean }> = [];

    // Link math requirements
    const mathReqs = requirements?.filter(r => 
      r.slug?.toLowerCase().includes('math') || 
      r.slug?.toLowerCase().includes('algebra') ||
      r.title?.toLowerCase().includes('math')
    );

    for (const req of mathReqs || []) {
      const mathCourses = [
        'SOPHIA:SOPH-COLLEGE-ALG',
        'STUDY:STUDY-COLLEGE-ALG',
        'CLEP:CLEP-COLLEGE-ALG',
        'TESU:MAT-121',
        'EXCU:MAT-1105',
      ];
      mathCourses.forEach((key, idx) => {
        const courseId = courseMap.get(key);
        if (courseId) {
          optionsToInsert.push({ requirement_id: req.id, course_id: courseId, is_primary_option: idx === 0 });
        }
      });
    }

    // Link english requirements
    const englishReqs = requirements?.filter(r => 
      r.slug?.toLowerCase().includes('english') || 
      r.slug?.toLowerCase().includes('composition') ||
      r.title?.toLowerCase().includes('english') ||
      r.title?.toLowerCase().includes('writing')
    );

    for (const req of englishReqs || []) {
      const englishCourses = [
        'SOPHIA:SOPH-ENG-COMP',
        'STUDY:STUDY-ENG-COMP',
        'CLEP:CLEP-ENG-COMP',
        'TESU:ENG-101',
        'EXCU:ENG-105',
      ];
      englishCourses.forEach((key, idx) => {
        const courseId = courseMap.get(key);
        if (courseId) {
          optionsToInsert.push({ requirement_id: req.id, course_id: courseId, is_primary_option: idx === 0 });
        }
      });
    }

    // Link CS requirements
    const csReqs = requirements?.filter(r => 
      r.slug?.toLowerCase().includes('cs') || 
      r.slug?.toLowerCase().includes('computer') ||
      r.slug?.toLowerCase().includes('programming') ||
      r.title?.toLowerCase().includes('computer') ||
      r.title?.toLowerCase().includes('programming')
    );

    for (const req of csReqs || []) {
      const csCourses = [
        'STUDY:STUDY-INTRO-CS',
        'SOPHIA:SOPH-INTRO-PYTHON',
        'TESU:CMP-101',
        'EXCU:CIS-101',
        'WGU:C191',
        'COURSERA:COURSERA-PYTHON',
      ];
      csCourses.forEach((key, idx) => {
        const courseId = courseMap.get(key);
        if (courseId) {
          optionsToInsert.push({ requirement_id: req.id, course_id: courseId, is_primary_option: idx === 0 });
        }
      });
    }

    if (optionsToInsert.length > 0) {
      const { error: optionsError } = await supabase
        .from('requirement_options')
        .upsert(optionsToInsert, { onConflict: 'requirement_id,course_id', ignoreDuplicates: true });

      if (optionsError) throw optionsError;
      console.log(`✅ Linked ${optionsToInsert.length} requirement options`);
    }

    // Phase 4: Seed Transfer Rules
    console.log('🔄 Phase 4: Seeding transfer rules...');
    const transferRules = [
      // Same-institution (confidence 1.0)
      { source_institution: 'TESU', source_course_code: 'ENG-101', target_institution: 'TESU', target_course_code: 'ENG-101', acceptance_status: 'accepted', confidence: 1.0, requirement_type: 'genED', notes: 'Institutional course' },
      { source_institution: 'TESU', source_course_code: 'MAT-121', target_institution: 'TESU', target_course_code: 'MAT-121', acceptance_status: 'accepted', confidence: 1.0, requirement_type: 'major', notes: 'Institutional course' },
      { source_institution: 'TESU', source_course_code: 'CMP-101', target_institution: 'TESU', target_course_code: 'CMP-101', acceptance_status: 'accepted', confidence: 1.0, requirement_type: 'major', notes: 'Institutional course' },
      { source_institution: 'TESU', source_course_code: 'CMP-221', target_institution: 'TESU', target_course_code: 'CMP-221', acceptance_status: 'accepted', confidence: 1.0, requirement_type: 'major', notes: 'Institutional course' },
      
      { source_institution: 'EXCU', source_course_code: 'ENG-105', target_institution: 'EXCU', target_course_code: 'ENG-105', acceptance_status: 'accepted', confidence: 1.0, requirement_type: 'genED', notes: 'Institutional course' },
      { source_institution: 'EXCU', source_course_code: 'MAT-1105', target_institution: 'EXCU', target_course_code: 'MAT-1105', acceptance_status: 'accepted', confidence: 1.0, requirement_type: 'major', notes: 'Institutional course' },
      { source_institution: 'EXCU', source_course_code: 'CIS-101', target_institution: 'EXCU', target_course_code: 'CIS-101', acceptance_status: 'accepted', confidence: 1.0, requirement_type: 'major', notes: 'Institutional course' },
      
      { source_institution: 'WGU', source_course_code: 'C191', target_institution: 'WGU', target_course_code: 'C191', acceptance_status: 'accepted', confidence: 1.0, requirement_type: 'major', notes: 'Institutional course' },
      { source_institution: 'WGU', source_course_code: 'C949', target_institution: 'WGU', target_course_code: 'C949', acceptance_status: 'accepted', confidence: 1.0, requirement_type: 'major', notes: 'Institutional course' },
      
      // ACE-approved transfers
      { source_institution: 'SOPHIA', source_course_code: 'SOPH-COLLEGE-ALG', target_institution: 'TESU', target_course_code: 'MAT-121', acceptance_status: 'accepted', confidence: 0.90, requirement_type: 'major', notes: 'ACE-approved transfer' },
      { source_institution: 'SOPHIA', source_course_code: 'SOPH-COLLEGE-ALG', target_institution: 'EXCU', target_course_code: 'MAT-1105', acceptance_status: 'accepted', confidence: 0.90, requirement_type: 'major', notes: 'ACE-approved transfer' },
      { source_institution: 'SOPHIA', source_course_code: 'SOPH-ENG-COMP', target_institution: 'TESU', target_course_code: 'ENG-101', acceptance_status: 'accepted', confidence: 0.92, requirement_type: 'genED', notes: 'ACE-approved composition' },
      { source_institution: 'SOPHIA', source_course_code: 'SOPH-ENG-COMP', target_institution: 'EXCU', target_course_code: 'ENG-105', acceptance_status: 'accepted', confidence: 0.90, requirement_type: 'genED', notes: 'ACE-approved composition' },
      { source_institution: 'SOPHIA', source_course_code: 'SOPH-INTRO-PYTHON', target_institution: 'TESU', target_course_code: 'ELEC-CS', acceptance_status: 'elective', confidence: 0.82, requirement_type: 'elective', notes: 'Transfers as CS elective only' },
      
      { source_institution: 'STUDY', source_course_code: 'STUDY-COLLEGE-ALG', target_institution: 'TESU', target_course_code: 'MAT-121', acceptance_status: 'accepted', confidence: 0.88, requirement_type: 'major', notes: 'ACE-approved transfer' },
      { source_institution: 'STUDY', source_course_code: 'STUDY-COLLEGE-ALG', target_institution: 'EXCU', target_course_code: 'MAT-1105', acceptance_status: 'accepted', confidence: 0.87, requirement_type: 'major', notes: 'ACE-approved transfer' },
      { source_institution: 'STUDY', source_course_code: 'STUDY-ENG-COMP', target_institution: 'TESU', target_course_code: 'ENG-101', acceptance_status: 'accepted', confidence: 0.86, requirement_type: 'genED', notes: 'ACE-approved composition' },
      { source_institution: 'STUDY', source_course_code: 'STUDY-ENG-COMP', target_institution: 'EXCU', target_course_code: 'ENG-105', acceptance_status: 'accepted', confidence: 0.85, requirement_type: 'genED', notes: 'ACE-approved composition' },
      { source_institution: 'STUDY', source_course_code: 'STUDY-INTRO-CS', target_institution: 'TESU', target_course_code: 'CMP-101', acceptance_status: 'accepted', confidence: 0.85, requirement_type: 'major', notes: 'ACE-approved CS fundamentals' },
      { source_institution: 'STUDY', source_course_code: 'STUDY-INTRO-CS', target_institution: 'EXCU', target_course_code: 'CIS-101', acceptance_status: 'accepted', confidence: 0.84, requirement_type: 'major', notes: 'ACE-approved CS fundamentals' },
      { source_institution: 'STUDY', source_course_code: 'STUDY-INTRO-CS', target_institution: 'WGU', target_course_code: 'C191', acceptance_status: 'accepted', confidence: 0.85, requirement_type: 'major', notes: 'Competency alignment' },
      { source_institution: 'STUDY', source_course_code: 'STUDY-DATA-STRUCT', target_institution: 'TESU', target_course_code: 'CMP-221', acceptance_status: 'accepted', confidence: 0.82, requirement_type: 'major', notes: 'ACE-approved upper-level CS' },
      { source_institution: 'STUDY', source_course_code: 'STUDY-DATA-STRUCT', target_institution: 'WGU', target_course_code: 'C949', acceptance_status: 'accepted', confidence: 0.80, requirement_type: 'major', notes: 'Competency alignment verified' },
      
      { source_institution: 'CLEP', source_course_code: 'CLEP-COLLEGE-ALG', target_institution: 'TESU', target_course_code: 'MAT-121', acceptance_status: 'accepted', confidence: 0.95, requirement_type: 'major', notes: 'CLEP accepted' },
      { source_institution: 'CLEP', source_course_code: 'CLEP-COLLEGE-ALG', target_institution: 'EXCU', target_course_code: 'MAT-1105', acceptance_status: 'accepted', confidence: 0.95, requirement_type: 'major', notes: 'CLEP accepted' },
      { source_institution: 'CLEP', source_course_code: 'CLEP-COLLEGE-ALG', target_institution: 'WGU', target_course_code: 'C191', acceptance_status: 'accepted', confidence: 0.92, requirement_type: 'major', notes: 'CLEP fulfills competency' },
      { source_institution: 'CLEP', source_course_code: 'CLEP-ENG-COMP', target_institution: 'TESU', target_course_code: 'ENG-101', acceptance_status: 'accepted', confidence: 0.95, requirement_type: 'genED', notes: 'CLEP accepted for composition' },
      { source_institution: 'CLEP', source_course_code: 'CLEP-ENG-COMP', target_institution: 'EXCU', target_course_code: 'ENG-105', acceptance_status: 'accepted', confidence: 0.95, requirement_type: 'genED', notes: 'CLEP accepted for composition' },
      
      // Cross-RA transfers (lower confidence)
      { source_institution: 'COURSERA', source_course_code: 'COURSERA-PYTHON', target_institution: 'TESU', target_course_code: 'ELEC-GEN', acceptance_status: 'elective', confidence: 0.65, requirement_type: 'elective', notes: 'May transfer as elective only; not ACE-approved' },
      { source_institution: 'COURSERA', source_course_code: 'COURSERA-PYTHON', target_institution: 'EXCU', target_course_code: 'ELEC-GEN', acceptance_status: 'elective', confidence: 0.60, requirement_type: 'elective', notes: 'May transfer as elective only; not ACE-approved' },
      { source_institution: 'EDX', source_course_code: 'EDX-DATA-SCI', target_institution: 'TESU', target_course_code: 'ELEC-GEN', acceptance_status: 'elective', confidence: 0.65, requirement_type: 'elective', notes: 'May transfer as elective only; requires review' },
    ];

    const { data: seededRules, error: rulesError } = await supabase
      .from('transfer_rules')
      .upsert(transferRules, { 
        onConflict: 'source_institution,source_course_code,target_institution,target_course_code' 
      })
      .select();

    if (rulesError) throw rulesError;
    console.log(`✅ Seeded ${seededRules?.length || 0} transfer rules`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'V5 Marketplace seeded successfully',
        counts: {
          providers: providers?.length || 0,
          courses: marketplaceCourses?.length || 0,
          requirementOptions: optionsToInsert.length,
          transferRules: seededRules?.length || 0,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Seeding error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
