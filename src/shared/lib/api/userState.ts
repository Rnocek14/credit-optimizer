/**
 * API module for user-state reads/writes:
 * experience level, preferences, trust metrics.
 */
import { supabase } from './client';

// ─── User Preferences / Experience Level ───────────────────────────

export async function fetchUserPreferences(userId: string) {
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

/**
 * Detect experience level from activity counts.
 * Returns raw counts — the scoring logic stays in the hook.
 */
export async function fetchUserActivityCounts(userId: string) {
  const [skillProgress, courseHistory, goalCount] = await Promise.all([
    supabase.from('user_skill_progress').select('*').eq('user_id', userId),
    supabase.from('course_progress').select('*').eq('user_id', userId),
    supabase.from('user_goals').select('*').eq('user_id', userId),
  ]);

  return {
    skills: skillProgress.data || [],
    courses: courseHistory.data || [],
    goals: goalCount.data || [],
  };
}

export async function upsertUserPreferences(
  userId: string,
  patch: Record<string, unknown>
) {
  const { error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: userId,
      ...patch,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
}

// ─── Trust Metrics ─────────────────────────────────────────────────

export async function upsertTrustMetrics(userId: string, daysBack = 90) {
  const { error } = await supabase.rpc('upsert_user_trust_metrics', {
    user_id_param: userId,
    days_back: daysBack,
  });
  if (error) throw error;
}

export async function fetchTrustMetrics(userId: string) {
  const { data, error } = await supabase
    .from('user_trust_metrics')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
