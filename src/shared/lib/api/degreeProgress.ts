/**
 * DAL — degree progress data for a user plan.
 *
 * Computes credits earned/required and course completion counts
 * from user_plan_courses + program_requirements.
 */
import { supabase } from './client';

export interface DegreeProgress {
  creditsEarned: number;
  creditsRequired: number | null;
  coursesComplete: number;
  coursesTotal: number;
  percent: number | null;
}

/**
 * Fetch degree progress for a plan.
 *
 * Credits earned = sum of credits_earned on complete courses.
 * Credits required = sum of credits_required across program_requirements for the plan's program.
 * Courses total = non-dropped plan courses.
 * Courses complete = status === 'complete'.
 */
export async function fetchDegreeProgress(
  planId: string,
  programId: string,
): Promise<DegreeProgress> {
  // Parallel: plan courses + program requirements
  const [coursesResult, reqResult] = await Promise.all([
    supabase
      .from('user_plan_courses')
      .select('status, credits_earned')
      .eq('plan_id', planId),
    supabase
      .from('program_requirements')
      .select('credits_required')
      .eq('program_id', programId),
  ]);

  if (coursesResult.error) throw coursesResult.error;
  if (reqResult.error) throw reqResult.error;

  const courses = (coursesResult.data ?? []).filter((c) => c.status !== 'dropped');
  const completeCourses = courses.filter((c) => c.status === 'complete');

  const creditsEarned = completeCourses.reduce(
    (sum, c) => sum + (c.credits_earned ?? 0),
    0,
  );

  const reqRows = reqResult.data ?? [];
  const creditsRequired =
    reqRows.length > 0
      ? reqRows.reduce((sum, r) => sum + (r.credits_required ?? 0), 0)
      : null;

  const coursesComplete = completeCourses.length;
  const coursesTotal = courses.length;

  // Prefer credit-based percent; fall back to course-based
  let percent: number | null = null;
  if (creditsRequired && creditsRequired > 0) {
    percent = Math.min(100, Math.round((creditsEarned / creditsRequired) * 100));
  } else if (coursesTotal > 0) {
    percent = Math.round((coursesComplete / coursesTotal) * 100);
  }

  return { creditsEarned, creditsRequired, coursesComplete, coursesTotal, percent };
}
