import { supabase } from './client';

export interface PlanCourseSelection {
  id?: string;
  title?: string;
  cost?: number | null;
  provider?: string | null;
}

export async function fetchUserPlanSelections(
  planId: string
): Promise<Map<string, PlanCourseSelection>> {
  const { data, error } = await supabase
    .from('user_plan_courses')
    .select(`
      requirement_id,
      course:marketplace_courses(id, title, cost_usd, provider_id),
      provider:providers!user_plan_courses_provider_id_fkey(name)
    `)
    .eq('plan_id', planId);

  if (error) throw error;

  return new Map(
    (data ?? []).map((d: any) => [d.requirement_id, {
      id: d.course?.id,
      title: d.course?.title,
      cost: d.course?.cost_usd,
      provider: d.provider?.name,
    }])
  );
}
