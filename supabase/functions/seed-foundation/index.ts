import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import postgres from 'https://esm.sh/postgres@3.4.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const dbUrl = Deno.env.get('SUPABASE_DB_URL');
    if (!dbUrl) {
      console.error('SUPABASE_DB_URL not found');
      return new Response(
        JSON.stringify({ error: 'Database URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Connecting to database...');
    const sql = postgres(dbUrl);

    // Seed providers
    const providers = [
      { provider_code: 'SOPHIA', name: 'Sophia Learning', base_url: 'https://sophia.org' },
      { provider_code: 'STUDY', name: 'Study.com', base_url: 'https://study.com' },
      { provider_code: 'CLEP', name: 'CLEP Exams', base_url: 'https://clep.collegeboard.org' },
      { provider_code: 'DANTES', name: 'DSST Exams', base_url: 'https://getcollegecredit.com' },
      { provider_code: 'TEEX', name: 'TEEX Courses', base_url: 'https://teex.org' },
      { provider_code: 'NCCRS', name: 'NCCRS ACE', base_url: 'https://nccrs.org' },
      { provider_code: 'ACE', name: 'ACE Credit', base_url: 'https://acenet.edu' },
      { provider_code: 'TESU', name: 'TESU ePack', base_url: 'https://tesu.edu' },
      { provider_code: 'WGU', name: 'WGU Academy', base_url: 'https://wgu.edu' },
      { provider_code: 'COSC', name: 'Charter Oak', base_url: 'https://charteroak.edu' }
    ];

    for (const p of providers) {
      await sql`
        INSERT INTO providers (provider_code, name, base_url)
        VALUES (${p.provider_code}, ${p.name}, ${p.base_url})
        ON CONFLICT (provider_code) DO NOTHING
      `;
    }

    // Seed requirements
    const requirements = [
      { req_code: 'ENG-COMP', label: 'English Composition', category: 'gen-ed', credits_required: 6 },
      { req_code: 'COLLEGE-MATH', label: 'College Mathematics', category: 'gen-ed', credits_required: 3 },
      { req_code: 'STATS', label: 'Statistics', category: 'gen-ed', credits_required: 3 },
      { req_code: 'HUMANITIES', label: 'Humanities Elective', category: 'gen-ed', credits_required: 3 },
      { req_code: 'SOCIAL-SCI', label: 'Social Science Elective', category: 'gen-ed', credits_required: 3 },
      { req_code: 'NATURAL-SCI', label: 'Natural Science w/ Lab', category: 'gen-ed', credits_required: 4 },
      { req_code: 'PROG-FOUND', label: 'Programming Foundations', category: 'cs-core', credits_required: 3 },
      { req_code: 'DATA-STRUCT', label: 'Data Structures', category: 'cs-core', credits_required: 3 },
      { req_code: 'ALGORITHMS', label: 'Algorithms', category: 'cs-core', credits_required: 3 },
      { req_code: 'OS', label: 'Operating Systems', category: 'cs-core', credits_required: 3 },
      { req_code: 'DATABASE', label: 'Database Systems', category: 'cs-core', credits_required: 3 },
      { req_code: 'CS-ELECTIVE', label: 'CS Elective', category: 'cs-elective', credits_required: 3 },
      { req_code: 'FREE-ELECTIVE', label: 'Free Elective', category: 'elective', credits_required: 3 }
    ];

    for (const r of requirements) {
      await sql`
        INSERT INTO requirement_catalog (req_code, label, category, credits_earned, credits_required)
        VALUES (${r.req_code}, ${r.label}, ${r.category}, 0, ${r.credits_required})
        ON CONFLICT (req_code) DO NOTHING
      `;
    }

    // Seed partner policies (anchor schools)
    const anchors = [
      { school_code: 'TESU', school_name: 'Thomas Edison State University', max_alt_credits: 113, residency_required: 16 },
      { school_code: 'COSC', school_name: 'Charter Oak State College', max_alt_credits: 105, residency_required: 15 },
      { school_code: 'EU', school_name: 'Excelsior University', max_alt_credits: 90, residency_required: 30 },
      { school_code: 'WGU', school_name: 'Western Governors University', max_alt_credits: 90, residency_required: 30 }
    ];

    for (const a of anchors) {
      await sql`
        INSERT INTO partner_policies (school_code, school_name, max_alt_credits, residency_required)
        VALUES (${a.school_code}, ${a.school_name}, ${a.max_alt_credits}, ${a.residency_required})
        ON CONFLICT (school_code) DO NOTHING
      `;
    }

    // Seed transfer rules (sample courses)
    const rules = [
      { provider_code: 'SOPHIA', req_code: 'ENG-COMP', course_id: 'ENG-101', course_title: 'English Composition I', credits: 3 },
      { provider_code: 'SOPHIA', req_code: 'ENG-COMP', course_id: 'ENG-102', course_title: 'English Composition II', credits: 3 },
      { provider_code: 'SOPHIA', req_code: 'COLLEGE-MATH', course_id: 'MATH-105', course_title: 'College Algebra', credits: 3 },
      { provider_code: 'STUDY', req_code: 'STATS', course_id: 'STAT-201', course_title: 'Introduction to Statistics', credits: 3 },
      { provider_code: 'STUDY', req_code: 'PROG-FOUND', course_id: 'CS-101', course_title: 'Computer Science 101', credits: 3 },
      { provider_code: 'STUDY', req_code: 'DATA-STRUCT', course_id: 'CS-201', course_title: 'Data Structures', credits: 3 },
      { provider_code: 'CLEP', req_code: 'HUMANITIES', course_id: 'CLEP-HUM', course_title: 'Humanities CLEP', credits: 3 },
      { provider_code: 'CLEP', req_code: 'SOCIAL-SCI', course_id: 'CLEP-PSYCH', course_title: 'Introductory Psychology', credits: 3 },
      { provider_code: 'DANTES', req_code: 'NATURAL-SCI', course_id: 'DSST-ENV', course_title: 'Environmental Science', credits: 3 },
      { provider_code: 'SOPHIA', req_code: 'DATABASE', course_id: 'CS-304', course_title: 'Introduction to Relational Databases', credits: 3 },
      { provider_code: 'STUDY', req_code: 'OS', course_id: 'CS-302', course_title: 'Operating Systems', credits: 3 },
      { provider_code: 'STUDY', req_code: 'ALGORITHMS', course_id: 'CS-202', course_title: 'Computer Science 202', credits: 3 },
      { provider_code: 'SOPHIA', req_code: 'CS-ELECTIVE', course_id: 'CS-205', course_title: 'Web Development', credits: 3 },
      { provider_code: 'STUDY', req_code: 'CS-ELECTIVE', course_id: 'CS-303', course_title: 'Networking Fundamentals', credits: 3 },
      { provider_code: 'SOPHIA', req_code: 'FREE-ELECTIVE', course_id: 'BUS-101', course_title: 'Introduction to Business', credits: 3 },
      { provider_code: 'TEEX', req_code: 'FREE-ELECTIVE', course_id: 'TEEX-CYBER', course_title: 'Cybersecurity', credits: 3 }
    ];

    for (const rule of rules) {
      await sql`
        INSERT INTO credit_transfer_rules (provider_code, req_code, course_id, course_title, credits)
        VALUES (${rule.provider_code}, ${rule.req_code}, ${rule.course_id}, ${rule.course_title}, ${rule.credits})
        ON CONFLICT (provider_code, course_id, req_code) DO NOTHING
      `;
    }

    // Seed option exclusions (sample)
    const exclusions = [
      { req_code: 'PROG-FOUND', course_id: 'CS-101', reason: 'Overlaps with CS-102' },
      { req_code: 'DATA-STRUCT', course_id: 'CS-150', reason: 'Duplicate content' },
      { req_code: 'ALGORITHMS', course_id: 'CS-250', reason: 'Not accepted by TESU' }
    ];

    for (const ex of exclusions) {
      await sql`
        INSERT INTO option_exclusions (req_code, course_id, reason)
        VALUES (${ex.req_code}, ${ex.course_id}, ${ex.reason})
        ON CONFLICT (req_code, course_id) DO NOTHING
      `;
    }

    await sql.end();

    const counts = {
      providers: providers.length,
      requirements: requirements.length,
      anchors: anchors.length,
      rules: rules.length,
      exclusions: exclusions.length
    };

    console.log('✅ Seed complete:', counts);
    return new Response(
      JSON.stringify({ success: true, counts }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Seed error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
