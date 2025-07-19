import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  slug: string;
  trigger_type: string;
  threshold: number;
}

interface UserStats {
  transcript_count: number;
  saved_courses_count: number;
  goal_count: number;
  published_resume_count: number;
  max_cri_score: number;
  max_readiness_score: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { user_id } = await req.json();

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Checking badges for user: ${user_id}`);

    // Get all available badges
    const { data: badges, error: badgesError } = await supabase
      .from('badges')
      .select('*');

    if (badgesError) {
      console.error('Error fetching badges:', badgesError);
      throw badgesError;
    }

    // Get user's current badges
    const { data: userBadges, error: userBadgesError } = await supabase
      .from('user_badges')
      .select('badge_id')
      .eq('user_id', user_id);

    if (userBadgesError) {
      console.error('Error fetching user badges:', userBadgesError);
      throw userBadgesError;
    }

    const earnedBadgeIds = new Set(userBadges?.map(ub => ub.badge_id) || []);

    // Calculate user stats
    const userStats = await calculateUserStats(supabase, user_id);
    console.log('User stats:', userStats);

    // Check which badges to award
    const badgesToAward: Badge[] = [];

    for (const badge of badges as Badge[]) {
      if (earnedBadgeIds.has(badge.id)) {
        continue; // Already earned
      }

      let shouldAward = false;

      switch (badge.trigger_type) {
        case 'transcript_count':
          shouldAward = userStats.transcript_count >= badge.threshold;
          break;
        case 'saved_courses_count':
          shouldAward = userStats.saved_courses_count >= badge.threshold;
          break;
        case 'goal_count':
          shouldAward = userStats.goal_count >= badge.threshold;
          break;
        case 'published_resume_count':
          shouldAward = userStats.published_resume_count >= badge.threshold;
          break;
        case 'cri_score':
          shouldAward = userStats.max_cri_score >= badge.threshold;
          break;
        case 'readiness_score':
          shouldAward = userStats.max_readiness_score >= badge.threshold;
          break;
        default:
          console.log(`Unknown trigger_type: ${badge.trigger_type}`);
      }

      if (shouldAward) {
        badgesToAward.push(badge);
      }
    }

    console.log(`Awarding ${badgesToAward.length} badges:`, badgesToAward.map(b => b.name));

    // Award new badges
    if (badgesToAward.length > 0) {
      const badgeInserts = badgesToAward.map(badge => ({
        user_id,
        badge_id: badge.id
      }));

      const { error: insertError } = await supabase
        .from('user_badges')
        .insert(badgeInserts);

      if (insertError) {
        console.error('Error inserting badges:', insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        awarded_badges: badgesToAward.length,
        badges: badgesToAward.map(b => ({ name: b.name, emoji: b.emoji }))
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in assign-badges function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function calculateUserStats(supabase: any, userId: string): Promise<UserStats> {
  // Get transcript count
  const { count: transcriptCount } = await supabase
    .from('transcripts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get saved courses count
  const { count: savedCoursesCount } = await supabase
    .from('saved_courses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get career goals count
  const { count: goalCount } = await supabase
    .from('career_goals')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('active', true);

  // Get published resume count
  const { count: publishedResumeCount } = await supabase
    .from('ai_resume_drafts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('published_to_profile', true);

  // Get max CRI score from transcripts
  const { data: maxCriData } = await supabase
    .from('transcripts')
    .select('cri_score')
    .eq('user_id', userId)
    .not('cri_score', 'is', null)
    .order('cri_score', { ascending: false })
    .limit(1);

  // Get max readiness score from AI resume drafts
  const { data: maxReadinessData } = await supabase
    .from('ai_resume_drafts')
    .select('readiness_score')
    .eq('user_id', userId)
    .not('readiness_score', 'is', null)
    .order('readiness_score', { ascending: false })
    .limit(1);

  return {
    transcript_count: transcriptCount || 0,
    saved_courses_count: savedCoursesCount || 0,
    goal_count: goalCount || 0,
    published_resume_count: publishedResumeCount || 0,
    max_cri_score: maxCriData?.[0]?.cri_score || 0,
    max_readiness_score: maxReadinessData?.[0]?.readiness_score || 0
  };
}