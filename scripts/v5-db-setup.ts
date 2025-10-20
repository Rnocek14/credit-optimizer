// scripts/v5-db-setup.ts
// Usage:
//  - Diagnose only:   npx tsx scripts/v5-db-setup.ts --diag
//  - Seed + diagnose: npx tsx scripts/v5-db-setup.ts --seed
//
// Requires env:
//   VITE_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY (preferred) or VITE_SUPABASE_PUBLISHABLE_KEY

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

const PROGRAM_ID = 'bs_cs';

const seedData = {
  providers: [
    { id: 'univ', name: 'University', is_marketplace: false },
    { id: 'coursera', name: 'Coursera', is_marketplace: true },
    { id: 'edx', name: 'edX', is_marketplace: true },
  ],
  
  requirements: [
    { year: 1, category: 'gened', name: 'Foundations', description: 'General foundations', credits_required: 6, min_select: 1 },
    { year: 2, category: 'core', name: 'Core I', description: 'CS core part I', credits_required: 6, min_select: 1 },
    { year: 3, category: 'core', name: 'Core II', description: 'CS core part II', credits_required: 6, min_select: 1 },
    { year: 4, category: 'capstone', name: 'Senior Capstone', description: 'Culminating project', credits_required: 6, min_select: 1 },
  ],
  
  eduCourses: [
    { code: 'CS-101', title: 'Intro to Computer Science', credits: 3, provider_id: 'univ' },
    { code: 'CS-201', title: 'Data Structures & Algorithms', credits: 3, provider_id: 'univ' },
    { code: 'CS-301', title: 'Database Systems', credits: 3, provider_id: 'univ' },
    { code: 'CS-401', title: 'Senior Capstone Project', credits: 6, provider_id: 'univ' },
  ],
  
  marketplaceCourses: [
    { code: 'COURSERA-CS50', title: 'CS50: Introduction to Computer Science', credits: 3, cost_usd: 49, provider_id: 'coursera', duration_weeks: 12 },
    { code: 'EDX-DS101', title: 'Algorithms and Data Structures', credits: 3, cost_usd: 99, provider_id: 'edx', duration_weeks: 10 },
    { code: 'COURSERA-DB', title: 'Database Design and Management', credits: 3, cost_usd: 79, provider_id: 'coursera', duration_weeks: 8 },
    { code: 'EDX-CAPSTONE', title: 'Applied CS Capstone', credits: 6, cost_usd: 199, provider_id: 'edx', duration_weeks: 16 },
  ],
};

async function upsertProvider(id: string, name: string, is_marketplace: boolean) {
  const { data: existing } = await sb.from('providers').select('id').eq('id', id).maybeSingle();
  if (existing?.id) return id;

  const { error } = await sb.from('providers').insert({ id, name, is_marketplace });
  if (error) throw error;
  return id;
}

async function upsertEduCourse(code: string, title: string, credits: number, provider_id: string) {
  const { data: existing } = await sb.from('edu_courses').select('id').eq('code', code).maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await sb.from('edu_courses')
    .insert({ code, title, credits, provider_id })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function upsertMarketplaceCourse(code: string, title: string, credits: number, cost_usd: number, provider_id: string, duration_weeks?: number) {
  const { data: existing } = await sb.from('marketplace_courses').select('id').eq('code', code).maybeSingle();
  if (existing?.id) return existing.id;

  const { data, error } = await sb.from('marketplace_courses')
    .insert({ code, title, credits, cost_usd, provider_id, duration_weeks })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function upsertRequirement(year: number, category: string, name: string, description: string, credits_required: number, min_select: number) {
  const { data: existing } = await sb.from('program_requirements')
    .select('id, credits_required')
    .eq('program_id', PROGRAM_ID)
    .eq('year', year)
    .eq('name', name)
    .maybeSingle();

  if (existing?.id) {
    // Update if credits_required is 0
    if ((existing.credits_required ?? 0) === 0) {
      await sb.from('program_requirements')
        .update({ credits_required, min_select })
        .eq('id', existing.id);
    }
    return existing.id;
  }

  const { data, error } = await sb.from('program_requirements')
    .insert({
      program_id: PROGRAM_ID,
      year,
      category,
      name,
      description,
      credits_required,
      min_select
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

async function linkOption(requirement_id: string, option_ref_id: string, credits_awarded: number) {
  const { data: existing } = await sb.from('requirement_options')
    .select('id')
    .eq('requirement_id', requirement_id)
    .eq('option_ref_id', option_ref_id)
    .maybeSingle();
  
  if (existing?.id) return;

  const { error } = await sb.from('requirement_options')
    .insert({
      requirement_id,
      option_kind: 'course',
      option_ref_id,
      credits_awarded
    });
  if (error) throw error;
}

async function seed() {
  console.log('🌱 Seeding minimal V5 data (Years 1–4)...\n');

  // 1. Providers
  console.log('📦 Providers...');
  for (const p of seedData.providers) {
    await upsertProvider(p.id, p.name, p.is_marketplace);
  }

  // 2. Edu courses
  console.log('🎓 Edu courses...');
  const eduCourseIds: Record<string, string> = {};
  for (const c of seedData.eduCourses) {
    eduCourseIds[c.code] = await upsertEduCourse(c.code, c.title, c.credits, c.provider_id);
  }

  // 3. Marketplace courses
  console.log('🛒 Marketplace courses...');
  const marketplaceCourseIds: Record<string, string> = {};
  for (const c of seedData.marketplaceCourses) {
    marketplaceCourseIds[c.code] = await upsertMarketplaceCourse(
      c.code, c.title, c.credits, c.cost_usd, c.provider_id, c.duration_weeks
    );
  }

  // 4. Requirements + link options
  console.log('📋 Requirements + options...');
  for (let i = 0; i < seedData.requirements.length; i++) {
    const req = seedData.requirements[i];
    const reqId = await upsertRequirement(
      req.year, req.category, req.name, req.description, req.credits_required, req.min_select
    );

    // Link 1 edu + 1 marketplace per requirement
    const eduCourseId = eduCourseIds[seedData.eduCourses[i].code];
    const marketplaceCourseId = marketplaceCourseIds[seedData.marketplaceCourses[i].code];

    await linkOption(reqId, eduCourseId, seedData.eduCourses[i].credits);
    await linkOption(reqId, marketplaceCourseId, seedData.marketplaceCourses[i].credits);
  }

  console.log('✅ Seed complete!\n');
}

async function diagnose() {
  console.log('\n=== V5 DIAGNOSTIC ===\n');

  // Table counts
  const tables = ['providers', 'program_requirements', 'requirement_options', 'edu_courses', 'marketplace_courses'];
  const counts: Record<string, number> = {};
  
  console.log('📊 Table counts:');
  for (const t of tables) {
    const { count } = await sb.from(t as any).select('*', { count: 'exact', head: true });
    counts[t] = count ?? 0;
    console.log(`  ${t}: ${counts[t]}`);
  }

  // Requirements by year
  const { data: reqs } = await sb.from('program_requirements')
    .select('id, year, category, name, credits_required')
    .eq('program_id', PROGRAM_ID)
    .order('year', { ascending: true });

  const byYear: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [] };
  (reqs || []).forEach(r => {
    const y = Math.min(4, Math.max(1, Number(r.year) || 1));
    byYear[y].push(r);
  });

  console.log('\n📅 Requirements by year:');
  for (let y = 1; y <= 4; y++) {
    console.log(`  Year ${y}: ${byYear[y].length} requirements`);
    byYear[y].forEach(r => {
      console.log(`    - ${r.name} (${r.credits_required ?? 0} credits)`);
    });
  }

  const zeroCredit = (reqs || []).filter(r => (r.credits_required ?? 0) === 0);
  if (zeroCredit.length > 0) {
    console.log('\n⚠️  Zero-credit requirements:');
    zeroCredit.forEach(r => console.log(`  - ${r.name} (Year ${r.year})`));
  }

  // Options resolution
  if (reqs && reqs.length > 0) {
    const reqIds = reqs.map(r => r.id);
    const { data: opts } = await sb.from('requirement_options')
      .select('id, requirement_id, option_ref_id, option_kind')
      .in('requirement_id', reqIds);

    const refIds = Array.from(new Set((opts || []).map(o => o.option_ref_id)));
    const eduHits = new Set<string>();
    const mkHits = new Set<string>();

    if (refIds.length > 0) {
      const { data: edu } = await sb.from('edu_courses').select('id').in('id', refIds);
      const { data: mk } = await sb.from('marketplace_courses').select('id').in('id', refIds);
      (edu || []).forEach(e => eduHits.add(e.id));
      (mk || []).forEach(m => mkHits.add(m.id));
    }

    const unresolved = (opts || []).filter(o => !eduHits.has(o.option_ref_id) && !mkHits.has(o.option_ref_id));

    console.log('\n🔗 Requirement options:');
    console.log(`  Total: ${opts?.length ?? 0}`);
    console.log(`  Edu courses: ${(opts || []).filter(o => eduHits.has(o.option_ref_id)).length}`);
    console.log(`  Marketplace: ${(opts || []).filter(o => mkHits.has(o.option_ref_id)).length}`);
    console.log(`  Unresolved: ${unresolved.length}`);
    
    if (unresolved.length > 0) {
      console.log('\n⚠️  Unresolved options (sample):');
      unresolved.slice(0, 3).forEach(o => {
        console.log(`  - Option ${o.id} → ${o.option_ref_id}`);
      });
    }
  }

  console.log('\n=== END DIAGNOSTIC ===\n');
}

(async () => {
  const args = new Set(process.argv.slice(2));
  const doSeed = args.has('--seed');
  const doDiag = args.has('--diag') || !doSeed;

  try {
    if (doSeed) {
      await seed();
    }
    if (doDiag) {
      await diagnose();
    }
  } catch (err: any) {
    console.error('❌ Script failed:', err?.message || err);
    process.exit(1);
  }
})();
