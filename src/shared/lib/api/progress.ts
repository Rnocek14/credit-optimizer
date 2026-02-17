/**
 * API module for course progress + learning milestones.
 * RPCs: start_course_progress, complete_course_progress.
 * Tables: course_progress, learning_milestones, recommended_courses.
 */
import { supabase } from './client';

// ─── Course Progress ───────────────────────────────────────────────

export async function fetchCourseProgress(
  userId: string,
  trackId?: string
) {
  let query = supabase
    .from('course_progress')
    .select('*')
    .eq('user_id', userId);

  if (trackId) {
    query = query.eq('track_id', trackId);
  }

  const { data, error } = await query.order('last_accessed_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchRecommendedCoursesByIds(courseIds: string[]) {
  if (!courseIds.length) return [];

  const { data, error } = await supabase
    .from('recommended_courses')
    .select('id, title, platform')
    .in('id', courseIds);

  if (error) throw error;
  return data || [];
}

export async function rpcStartCourseProgress(userId: string, courseId: string) {
  const { data, error } = await supabase.rpc('start_course_progress', {
    user_id_param: userId,
    course_id_param: courseId,
  });
  if (error) throw error;
  return data;
}

export async function updateCourseProgressTrack(
  userId: string,
  courseId: string,
  trackId: string
) {
  const { error } = await supabase
    .from('course_progress')
    .update({ track_id: trackId })
    .eq('user_id', userId)
    .eq('course_id', courseId);

  if (error) throw error;
}

export async function rpcCompleteCourseProgress(
  userId: string,
  courseId: string,
  notes?: string | null
) {
  const { data, error } = await supabase.rpc('complete_course_progress', {
    user_id_param: userId,
    course_id_param: courseId,
    completion_notes_param: notes ?? null,
  });
  if (error) throw error;
  return data;
}

export async function updateCourseProgressRow(
  userId: string,
  courseId: string,
  patch: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('course_progress')
    .update(patch)
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Learning Milestones ───────────────────────────────────────────

export async function fetchLearningMilestones(userId: string) {
  const { data, error } = await supabase
    .from('learning_milestones')
    .select('*')
    .eq('user_id', userId)
    .order('achieved_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
