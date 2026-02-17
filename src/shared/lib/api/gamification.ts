/**
 * API module for gamification: streaks, celebrations, and metrics.
 * Tables: learning_streaks, celebration_moments, gamification_metrics.
 * RPCs: update_learning_streak, create_celebration_moment.
 */
import { supabase } from './client';
import type { Json } from '@/integrations/supabase/types';

// ─── Learning Streaks ──────────────────────────────────────────────

export async function fetchLearningStreaks(userId: string) {
  const { data, error } = await supabase
    .from('learning_streaks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// ─── Celebration Moments ───────────────────────────────────────────

export async function fetchCelebrationMoments(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('celebration_moments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

export async function updateCelebrationMoment(
  celebrationId: string,
  userId: string,
  patch: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from('celebration_moments')
    .update(patch)
    .eq('id', celebrationId)
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

// ─── Gamification Metrics ──────────────────────────────────────────

export async function fetchGamificationMetrics(
  userId: string,
  startDate: string,
  endDate: string
) {
  const { data, error } = await supabase
    .from('gamification_metrics')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate)
    .lte('created_at', endDate);

  if (error) throw error;
  return data;
}

// ─── RPCs ──────────────────────────────────────────────────────────

export async function rpcUpdateLearningStreak(userId: string) {
  const { data, error } = await supabase.rpc('update_learning_streak', {
    user_id_param: userId,
  });
  if (error) throw error;
  return data;
}

export async function rpcCreateCelebrationMoment(
  userId: string,
  celebrationType: string,
  triggerData: Json,
  celebrationData: Json
) {
  const { data, error } = await supabase.rpc('create_celebration_moment', {
    user_id_param: userId,
    celebration_type_param: celebrationType,
    trigger_data_param: triggerData,
    celebration_data_param: celebrationData,
  });
  if (error) throw error;
  return data;
}
