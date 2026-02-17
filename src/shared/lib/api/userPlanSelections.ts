import { supabase } from './client';

export interface PlanCourseSelection {
  id: string | null;
  title: string | null;
  cost: number | null;
  provider: string | null;
}

export async function fetchUserPlanSelections(
  planId: string
): Promise<Map<string, PlanCourseSelection>> {
  const { data: planRows, error: planErr } = await supabase
    .from('user_plan_courses')
    .select('requirement_id, course_id, provider_id')
    .eq('plan_id', planId);

  if (planErr) throw planErr;

  const rows = (planRows ?? []).filter(
    (r): r is typeof r & { requirement_id: string } => !!r.requirement_id
  );
  if (!rows.length) return new Map();

  const courseIds = [...new Set(rows.map(r => r.course_id).filter(Boolean))] as string[];
  const providerIds = [...new Set(rows.map(r => r.provider_id).filter(Boolean))] as string[];

  const [courseResult, providerResult] = await Promise.all([
    courseIds.length
      ? supabase.from('marketplace_courses').select('id, title, cost_usd').in('id', courseIds)
      : { data: [] as { id: string; title: string | null; cost_usd: number | null }[], error: null },
    providerIds.length
      ? supabase.from('providers').select('id, name').in('id', providerIds)
      : { data: [] as { id: string; name: string | null }[], error: null },
  ]);

  if (courseResult.error) throw courseResult.error;
  if (providerResult.error) throw providerResult.error;

  const courseById = new Map((courseResult.data ?? []).map(c => [c.id, c]));
  const providerById = new Map((providerResult.data ?? []).map(p => [p.id, p]));

  return new Map(
    rows.map(r => [
      r.requirement_id,
      {
        id: r.course_id ?? null,
        title: r.course_id ? courseById.get(r.course_id)?.title ?? null : null,
        cost: r.course_id ? courseById.get(r.course_id)?.cost_usd ?? null : null,
        provider: r.provider_id ? providerById.get(r.provider_id)?.name ?? null : null,
      },
    ])
  );
}
