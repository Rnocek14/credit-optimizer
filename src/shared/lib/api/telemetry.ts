/**
 * API module for telemetry / AI model usage logging.
 * Fire-and-forget inserts — errors are caught and logged, never thrown.
 */
import { supabase } from './client';

export async function logAiModelUsage(params: {
  userId: string;
  task: string;
  route: string;
  functionName: string;
  success?: boolean;
  complexity?: string;
}) {
  try {
    await supabase.from('ai_model_usage').insert({
      user_id: params.userId,
      task: params.task,
      route: params.route,
      function_name: params.functionName,
      success: params.success ?? true,
      complexity: params.complexity,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[telemetry] Failed to log AI model usage:', error);
  }
}

/**
 * Fetch CI course summaries with platform + instructor joins.
 */
export async function fetchCiCourseSummaries(courseIds: string[]) {
  const { data, error } = await supabase
    .from('ci_courses')
    .select(`
      id, title, slug, url, difficulty, duration_hours,
      platform:ci_platforms(id, slug, name, website_url),
      instructor:ci_instructors(id, name, reputation)
    `)
    .in('id', courseIds)
    .eq('active', true);

  if (error) throw error;
  return data || [];
}
