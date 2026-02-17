/**
 * DAL — user_plan_courses write operations.
 *
 * Canonical write-path for adding/removing courses in EduTree plans.
 * Consumed by useAddCourseToPlan, useMarketplaceActions, etc.
 */
import { supabase } from './client';

export interface PlanCourseSelection {
  id: string | null;
  title: string | null;
  cost: number | null;
  provider: string | null;
}

type PlanStatus = 'planned' | 'enrolled' | 'complete' | 'dropped';

export async function addCourseToUserPlan(row: {
  plan_id: string;
  course_id: string;
  provider_id: string;
  requirement_id?: string | null;
  status?: PlanStatus;
  planned_term?: string | null;
}) {
  const { data, error } = await supabase
    .from('user_plan_courses')
    .insert({
      plan_id: row.plan_id,
      course_id: row.course_id,
      provider_id: row.provider_id,
      requirement_id: row.requirement_id ?? null,
      status: row.status ?? 'planned',
      planned_term: row.planned_term ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function fetchUserPlanSelections(
  planId: string,
): Promise<Map<string, PlanCourseSelection>> {
  const { data: planRows, error: planErr } = await supabase
    .from('user_plan_courses')
    .select('requirement_id, course_id, provider_id')
    .eq('plan_id', planId);

  if (planErr) throw planErr;

  const rows = (planRows ?? []).filter(
    (r): r is typeof r & { requirement_id: string } => !!r.requirement_id,
  );
  if (!rows.length) return new Map();

  const courseIds = [...new Set(rows.map((r) => r.course_id).filter(Boolean))] as string[];
  const providerIds = [...new Set(rows.map((r) => r.provider_id).filter(Boolean))] as string[];

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

  const courseById = new Map((courseResult.data ?? []).map((c) => [c.id, c]));
  const providerById = new Map((providerResult.data ?? []).map((p) => [p.id, p]));

  return new Map(
    rows.map((r) => [
      r.requirement_id,
      {
        id: r.course_id ?? null,
        title: r.course_id ? courseById.get(r.course_id)?.title ?? null : null,
        cost: r.course_id ? courseById.get(r.course_id)?.cost_usd ?? null : null,
        provider: r.provider_id ? providerById.get(r.provider_id)?.name ?? null : null,
      },
    ]),
  );
}
