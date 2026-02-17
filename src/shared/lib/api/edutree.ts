/**
 * API module for EduTree data (courses, blocks, members, gates, edges).
 * Consumed by useEduTreeData and useCareerV5Data hooks.
 *
 * TODO(types): replace `as X` casts after `supabase gen types` refresh
 * so return types are inferred directly from Database['public']['Tables'].
 */
import { supabase } from './client';
import type {
  EduCourse,
  RequirementBlock,
  BlockMember,
  BlockGate,
  GateEdge,
} from '@/lib/types/eduTree';

// ── Queries ─────────────────────────────────────────────────────

export async function fetchEduCourses(): Promise<EduCourse[]> {
  const { data, error } = await supabase
    .from('edu_courses')
    .select('*')
    .order('code', { ascending: true });

  if (error) throw error;
  return (data as EduCourse[]) ?? [];
}

/**
 * Fetch requirement blocks. By default ordered by level_year + title.
 * Pass `{ ordered: false }` for unordered results (e.g. career V5).
 */
export async function fetchRequirementBlocks(opts?: {
  ordered?: boolean;
}): Promise<RequirementBlock[]> {
  let q = supabase.from('requirement_blocks').select('*');
  if (opts?.ordered !== false) {
    q = q.order('level_year', { ascending: true }).order('title', { ascending: true });
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data as RequirementBlock[]) ?? [];
}

export async function fetchBlockMembers(): Promise<BlockMember[]> {
  const { data, error } = await supabase
    .from('block_members')
    .select('*');

  if (error) throw error;
  return (data as BlockMember[]) ?? [];
}

export async function fetchBlockGates(): Promise<BlockGate[]> {
  const { data, error } = await supabase
    .from('block_gates')
    .select('*');

  if (error) throw error;
  return (data as BlockGate[]) ?? [];
}

export async function fetchGateEdges(): Promise<GateEdge[]> {
  const { data, error } = await supabase
    .from('prereq_to_block')
    .select('*');

  if (error) throw error;
  return (data as GateEdge[]) ?? [];
}

// ── Career V5 queries ───────────────────────────────────────────

export async function fetchProgramRequirements(programId: string) {
  const { data, error } = await supabase
    .from('program_requirements')
    .select('*')
    .eq('program_id', programId);

  if (error) throw error;
  return data ?? [];
}

export async function fetchRequirementOptionsWithCourses() {
  const { data, error } = await supabase
    .from('requirement_options')
    .select(`
      *,
      educational_courses (*)
    `);

  if (error) throw error;
  return data ?? [];
}
