/**
 * API module for TeachAnalytics (Mentor) page.
 */
import { supabase } from './client';

export interface MentorMetrics {
  courses_reviewed: number;
  courses_approved: number;
  courses_rejected: number;
  approval_rate: number;
  avg_review_time_hours: number;
  impact_score: number;
  quality_score: number;
}

export async function fetchMentorMetrics(
  userId: string,
  startDate: string,
  endDate: string
): Promise<MentorMetrics | null> {
  const { data, error } = await supabase.rpc('calculate_mentor_performance_metrics', {
    mentor_user_id: userId,
    start_date: startDate,
    end_date: endDate,
  });

  if (error) throw error;
  return data?.[0] || null;
}

export async function fetchMentorAchievements(userId: string) {
  const { data, error } = await supabase
    .from('mentor_achievements')
    .select('*')
    .eq('mentor_id', userId)
    .order('earned_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchMentorLeaderboard(periodType: string) {
  const { data, error } = await supabase
    .from('mentor_leaderboard')
    .select('*')
    .eq('period_type', periodType)
    .order('rank_position')
    .limit(10);

  if (error) throw error;
  return data || [];
}

export async function fetchMentorFeedback(userId: string, since: string) {
  const { data, error } = await supabase
    .from('mentor_course_feedback')
    .select('*')
    .eq('mentor_id', userId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;
  return data || [];
}

export async function checkMentorAchievements(userId: string) {
  const { error } = await supabase.rpc('check_mentor_achievements', {
    mentor_user_id: userId,
  });

  if (error) throw error;
}

export async function submitMentorFeedback(feedbackData: {
  course_id: string;
  student_id: string;
  mentor_id: string;
  rating: number;
  feedback_text?: string;
  course_quality_rating?: number;
  learning_outcome_rating?: number;
  would_recommend?: boolean;
  completed_course?: boolean;
}) {
  const { data, error } = await supabase
    .from('mentor_course_feedback')
    .insert([feedbackData])
    .select()
    .single();

  if (error) throw error;
  return data;
}
