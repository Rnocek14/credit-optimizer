/**
 * API module for dev/admin tooling (SeedStatus, Phase1TestPanel, DemoCourseSeedTrigger, RepoScanTab, SeedV5Database).
 */
import { supabase } from './client';

// ── SeedStatus ──────────────────────────────────────────────────

export interface SeedStatusCounts {
  providers: number;
  requirements: number;
  anchors: number;
  rules: number;
  exclusions: number;
}

export async function fetchSeedStatusCounts(): Promise<SeedStatusCounts> {
  const [providers, reqs, anchors, rules, exclusions] = await Promise.all([
    supabase.from('providers').select('*', { count: 'exact', head: true }),
    supabase.from('requirement_catalog').select('*', { count: 'exact', head: true }),
    supabase.from('partner_policies').select('*', { count: 'exact', head: true }),
    supabase.from('credit_transfer_rules').select('*', { count: 'exact', head: true }),
    supabase.from('option_exclusions').select('*', { count: 'exact', head: true }),
  ]);

  return {
    providers: providers.count ?? 0,
    requirements: reqs.count ?? 0,
    anchors: anchors.count ?? 0,
    rules: rules.count ?? 0,
    exclusions: exclusions.count ?? 0,
  };
}

// ── Phase1TestPanel ─────────────────────────────────────────────

export async function fetchPhase1TestResults() {
  const { data, error } = await supabase.from('phase1_test_results').select('*');
  if (error) throw error;
  return data ?? [];
}

// ── DemoCourseSeedTrigger ───────────────────────────────────────

export async function clearDemoCourseData() {
  await supabase.from('course_intelligence_pipeline').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('course_discovery_queue').delete().neq('id', '00000000-0000-0000-0000-000000000000');
}

// ── RepoScanTab ─────────────────────────────────────────────────

export async function upsertDemoRepo(repoId: string, fileCount: number) {
  await supabase.from('ai_analyzer_repos').upsert({
    id: repoId,
    user_id: 'demo-user',
    name: 'Demo Project (Lovable)',
    repo_type: 'demo',
    file_count: fileCount,
    language_breakdown: {
      TypeScript: 75,
      JavaScript: 15,
      CSS: 7,
      JSON: 3,
    },
    indexed_at: new Date().toISOString(),
  });
}

export async function upsertDemoChunks(chunks: Array<{
  id: string;
  repo_id: string;
  file_path: string;
  chunk_content: string;
  chunk_index: number;
  total_chunks: number;
  language: string;
  content_hash: string;
  symbols: string[];
}>) {
  await supabase.from('ai_analyzer_chunks').upsert(chunks);
}

// ── EduTree Seed Verification ───────────────────────────────────

export async function verifySeedCounts() {
  const [chk1, chk2, chk3, chk4] = await Promise.all([
    supabase.from('requirement_blocks').select('id'),
    supabase.from('block_members').select('id'),
    supabase.from('block_gates').select('id'),
    supabase.from('prereq_to_block').select('id'),
  ]);

  return {
    blocks: chk1.data?.length ?? 0,
    members: chk2.data?.length ?? 0,
    gates: chk3.data?.length ?? 0,
    edges: chk4.data?.length ?? 0,
  };
}

// ── SeedV5Database helpers ──────────────────────────────────────

export async function seedFetchEduCourses(limit: number) {
  const { data, error } = await supabase
    .from('edu_courses' as any)
    .select('id, code, title, credits')
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function seedFetchProgramRequirements(programId: string) {
  const { data, error } = await supabase
    .from('program_requirements' as any)
    .select('id')
    .eq('program_id', programId);
  if (error) throw error;
  return data ?? [];
}

export async function deleteProgramRequirements(programId: string) {
  const { error } = await supabase
    .from('program_requirements' as any)
    .delete()
    .eq('program_id', programId);
  if (error) throw error;
}

export async function deleteRequirementOptions(requirementIds: string[]) {
  const { error } = await supabase
    .from('requirement_options' as any)
    .delete()
    .in('requirement_id', requirementIds);
  if (error) throw error;
}

export async function insertProgramRequirements(requirements: any[]) {
  const { data, error } = await supabase
    .from('program_requirements' as any)
    .insert(requirements)
    .select('id, year')
    .order('year');
  if (error) throw error;
  return data;
}

export async function insertRequirementOptions(options: any[]) {
  const { data, error } = await supabase
    .from('requirement_options' as any)
    .insert(options)
    .select('id');
  if (error) throw error;
  return data;
}

export async function upsertProviders(providers: any[]) {
  const { error } = await supabase
    .from('providers' as any)
    .upsert(providers, { onConflict: 'name' });
  if (error) throw error;
}

export async function upsertEduCourses(courses: any[]) {
  const { error } = await supabase
    .from('edu_courses' as any)
    .upsert(courses, { onConflict: 'code' });
  if (error) throw error;
}

export async function upsertMarketplaceCourses(courses: any[]) {
  const { error } = await supabase
    .from('marketplace_courses' as any)
    .upsert(courses, { onConflict: 'code' });
  if (error) throw error;
}
