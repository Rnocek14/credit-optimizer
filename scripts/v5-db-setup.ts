import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/integrations/supabase/types';

const SUPABASE_URL = "https://vzpissitddpunkpythsb.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6cGlzc2l0ZGRwdW5rcHl0aHNiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3ODUxMDUsImV4cCI6MjA2ODM2MTEwNX0.qm92R4H0_rQpNipa2u1PjJqjnKrlRz_RJe6h6J9G-RI";

const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_KEY);

async function diagnose() {
  console.log('\n📊 V5 Database Diagnostic\n');

  const { data: providers } = await supabase.from('course_providers').select('id');
  const { data: eduCourses } = await supabase.from('edu_courses').select('id');
  const { data: marketplaceCourses } = await supabase.from('marketplace_courses').select('id');
  const { data: requirements } = await supabase.from('program_requirements').select('id, year, category, name, credits_required').eq('program_id', 'bs_cs');
  const { data: options } = await supabase.from('requirement_options').select('id, requirement_id, option_ref_id');

  console.log('📋 Table Counts:');
  console.log(`  providers: ${providers?.length || 0}`);
  console.log(`  edu_courses: ${eduCourses?.length || 0}`);
  console.log(`  marketplace_courses: ${marketplaceCourses?.length || 0}`);
  console.log(`  program_requirements (bs_cs): ${requirements?.length || 0}`);
  console.log(`  requirement_options: ${options?.length || 0}\n`);

  console.log('📅 Requirements by Year:');
  const byYear = [1, 2, 3, 4].map(y => ({
    year: y,
    count: requirements?.filter(r => r.year === y).length || 0,
    items: requirements?.filter(r => r.year === y).map(r => `${r.name} (${r.credits_required} cr)`) || []
  }));
  
  byYear.forEach(({ year, count, items }) => {
    console.log(`  Year ${year}: ${count} requirement(s)`);
    items.forEach(item => console.log(`    - ${item}`));
  });

  const zeroCredit = requirements?.filter(r => !r.credits_required || r.credits_required === 0) || [];
  if (zeroCredit.length > 0) {
    console.log('\n⚠️  Zero-Credit Requirements:');
    zeroCredit.forEach(r => console.log(`  - Year ${r.year}: ${r.name}`));
  }

  const unresolvedCount = options?.filter(opt => {
    const hasEdu = eduCourses?.some(c => c.id === opt.option_ref_id);
    const hasMkt = marketplaceCourses?.some(c => c.id === opt.option_ref_id);
    return !hasEdu && !hasMkt;
  }).length || 0;

  console.log(`\n🔗 Options: ${options?.length || 0} total, ${unresolvedCount} unresolved\n`);
}

async function seed() {
  console.log('\n🌱 Seeding V5 Database Data\n');

  const providers = [
    { id: crypto.randomUUID(), name: 'Coursera', website: 'https://coursera.org', accreditation_status: 'accredited' },
    { id: crypto.randomUUID(), name: 'edX', website: 'https://edx.org', accreditation_status: 'accredited' },
    { id: crypto.randomUUID(), name: 'Udacity', website: 'https://udacity.com', accreditation_status: 'recognized' }
  ];

  const { error: provError } = await supabase.from('course_providers').upsert(providers, { onConflict: 'name' });
  if (provError) console.error('Provider seed error:', provError);
  else console.log(`✓ Providers seeded: ${providers.length}`);

  const eduCourses = [
    { id: crypto.randomUUID(), code: 'CS101', title: 'Intro to Computer Science', credits: 3 },
    { id: crypto.randomUUID(), code: 'MATH201', title: 'Calculus I', credits: 3 },
    { id: crypto.randomUUID(), code: 'CS201', title: 'Data Structures', credits: 3 },
    { id: crypto.randomUUID(), code: 'CS301', title: 'Algorithms', credits: 3 }
  ];

  const { error: eduError } = await supabase.from('edu_courses').upsert(eduCourses, { onConflict: 'code' });
  if (eduError) console.error('Edu courses seed error:', eduError);
  else console.log(`✓ Edu courses seeded: ${eduCourses.length}`);

  const marketplaceCourses = [
    { 
      id: crypto.randomUUID(), 
      code: 'COUR-CS-101', 
      title: 'Programming Foundations', 
      credits: 3, 
      cost_usd: 49, 
      duration_weeks: 6,
      provider_id: providers[0].id 
    },
    { 
      id: crypto.randomUUID(), 
      code: 'EDX-MATH-101', 
      title: 'Mathematical Thinking', 
      credits: 3, 
      cost_usd: 99, 
      duration_weeks: 8,
      provider_id: providers[1].id 
    },
    { 
      id: crypto.randomUUID(), 
      code: 'UDAC-DS-201', 
      title: 'Data Structures Nanodegree', 
      credits: 3, 
      cost_usd: 399, 
      duration_weeks: 12,
      provider_id: providers[2].id 
    },
    { 
      id: crypto.randomUUID(), 
      code: 'COUR-ALG-301', 
      title: 'Algorithm Design', 
      credits: 3, 
      cost_usd: 79, 
      duration_weeks: 10,
      provider_id: providers[0].id 
    }
  ];

  const { error: mktError } = await supabase.from('marketplace_courses').upsert(marketplaceCourses, { onConflict: 'code' });
  if (mktError) console.error('Marketplace courses seed error:', mktError);
  else console.log(`✓ Marketplace courses seeded: ${marketplaceCourses.length}`);

  // Delete existing requirements for bs_cs to ensure clean slate
  const { error: deleteError } = await supabase
    .from('program_requirements')
    .delete()
    .eq('program_id', 'bs_cs');
  
  if (deleteError) console.error('Delete requirements error:', deleteError);
  else console.log('✓ Cleared existing bs_cs requirements');

  const requirements = [
    { id: crypto.randomUUID(), program_id: 'bs_cs', year: 1, category: 'foundation', name: 'Foundations', description: 'Core programming foundations', credits_required: 6 },
    { id: crypto.randomUUID(), program_id: 'bs_cs', year: 2, category: 'core', name: 'Core I', description: 'Data structures and algorithms', credits_required: 6 },
    { id: crypto.randomUUID(), program_id: 'bs_cs', year: 3, category: 'specialization', name: 'Specialization', description: 'Track-specific courses', credits_required: 6 },
    { id: crypto.randomUUID(), program_id: 'bs_cs', year: 4, category: 'capstone', name: 'Capstone', description: 'Final project and electives', credits_required: 6 }
  ];

  const { error: reqError } = await supabase.from('program_requirements').insert(requirements);
  if (reqError) console.error('Requirements seed error:', reqError);
  else console.log(`✓ Program requirements seeded: ${requirements.length}`);

  const options = requirements.flatMap((req, idx) => [
    {
      id: crypto.randomUUID(),
      requirement_id: req.id,
      option_kind: 'course' as const,
      option_ref_id: eduCourses[idx]?.id || eduCourses[0].id,
      credits_awarded: 3,
      transfer_eligible: true
    },
    {
      id: crypto.randomUUID(),
      requirement_id: req.id,
      option_kind: 'course' as const,
      option_ref_id: marketplaceCourses[idx]?.id || marketplaceCourses[0].id,
      credits_awarded: 3,
      transfer_eligible: true
    }
  ]);

  const { error: optError } = await supabase.from('requirement_options').upsert(options, { onConflict: 'requirement_id,option_ref_id' });
  if (optError) console.error('Options seed error:', optError);
  else console.log(`✓ Requirement options seeded: ${options.length}`);

  console.log('\n✨ Seeding complete!\n');
}

async function main() {
  const mode = process.argv[2];

  if (mode === '--diag') {
    await diagnose();
  } else if (mode === '--seed') {
    await seed();
    console.log('Running diagnostic after seed...');
    await diagnose();
  } else {
    console.log('Usage: tsx scripts/v5-db-setup.ts [--diag|--seed]');
    console.log('  --diag: Show current database state');
    console.log('  --seed: Populate database with sample data');
  }
}

main().catch(console.error);
