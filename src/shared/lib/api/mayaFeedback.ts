/**
 * API module for Maya feedback correlations.
 * Table: maya_feedback_correlations.
 * RPC: dev_user_submit_maya_feedback.
 */
import { supabase } from './client';
import type { Json } from '@/integrations/supabase/types';

// ─── Fetch ─────────────────────────────────────────────────────────

export async function fetchMayaFeedbackCorrelations(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('maya_feedback_correlations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function fetchMayaFeedbackCorrelationById(id: string) {
  const { data, error } = await supabase
    .from('maya_feedback_correlations')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// ─── Insert ────────────────────────────────────────────────────────

export async function insertMayaFeedbackCorrelation(row: {
  user_id: string;
  feedback_type: string;
  feedback_data: Json;
  user_action: string;
  outcome_metrics: Json;
  correlation_score: number;
  feedback_effectiveness: number;
  time_to_action_hours: number | null;
  long_term_impact: Json;
}) {
  const { data, error } = await supabase
    .from('maya_feedback_correlations')
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Update ────────────────────────────────────────────────────────

export async function updateMayaFeedbackCorrelation(
  correlationId: string,
  patch: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('maya_feedback_correlations')
    .update(patch)
    .eq('id', correlationId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── Dev User RPC ──────────────────────────────────────────────────

export async function rpcDevUserSubmitMayaFeedback(
  devUserId: string,
  feedbackType: string,
  feedbackData: Json,
  userRating: number | null
) {
  const { data, error } = await supabase.rpc('dev_user_submit_maya_feedback', {
    dev_user_id: devUserId,
    feedback_type_param: feedbackType,
    feedback_data_param: feedbackData,
    user_rating_param: userRating,
  });
  if (error) throw error;
  return data;
}
