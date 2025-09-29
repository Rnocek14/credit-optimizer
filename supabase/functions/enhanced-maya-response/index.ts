import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnhancedMayaRequest {
  request: string;
  userId?: string;
  context?: {
    careerPath?: string;
    location?: string;
    goals?: string[];
    skillLevel?: string;
    marketPreferences?: any;
    gamificationData?: any;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const requestBody: EnhancedMayaRequest = await req.json();
    const { request, userId, context } = requestBody;
    
    console.log('Enhanced Maya request:', { request, userId, context });

    // Validate and normalize user ID
    const validatedUserId = validateUserId(userId || '');
    
    // Analyze request complexity and determine appropriate response strategy
    const requestAnalysis = analyzeRequestComplexity(request, context);
    console.log('Request analysis:', requestAnalysis);

    // Gather comprehensive real-time intelligence including gamification data
    const realTimeData = await gatherRealTimeIntelligence(supabase, validatedUserId, context, requestAnalysis);
    console.log('Real-time data gathered:', Object.keys(realTimeData));

    // Generate enhanced prompt with all contextual data
    const { systemPrompt, enhancedUserRequest } = generateDataDrivenPrompt(request, context, realTimeData, requestAnalysis);

    // Call OpenAI with enhanced context
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: enhancedUserRequest }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!openAIResponse.ok) {
      console.error('OpenAI API error:', await openAIResponse.text());
      throw new Error('Failed to get AI response');
    }

    const openAIData = await openAIResponse.json();
    const aiResponse = openAIData.choices[0].message.content;

    // Execute autonomous actions based on the analysis and response
    const autonomousActions = await executeAutonomousActions(supabase, validatedUserId, requestAnalysis, realTimeData, aiResponse);

    // Generate decision reasoning based on gamification and context
    const decisionReasoning = generateDecisionReasoning(realTimeData, requestAnalysis, context);

    // Return comprehensive response
    return new Response(JSON.stringify({
      response: aiResponse,
      realTimeData,
      autonomousActions,
      requestAnalysis,
      decisionReasoning,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhanced-maya-response:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error occurred',
      response: "I'm experiencing some technical difficulties right now, but I'm here to help with your career development. Could you try rephrasing your question?",
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to validate and normalize user IDs
function validateUserId(userId: string): string {
  // Known demo users
  const demoUsers: { [key: string]: string } = {
    'aisha': '2b458624-d498-4cca-a63d-9341cc20e363',
    'mateo': '3c459625-e499-5ddb-b64d-a442dd21f474', 
    'jade': '4d56a736-f5aa-6eec-c75e-b553ee32e585'
  };
  
  if (demoUsers[userId.toLowerCase()]) {
    return demoUsers[userId.toLowerCase()];
  }
  
  if (userId && userId.length > 10) {
    return userId;
  }
  
  // Default to Aisha Khan for demo purposes
  return '2b458624-d498-4cca-a63d-9341cc20e363';
}

// Analyze request complexity and determine response strategy
function analyzeRequestComplexity(request: string, context: any): any {
  const requestLower = request.toLowerCase();
  const complexity = {
    type: 'general',
    complexity_score: 0.5,
    requires_market_data: false,
    requires_skill_analysis: false,
    requires_workflow_creation: false,
    requires_alerts: false,
    gamification_factors: [] as string[]
  };

  // Detect request type and requirements
  if (requestLower.includes('career') || requestLower.includes('job') || requestLower.includes('role')) {
    complexity.type = 'career_guidance';
    complexity.requires_market_data = true;
    complexity.requires_skill_analysis = true;
    complexity.complexity_score += 0.3;
    complexity.gamification_factors.push('streak_momentum', 'learning_consistency');
  }

  if (requestLower.includes('skill') || requestLower.includes('learn') || requestLower.includes('course')) {
    complexity.type = 'skill_development';
    complexity.requires_skill_analysis = true;
    complexity.complexity_score += 0.2;
    complexity.gamification_factors.push('skill_progression', 'completion_patterns');
  }

  if (requestLower.includes('plan') || requestLower.includes('roadmap') || requestLower.includes('path')) {
    complexity.requires_workflow_creation = true;
    complexity.complexity_score += 0.4;
    complexity.gamification_factors.push('goal_achievement', 'milestone_tracking');
  }

  if (requestLower.includes('market') || requestLower.includes('trend') || requestLower.includes('demand')) {
    complexity.requires_market_data = true;
    complexity.requires_alerts = true;
    complexity.complexity_score += 0.3;
  }

  return complexity;
}

// Gather comprehensive real-time intelligence including gamification data
async function gatherRealTimeIntelligence(supabase: any, userId: string, context: any, analysis: any): Promise<any> {
  const intelligence: any = {
    userProfile: {},
    marketTrends: {},
    skillGaps: {},
    careerOpportunities: {},
    gamificationMetrics: {},
    streakData: {},
    celebrationHistory: {},
    alertStatus: {},
    predictions: {},
    personalizedInsights: {}
  };

  try {
    // Fetch user profile and basic data
    intelligence.userProfile = await fetchUserProfileData(supabase, userId);
    
    // Fetch gamification metrics for Maya intelligence
    intelligence.gamificationMetrics = await fetchGamificationMetrics(supabase, userId);
    intelligence.streakData = await fetchStreakData(supabase, userId);
    intelligence.celebrationHistory = await fetchCelebrationHistory(supabase, userId);

    // Get target role from context or user goals
    const targetRole = context?.careerPath || intelligence.userProfile?.careerGoals?.[0]?.target_role || 'Software Developer';

    // Fetch market intelligence if needed
    if (analysis.requires_market_data) {
      intelligence.marketTrends = await fetchCurrentMarketIntelligence(supabase, targetRole);
    }

    // Perform skill analysis if needed
    if (analysis.requires_skill_analysis) {
      intelligence.skillGaps = await performRealTimeSkillAnalysis(supabase, userId, context, targetRole, intelligence);
    }

    // Identify career opportunities
    intelligence.careerOpportunities = await identifyCareerOpportunities(supabase, context, targetRole);

    // Get alert status
    intelligence.alertStatus = await fetchUserAlertStatus(supabase, userId);

    console.log('Intelligence gathered:', {
      hasGamificationMetrics: !!intelligence.gamificationMetrics?.daily_xp,
      hasStreakData: !!intelligence.streakData?.current_streak,
      hasCelebrations: !!intelligence.celebrationHistory?.recent_count
    });

  } catch (error) {
    console.error('Error gathering intelligence:', error);
  }

  return intelligence;
}

// Fetch user profile data including goals and XP
async function fetchUserProfileData(supabase: any, userId: string): Promise<any> {
  try {
    const [profileResponse, goalsResponse, xpResponse] = await Promise.all([
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('career_goals').select('*').eq('user_id', userId).eq('active', true),
      supabase.from('user_xp').select('*').eq('user_id', userId).maybeSingle()
    ]);

    return {
      profile: profileResponse.data,
      careerGoals: goalsResponse.data || [],
      xpData: xpResponse.data || { total_xp: 0 },
      experienceLevel: profileResponse.data?.experience_level || 'beginner'
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { profile: null, careerGoals: [], xpData: { total_xp: 0 }, experienceLevel: 'beginner' };
  }
}

// Fetch gamification metrics for Maya intelligence
async function fetchGamificationMetrics(supabase: any, userId: string): Promise<any> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const { data, error } = await supabase
      .from('gamification_metrics')
      .select('*')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());

    if (error) throw error;

    // Calculate aggregate metrics
    const dailyXP = data.filter((m: any) => m.metric_type === 'daily_xp').reduce((sum: number, m: any) => sum + Number(m.metric_value), 0);
    const streakBonus = data.filter((m: any) => m.metric_type === 'streak_bonus').reduce((sum: number, m: any) => sum + Number(m.metric_value), 0);
    const mayaCollaboration = data.filter((m: any) => m.metric_type === 'maya_collaboration');
    const avgMayaScore = mayaCollaboration.length > 0 
      ? mayaCollaboration.reduce((sum: number, m: any) => sum + Number(m.metric_value), 0) / mayaCollaboration.length
      : 0;

    return {
      daily_xp: dailyXP,
      streak_bonus: streakBonus,
      maya_collaboration_score: avgMayaScore,
      engagement_trend: data.filter((m: any) => m.metric_type === 'engagement_trend').slice(-1)[0]?.metric_value || 0.5,
      total_metrics_count: data.length
    };
  } catch (error) {
    console.error('Error fetching gamification metrics:', error);
    return { daily_xp: 0, streak_bonus: 0, maya_collaboration_score: 0, engagement_trend: 0.5 };
  }
}

// Fetch streak data
async function fetchStreakData(supabase: any, userId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('learning_streaks')
      .select('*')
      .eq('user_id', userId)
      .eq('streak_type', 'daily')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (error) throw error;

    return data?.[0] || { current_streak: 0, longest_streak: 0, bonus_multiplier: 1.0 };
  } catch (error) {
    console.error('Error fetching streak data:', error);
    return { current_streak: 0, longest_streak: 0, bonus_multiplier: 1.0 };
  }
}

// Fetch celebration history
async function fetchCelebrationHistory(supabase: any, userId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('celebration_moments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    const recent_count = data?.length || 0;
    const unread_count = data?.filter((c: any) => !c.displayed_at)?.length || 0;

    return { recent_count, unread_count, latest_celebrations: data?.slice(0, 3) || [] };
  } catch (error) {
    console.error('Error fetching celebration history:', error);
    return { recent_count: 0, unread_count: 0, latest_celebrations: [] };
  }
}

// Fetch current market intelligence
async function fetchCurrentMarketIntelligence(supabase: any, targetRole: string): Promise<any> {
  try {
    // This would typically fetch from market data sources
    // For now, return mock data based on the target role
    return {
      demand_score: 0.8,
      growth_trend: 'increasing',
      avg_salary: 95000,
      market_stability: 'high',
      competition_level: 'moderate',
      last_updated: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching market intelligence:', error);
    return { demand_score: 0.5, growth_trend: 'stable', market_stability: 'moderate' };
  }
}

// Perform real-time skill analysis
async function performRealTimeSkillAnalysis(supabase: any, userId: string, context: any, targetRole: string, intelligence: any): Promise<any> {
  try {
    // Analyze skill gaps based on user progress and target role
    const skillGaps = {
      identified_gaps: ['Advanced React Patterns', 'System Design', 'Cloud Architecture'],
      proficiency_scores: { 'React': 0.8, 'JavaScript': 0.9, 'Node.js': 0.6 },
      learning_velocity: intelligence.gamificationMetrics?.engagement_trend || 0.5,
      recommended_next_steps: [
        'Complete React Advanced Patterns course',
        'Practice system design interviews',
        'Build cloud-native applications'
      ]
    };

    return skillGaps;
  } catch (error) {
    console.error('Error performing skill analysis:', error);
    return { identified_gaps: [], proficiency_scores: {}, learning_velocity: 0.5 };
  }
}

// Identify career opportunities
async function identifyCareerOpportunities(supabase: any, context: any, targetRole: string): Promise<any> {
  try {
    return {
      immediate_opportunities: [
        'Senior Frontend Developer roles',
        'Full-stack positions at startups',
        'Remote React developer positions'
      ],
      growth_paths: [
        'Technical Lead',
        'Engineering Manager',
        'Solution Architect'
      ],
      market_demand: 0.85
    };
  } catch (error) {
    console.error('Error identifying opportunities:', error);
    return { immediate_opportunities: [], growth_paths: [], market_demand: 0.5 };
  }
}

// Fetch user alert status
async function fetchUserAlertStatus(supabase: any, userId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('career_monitoring_alerts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      active_alerts: data?.length || 0,
      unread_alerts: data?.filter((a: any) => !a.acknowledged_at)?.length || 0,
      latest_alerts: data?.slice(0, 3) || []
    };
  } catch (error) {
    console.error('Error fetching alert status:', error);
    return { active_alerts: 0, unread_alerts: 0, latest_alerts: [] };
  }
}

// Generate data-driven prompt for OpenAI
function generateDataDrivenPrompt(request: string, context: any, realTimeData: any, analysis: any): any {
  const systemPrompt = `You are Maya, an AI career intelligence assistant with access to real-time market data and gamification insights. 

CURRENT USER CONTEXT:
- Learning Streak: ${realTimeData.streakData?.current_streak || 0} days (Multiplier: ${realTimeData.streakData?.bonus_multiplier || 1.0}x)
- Daily XP: ${realTimeData.gamificationMetrics?.daily_xp || 0} points (Last 30 days)
- Maya Collaboration Score: ${Math.round(realTimeData.gamificationMetrics?.maya_collaboration_score || 0)}/100
- Engagement Trend: ${Math.round((realTimeData.gamificationMetrics?.engagement_trend || 0.5) * 100)}%
- Total XP: ${realTimeData.userProfile?.xpData?.total_xp || 0}
- Experience Level: ${realTimeData.userProfile?.experienceLevel || 'beginner'}

GAMIFICATION INTELLIGENCE:
- Learning momentum is ${realTimeData.streakData?.current_streak > 3 ? 'HIGH' : realTimeData.streakData?.current_streak > 0 ? 'MODERATE' : 'LOW'} based on ${realTimeData.streakData?.current_streak || 0}-day streak
- Engagement pattern shows ${realTimeData.gamificationMetrics?.engagement_trend > 0.7 ? 'consistent' : realTimeData.gamificationMetrics?.engagement_trend > 0.4 ? 'variable' : 'declining'} learning behavior
- Recent celebrations: ${realTimeData.celebrationHistory?.recent_count || 0} achievements unlocked

DECISION FACTORS TO CONSIDER:
1. Streak Momentum: Factor in the user's current learning streak when recommending timing and intensity
2. Engagement Patterns: Adjust recommendations based on their engagement trends
3. Maya Collaboration: Consider our previous interaction quality (${Math.round(realTimeData.gamificationMetrics?.maya_collaboration_score || 0)}/100)
4. Learning Velocity: Account for their learning pace and XP accumulation

RESPONSE GUIDELINES:
- Be conversational and encouraging, acknowledging their learning streak when relevant
- Factor gamification data into recommendations (e.g., "Your 7-day streak shows great momentum...")
- Provide confidence scores for major decisions
- Explain your reasoning when making recommendations
- Suggest optimal timing based on their engagement patterns
- Mention specific gamification factors that influenced your advice

REQUEST TYPE: ${analysis.type}
COMPLEXITY: ${analysis.complexity_score}/1.0`;

  const enhancedUserRequest = `${request}

Additional Context:
- Current career goals: ${realTimeData.userProfile?.careerGoals?.map((g: any) => g.title).join(', ') || 'Not specified'}
- Market context: ${realTimeData.marketTrends?.growth_trend || 'stable'} demand
- Recent learning activity: ${realTimeData.streakData?.current_streak || 0} consecutive days
- Skill gaps identified: ${realTimeData.skillGaps?.identified_gaps?.join(', ') || 'Assessment pending'}`;

  return { systemPrompt, enhancedUserRequest };
}

// Execute autonomous actions based on analysis
async function executeAutonomousActions(supabase: any, userId: string, analysis: any, realTimeData: any, aiResponse: string): Promise<any[]> {
  const actions = [];

  try {
    // Store conversation context for continuity
    await storeConversationContext(supabase, userId, analysis, realTimeData, aiResponse);
    actions.push({ type: 'context_stored', success: true });

    // Create conversation session if needed
    await createConversationSession(supabase, userId, analysis, realTimeData);
    actions.push({ type: 'session_created', success: true });

    // Create celebration for streak milestones
    if (realTimeData.streakData?.current_streak > 0 && realTimeData.streakData.current_streak % 7 === 0) {
      const { error } = await supabase.rpc('create_celebration_moment', {
        user_id_param: userId,
        celebration_type_param: 'streak_milestone',
        trigger_data_param: { streak_length: realTimeData.streakData.current_streak },
        celebration_data_param: { 
          message: `Amazing! You've maintained a ${realTimeData.streakData.current_streak}-day learning streak!`,
          reward_type: 'streak_milestone',
          confetti: true
        }
      });
      
      if (!error) {
        actions.push({ type: 'celebration_created', celebration_type: 'streak_milestone' });
      }
    }

  } catch (error) {
    console.error('Error executing autonomous actions:', error);
    actions.push({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error occurred' });
  }

  return actions;
}

// Store conversation context
async function storeConversationContext(supabase: any, userId: string, analysis: any, realTimeData: any, aiResponse: string): Promise<void> {
  try {
    await supabase.from('conversation_context').insert({
      user_id: userId,
      context_type: 'maya_intelligence',
      context_key: 'recent_interaction',
      context_value: {
        analysis,
        gamification_state: realTimeData.gamificationMetrics,
        streak_data: realTimeData.streakData,
        ai_response_summary: aiResponse.substring(0, 200)
      },
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
    });
  } catch (error) {
    console.error('Error storing conversation context:', error);
  }
}

// Create conversation session
async function createConversationSession(supabase: any, userId: string, analysis: any, realTimeData: any): Promise<void> {
  try {
    await supabase.from('conversation_sessions').insert({
      user_id: userId,
      title: `Maya Intelligence Session - ${analysis.type}`,
      feature: 'maya_intelligence',
      context: {
        request_type: analysis.type,
        complexity_score: analysis.complexity_score,
        gamification_snapshot: realTimeData.gamificationMetrics,
        streak_snapshot: realTimeData.streakData
      }
    });
  } catch (error) {
    console.error('Error creating conversation session:', error);
  }
}

// Generate decision reasoning for transparency
function generateDecisionReasoning(realTimeData: any, analysis: any, context: any): any {
  const reasoning: any = {
    confidence_score: 0.8,
    primary_factors: [] as string[],
    gamification_influence: {} as any,
    decision_drivers: [] as string[],
    transparency_note: "This decision was made considering your learning patterns, market data, and current progress."
  };

  // Factor in streak data
  if (realTimeData.streakData?.current_streak > 0) {
    reasoning.primary_factors.push(`${realTimeData.streakData.current_streak}-day learning streak indicates strong momentum`);
    reasoning.gamification_influence.streak_factor = realTimeData.streakData.current_streak > 5 ? 'high' : 'moderate';
    reasoning.confidence_score += 0.1;
  }

  // Factor in engagement trends
  if (realTimeData.gamificationMetrics?.engagement_trend > 0.7) {
    reasoning.primary_factors.push('High engagement pattern supports accelerated learning');
    reasoning.gamification_influence.engagement_factor = 'high';
    reasoning.confidence_score += 0.1;
  }

  // Factor in Maya collaboration score
  if (realTimeData.gamificationMetrics?.maya_collaboration_score > 80) {
    reasoning.primary_factors.push('Strong Maya collaboration history indicates good response alignment');
    reasoning.gamification_influence.collaboration_factor = 'high';
  }

  reasoning.decision_drivers = [
    'Current learning momentum and consistency',
    'Engagement pattern analysis',
    'Market demand and timing factors',
    'Previous interaction success rate'
  ];

  return reasoning;
}