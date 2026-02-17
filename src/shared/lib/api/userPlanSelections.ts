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

  type Row = NonNullable<typeof data>[number];

  return new Map(
    (data ?? []).map((d: Row) => [d.requirement_id, {
      id: (d.course as any)?.id,
      title: (d.course as any)?.title,
      cost: (d.course as any)?.cost_usd,
      provider: (d.provider as any)?.name,
    }])
  );
}
