import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId } = await req.json();
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch comprehensive user context
    const userContext = await fetchUserContext(supabase, userId);
    
    // Generate system prompt based on user data
    const systemPrompt = generateSystemPrompt(userContext);
    
    // Call OpenAI GPT-4o
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        userContext: userContext 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in AI mentor chat:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function fetchUserContext(supabase: any, userId: string) {
  try {
    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get user XP and level
    const { data: userLevel } = await supabase
      .rpc('get_user_level', { user_id_param: userId });

    // Get active career goals
    const { data: goals } = await supabase
      .from('career_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true);

    // Get saved courses count
    const { data: savedCourses, count: savedCount } = await supabase
      .from('saved_courses')
      .select('*', { count: 'exact' })
      .eq('user_id', userId);

    // Get published resume status
    const { data: publishedResume } = await supabase
      .from('ai_resume_drafts')
      .select('*')
      .eq('user_id', userId)
      .eq('published_to_profile', true)
      .order('created_at', { ascending: false })
      .limit(1);

    // Get recent XP events for activity
    const { data: recentActions } = await supabase
      .from('xp_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get user badges
    const { data: badges } = await supabase
      .from('user_badges')
      .select(`
        *,
        badges (name, emoji, slug)
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })
      .limit(3);

    return {
      profile: profile || {},
      level: userLevel?.[0] || { current_level: 1, total_xp: 0, xp_for_next_level: 100 },
      goals: goals || [],
      savedCount: savedCount || 0,
      hasPublishedResume: publishedResume?.length > 0,
      criScore: publishedResume?.[0]?.cri_average || 0,
      readinessScore: publishedResume?.[0]?.readiness_score || 0,
      recentActions: recentActions || [],
      recentBadges: badges || []
    };
  } catch (error) {
    console.error('Error fetching user context:', error);
    return {
      profile: {},
      level: { current_level: 1, total_xp: 0, xp_for_next_level: 100 },
      goals: [],
      savedCount: 0,
      hasPublishedResume: false,
      criScore: 0,
      readinessScore: 0,
      recentActions: [],
      recentBadges: []
    };
  }
}

function generateSystemPrompt(context: any) {
  const { profile, level, goals, savedCount, hasPublishedResume, criScore, readinessScore, recentActions, recentBadges } = context;
  
  const userName = profile.name || 'there';
  const currentLevel = level.current_level || 1;
  const totalXP = level.total_xp || 0;
  const nextLevelXP = level.xp_for_next_level || 100;
  const skills = profile.skills || [];
  const currentGoal = goals[0]?.title || 'exploring your options';
  const targetRole = goals[0]?.target_role || profile.role_title || 'your dream role';

  let personalityTraits = '';
  if (criScore >= 85) {
    personalityTraits = 'You should celebrate their high CRI score and suggest badge achievements or advanced challenges.';
  } else if (criScore < 70 && criScore > 0) {
    personalityTraits = 'You should gently suggest ways to improve their CRI score through verified projects and mentor feedback.';
  }

  if (currentLevel >= 10) {
    personalityTraits += ' They\'re an experienced learner - treat them as such with more advanced suggestions.';
  } else if (currentLevel <= 3) {
    personalityTraits += ' They\'re still getting started - be encouraging and provide clear next steps.';
  }

  const recentActivitySummary = recentActions.length > 0 
    ? `Recent activity includes: ${recentActions.slice(0, 3).map(a => a.reason).join(', ')}.` 
    : 'No recent activity recorded.';

  const badgesSummary = recentBadges.length > 0
    ? `Recently earned badges: ${recentBadges.map(b => b.badges.name).join(', ')}.`
    : 'No badges earned yet.';

  return `You are Maya, a warm and encouraging AI mentor for a career development platform called Life Path. You help users progress through their skill development journey.

CURRENT USER CONTEXT:
- Name: ${userName}
- Level: ${currentLevel} (${totalXP}/${nextLevelXP} XP)
- Current Goal: ${currentGoal}
- Target Role: ${targetRole}  
- Skills: ${skills.join(', ') || 'None listed yet'}
- CRI Score: ${criScore > 0 ? Math.round(criScore) : 'Not assessed yet'}
- Readiness Score: ${readinessScore > 0 ? Math.round(readinessScore) : 'Not assessed yet'}
- Saved Items: ${savedCount} courses/mentors saved
- Published Resume: ${hasPublishedResume ? 'Yes' : 'No'}
- ${recentActivitySummary}
- ${badgesSummary}

PERSONALITY & APPROACH:
- Be warm, encouraging, and direct like a trusted mentor
- Use natural conversational tone, not robotic responses
- Reference their specific progress and achievements naturally
- Use strategic emojis: 🎯 for goals, 📚 for learning, 💬 for feedback, 🚀 for achievements
- ${personalityTraits}

GUIDANCE PRIORITIES:
1. If they're close to leveling up, acknowledge their progress and motivate them
2. Reference their active goals and suggest concrete next steps
3. If CRI/readiness scores are low, suggest improvement strategies
4. If they have many saved items, suggest prioritization
5. If no published resume, encourage making their profile public
6. Celebrate recent achievements and badges naturally in conversation

Keep responses conversational, specific to their journey, and actionable. Avoid generic advice - make it personal to their current situation.`;
}