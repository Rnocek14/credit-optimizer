import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { goalId, userId, marketContext } = await req.json();
    
    console.log('🎯 Starting intelligent goal optimization:', { goalId, userId });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch goal details
    const { data: goal, error: goalError } = await supabase
      .from('career_goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();

    if (goalError || !goal) {
      throw new Error(`Goal not found: ${goalError?.message}`);
    }

    // Fetch market intelligence
    const { data: marketTrends } = await supabase
      .from('market_trends')
      .select('*')
      .eq('career_path', goal.target_role)
      .order('created_at', { ascending: false })
      .limit(5);

    // Fetch career graph nodes for analysis
    const { data: careerNodes } = await supabase
      .from('career_graph_nodes')
      .select('*')
      .eq('node_type', 'job')
      .ilike('title', `%${goal.target_role}%`)
      .limit(10);

    // AI Analysis using OpenAI
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const analysisPrompt = `
    As an AI career strategist, analyze this career goal and provide optimization recommendations:

    GOAL DETAILS:
    - Title: ${goal.title}
    - Target Role: ${goal.target_role}
    - Description: ${goal.description}
    - Current Progress: ${goal.current_progress}%
    - Target Date: ${goal.target_date}
    - Priority Score: ${goal.priority_score}

    MARKET DATA:
    - Recent Market Trends: ${JSON.stringify(marketTrends || [])}
    - Available Career Paths: ${JSON.stringify(careerNodes || [])}
    - Market Context: ${JSON.stringify(marketContext || {})}

    ANALYSIS REQUIRED:
    1. Market Score (0-100): How favorable is the current market for this goal?
    2. Difficulty Score (0-100): How challenging is this goal given current conditions?
    3. Success Probability (0-1): Likelihood of achieving this goal
    4. Recommended Timeline (weeks): Optimal timeline based on market conditions
    5. Skill Gap Analysis: Key skills needed and their importance
    6. Market Trends Analysis: Current market conditions affecting this goal
    7. AI Insights: Specific recommendations for optimization

    AUTONOMOUS ACTIONS TO CONSIDER:
    - Priority adjustment based on market conditions
    - Timeline optimization
    - Skill focus recommendations
    - Alternative path suggestions

    Return a JSON response with this exact structure:
    {
      "marketScore": number,
      "difficultyScore": number,
      "successProbability": number,
      "recommendedTimelineWeeks": number,
      "skillGapAnalysis": {
        "criticalSkills": ["skill1", "skill2"],
        "skillImportance": {"skill1": 0.9, "skill2": 0.8},
        "marketDemandBySkill": {"skill1": 0.85, "skill2": 0.75}
      },
      "marketTrends": {
        "demandTrend": "increasing|stable|decreasing",
        "salaryTrend": "increasing|stable|decreasing", 
        "competitionLevel": "low|medium|high",
        "emergingSkills": ["skill1", "skill2"]
      },
      "aiInsights": {
        "primaryRecommendation": "Main optimization advice",
        "actionableSteps": ["step1", "step2", "step3"],
        "riskFactors": ["risk1", "risk2"],
        "opportunities": ["opportunity1", "opportunity2"]
      },
      "autonomousActions": [
        {
          "type": "priority_adjustment|timeline_update|skill_focus",
          "description": "What action to take",
          "rationale": "Why this action is recommended",
          "confidence": 0.8
        }
      ]
    }
    `;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert AI career strategist specializing in goal optimization and market analysis. Always respond with valid JSON.' },
          { role: 'user', content: analysisPrompt }
        ],
        temperature: 0.3,
      }),
    });

    const aiData = await openAIResponse.json();
    let analysis;
    
    try {
      analysis = JSON.parse(aiData.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiData.choices[0].message.content);
      throw new Error('Invalid AI response format');
    }

    // Store intelligence cache
    const { error: cacheError } = await supabase
      .from('goal_intelligence_cache')
      .upsert({
        goal_id: goalId,
        user_id: userId,
        market_score: analysis.marketScore,
        difficulty_score: analysis.difficultyScore,
        success_probability: analysis.successProbability,
        recommended_timeline_weeks: analysis.recommendedTimelineWeeks,
        skill_gap_analysis: analysis.skillGapAnalysis,
        market_trends: analysis.marketTrends,
        ai_insights: analysis.aiInsights,
        last_analyzed_at: new Date().toISOString(),
      }, {
        onConflict: 'goal_id,user_id'
      });

    if (cacheError) {
      console.error('Failed to cache intelligence:', cacheError);
    }

    // Create autonomous actions
    if (analysis.autonomousActions && analysis.autonomousActions.length > 0) {
      for (const action of analysis.autonomousActions) {
        await supabase
          .from('goal_autonomous_actions')
          .insert({
            goal_id: goalId,
            user_id: userId,
            action_type: action.type,
            action_description: action.description,
            previous_state: { 
              priority_score: goal.priority_score,
              estimated_timeline_weeks: goal.estimated_timeline_weeks 
            },
            new_state: action.type === 'priority_adjustment' ? 
              { priority_score: Math.min(100, goal.priority_score + 10) } :
              action.type === 'timeline_update' ?
              { estimated_timeline_weeks: analysis.recommendedTimelineWeeks } :
              {},
            confidence_score: action.confidence || 0.8,
          });
      }
    }

    // Generate market alerts if needed
    if (analysis.marketTrends.demandTrend === 'decreasing' || analysis.marketTrends.competitionLevel === 'high') {
      await supabase
        .from('goal_market_alerts')
        .insert({
          goal_id: goalId,
          user_id: userId,
          alert_type: analysis.marketTrends.demandTrend === 'decreasing' ? 'demand_decrease' : 'high_competition',
          severity: analysis.marketTrends.demandTrend === 'decreasing' ? 'high' : 'medium',
          title: analysis.marketTrends.demandTrend === 'decreasing' ? 
            'Market Demand Declining' : 'High Competition Detected',
          description: analysis.aiInsights.primaryRecommendation,
          market_data: analysis.marketTrends,
          recommended_actions: analysis.aiInsights.actionableSteps,
        });
    }

    console.log('✅ Goal optimization completed successfully');

    return new Response(JSON.stringify({
      success: true,
      goalId,
      optimization: analysis,
      cached: true,
      autonomousActionsCreated: analysis.autonomousActions?.length || 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Goal optimization error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});