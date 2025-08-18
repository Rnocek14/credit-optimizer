import { supabase } from '@/integrations/supabase/client';

export async function seedTodayDemoData() {
  // Helper to shift dates
  const isoDaysAgo = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  };

  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user) {
    throw new Error('Please sign in first to seed demo data.');
  }
  const userId = user.id;

  // 1) Ensure a daily learning streak exists
  const { data: existingStreak } = await supabase
    .from('learning_streaks')
    .select('*')
    .eq('user_id', userId)
    .eq('streak_type', 'daily')
    .maybeSingle();

  if (!existingStreak) {
    await supabase.from('learning_streaks').insert({
      user_id: userId,
      streak_type: 'daily',
      current_streak: 5,
      longest_streak: 9,
      last_activity_date: isoDaysAgo(1),
      streak_start_date: isoDaysAgo(5),
      bonus_multiplier: 1.1,
    });
  }

  // 2) Add a couple of recent celebration moments
  await supabase.from('celebration_moments').insert([
    {
      user_id: userId,
      celebration_type: 'streak_milestone',
      trigger_data: { milestone: 5 },
      celebration_data: { message: '5-day streak! Keep the momentum 🔥' },
    },
    {
      user_id: userId,
      celebration_type: 'quick_win',
      trigger_data: { skill: 'TypeScript' },
      celebration_data: { message: 'Completed a 30-min Typescript practice' },
    },
  ]);

  // 3) Seed basic gamification metrics for last few days
  const metricsPayload = [] as any[];
  for (let i = 5; i >= 1; i--) {
    metricsPayload.push(
      { user_id: userId, metric_type: 'daily_xp', metric_value: 20 + i, created_at: isoDaysAgo(i) },
      { user_id: userId, metric_type: 'streak_bonus', metric_value: 2 + i, created_at: isoDaysAgo(i) },
      { user_id: userId, metric_type: 'maya_collaboration', metric_value: 60 + i, created_at: isoDaysAgo(i) },
    );
  }
  await supabase.from('gamification_metrics').insert(metricsPayload);

  return { ok: true };
}
