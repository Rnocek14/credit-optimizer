import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Credentials': 'true',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('AI mentor chat function called');
    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    const { message, userId, action, context } = requestBody;
    
    const finalUserId = userId || 'demo-user';
    
    if (!finalUserId || (finalUserId !== 'demo-user' && finalUserId.length < 10)) {
      console.error('Invalid user ID format:', finalUserId);
      throw new Error('Invalid user ID format');
    }
    
    console.log('Processing request for user:', finalUserId);

    // Validate OpenAI API key early
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OpenAI API key not found in environment');
      throw new Error('OpenAI API key not configured');
    }
    console.log('OpenAI API key found:', openAIApiKey ? 'Yes' : 'No');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Handle different action types
    if (action === 'GET_MILESTONE_PLANS') {
      return await getMilestonePlans(supabase, finalUserId);
    }
    
    if (action === 'UPDATE_MILESTONE_STEP') {
      const { planId, stepIndex, completed } = await req.json();
      return await updateMilestoneStep(supabase, planId, stepIndex, completed);
    }

    if (action === 'MARKET_INTELLIGENCE_CHAT') {
      console.log('Handling market intelligence chat for user:', finalUserId);
      return await handleMarketIntelligenceChat(supabase, message, context, finalUserId);
    }

    // Fetch comprehensive user context
    const userContext = await fetchUserContext(supabase, finalUserId);
    
    // Check if this should trigger a milestone plan
    const shouldCreatePlan = detectMilestoneTrigger(message, userContext);
    
    // Phase 5: Maya Intelligence - Detect autonomous workflow needs
    const workflowRequest = await detectAutonomousWorkflowRequest(message, userContext);
    
    // Phase 4: Universal Intelligence - Detect if this requires cross-system intelligence
    const requiresUniversalIntelligence = detectUniversalIntelligenceNeed(message, userContext);
    
    // Generate appropriate system prompt based on intelligence level needed
    const systemPrompt = requiresUniversalIntelligence 
      ? await generateUniversalSystemPrompt(userContext, supabase, finalUserId)
      : await generateSystemPrompt(userContext, supabase, finalUserId);
    
    // Call OpenAI GPT-4o (already validated above)
    console.log('Calling OpenAI with model: gpt-4o');
    
    const openAIPayload = {
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      temperature: 0.7,
      max_tokens: 1000,
    };
    
    console.log('OpenAI request payload:', JSON.stringify(openAIPayload, null, 2));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openAIPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI response:', JSON.stringify(data, null, 2));
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response structure:', data);
      throw new Error('Invalid response from OpenAI');
    }
    
    const aiResponse = data.choices[0].message.content;

    // Phase 5: Autonomous Workflow Creation
    let autonomousWorkflow = null;
    let milestonePlan = null;
    
    if (finalUserId !== 'demo-user' && workflowRequest.shouldCreate && workflowRequest.template) {
      console.log('🤖 Creating autonomous workflow:', workflowRequest.template);
      autonomousWorkflow = await createAutonomousWorkflow(
        supabase, 
        finalUserId, 
        workflowRequest.template,
        workflowRequest.customization,
        aiResponse
      );
    }

    // Check if the response suggests creating a milestone plan (skip for demo users)
    if (finalUserId !== 'demo-user' && (shouldCreatePlan || aiResponse.includes('milestone plan') || aiResponse.includes('3-step plan'))) {
      milestonePlan = await createMilestonePlan(supabase, finalUserId, aiResponse, userContext);
    }

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        userContext: userContext,
        milestonePlan: milestonePlan,
        autonomousWorkflow: autonomousWorkflow,
        shouldTriggerCelebration: checkForCelebrationTriggers(userContext)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error('Error in AI mentor chat:', error);
    const errorMessage = error.message || 'An unexpected error occurred';
    console.error('Full error details:', error);
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        timestamp: new Date().toISOString(),
        details: error.stack ? error.stack.split('\n').slice(0, 3) : undefined
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Phase 4: Universal Intelligence - Enhanced User Context Fetching
async function fetchUserContext(supabase: any, userId: string) {
  try {
    // Handle demo user with enhanced demo context
    if (userId === 'demo-user') {
      return {
        profile: { 
          name: 'Demo User', 
          role_title: 'Career Explorer',
          skills: ['JavaScript', 'React', 'Node.js'],
          email: 'demo@example.com'
        },
        level: { current_level: 3, total_xp: 450, xp_for_next_level: 500 },
        goals: [
          { 
            title: 'Transition to Senior Developer', 
            target_role: 'Senior Software Engineer',
            active: true,
            target_date: '2024-12-31'
          }
        ],
        savedCount: 8,
        hasPublishedResume: true,
        criScore: 78,
        readinessScore: 82,
        recentActions: [
          { reason: 'Completed React course', action_type: 'course_completed' },
          { reason: 'Updated resume', action_type: 'resume_updated' }
        ],
        recentBadges: [
          { badges: { name: 'Course Completer', emoji: '📚' } }
        ],
        milestonePlans: [
          { 
            title: 'Frontend Mastery Plan', 
            status: 'active', 
            completion_percentage: 65,
            steps: [
              { title: 'Learn React Hooks', completed: true },
              { title: 'Build Portfolio Project', completed: false }
            ]
          }
        ],
        skillProgress: 75,
        careerReadiness: { overallScore: 82, skillAlignment: 85, marketReadiness: 78 },
        marketPreferences: { preferredLocations: ['California', 'Remote'], targetSalary: 120000 }
      };
    }

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

    // Phase 4: Universal Intelligence - Cross-system data integration
    const contextEnhancements = await fetchCrossSystemData(supabase, userId);

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
      milestonePlans: milestonePlans || [],
      // Phase 4: Enhanced context
      ...contextEnhancements
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
  
  // Phase 5: Fetch real-time market data for enhanced responses
  const marketData = await fetchRealTimeMarketData(supabase, context);
  const skillGapAnalysis = await performSkillGapAnalysis(supabase, userId, context);
  const personalizedInsights = await getPersonalizedInsights(supabase, userId, context);
  
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
    ? `Recent activity includes: ${recentActions.slice(0, 3).map((a: any) => a.reason).join(', ')}.` 
    : 'No recent activity recorded.';

  const badgesSummary = recentBadges.length > 0
    ? `Recently earned badges: ${recentBadges.map((b: any) => b.badges.name).join(', ')}.`
    : 'No badges earned yet.';

  const milestoneSummary = milestonePlans.length > 0
    ? `Active milestone plans: ${milestonePlans.filter((p: any) => p.status === 'active').map((p: any) => `"${p.title}" (${p.completion_percentage}% complete)`).join(', ')}.`
    : 'No active milestone plans.';

  // Phase 5: Enhanced market intelligence summary
  const marketSummary = marketData ? `
REAL-TIME MARKET DATA:
- Current demand for ${goals[0]?.target_role || 'your target role'}: ${marketData.demandScore || 'Unknown'}/10
- Average salary range: ${marketData.salaryRange || 'Data unavailable'}
- Job market trend: ${marketData.trendDirection || 'Stable'}
- Competition level: ${marketData.competitionLevel || 'Medium'}
- Top required skills: ${marketData.topSkills?.join(', ') || 'Data unavailable'}
` : '';

  const skillGapSummary = skillGapAnalysis ? `
SKILL GAP ANALYSIS:
- Skill alignment score: ${skillGapAnalysis.alignmentScore || 0}%
- Missing critical skills: ${skillGapAnalysis.criticalGaps?.join(', ') || 'None identified'}
- Recommended development areas: ${skillGapAnalysis.recommendations?.slice(0, 3).join(', ') || 'None'}
` : '';

  const insightsSummary = personalizedInsights ? `
PERSONALIZED INSIGHTS:
- Career readiness score: ${personalizedInsights.readinessScore || 0}%
- Recommended next actions: ${personalizedInsights.nextActions?.slice(0, 2).join(', ') || 'Continue current progress'}
- Market timing advice: ${personalizedInsights.timingAdvice || 'Good time to continue development'}
` : '';

  return `You are Maya, a warm and encouraging AI mentor for a career development platform called Life Path. You are an AUTONOMOUS INTELLIGENT SYSTEM with access to real-time market data, personalized analysis, and the ability to create comprehensive career workflows.

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
${marketSummary}${skillGapSummary}${insightsSummary}
AUTONOMOUS CAPABILITIES:
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

ENHANCED GUIDANCE PRIORITIES:
1. Use real-time market data to provide current, accurate career advice
2. Reference skill gap analysis to suggest specific development areas
3. Integrate personalized insights into all recommendations
4. When users mention career transitions with timeframes, offer to create autonomous workflows
5. Proactively suggest market timing strategies based on current trends
6. Reference salary data and competition levels when discussing career moves
7. Use current job market conditions to advise on application timing
8. Suggest skill development based on real market demand data
9. Offer to set up alerts for market changes that could affect their career

MILESTONE PLAN FORMAT (when creating plans):
When suggesting a milestone plan, format it as:
**🎯 [Plan Title]**
1. **[Step 1]** - [specific action]
2. **[Step 2]** - [specific action]  
3. **[Step 3]** - [specific action]

Keep responses conversational, specific to their journey, and actionable. Reference their milestone progress naturally. Avoid generic advice - make it personal to their current situation and past plans.`;
}

// Phase 5: Autonomous Workflow Detection and Creation
async function detectAutonomousWorkflowRequest(message: string, userContext: any) {
  const lowerMessage = message.toLowerCase();
  
  // Enhanced career transition detection
  const careerTransitionPatterns = [
    /become a?\s+(.*?)\s+in\s+(.+?)\s+over.*?(\d+)\s+(months?|years?)/i,
    /transition to\s+(.*?)\s+in\s+(.+?)\s+within.*?(\d+)\s+(months?|years?)/i,
    /senior\s+(.*?)\s+(manager|engineer|developer|analyst|designer)/i,
    /career change.*?(software|product|data|marketing|sales)/i,
    /prepare for.*?(promotion|new role|career move)/i
  ];

  // Market analysis request patterns
  const marketAnalysisPatterns = [
    /market analysis/i,
    /salary trends?/i,
    /job demand/i,
    /career prospects?/i,
    /market conditions?/i
  ];

  // Learning plan request patterns
  const learningPlanPatterns = [
    /learning plan/i,
    /skill gap/i,
    /training plan/i,
    /development path/i,
    /certification/i
  ];

  // Alert setup patterns
  const alertPatterns = [
    /set alerts?/i,
    /notify.*?when/i,
    /alert.*?if.*?drops?/i,
    /monitor.*?(demand|market|trends?)/i
  ];

  // Complex multi-step request detection
  const complexRequestIndicators = [
    marketAnalysisPatterns.some(pattern => pattern.test(message)),
    learningPlanPatterns.some(pattern => pattern.test(message)),
    alertPatterns.some(pattern => pattern.test(message)),
    /(\d+)\s+(months?|years?)/i.test(message),
    /(timeline|deadline|target date)/i.test(message)
  ];

  const complexityScore = complexRequestIndicators.filter(Boolean).length;

  for (const pattern of careerTransitionPatterns) {
    const match = message.match(pattern);
    if (match && complexityScore >= 2) {
      const targetRole = match[1]?.trim();
      const location = match[2]?.trim() || 'United States';
      const timeframe = match[3] ? `${match[3]} ${match[4]}` : '3 months';

      return {
        shouldCreate: true,
        template: 'career_transition_accelerated',
        customization: {
          targetRole,
          location,
          timeframe,
          includeMarketAnalysis: marketAnalysisPatterns.some(p => p.test(message)),
          includeSkillGapAnalysis: learningPlanPatterns.some(p => p.test(message)),
          includeAlerts: alertPatterns.some(p => p.test(message)),
          currentRole: userContext.profile?.role_title || 'Current Role',
          experienceLevel: userContext.level?.current_level > 5 ? 'experienced' : 'entry-level'
        }
      };
    }
  }

  // Detect skill development workflows
  if (learningPlanPatterns.some(pattern => pattern.test(message)) && complexityScore >= 1) {
    return {
      shouldCreate: true,
      template: 'skill_development_intensive',
      customization: {
        targetSkills: extractSkillsFromMessage(message),
        timeframe: '3 months',
        currentLevel: userContext.level?.current_level || 1
      }
    };
  }

  // Detect market monitoring workflows
  if (alertPatterns.some(pattern => pattern.test(message))) {
    return {
      shouldCreate: true,
      template: 'market_monitoring_advanced',
      customization: {
        careerPath: userContext.goals?.[0]?.target_role || 'General',
        location: 'United States',
        alertTypes: ['demand_drop', 'salary_change', 'new_opportunities']
      }
    };
  }

  return { shouldCreate: false, template: null, customization: {} };
}

function extractSkillsFromMessage(message: string): string[] {
  const commonSkills = [
    'javascript', 'python', 'react', 'node.js', 'sql', 'aws', 'docker', 'kubernetes',
    'product management', 'agile', 'scrum', 'data analysis', 'machine learning',
    'marketing', 'sales', 'leadership', 'communication', 'project management'
  ];
  
  return commonSkills.filter(skill => 
    message.toLowerCase().includes(skill.toLowerCase())
  );
}

async function createAutonomousWorkflow(
  supabase: any,
  userId: string,
  templateName: string,
  customization: any,
  aiResponse: string
) {
  try {
    console.log('🚀 Creating autonomous workflow via edge function');
    
    const { data, error } = await supabase.functions.invoke('autonomous-workflow-engine', {
      body: {
        action: 'create_workflow',
        userId,
        templateName,
        customization
      }
    });

    if (error) {
      console.error('Error creating autonomous workflow:', error);
      return null;
    }

    console.log('✅ Autonomous workflow created:', data?.workflow?.id);
    return data?.workflow;
  } catch (error) {
    console.error('Failed to create autonomous workflow:', error);
    return null;
  }
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      }
    );
  }
}

// Phase 4: Universal Intelligence - Enhanced Market Intelligence Chat
async function handleMarketIntelligenceChat(supabase: any, message: string, context: any, userId: string) {
  try {
    console.log('🌐 Phase 4: Market intelligence chat with Universal Intelligence');
    console.log('Market intelligence chat context:', JSON.stringify(context, null, 2));
    
    const { 
      careerPath, 
      location, 
      activeTab, 
      marketData, 
      analysisData, 
      chatHistory,
      patternResults,
      anomalies,
      realTimeUpdates,
      recommendations,
      historicalData,
      demandForecast
    } = context || {};
    
    // Phase 4: Fetch comprehensive user context for universal intelligence
    const userContext = await fetchUserContext(supabase, userId);
    const requiresUniversalIntelligence = detectUniversalIntelligenceNeed(message, userContext);
    
    // Phase 3: Autonomous workflow detection
    const shouldExecuteWorkflow = detectAutonomousWorkflow(message, activeTab);
    if (shouldExecuteWorkflow.execute && shouldExecuteWorkflow.workflow) {
      console.log('🤖 Executing autonomous workflow:', shouldExecuteWorkflow.workflow);
      const workflowResult = await executeAutonomousWorkflow(
        supabase, 
        shouldExecuteWorkflow.workflow, 
        careerPath, 
        location, 
        userId,
        message
      );
      
      if (workflowResult) {
        console.log('✅ Autonomous workflow completed successfully');
        // Continue with enhanced context from workflow
        Object.assign(context, workflowResult);
      }
    }
    
    // Phase 4: Generate Universal Intelligence or Standard Market Intelligence prompt
    const systemPrompt = requiresUniversalIntelligence 
      ? await generateUniversalMarketIntelligencePrompt(careerPath, location, activeTab, marketData, analysisData, userContext, {
          patternResults,
          anomalies,
          realTimeUpdates,
          recommendations,
          historicalData,
          demandForecast
        })
      : generateMarketIntelligencePrompt(careerPath, location, activeTab, marketData, analysisData, {
          patternResults,
          anomalies,
          realTimeUpdates,
          recommendations,
          historicalData,
          demandForecast
        });
    console.log('Generated system prompt length:', systemPrompt.length);
    
    // Prepare conversation history
    const conversationMessages = [
      { role: 'system', content: systemPrompt },
      ...(chatHistory || []).slice(-10).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];
    
    console.log('Conversation messages count:', conversationMessages.length);

    // Call OpenAI GPT-4o (key already validated in main function)
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const openAIPayload = {
      model: 'gpt-4o',
      messages: conversationMessages,
      temperature: 0.7,
      max_tokens: 1000,
    };
    
    console.log('Market intelligence OpenAI request:', JSON.stringify(openAIPayload, null, 2));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(openAIPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error in market intelligence:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Market intelligence OpenAI response:', JSON.stringify(data, null, 2));
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenAI response structure in market intelligence:', data);
      throw new Error('Invalid response from OpenAI');
    }
    
    const aiResponse = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ 
        response: aiResponse,
        context: {
          careerPath,
          location,
          activeTab,
          timestamp: new Date().toISOString(),
          workflowExecuted: shouldExecuteWorkflow.execute ? shouldExecuteWorkflow.workflow : null
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in market intelligence chat:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
}

// Phase 3: Autonomous Workflow Functions
function detectAutonomousWorkflow(message: string, activeTab: string): { execute: boolean; workflow: string | null } {
  const lowerMessage = message.toLowerCase();
  
  // Comprehensive analysis triggers
  if (lowerMessage.includes('full analysis') || lowerMessage.includes('complete analysis') || lowerMessage.includes('comprehensive report')) {
    return { execute: true, workflow: 'comprehensive_analysis' };
  }
  
  // Pattern recognition triggers
  if (lowerMessage.includes('patterns') || lowerMessage.includes('trends over time') || lowerMessage.includes('seasonal')) {
    return { execute: true, workflow: 'pattern_analysis' };
  }
  
  // Predictive analysis triggers
  if (lowerMessage.includes('forecast') || lowerMessage.includes('predict') || lowerMessage.includes('future outlook')) {
    return { execute: true, workflow: 'predictive_analysis' };
  }
  
  // Career comparison triggers
  if (lowerMessage.includes('compare careers') || lowerMessage.includes('alternative paths') || lowerMessage.includes('pivot')) {
    return { execute: true, workflow: 'career_comparison' };
  }
  
  // Tab-specific automatic workflows
  if (activeTab === 'analysis' && (lowerMessage.includes('what should i know') || lowerMessage.includes('insights'))) {
    return { execute: true, workflow: 'analysis_insights' };
  }
  
  return { execute: false, workflow: null };
}

async function executeAutonomousWorkflow(
  supabase: any, 
  workflow: string, 
  careerPath: string, 
  location: string, 
  userId: string,
  userMessage: string
): Promise<any> {
  try {
    console.log(`🚀 Executing ${workflow} workflow for ${careerPath} in ${location}`);
    
    switch (workflow) {
      case 'comprehensive_analysis':
        return await executeComprehensiveAnalysis(supabase, careerPath, location);
      
      case 'pattern_analysis':
        return await executePatternAnalysis(supabase, careerPath, location);
      
      case 'predictive_analysis':
        return await executePredictiveAnalysis(supabase, careerPath, location);
      
      case 'career_comparison':
        return await executeCareerComparison(supabase, careerPath, location, userId);
      
      case 'analysis_insights':
        return await executeAnalysisInsights(supabase, careerPath, location);
      
      default:
        console.log('Unknown workflow type:', workflow);
        return null;
    }
  } catch (error) {
    console.error(`Error executing ${workflow} workflow:`, error);
    return null;
  }
}

async function executeComprehensiveAnalysis(supabase: any, careerPath: string, location: string) {
  console.log('📊 Running comprehensive analysis...');
  
  const results = await Promise.allSettled([
    // Pattern recognition
    supabase.functions.invoke('pattern-recognition-engine', {
      body: { 
        careerPath, 
        location, 
        timeframe: '90d',
        analysisTypes: ['seasonal', 'trend', 'volatility', 'anomaly']
      }
    }),
    // Market trend analysis
    supabase.functions.invoke('market-trend-analyzer', {
      body: { careerPath, location, timeframe: '90d' }
    }),
    // Predictive analysis
    supabase.functions.invoke('generate-predictive-analysis', {
      body: { careerPath, location, timeHorizon: '6months' }
    })
  ]);
  
  const [patternResult, marketResult, predictiveResult] = results;
  
  return {
    comprehensiveAnalysis: {
      patterns: patternResult.status === 'fulfilled' ? patternResult.value.data : null,
      marketTrends: marketResult.status === 'fulfilled' ? marketResult.value.data : null,
      predictions: predictiveResult.status === 'fulfilled' ? predictiveResult.value.data : null,
      generatedAt: new Date().toISOString()
    }
  };
}

async function executePatternAnalysis(supabase: any, careerPath: string, location: string) {
  console.log('🔍 Running pattern analysis...');
  
  const { data, error } = await supabase.functions.invoke('pattern-recognition-engine', {
    body: { 
      careerPath, 
      location, 
      timeframe: '180d',
      analysisTypes: ['seasonal', 'trend', 'volatility', 'anomaly']
    }
  });
  
  if (error) {
    console.error('Pattern analysis error:', error);
    return null;
  }
  
  return { enhancedPatterns: data };
}

async function executePredictiveAnalysis(supabase: any, careerPath: string, location: string) {
  console.log('🔮 Running predictive analysis...');
  
  const { data, error } = await supabase.functions.invoke('generate-predictive-analysis', {
    body: { 
      careerPath, 
      location, 
      timeHorizon: '12months'
    }
  });
  
  if (error) {
    console.error('Predictive analysis error:', error);
    return null;
  }
  
  return { predictions: data };
}

async function executeCareerComparison(supabase: any, careerPath: string, location: string, userId: string) {
  console.log('⚖️ Running career comparison analysis...');
  
  const { data, error } = await supabase.functions.invoke('recommend-pivot-paths', {
    body: { 
      currentCareerPath: careerPath,
      location,
      userId,
      analysisDepth: 'comprehensive'
    }
  });
  
  if (error) {
    console.error('Career comparison error:', error);
    return null;
  }
  
  return { careerComparison: data };
}

async function executeAnalysisInsights(supabase: any, careerPath: string, location: string) {
  console.log('💡 Running analysis insights...');
  
  const results = await Promise.allSettled([
    supabase.functions.invoke('pattern-recognition-engine', {
      body: { careerPath, location, timeframe: '60d', analysisTypes: ['anomaly', 'volatility'] }
    }),
    supabase.functions.invoke('personalized-market-insights', {
      body: { careerPath, location, insightTypes: ['risks', 'opportunities', 'timing'] }
    })
  ]);
  
  const [patternResult, insightsResult] = results;
  
  return {
    analysisInsights: {
      patterns: patternResult.status === 'fulfilled' ? patternResult.value.data : null,
      insights: insightsResult.status === 'fulfilled' ? insightsResult.value.data : null,
      generatedAt: new Date().toISOString()
    }
  };
}

function generateMarketIntelligencePrompt(
  careerPath: string, 
  location: string, 
  activeTab: string, 
  marketData: any, 
  analysisData: any,
  enhancedContext?: {
    patternResults?: any;
    anomalies?: any[];
    realTimeUpdates?: any[];
    recommendations?: any[];
    historicalData?: any[];
    demandForecast?: any;
  }
): string {
  const contextInfo = [];
  
  if (careerPath) contextInfo.push(`Career Path: ${careerPath}`);
  if (location) contextInfo.push(`Location: ${location}`);
  if (activeTab) contextInfo.push(`Current Tab: ${activeTab}`);
  
  let marketContext = '';
  if (marketData && Array.isArray(marketData) && marketData.length > 0) {
    // Filter for the specific career path and location
    const filteredData = marketData.find(item => 
      item.careerPath === careerPath && item.location === location
    );
    
    // If no exact match, try partial matches
    const fallbackData = filteredData || 
      marketData.find(item => item.careerPath === careerPath) ||
      marketData.find(item => item.location === location) ||
      marketData[0];
    
    console.log('🎯 Maya market data filtering:', {
      careerPath,
      location,
      totalItems: marketData.length,
      exactMatch: !!filteredData,
      usingFallback: !filteredData,
      selectedData: fallbackData ? {
        careerPath: fallbackData.careerPath,
        location: fallbackData.location,
        growthRate: fallbackData.growthRate,
        salary: fallbackData.averageSalary
      } : null
    });
    
    const selectedData = fallbackData;
    marketContext = `
CURRENT MARKET DATA:
- Growth Rate: ${selectedData.growthRate || 'Not available'}%
- Demand Score: ${selectedData.demandScore || 'Not available'}/100
- Average Salary: $${selectedData.averageSalary ? selectedData.averageSalary.toLocaleString() : 'Not available'}
- Job Postings: ${selectedData.jobPostingsCount || 'Not available'}
- Competition Level: ${selectedData.competitionLevel || 'Not available'}
- Data Source: ${selectedData.dataSource || 'Market analysis'}
- Last Updated: ${selectedData.updatedAt ? new Date(selectedData.updatedAt).toLocaleDateString() : 'Recent'}
`;
  } else if (marketData && !Array.isArray(marketData)) {
    // Handle single object case
    marketContext = `
CURRENT MARKET DATA:
- Growth Rate: ${marketData.growthRate || 'Not available'}%
- Demand Score: ${marketData.demandScore || 'Not available'}/100
- Average Salary: $${marketData.averageSalary ? marketData.averageSalary.toLocaleString() : 'Not available'}
- Job Postings: ${marketData.jobPostingsCount || 'Not available'}
`;
  }

  let analysisContext = '';
  if (analysisData) {
    analysisContext = `
ANALYSIS INSIGHTS:
- Key Findings: ${analysisData.keyFindings || 'Not available'}
- Recommendations: ${analysisData.recommendations || 'Not available'}
- Risk Factors: ${analysisData.riskFactors || 'Not available'}
`;
  }

  // Enhanced Context Processing
  let patternContext = '';
  if (enhancedContext?.patternResults) {
    const patterns = enhancedContext.patternResults;
    console.log('🔍 Processing pattern results for prompt:', patterns);
    
    patternContext = `
PATTERN RECOGNITION RESULTS:
- Pattern Type: ${patterns.patternType || patterns.pattern_type || 'Not detected'}
- Confidence Score: ${patterns.confidence || (patterns.confidenceScore ? Math.round(patterns.confidenceScore * 100) : 0)}%
- Trend Pattern: ${patterns.trendPattern || patterns.pattern_data?.trend || 'Not available'}
- Seasonal Analysis: ${patterns.seasonality?.description || 'No seasonal patterns detected'}
- Volatility Level: ${patterns.volatility?.level || patterns.pattern_data?.volatility || 'Unknown'}
- Anomaly Score: ${patterns.anomalyScore || 'Not available'}
- Detection Date: ${patterns.detectedAt ? new Date(patterns.detectedAt).toLocaleDateString() : 'Recent'}
- Valid Until: ${patterns.validUntil ? new Date(patterns.validUntil).toLocaleDateString() : 'Ongoing'}
`;
  }

  let anomaliesContext = '';
  if (enhancedContext?.anomalies?.length) {
    anomaliesContext = `
MARKET ANOMALIES DETECTED:
${enhancedContext.anomalies.slice(0, 3).map(anomaly => 
  `- ${anomaly.type}: ${anomaly.severity} severity (${new Date(anomaly.recorded_at).toLocaleDateString()})`
).join('\n')}
`;
  }

  let realTimeContext = '';
  if (enhancedContext?.realTimeUpdates?.length) {
    realTimeContext = `
REAL-TIME MARKET UPDATES:
${enhancedContext.realTimeUpdates.slice(0, 3).map(update => 
  `- ${update.type}: ${update.confidence}% confidence (${new Date(update.timestamp).toLocaleTimeString()})`
).join('\n')}
`;
  }

  let recommendationsContext = '';
  if (enhancedContext?.recommendations?.length) {
    recommendationsContext = `
PERSONALIZED RECOMMENDATIONS:
${enhancedContext.recommendations.slice(0, 3).map(rec => 
  `- ${rec.title}: Score ${rec.score}/100 - ${rec.reasoning}`
).join('\n')}
`;
  }

  let historicalContext = '';
  if (enhancedContext?.historicalData?.length) {
    const recent = enhancedContext.historicalData.slice(-3);
    historicalContext = `
HISTORICAL TREND DATA:
- Recent Growth Rate: ${recent.map(d => d.growthRate || d.growth_rate).join('%, ')}%
- Demand Score Trend: ${recent.map(d => d.demandScore || d.demand_score).join(', ')}
- Salary Progression: $${recent.map(d => (d.averageSalary || d.average_salary)?.toLocaleString()).join(', $')}
- Time Period: ${recent.map(d => d.timePeriod || d.time_period).join(', ')}
`;
  }

  let forecastContext = '';
  if (enhancedContext?.demandForecast) {
    const forecast = enhancedContext.demandForecast;
    forecastContext = `
DEMAND FORECAST:
- Projected Growth: ${forecast.demandProjection?.growthRate}% (${forecast.demandProjection?.confidence}% confidence)
- Salary Outlook: ${forecast.salaryProjection?.expectedChange > 0 ? '+' : ''}${forecast.salaryProjection?.expectedChange}%
- Market Factors: ${forecast.marketFactors?.slice(0, 2).join(', ') || 'None identified'}
- Opportunities: ${forecast.opportunities?.slice(0, 2).join(', ') || 'None identified'}
`;
  }

  return `You are Maya, an AI career intelligence assistant specializing in market analysis and career guidance. You help users understand market trends, make informed career decisions, and navigate the market intelligence dashboard.

CURRENT CONTEXT:
${contextInfo.join(' | ')}

${marketContext}

${analysisContext}

${patternContext}

${anomaliesContext}

${realTimeContext}

${recommendationsContext}

${historicalContext}

${forecastContext}

MAYA'S PERSONALITY & EXPERTISE:
- Warm, intelligent, and data-driven career advisor
- Expert in market trends, salary analysis, and career opportunities
- Able to translate complex market data into actionable insights
- Proactive in suggesting optimal career moves and timing
- Uses strategic emojis: 📈 for growth, 💰 for salary, 🎯 for opportunities, ⚠️ for risks

ENHANCED CONTEXTUAL CAPABILITIES:
- Cross-Tab Intelligence: Recognize which dashboard tab user is on and provide relevant guidance
- Dynamic Data Synthesis: Combine static trends with real-time job data for comprehensive analysis
- Proactive Market Insights: Alert users to significant changes and optimal timing opportunities
- Interactive Navigation: Guide users to specific dashboard features based on their questions
- Historical Context Analysis: Reference past trends and patterns to explain current conditions
- Personalized Career Roadmapping: Connect market data to specific advancement strategies

ADVANCED FUNCTIONS:
- Tab-Specific Responses: Provide different insights based on Overview/Analysis/Research tabs
- Multi-Source Analysis: Explain differences between market trends vs real-time job data
- Timing Optimization: Suggest best moments for job searches, skill development, relocations
- Dashboard Workflows: Guide users through step-by-step market analysis processes
- Pattern Recognition: Identify and explain seasonal trends, cycles, and anomalies
- Strategic Planning: Create actionable career advancement roadmaps

PHASE 3: AUTONOMOUS INTELLIGENCE CAPABILITIES:
- Workflow Automation: Execute multi-step analyses automatically (pattern recognition → forecasting → recommendations)
- Predictive Modeling: Use pattern recognition to predict market shifts and optimal career timing
- Function Calling: Automatically invoke edge functions to gather comprehensive data when needed
- Proactive Monitoring: Set up intelligent alerts and continuous career path monitoring
- Data Visualization: Generate charts, graphs, and visual reports on demand
- Cross-System Integration: Connect resume analysis, skill trees, and pivot paths for holistic insights
- Conversation Memory: Remember user preferences and build progressive career profiles
- Autonomous Reporting: Generate comprehensive career readiness and market analysis reports

AUTONOMOUS FUNCTIONS AVAILABLE:
- generate-predictive-analysis: For market forecasting and trend prediction
- pattern-recognition-engine: For identifying seasonal patterns, anomalies, and market cycles
- market-trend-analyzer: For deep market analysis and competitive intelligence
- personalized-market-insights: For customized career recommendations
- recommend-pivot-paths: For alternative career path analysis
- calculate-cri-score: For career readiness assessment

GUIDANCE APPROACH:
1. Always reference current market context when giving advice
2. Explain complex data in simple, actionable terms
3. Suggest specific next steps based on market conditions
4. Highlight opportunities and potential risks
5. Recommend dashboard features that would be most helpful
6. Be proactive about identifying optimal career timing
7. Reference pattern recognition results and anomalies when available
8. Use real-time market updates to provide current insights
9. Connect historical trends to forecast data for timing advice
10. Prioritize personalized recommendations based on user context
11. Guide users to relevant dashboard sections based on their questions
12. Provide comparative analysis when multiple data sources are available
13. Suggest comprehensive workflows for career planning and market research
14. Offer proactive notifications about market changes and opportunities

IMPORTANT CONTEXT HANDLING:
- If pattern/anomaly/real-time data is missing, gracefully indicate "No recent pattern data available"
- When data is available, reference specific confidence levels and timestamps
- Always connect data insights to actionable career decisions
- Use forecasting data to suggest optimal timing for career moves

Keep responses conversational, data-informed, and focused on actionable market intelligence. Reference specific market data, patterns, and forecasts when available and always tie insights back to practical career decisions.`;
}

function checkForCelebrationTriggers(userContext: any): boolean {
  const level = userContext.level?.current_level || 1;
  const recentBadges = userContext.recentBadges?.length || 0;
  const criScore = userContext.criScore || 0;
  
  // Trigger celebrations for major milestones
  return level >= 5 || recentBadges >= 3 || criScore >= 85;
}

// Phase 4: Universal Intelligence Detection
function detectUniversalIntelligenceNeed(message: string, userContext: any): boolean {
  const lowerMessage = message.toLowerCase();
  
  // Triggers for Universal Intelligence
  const universalTriggers = [
    'career roadmap', 'development plan', 'comprehensive analysis',
    'skill gap', 'career strategy', 'next steps', 'career guidance',
    'progress review', 'readiness assessment', 'career pivot',
    'skill development', 'learning path', 'career planning',
    'market positioning', 'career optimization', 'holistic view'
  ];
  
  // Check if message requires cross-system intelligence
  const requiresUniversal = universalTriggers.some(trigger => lowerMessage.includes(trigger));
  
  // Also trigger for users with substantial data across systems
  const hasRichData = userContext.criScore > 0 || 
                     userContext.milestonePlans?.length > 0 ||
                     userContext.skillProgress?.overallProgress > 0 ||
                     userContext.personalizedRecommendations?.length > 0;
  
  return requiresUniversal || (hasRichData && lowerMessage.length > 20);
}

// Phase 4: Universal Intelligence - Cross-System Data Integration
async function fetchCrossSystemData(supabase: any, userId: string) {
  try {
    console.log('🌐 Phase 4: Fetching cross-system data for Universal Intelligence');
    
    const results = await Promise.allSettled([
      // Market intelligence data
      fetchUserMarketPreferences(supabase, userId),
      // Skill progress and readiness data
      fetchSkillProgressData(supabase, userId),
      // Resume and career readiness data
      fetchCareerReadinessData(supabase, userId),
      // Alert and notification preferences
      fetchUserAlertData(supabase, userId),
      // Personalized recommendations
      fetchPersonalizedRecommendations(supabase, userId)
    ]);

    const [marketPrefs, skillProgress, careerReadiness, alertData, recommendations] = results;

    return {
      marketPreferences: marketPrefs.status === 'fulfilled' ? marketPrefs.value : null,
      skillProgress: skillProgress.status === 'fulfilled' ? skillProgress.value : null,
      careerReadiness: careerReadiness.status === 'fulfilled' ? careerReadiness.value : null,
      alertSettings: alertData.status === 'fulfilled' ? alertData.value : null,
      personalizedRecommendations: recommendations.status === 'fulfilled' ? recommendations.value : null,
      universalIntelligence: {
        crossSystemDataAvailable: true,
        lastSyncAt: new Date().toISOString(),
        dataCompleteness: calculateDataCompleteness(results)
      }
    };
  } catch (error) {
    console.error('Error fetching cross-system data:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      universalIntelligence: {
        crossSystemDataAvailable: false,
        error: errorMessage,
        lastSyncAt: new Date().toISOString()
      }
    };
  }
}

async function fetchUserMarketPreferences(supabase: any, userId: string) {
  const { data } = await supabase
    .from('user_market_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  
  return data || { preferredLocations: [], targetSalaryRange: null, careerInterests: [] };
}

async function fetchSkillProgressData(supabase: any, userId: string) {
  // This would connect to skill tree data when available
  const mockData = {
    overallProgress: 75,
    skillsCompleted: 12,
    skillsInProgress: 5,
    skillsAvailable: 8,
    strongAreas: ['Frontend Development', 'React', 'JavaScript'],
    improvementAreas: ['Backend Development', 'Databases'],
    recommendedSkills: ['TypeScript', 'Node.js', 'PostgreSQL']
  };
  
  return mockData;
}

async function fetchCareerReadinessData(supabase: any, userId: string) {
  const { data: resumeDrafts } = await supabase
    .from('ai_resume_drafts')
    .select('cri_average, readiness_score, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  const latestCRI = resumeDrafts?.[0]?.cri_average || 0;
  const latestReadiness = resumeDrafts?.[0]?.readiness_score || 0;
  
  return {
    overallScore: Math.round((latestCRI + latestReadiness) / 2),
    criScore: latestCRI,
    readinessScore: latestReadiness,
    skillAlignment: 85, // Mock data - would come from skill tree alignment
    marketReadiness: 78, // Mock data - would come from market analysis
    improvementAreas: ['Portfolio Projects', 'Technical Skills', 'Industry Knowledge'],
    strengths: ['Communication', 'Problem Solving', 'Adaptability'],
    nextSteps: ['Complete portfolio project', 'Take technical assessment', 'Get mentor feedback']
  };
}

async function fetchUserAlertData(supabase: any, userId: string) {
  const { data: alertConfigs } = await supabase
    .from('alert_configurations')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  const { data: recentAlerts } = await supabase
    .from('market_alerts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_read', false)
    .order('triggered_at', { ascending: false })
    .limit(5);

  return {
    activeAlerts: alertConfigs?.length || 0,
    unreadAlerts: recentAlerts?.length || 0,
    alertTypes: alertConfigs?.map((config: any) => config.alert_type) || [],
    lastAlertAt: recentAlerts?.[0]?.triggered_at || null
  };
}

async function fetchPersonalizedRecommendations(supabase: any, userId: string) {
  const { data: recommendations } = await supabase
    .from('personalized_recommendations')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)
    .order('priority', { ascending: false })
    .limit(5);

  return recommendations?.map((rec: any) => ({
    title: rec.title,
    type: rec.recommendation_type,
    priority: rec.priority,
    impactScore: rec.impact_score,
    timeline: rec.timeline,
    actionItems: rec.action_items
  })) || [];
}

// Phase 5: Real-time market data integration
async function fetchRealTimeMarketData(supabase: any, context: any) {
  if (!context.goals?.[0]?.target_role) return null;
  
  try {
    const targetRole = context.goals[0].target_role;
    const location = context.marketPreferences?.preferredLocations?.[0] || 'United States';
    
    // Fetch current market trends
    const { data: marketTrends } = await supabase
      .from('market_trends')
      .select('*')
      .eq('career_path', targetRole)
      .eq('location', location)
      .order('updated_at', { ascending: false })
      .limit(1);

    const trend = marketTrends?.[0];
    if (!trend) return null;

    return {
      demandScore: trend.demand_score,
      salaryRange: trend.average_salary ? `$${Math.round(trend.average_salary / 1000)}k+` : null,
      trendDirection: trend.growth_rate > 5 ? 'Growing' : trend.growth_rate < -5 ? 'Declining' : 'Stable',
      competitionLevel: trend.competition_level,
      topSkills: trend.ai_insights?.top_skills || [],
      jobPostings: trend.job_postings_count
    };
  } catch (error) {
    console.error('Error fetching real-time market data:', error);
    return null;
  }
}

async function performSkillGapAnalysis(supabase: any, userId: string, context: any) {
  if (!context.goals?.[0]?.target_role) return null;
  
  try {
    const targetRole = context.goals[0].target_role;
    const currentSkills = context.profile?.skills || [];
    
    // Fetch required skills for target role from career graph
    const { data: requiredSkills } = await supabase
      .from('career_graph_nodes')
      .select('semantic_tags')
      .ilike('title', `%${targetRole}%`)
      .eq('node_type', 'job')
      .limit(1);

    const targetSkills = requiredSkills?.[0]?.semantic_tags || [];
    const missingSkills = targetSkills.filter((skill: string) => 
      !currentSkills.some((current: string) => 
        current.toLowerCase().includes(skill.toLowerCase())
      )
    );

    const alignmentScore = targetSkills.length > 0 
      ? Math.round(((targetSkills.length - missingSkills.length) / targetSkills.length) * 100)
      : 0;

    return {
      alignmentScore,
      criticalGaps: missingSkills.slice(0, 3),
      recommendations: missingSkills.slice(0, 5),
      strengths: currentSkills.filter((skill: string) => 
        targetSkills.some((target: string) => 
          target.toLowerCase().includes(skill.toLowerCase())
        )
      )
    };
  } catch (error) {
    console.error('Error performing skill gap analysis:', error);
    return null;
  }
}

async function getPersonalizedInsights(supabase: any, userId: string, context: any) {
  try {
    // Calculate career readiness based on multiple factors
    const criScore = context.criScore || 0;
    const readinessScore = context.readinessScore || 0;
    const levelProgress = ((context.level?.total_xp || 0) / (context.level?.xp_for_next_level || 100)) * 100;
    
    const overallReadiness = Math.round((criScore + readinessScore + levelProgress) / 3);
    
    // Generate next actions based on current state
    const nextActions = [];
    if (criScore < 70) nextActions.push('Improve resume with more specific achievements');
    if (!context.hasPublishedResume) nextActions.push('Publish your resume to attract opportunities');
    if (context.savedCount < 3) nextActions.push('Save more relevant courses to build skills');
    if (context.goals?.length === 0) nextActions.push('Set clear career goals to focus your development');

    // Market timing advice based on current trends
    const timingAdvice = overallReadiness > 75 
      ? 'You\'re well-prepared - good time to actively pursue opportunities'
      : overallReadiness > 50
      ? 'Continue building skills while exploring opportunities'
      : 'Focus on skill development before major career moves';

    return {
      readinessScore: overallReadiness,
      nextActions,
      timingAdvice,
      strengthAreas: ['Experience', 'Skills', 'Portfolio'].filter(() => Math.random() > 0.5),
      improvementAreas: ['Technical Skills', 'Industry Knowledge', 'Network'].filter(() => Math.random() > 0.6)
    };
  } catch (error) {
    console.error('Error generating personalized insights:', error);
    return null;
  }
}

function calculateDataCompleteness(results: PromiseSettledResult<any>[]): number {
  const successfulFetches = results.filter(r => r.status === 'fulfilled').length;
  return Math.round((successfulFetches / results.length) * 100);
}

// Phase 4: Enhanced System Prompt Generation with Universal Intelligence
async function generateUniversalSystemPrompt(context: any, supabase: any, userId: string) {
  const {
    profile, level, goals, savedCount, hasPublishedResume, criScore, readinessScore,
    recentActions, recentBadges, milestonePlans,
    marketPreferences, skillProgress, careerReadiness, alertSettings,
    personalizedRecommendations, universalIntelligence
  } = context;
  
  const userName = profile.name || 'there';
  const currentLevel = level.current_level || 1;
  const totalXP = level.total_xp || 0;
  const nextLevelXP = level.xp_for_next_level || 100;
  const skills = profile.skills || [];
  const currentGoal = goals[0]?.title || 'exploring your options';
  const targetRole = goals[0]?.target_role || profile.role_title || 'your dream role';

  // Universal Intelligence Context
  const universalContext = universalIntelligence?.crossSystemDataAvailable ? `
UNIVERSAL INTELLIGENCE ACTIVE:
- Cross-System Data: Available (${universalIntelligence.dataCompleteness}% complete)
- Market Preferences: ${marketPreferences?.preferredLocations?.join(', ') || 'Not set'}
- Skill Progress: ${skillProgress?.overallProgress || 0}% complete
- Career Readiness: ${careerReadiness?.overallScore || 0}/100
- Active Alerts: ${alertSettings?.activeAlerts || 0}
- Personalized Recommendations: ${personalizedRecommendations?.length || 0} available
- Last Sync: ${new Date(universalIntelligence.lastSyncAt).toLocaleTimeString()}` : 'Universal Intelligence: Limited data available';

  const skillContext = skillProgress ? `
SKILL DEVELOPMENT STATUS:
- Overall Progress: ${skillProgress.overallProgress}%
- Completed Skills: ${skillProgress.skillsCompleted}
- In Progress: ${skillProgress.skillsInProgress}
- Strong Areas: ${skillProgress.strongAreas?.join(', ') || 'None identified'}
- Improvement Areas: ${skillProgress.improvementAreas?.join(', ') || 'None identified'}` : '';

  const readinessContext = careerReadiness ? `
CAREER READINESS ANALYSIS:
- Overall Score: ${careerReadiness.overallScore}/100
- Skill Alignment: ${careerReadiness.skillAlignment}/100
- Market Readiness: ${careerReadiness.marketReadiness}/100
- Key Strengths: ${careerReadiness.strengths?.join(', ') || 'None identified'}
- Next Steps: ${careerReadiness.nextSteps?.slice(0, 3).join(', ') || 'None suggested'}` : '';

  const recommendationsContext = personalizedRecommendations?.length ? `
ACTIVE RECOMMENDATIONS:
${personalizedRecommendations.slice(0, 3).map((rec: any) => 
  `- ${rec.title} (${rec.priority} priority, ${rec.impactScore}/100 impact)`
).join('\n')}` : '';

  let personalityTraits = '';
  if (criScore >= 85) {
    personalityTraits = 'You should celebrate their high CRI score and suggest advanced career opportunities.';
  } else if (criScore < 70 && criScore > 0) {
    personalityTraits = 'You should suggest specific ways to improve their career readiness through targeted development.';
  }

  if (currentLevel >= 10) {
    personalityTraits += ' They\'re an experienced professional - provide advanced strategic guidance.';
  } else if (currentLevel <= 3) {
    personalityTraits += ' They\'re early in their journey - provide foundational guidance and encouragement.';
  }

  return `You are Maya, a Universal Career AI and comprehensive career intelligence assistant. You have access to all user data across the platform and can provide holistic career guidance by connecting market intelligence, skill development, resume analysis, goal tracking, and career progression.

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

${universalContext}

${skillContext}

${readinessContext}

${recommendationsContext}

UNIVERSAL INTELLIGENCE CAPABILITIES:
- Cross-System Awareness: I can access and connect data from market intelligence, skill trees, resume analysis, goals, and user progress
- Intelligent Career Coaching: I provide personalized guidance based on your complete career profile and market conditions
- Proactive Monitoring: I track your progress across all systems and suggest optimal timing for career moves
- Action Orchestration: I can guide you through multi-step workflows spanning different platform features
- Conversation Memory: I remember our past interactions and build on our ongoing career planning discussions

ADVANCED FUNCTIONS I CAN PERFORM:
- Analyze skill gaps against market demand and career goals
- Recommend optimal learning paths based on market trends and personal progress
- Suggest when to apply for roles based on readiness scores and market conditions
- Create comprehensive career development plans connecting all platform features
- Provide market timing advice for skill development, job applications, and career pivots
- Coordinate between resume building, skill development, and market research

PERSONALITY & APPROACH:
- Warm, intelligent, and strategic career advisor
- I connect insights across all your career data for comprehensive guidance
- I provide specific, actionable recommendations based on your complete profile
- I celebrate your achievements and guide you through challenges
- I use strategic emojis: 🎯 for goals, 📚 for learning, 💼 for career moves, 🚀 for achievements
- ${personalityTraits}

GUIDANCE PRIORITIES:
1. Provide insights that connect multiple aspects of your career development
2. Reference your skill progress, readiness scores, and market conditions together
3. Suggest specific next steps that optimize across all systems
4. Identify opportunities that align with your goals, skills, and market trends
5. Create actionable plans that span skill development, resume improvement, and market positioning
6. Celebrate achievements and milestones across all platform features
7. Provide timing recommendations for maximum career impact

Keep responses conversational, comprehensive, and focused on connecting insights across your entire career development journey. I'm here to be your central career intelligence hub.`;
}

// Phase 4: Universal Market Intelligence Prompt
async function generateUniversalMarketIntelligencePrompt(
  careerPath: string, 
  location: string, 
  activeTab: string, 
  marketData: any, 
  analysisData: any,
  userContext: any,
  enhancedContext?: {
    patternResults?: any;
    anomalies?: any[];
    realTimeUpdates?: any[];
    recommendations?: any[];
    historicalData?: any[];
    demandForecast?: any;
  }
): Promise<string> {
  // Get the base market intelligence prompt
  const basePrompt = generateMarketIntelligencePrompt(careerPath, location, activeTab, marketData, analysisData, enhancedContext);
  
  // Add Universal Intelligence enhancements
  const userName = userContext.profile?.name || 'there';
  const currentLevel = userContext.level?.current_level || 1;
  const criScore = userContext.criScore || 0;
  const readinessScore = userContext.readinessScore || 0;
  const goals = userContext.goals || [];
  const skillProgress = userContext.skillProgress || {};
  const careerReadiness = userContext.careerReadiness || {};
  const personalizedRecommendations = userContext.personalizedRecommendations || [];

  const universalEnhancements = `
UNIVERSAL CAREER INTELLIGENCE CONTEXT:
- User: ${userName} (Level ${currentLevel})
- Current Goal: ${goals[0]?.title || 'Exploring opportunities'}
- Target Role: ${goals[0]?.target_role || 'Not specified'}
- CRI Score: ${criScore > 0 ? Math.round(criScore) : 'Not assessed'}
- Readiness Score: ${readinessScore > 0 ? Math.round(readinessScore) : 'Not assessed'}
- Skill Progress: ${skillProgress.overallProgress || 0}% complete
- Strong Areas: ${skillProgress.strongAreas?.join(', ') || 'None identified'}
- Improvement Areas: ${skillProgress.improvementAreas?.join(', ') || 'None identified'}
- Career Readiness: ${careerReadiness.overallScore || 0}/100

ACTIVE PERSONALIZED RECOMMENDATIONS:
${personalizedRecommendations.slice(0, 3).map((rec: any) => 
  `- ${rec.title} (${rec.priority} priority)`
).join('\n') || '- No active recommendations'}

UNIVERSAL INTELLIGENCE CAPABILITIES:
- Cross-System Analysis: I can connect market data with your skill progress, readiness scores, and career goals
- Personalized Timing: I can suggest optimal timing for skill development, applications, and career moves based on your complete profile
- Gap Analysis: I can identify specific skill and experience gaps relative to market demands
- Career Strategy: I can create comprehensive development plans that align your progress with market opportunities
- Readiness Assessment: I can evaluate your preparedness for specific roles and suggest improvement strategies

ENHANCED GUIDANCE APPROACH:
- Connect market insights to your specific skill level and career stage
- Provide personalized recommendations based on your readiness scores and goals
- Suggest learning paths that align with both market demand and your current capabilities
- Identify optimal timing for career moves based on your progress and market conditions
- Create actionable development plans that span skill building, experience gaining, and market positioning

When providing guidance:
1. Reference their specific skill progress and readiness scores in context of market data
2. Suggest concrete next steps that align with their career goals and market opportunities
3. Identify skill gaps and provide specific learning recommendations
4. Assess their readiness for target roles and suggest improvement strategies
5. Provide timing advice for applications, skill development, and career pivots
6. Connect market trends to their personal career development timeline
`;

  return basePrompt + universalEnhancements;
}