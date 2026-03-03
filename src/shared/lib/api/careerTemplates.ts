/**
 * DAL: Career → Degree Template bridge
 * Resolves career_path_programs mappings into filtered degree_templates.
 */
import { supabase } from './client';

export interface CareerProgramMatch {
  program_id: string;
  anchor_school: string;
  strength: number;
  path_type: string;
}

/**
 * Fetch program matches for a career path from the join table.
 */
export async function fetchCareerProgramMatches(
  careerPathId: string
): Promise<CareerProgramMatch[]> {
  const { data, error } = await supabase
    .from('career_path_programs' as any)
    .select('program_id, anchor_school, strength, path_type')
    .eq('career_path_id', careerPathId)
    .or('valid_until.is.null,valid_until.gt.now()')
    .order('strength', { ascending: false });

  if (error) {
    // Gracefully handle missing table
    if ((error as any)?.code === '42P01') {
      console.warn('[careerTemplates] career_path_programs table missing');
      return [];
    }
    throw error;
  }
  return (data ?? []) as unknown as CareerProgramMatch[];
}

/**
 * Fetch degree_templates filtered + ranked by career relevance.
 * Returns templates sorted by strength (best-fit first) and a strength map for UI badges.
 */
export async function fetchDegreeTemplatesForCareer(careerPathId: string) {
  const matches = await fetchCareerProgramMatches(careerPathId);

  if (matches.length === 0) {
    return { matches: [], programCodes: [], institutionCodes: [] };
  }

  const programCodes = [...new Set(matches.map(m => m.program_id))];
  const institutionCodes = [...new Set(matches.map(m => m.anchor_school))];

  // Build a strength lookup keyed by "INSTITUTION::PROGRAM"
  const strengthMap = new Map<string, number>();
  for (const m of matches) {
    const key = `${m.anchor_school}::${m.program_id}`;
    strengthMap.set(key, m.strength ?? 0);
  }

  return { matches, programCodes, institutionCodes, strengthMap };
}
