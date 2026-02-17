/**
 * API module for predictive engagement + real-time learning sessions.
 * RPCs: predict_engagement_decline, generate_autonomous_intervention,
 *       update_maya_feedback_model, dev_user_session_start, dev_user_session_end.
 * Tables: learning_engagement_sessions, motivation_interventions.
 */
import { supabase } from './client';
import type { Json } from '@/integrations/supabase/types';

// ─── Predictive Engagement RPCs ────────────────────────────────────

export async function rpcPredictEngagementDecline(userId: string) {
  const { data, error } = await supabase.rpc('predict_engagement_decline', {
    target_user_id: userId,
  });
  if (error) throw error;
  return data;
}

export async function rpcGenerateAutonomousIntervention(
  userId: string,
  riskAssessment: unknown
) {
  const { data, error } = await supabase.rpc('generate_autonomous_intervention', {
    target_user_id: userId,
    risk_assessment: riskAssessment as any,
  });
  if (error) throw error;
  return data;
}

export async function rpcUpdateMayaFeedbackModel(userId: string) {
  const { data, error } = await supabase.rpc('update_maya_feedback_model', {
    target_user_id: userId,
  });
  if (error) throw error;
  return data;
}

// ─── Learning Sessions ─────────────────────────────────────────────

export async function fetchLearningSessions(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('learning_engagement_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function fetchLearningSessionById(sessionId: string) {
  const { data, error } = await supabase
    .from('learning_engagement_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error) throw error;
  return data;
}

export async function insertLearningSession(row: {
  user_id: string;
  course_id?: string;
  session_type: string;
  started_at: string;
  duration_minutes: number;
  activity_data: Json;
  engagement_score: number;
  completion_percentage: number;
  focus_events: Json;
  learning_velocity: number;
  retention_indicators: Json;
}) {
  const { data, error } = await supabase
    .from('learning_engagement_sessions')
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateLearningSession(
  sessionId: string,
  patch: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('learning_engagement_sessions')
    .update(patch)
    .eq('id', sessionId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Dev User Session RPCs ─────────────────────────────────────────

export async function rpcDevUserSessionStart(
  devUserId: string,
  courseId: string,
  sessionType: string
) {
  const { data, error } = await supabase.rpc('dev_user_session_start', {
    dev_user_id: devUserId,
    course_id_param: courseId,
    session_type_param: sessionType,
  });
  if (error) throw error;
  return data;
}

export async function rpcDevUserSessionEnd(
  devUserId: string,
  sessionId: string,
  sessionMetrics: Json
) {
  const { data, error } = await supabase.rpc('dev_user_session_end', {
    dev_user_id: devUserId,
    session_id_param: sessionId,
    session_metrics: sessionMetrics,
  });
  if (error) throw error;
  return data;
}

// ─── Motivation Interventions ──────────────────────────────────────

export async function fetchMotivationInterventions(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from('motivation_interventions')
    .select('*')
    .eq('user_id', userId)
    .order('suggested_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function insertMotivationIntervention(row: {
  user_id: string;
  intervention_type: string;
  trigger_conditions: Json;
  intervention_data: Json;
  confidence_score: number;
}) {
  const { data, error } = await supabase
    .from('motivation_interventions')
    .insert(row);

  if (error) throw error;
  return data;
}
