import { supabase } from './client';

export interface RequirementOptionCount {
  options_count: number | null;
  has_ace_credit: boolean | null;
  has_clep: boolean | null;
}

export async function fetchRequirementOptionSummary(
  requirementId: string
): Promise<RequirementOptionCount | null> {
  const { data, error } = await supabase
    .from('requirement_option_counts')
    .select('*')
    .eq('requirement_id', requirementId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export interface CourseSearchFilters {
  providerTypes?: string[];
  maxCost?: number;
  modality?: string[];
  minCriScore?: number;
}

export interface CourseOption {
  requirement_id: string | null;
  option_kind: string | null;
  course_id: string | null;
  title: string | null;
  credits: number | null;
  cost_usd: number | null;
  duration_weeks: number | null;
  modality: string | null;
  cri_score: number | null;
  level: number | null;
  skill_tags: string[] | null;
  provider_id: string | null;
  provider_name: string | null;
  provider_type: string | null;
  transfer_fit: string | null;
  block_id: string | null;
}

export async function fetchRequirementOptions(
  blockId: string,
  filters?: CourseSearchFilters
): Promise<CourseOption[]> {
  let query = supabase
    .from('requirement_options_view_by_block')
    .select('*')
    .eq('block_id', blockId);

  if (filters?.providerTypes?.length) {
    query = query.in('provider_type', filters.providerTypes as readonly string[] as readonly ('university' | 'mooc' | 'bootcamp' | 'testing_center')[]);
  }
  if (filters?.maxCost) {
    query = query.lte('cost_usd', filters.maxCost);
  }
  if (filters?.modality?.length) {
    query = query.in('modality', filters.modality as readonly string[] as readonly ('online' | 'in_person' | 'hybrid')[]);
  }
  if (filters?.minCriScore) {
    query = query.gte('cri_score', filters.minCriScore);
  }

  const { data, error } = await query.order('transfer_fit', { ascending: false });

  if (error) throw error;
  return data ?? [];
}
