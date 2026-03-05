/**
 * Career target DAL — fetches career options and updates user plan target.
 */
import { supabase } from '@/integrations/supabase/client';

export interface CareerOption {
  id: string;
  title: string;
}

/** Fetch all career paths for the picker (id + title, sorted). */
export async function fetchCareerOptions(): Promise<CareerOption[]> {
  const { data, error } = await supabase
    .from('career_paths')
    .select('id, title')
    .order('title');
  if (error) throw error;
  return data ?? [];
}

/** Update target_career_id on a user plan. Pass null to clear. */
export async function updatePlanTargetCareer(
  planId: string,
  careerId: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('user_plans')
    .update({ target_career_id: careerId })
    .eq('id', planId);
  if (error) throw error;
}
