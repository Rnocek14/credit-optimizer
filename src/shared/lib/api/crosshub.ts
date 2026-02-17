/**
 * API module for cross-hub integration.
 * Tables: saved_plan_items, user_achievements, celebration_moments, completion_triggers.
 */
import { supabase } from './client';
import type { Json } from '@/integrations/supabase/types';

// ─── Saved Plan Items ──────────────────────────────────────────────

export async function insertSavedPlanItem(row: {
  user_id: string;
  item_type: string;
  item_id: string;
  title: string;
  description?: string;
  metadata?: Json;
  priority?: string;
  estimated_time_to_complete?: string;
  skill_tags?: string[];
  added_from_hub?: string;
  status?: string;
  cri_boost_score?: number;
  cri_explanation?: string;
}) {
  const { data, error } = await supabase
    .from('saved_plan_items')
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ─── User Achievements ────────────────────────────────────────────

export async function insertUserAchievement(row: {
  user_id: string;
  achievement_type: string;
  milestone_id: string;
  xp_awarded: number;
  created_at: string;
}) {
  const { data, error } = await supabase
    .from('user_achievements')
    .insert(row);

  if (error) throw error;
  return data;
}

export async function fetchUserAchievements(userId: string) {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId);

  if (error) throw error;
  return data;
}

// ─── Celebration Moments (cross-hub inserts) ───────────────────────

export async function insertCelebrationMoment(row: {
  user_id: string;
  celebration_type: string;
  trigger_data: Json;
  celebration_data: Json;
}) {
  const { data, error } = await supabase
    .from('celebration_moments')
    .insert(row);

  if (error) throw error;
  return data;
}

// ─── Completion Triggers ───────────────────────────────────────────

export async function insertCompletionTrigger(row: {
  user_id: string;
  trigger_type: string;
  source_data: Json;
  target_action: string;
}) {
  const { data, error } = await supabase
    .from('completion_triggers')
    .insert(row);

  if (error) throw error;
  return data;
}
