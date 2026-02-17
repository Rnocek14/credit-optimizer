/**
 * API module for dev/admin tooling (SeedStatus, Phase1TestPanel, DemoCourseSeedTrigger, RepoScanTab).
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
