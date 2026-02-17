import { supabase } from './client';

export interface RequirementOptionCount {
  options_count: number;
  has_ace_credit: boolean;
  has_clep: boolean;
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
  requirement_id: string;
  option_kind: string;
  course_id: string;
  title: string;
  credits: number;
  cost_usd: number;
  duration_weeks: number;
  modality: string;
  cri_score: number;
  level: number;
  skill_tags: string[];
  provider_id: string;
  provider_name: string;
  provider_type: string;
  transfer_fit: 'excellent' | 'good' | 'fair';
}

export async function fetchRequirementOptions(
  blockId: string,
  filters?: CourseSearchFilters
): Promise<CourseOption[]> {
  let query = supabase
    .from('requirement_options_view_by_block')
    .select('*')
    .eq('block_id', blockId);

  if (filters?.providerTypes?.length && filters.providerTypes.length > 0) {
    query = query.in('provider_type', filters.providerTypes as any);
  }
  if (filters?.maxCost) {
    query = query.lte('cost_usd', filters.maxCost);
  }
  if (filters?.modality?.length && filters.modality.length > 0) {
    query = query.in('modality', filters.modality as any);
  }
  if (filters?.minCriScore) {
    query = query.gte('cri_score', filters.minCriScore);
  }

  const { data, error } = await query.order('transfer_fit', { ascending: false });

  if (error) throw error;
  return data as CourseOption[];
}
