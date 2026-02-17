/**
 * DAL — user_plans read/write operations.
 *
 * Canonical data access for plan management.
 * Consumed by PlanSelector, useActivePlan, etc.
 */
import { supabase } from './client';

export interface UserPlanRow {
  id: string;
  name: string;
  program_id: string;
  is_active: boolean;
  created_at: string;
}

/** Fetch all plans for a user, newest first. */
export async function fetchUserPlans(userId: string): Promise<UserPlanRow[]> {
  const { data, error } = await supabase
    .from('user_plans')
    .select('id, name, program_id, is_active, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/** Create a new plan for a user. Returns { id, name }. */
export async function createUserPlan(
  userId: string,
  name: string,
  programId = 'default',
): Promise<{ id: string; name: string }> {
  const { data, error } = await supabase
    .from('user_plans')
    .insert({
      user_id: userId,
      program_id: programId,
      name,
      is_active: true,
    })
    .select('id')
    .single();

  if (error) throw error;
  return { id: data.id, name };
}

/** Fetch plan courses for a plan, including provider name via join. */
export async function fetchPlanCoursesWithProvider(planId: string) {
  const { data, error } = await supabase
    .from('user_plan_courses')
    .select(`
      id,
      plan_id,
      course_id,
      provider_id,
      requirement_id,
      planned_term,
      status,
      notes,
      credits_earned,
      cost_paid,
      grade,
      transfer_source,
      providers!user_plan_courses_provider_id_fkey ( id, name )
    `)
    .eq('plan_id', planId);

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id as string,
    plan_id: row.plan_id as string,
    course_id: row.course_id as string,
    provider_id: row.provider_id as string,
    provider_code: (row.providers as any)?.name ?? null as string | null,
    requirement_id: row.requirement_id as string | null,
    planned_term: row.planned_term as string | null,
    status: row.status as string | null,
    notes: row.notes as string | null,
    credits_earned: row.credits_earned as number | null,
    cost_paid: row.cost_paid as number | null,
    grade: row.grade as string | null,
    transfer_source: row.transfer_source as string | null,
  }));
}

export type PlanCourseWithProvider = Awaited<ReturnType<typeof fetchPlanCoursesWithProvider>>[number];
