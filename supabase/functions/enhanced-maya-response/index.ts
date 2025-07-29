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
    const { request, userId, context } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('🤖 Enhanced Maya processing request:', request);

    // Phase 1: Analyze request complexity and type
    const requestAnalysis = await analyzeRequestComplexity(request, context);
    
    // Phase 2: Gather comprehensive real-time data
    const realTimeData = await gatherRealTimeIntelligence(supabase, userId, context, requestAnalysis);
    
    // Phase 3: Generate enhanced prompt with all data
    const enhancedPrompt = generateDataDrivenPrompt(request, context, realTimeData, requestAnalysis);
    
    // Phase 4: Call OpenAI with enhanced context
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: enhancedPrompt.systemPrompt
          },
          {
            role: 'user',
            content: enhancedPrompt.enhancedRequest
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Phase 5: Execute autonomous actions if needed
    const autonomousActions = await executeAutonomousActions(
      supabase, 
      userId, 
      requestAnalysis, 
      realTimeData,
      aiResponse
    );

    return new Response(
      JSON.stringify({
        response: aiResponse,
        realTimeData,
        autonomousActions,
        requestAnalysis,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in enhanced Maya response:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function analyzeRequestComplexity(request: string, context: any) {
  const complexity = {
    isCareerTransition: /become.*?(in|within|over).*?(months?|years?)/i.test(request),
    requiresMarketData: /(market|salary|demand|trends?)/i.test(request),
    requiresSkillAnalysis: /(skills?|gap|learning|training)/i.test(request),
    requiresAlerts: /(alert|monitor|notify)/i.test(request),
    hasTimeframe: /(\d+)\s+(months?|years?|weeks?)/i.test(request),
    isMultiStep: request.split('.').length > 2 || request.split(',').length > 3,
    complexityScore: 0
  };

  complexity.complexityScore = Object.values(complexity).filter(v => v === true).length;

  const requestType = complexity.isCareerTransition ? 'career_transition' :
                     complexity.requiresMarketData ? 'market_analysis' :
                     complexity.requiresSkillAnalysis ? 'skill_development' :
                     'general_guidance';

  return {
    ...complexity,
    requestType,
    shouldCreateWorkflow: complexity.complexityScore >= 3,
    priority: complexity.complexityScore >= 4 ? 'high' : complexity.complexityScore >= 2 ? 'medium' : 'low'
  };
}

async function gatherRealTimeIntelligence(supabase: any, userId: string, context: any, analysis: any) {
  const intelligence = {
    marketData: null,
    skillGaps: null,
    opportunities: null,
    alerts: null,
    predictions: null,
    personalized: null
  };

  try {
    // Parallel data gathering for efficiency
    const dataPromises = [];

    if (analysis.requiresMarketData && context.goals?.[0]?.target_role) {
      dataPromises.push(
        fetchCurrentMarketIntelligence(supabase, context.goals[0].target_role)
          .then(data => intelligence.marketData = data)
      );
    }

    if (analysis.requiresSkillAnalysis) {
      dataPromises.push(
        performRealTimeSkillAnalysis(supabase, userId, context)
          .then(data => intelligence.skillGaps = data)
      );
    }

    if (analysis.isCareerTransition) {
      dataPromises.push(
        identifyCareerOpportunities(supabase, context)
          .then(data => intelligence.opportunities = data)
      );
    }

    if (analysis.requiresAlerts) {
      dataPromises.push(
        fetchUserAlertStatus(supabase, userId)
          .then(data => intelligence.alerts = data)
      );
    }

    // Generate predictions for complex requests
    if (analysis.complexityScore >= 3) {
      dataPromises.push(
        generateCareerPredictions(supabase, context)
          .then(data => intelligence.predictions = data)
      );
    }

    // Always fetch personalized insights
    dataPromises.push(
      getPersonalizedCareerInsights(supabase, userId, context)
        .then(data => intelligence.personalized = data)
    );

    await Promise.all(dataPromises);
    
    console.log('📊 Real-time intelligence gathered:', Object.keys(intelligence).filter(k => intelligence[k]));
    
    return intelligence;
  } catch (error) {
    console.error('Error gathering real-time intelligence:', error);
    return intelligence;
  }
}

async function fetchCurrentMarketIntelligence(supabase: any, targetRole: string) {
  try {
    // Fetch latest market trends
    const { data: trends } = await supabase
      .from('market_trends')
      .select('*')
      .ilike('career_path', `%${targetRole}%`)
      .order('updated_at', { ascending: false })
      .limit(3);

    // Fetch salary data
    const { data: salaryData } = await supabase
      .from('career_location_multipliers')
      .select('*')
      .ilike('career_path_id', `%${targetRole}%`)
      .limit(5);

    return {
      currentDemand: trends?.[0]?.demand_score || 0,
      averageSalary: trends?.[0]?.average_salary || 0,
      growthRate: trends?.[0]?.growth_rate || 0,
      jobPostings: trends?.[0]?.job_postings_count || 0,
      competitionLevel: trends?.[0]?.competition_level || 'medium',
      topLocations: salaryData?.slice(0, 3).map(item => ({
        location: item.location_id,
        multiplier: item.salary_multiplier
      })) || [],
      lastUpdated: trends?.[0]?.updated_at || null
    };
  } catch (error) {
    console.error('Error fetching market intelligence:', error);
    return null;
  }
}

async function performRealTimeSkillAnalysis(supabase: any, userId: string, context: any) {
  try {
    const targetRole = context.goals?.[0]?.target_role;
    if (!targetRole) return null;

    // Fetch required skills from career graph
    const { data: roleSkills } = await supabase
      .from('career_graph_nodes')
      .select('semantic_tags, description')
      .ilike('title', `%${targetRole}%`)
      .eq('node_type', 'job')
      .limit(1);

    const requiredSkills = roleSkills?.[0]?.semantic_tags || [];
    const currentSkills = context.profile?.skills || [];

    // Calculate skill gaps
    const missingSkills = requiredSkills.filter(skill => 
      !currentSkills.some(current => 
        current.toLowerCase().includes(skill.toLowerCase())
      )
    );

    const matchingSkills = requiredSkills.filter(skill => 
      currentSkills.some(current => 
        current.toLowerCase().includes(skill.toLowerCase())
      )
    );

    const skillScore = requiredSkills.length > 0 
      ? Math.round((matchingSkills.length / requiredSkills.length) * 100)
      : 0;

    return {
      skillAlignment: skillScore,
      missingSkills: missingSkills.slice(0, 5),
      matchingSkills,
      criticalGaps: missingSkills.slice(0, 3),
      recommendedActions: missingSkills.slice(0, 3).map(skill => 
        `Learn ${skill} through practical projects`
      )
    };
  } catch (error) {
    console.error('Error performing skill analysis:', error);
    return null;
  }
}

async function identifyCareerOpportunities(supabase: any, context: any) {
  try {
    const currentRole = context.profile?.role_title || 'Current Role';
    const targetRole = context.goals?.[0]?.target_role;
    
    if (!targetRole) return null;

    // Find career paths and opportunities
    const { data: careerPaths } = await supabase
      .from('career_graph_edges')
      .select(`
        *,
        from_node:career_graph_nodes!career_graph_edges_from_id_fkey(title, node_type),
        to_node:career_graph_nodes!career_graph_edges_to_id_fkey(title, node_type)
      `)
      .eq('to_node.title', targetRole)
      .order('success_rate', { ascending: false })
      .limit(5);

    return {
      pathways: careerPaths?.map(path => ({
        from: path.from_node?.title,
        to: path.to_node?.title,
        successRate: path.success_rate,
        timeEstimate: path.time_cost_hours ? `${Math.round(path.time_cost_hours / 40)} weeks` : 'Unknown',
        difficulty: path.difficulty_multiplier
      })) || [],
      recommendations: [
        'Focus on high-impact skills',
        'Build portfolio projects',
        'Network in target industry'
      ]
    };
  } catch (error) {
    console.error('Error identifying opportunities:', error);
    return null;
  }
}

async function fetchUserAlertStatus(supabase: any, userId: string) {
  try {
    const { data: alerts } = await supabase
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
      .limit(3);

    return {
      activeAlerts: alerts?.length || 0,
      unreadAlerts: recentAlerts?.length || 0,
      alertTypes: alerts?.map(a => a.alert_type) || [],
      recentAlerts: recentAlerts?.map(a => ({
        type: a.alert_type,
        message: a.alert_message,
        triggeredAt: a.triggered_at
      })) || []
    };
  } catch (error) {
    console.error('Error fetching alert status:', error);
    return null;
  }
}

async function generateCareerPredictions(supabase: any, context: any) {
  try {
    // Call predictive analysis edge function
    const { data, error } = await supabase.functions.invoke('generate-predictive-analysis', {
      body: {
        careerPath: context.goals?.[0]?.target_role || 'Software Engineer',
        location: context.marketPreferences?.preferredLocations?.[0] || 'United States',
        timeHorizon: '6months'
      }
    });

    if (error) throw error;

    return {
      demandForecast: data?.predictions?.demand_forecast || null,
      salaryProjection: data?.predictions?.salary_projection || null,
      marketDynamics: data?.predictions?.market_dynamics || null,
      confidence: data?.accuracy_score || 0.7
    };
  } catch (error) {
    console.error('Error generating predictions:', error);
    return null;
  }
}

async function getPersonalizedCareerInsights(supabase: any, userId: string, context: any) {
  try {
    const { data, error } = await supabase.functions.invoke('personalized-market-insights', {
      body: { user_id: userId }
    });

    if (error) throw error;

    return {
      recommendations: data?.recommendations?.slice(0, 3) || [],
      nextSteps: data?.next_steps || [],
      timingAdvice: data?.timing_advice || 'Continue current development',
      readinessScore: Math.round((context.criScore + context.readinessScore) / 2) || 0
    };
  } catch (error) {
    console.error('Error getting personalized insights:', error);
    return null;
  }
}

function generateDataDrivenPrompt(request: string, context: any, realTimeData: any, analysis: any) {
  const marketInsights = realTimeData.marketData ? `
CURRENT MARKET CONDITIONS:
- Demand Score: ${realTimeData.marketData.currentDemand}/10
- Average Salary: $${Math.round(realTimeData.marketData.averageSalary / 1000)}k
- Growth Rate: ${realTimeData.marketData.growthRate}%
- Job Postings: ${realTimeData.marketData.jobPostings}
- Competition: ${realTimeData.marketData.competitionLevel}
` : '';

  const skillInsights = realTimeData.skillGaps ? `
SKILL ANALYSIS:
- Current Alignment: ${realTimeData.skillGaps.skillAlignment}%
- Missing Critical Skills: ${realTimeData.skillGaps.criticalGaps?.join(', ') || 'None identified'}
- Immediate Actions: ${realTimeData.skillGaps.recommendedActions?.join(', ') || 'Continue current progress'}
` : '';

  const predictionInsights = realTimeData.predictions ? `
MARKET PREDICTIONS:
- 6-Month Demand Trend: ${realTimeData.predictions.demandForecast?.trend_direction || 'Stable'}
- Salary Outlook: ${realTimeData.predictions.salaryProjection?.expected_change_6m || 0}% change expected
- Market Confidence: ${Math.round(realTimeData.predictions.confidence * 100)}%
` : '';

  const personalizedInsights = realTimeData.personalized ? `
PERSONALIZED RECOMMENDATIONS:
- Career Readiness: ${realTimeData.personalized.readinessScore}%
- Timing Advice: ${realTimeData.personalized.timingAdvice}
- Top Recommendations: ${realTimeData.personalized.recommendations?.slice(0, 2).map(r => r.title).join(', ') || 'Continue progress'}
` : '';

  const systemPrompt = `You are Maya, an advanced AI career mentor with REAL-TIME market intelligence and autonomous workflow capabilities.

USER CONTEXT:
- Name: ${context.profile?.name || 'User'}
- Current Level: ${context.level?.current_level || 1}
- Target Role: ${context.goals?.[0]?.target_role || 'Not specified'}
- Current Skills: ${context.profile?.skills?.join(', ') || 'None listed'}
${marketInsights}${skillInsights}${predictionInsights}${personalizedInsights}

REQUEST ANALYSIS:
- Type: ${analysis.requestType}
- Complexity: ${analysis.complexityScore}/7
- Priority: ${analysis.priority}
- Should Create Workflow: ${analysis.shouldCreateWorkflow}

ENHANCED CAPABILITIES:
- You have access to real-time market data and can provide current salary ranges, demand scores, and growth projections
- You can perform instant skill gap analysis and recommend specific development paths
- You can create autonomous workflows for complex career transitions
- You can set up market alerts and monitoring systems
- You provide data-driven insights, not generic advice

RESPONSE GUIDELINES:
1. Use the real-time data above to provide specific, current insights
2. Reference actual market conditions and salary data when available
3. Provide concrete next steps based on skill gap analysis
4. If this is a complex request, offer to create an autonomous workflow
5. Be encouraging but realistic based on current market data
6. Always provide actionable advice with specific timelines`;

  const enhancedRequest = `Original request: "${request}"

Additional context for enhanced response:
- User's current market position relative to target role
- Real-time demand and salary data for target position
- Specific skill gaps that need to be addressed
- Market timing considerations for career moves

Please provide a comprehensive, data-driven response that addresses the request with specific, actionable guidance.`;

  return {
    systemPrompt,
    enhancedRequest
  };
}

async function executeAutonomousActions(
  supabase: any, 
  userId: string, 
  analysis: any, 
  realTimeData: any,
  aiResponse: string
) {
  const actions = [];

  try {
    // Create autonomous workflow for complex requests
    if (analysis.shouldCreateWorkflow && analysis.isCareerTransition) {
      console.log('🚀 Creating autonomous career transition workflow');
      
      const { data: workflow, error } = await supabase.functions.invoke('autonomous-workflow-engine', {
        body: {
          action: 'create_workflow',
          userId,
          templateName: 'career_transition_accelerated',
          customization: {
            targetRole: realTimeData.opportunities?.pathways?.[0]?.to || 'Target Role',
            currentMarketData: realTimeData.marketData,
            skillGaps: realTimeData.skillGaps?.criticalGaps || [],
            timeframe: '3 months'
          }
        }
      });

      if (!error && workflow) {
        actions.push({
          type: 'workflow_created',
          id: workflow.workflow?.id,
          title: workflow.workflow?.title,
          steps: workflow.workflow?.estimated_duration_days
        });
      }
    }

    // Set up market alerts if requested
    if (analysis.requiresAlerts && realTimeData.marketData) {
      console.log('⚠️ Setting up market alerts');
      
      const { data: alert, error } = await supabase
        .from('alert_configurations')
        .insert({
          user_id: userId,
          name: 'Career Demand Alert',
          alert_type: 'demand_change',
          career_path: realTimeData.marketData.currentRole || 'General',
          location: 'United States',
          metric_type: 'demand_score',
          threshold_value: Math.max(realTimeData.marketData.currentDemand - 2, 1),
          comparison_operator: '<',
          time_window: '7d'
        })
        .select()
        .single();

      if (!error && alert) {
        actions.push({
          type: 'alert_created',
          id: alert.id,
          name: alert.name,
          threshold: alert.threshold_value
        });
      }
    }

    console.log('✅ Autonomous actions executed:', actions.length);
    return actions;
  } catch (error) {
    console.error('Error executing autonomous actions:', error);
    return actions;
  }
}