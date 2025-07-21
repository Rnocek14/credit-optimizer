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
    const { message, userId, action } = await req.json();
    
    if (!userId) {
      throw new Error('User ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle different action types
    if (action === 'GET_MILESTONE_PLANS') {
      return await getMilestonePlans(supabase, userId);
    }
    
    if (action === 'UPDATE_MILESTONE_STEP') {
      const { planId, stepIndex, completed } = await req.json();
      return await updateMilestoneStep(supabase, planId, stepIndex, completed);
    }

    // Fetch comprehensive user context
    const userContext = await fetchUserContext(supabase, userId);
    
    // Check if this should trigger a milestone plan
    const shouldCreatePlan = detectMilestoneTrigger(message, userContext);
    
    // Generate system prompt based on user data
    const systemPrompt = await generateSystemPrompt(userContext, supabase, userId);
    
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
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Check if the response suggests creating a milestone plan
    let milestonePlan = null;
    if (shouldCreatePlan || aiResponse.includes('milestone plan') || aiResponse.includes('3-step plan')) {
      milestonePlan = await createMilestonePlan(supabase, userId, aiResponse, userContext);
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        userContext: userContext,
        milestonePlan: milestonePlan,
        shouldTriggerCelebration: checkForCelebrationTriggers(userContext)
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

    // Get milestone plans
    const { data: milestonePlans } = await supabase
      .from('milestone_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
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
      recentBadges: badges || [],
      milestonePlans: milestonePlans || []
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
      recentBadges: [],
      milestonePlans: []
    };
  }
}

async function generateSystemPrompt(context: any, supabase: any, userId: string) {
  const { profile, level, goals, savedCount, hasPublishedResume, criScore, readinessScore, recentActions, recentBadges, milestonePlans } = context;
  
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

  const milestoneSummary = milestonePlans.length > 0
    ? `Active milestone plans: ${milestonePlans.filter(p => p.status === 'active').map(p => `"${p.title}" (${p.completion_percentage}% complete)`).join(', ')}.`
    : 'No active milestone plans.';

  return `You are Maya, a warm and encouraging AI mentor for a career development platform called Life Path. You help users progress through their skill development journey with LONG-TERM memory and milestone planning.

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
- ${milestoneSummary}

MEMORY & MILESTONE FEATURES:
- You can remember past conversations and milestone plans
- When users ask "What was my last plan?" reference their active milestone plans
- If they say "Plan my next steps" or "Help me level up", create a specific 3-step milestone plan
- Always be proactive about suggesting milestone plans for major achievements

PERSONALITY & APPROACH:
- Be warm, encouraging, and direct like a trusted mentor
- Use natural conversational tone, not robotic responses
- Reference their specific progress and achievements naturally
- Use strategic emojis: 🎯 for goals, 📚 for learning, 💬 for feedback, 🚀 for achievements
- ${personalityTraits}

GUIDANCE PRIORITIES:
1. Reference their active milestone plans naturally in conversation
2. If they're close to leveling up, acknowledge their progress and motivate them
3. Reference their active goals and suggest concrete next steps
4. If CRI/readiness scores are low, suggest improvement strategies
5. If they have many saved items, suggest prioritization
6. If no published resume, encourage making their profile public
7. Celebrate recent achievements and badges naturally in conversation
8. When appropriate, suggest creating new milestone plans

MILESTONE PLAN FORMAT (when creating plans):
When suggesting a milestone plan, format it as:
**🎯 [Plan Title]**
1. **[Step 1]** - [specific action]
2. **[Step 2]** - [specific action]  
3. **[Step 3]** - [specific action]

Keep responses conversational, specific to their journey, and actionable. Reference their milestone progress naturally. Avoid generic advice - make it personal to their current situation and past plans.`;
}

// Helper functions for milestone planning
function detectMilestoneTrigger(message: string, userContext: any): boolean {
  const triggers = [
    'plan my next steps',
    'help me level up',
    'what should i do next',
    'create a plan',
    'roadmap',
    'milestone'
  ];
  
  const lowerMessage = message.toLowerCase();
  return triggers.some(trigger => lowerMessage.includes(trigger));
}

async function createMilestonePlan(supabase: any, userId: string, aiResponse: string, userContext: any) {
  try {
    // Extract plan from AI response (simplified - could use more sophisticated parsing)
    const lines = aiResponse.split('\n').filter(line => line.trim());
    const titleMatch = aiResponse.match(/🎯\s*([^*\n]+)/);
    const title = titleMatch ? titleMatch[1].trim() : 'Personalized Learning Plan';
    
    // Extract numbered steps
    const stepRegex = /^\d+\.\s*\*\*([^*]+)\*\*\s*-\s*(.+)$/;
    const steps = lines
      .filter(line => stepRegex.test(line.trim()))
      .map(line => {
        const match = line.trim().match(stepRegex);
        return {
          title: match ? match[1].trim() : line,
          description: match ? match[2].trim() : '',
          completed: false,
          completedAt: null
        };
      });

    if (steps.length === 0) {
      return null; // Don't create empty plans
    }

    const { data: plan, error } = await supabase
      .from('milestone_plans')
      .insert({
        user_id: userId,
        title: title,
        description: `Generated plan based on current progress: Level ${userContext.level?.current_level || 1}`,
        steps: steps,
        status: 'active',
        completion_percentage: 0
      })
      .select()
      .single();

    if (error) throw error;
    return plan;
  } catch (error) {
    console.error('Error creating milestone plan:', error);
    return null;
  }
}

async function getMilestonePlans(supabase: any, userId: string) {
  try {
    const { data: plans, error } = await supabase
      .from('milestone_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return new Response(
      JSON.stringify({ plans }),
      { 
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching milestone plans:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      }
    );
  }
}

async function updateMilestoneStep(supabase: any, planId: string, stepIndex: number, completed: boolean) {
  try {
    // Get current plan
    const { data: plan, error: fetchError } = await supabase
      .from('milestone_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (fetchError) throw fetchError;

    // Update the specific step
    const updatedSteps = [...plan.steps];
    updatedSteps[stepIndex] = {
      ...updatedSteps[stepIndex],
      completed: completed,
      completedAt: completed ? new Date().toISOString() : null
    };

    // Calculate completion percentage
    const completedCount = updatedSteps.filter(step => step.completed).length;
    const completionPercentage = Math.round((completedCount / updatedSteps.length) * 100);
    
    // Determine if plan is completed
    const status = completionPercentage === 100 ? 'completed' : 'active';
    const completedAt = completionPercentage === 100 ? new Date().toISOString() : null;

    // Update plan
    const { data: updatedPlan, error: updateError } = await supabase
      .from('milestone_plans')
      .update({
        steps: updatedSteps,
        completion_percentage: completionPercentage,
        status: status,
        completed_at: completedAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId)
      .select()
      .single();

    if (updateError) throw updateError;

    // Award XP for step completion
    if (completed) {
      await supabase.rpc('award_xp', {
        user_id_param: plan.user_id,
        xp_amount_param: 25,
        action_type_param: 'milestone_step_completed',
        reason_param: `Completed step: ${updatedSteps[stepIndex].title}`,
        source_id_param: planId
      });
    }

    // Award bonus XP for plan completion
    if (completionPercentage === 100) {
      await supabase.rpc('award_xp', {
        user_id_param: plan.user_id,
        xp_amount_param: 100,
        action_type_param: 'milestone_plan_completed',
        reason_param: `Completed milestone plan: ${plan.title}`,
        source_id_param: planId
      });
    }

    return new Response(
      JSON.stringify({ 
        plan: updatedPlan,
        celebrated: completionPercentage === 100
      }),
      { 
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error updating milestone step:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      }
    );
  }
}

function checkForCelebrationTriggers(userContext: any): boolean {
  const level = userContext.level?.current_level || 1;
  const recentBadges = userContext.recentBadges?.length || 0;
  const criScore = userContext.criScore || 0;
  
  // Trigger celebrations for major milestones
  return level >= 5 || recentBadges >= 3 || criScore >= 85;
}