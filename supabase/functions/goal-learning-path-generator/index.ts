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
    const { goalId, userId, pathType = 'primary' } = await req.json();
    
    console.log('🛤️ Generating learning path for goal:', { goalId, userId, pathType });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch goal and intelligence cache
    const { data: goal, error: goalError } = await supabase
      .from('career_goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();

    if (goalError || !goal) {
      throw new Error(`Goal not found: ${goalError?.message}`);
    }

    // Fetch intelligence cache for enhanced context
    const { data: intelligence } = await supabase
      .from('goal_intelligence_cache')
      .select('*')
      .eq('goal_id', goalId)
      .eq('user_id', userId)
      .single();

    // Fetch relevant career graph nodes and edges
    const { data: careerNodes } = await supabase
      .from('career_graph_nodes')
      .select('*')
      .or(`node_type.eq.skill,node_type.eq.course,node_type.eq.certification,node_type.eq.project`)
      .eq('active', true)
      .limit(50);

    const { data: careerEdges } = await supabase
      .from('career_graph_edges')
      .select('*')
      .limit(100);

    // Call semantic planning engine for path generation
    const { data: semanticPaths, error: planningError } = await supabase.functions.invoke(
      'semantic-planning-engine',
      {
        body: {
          operation: 'generate_enhanced_plan',
          targetJob: goal.target_role,
          userContext: {
            userId,
            currentSkills: goal.skill_gaps || [],
            experienceLevel: 'intermediate',
            preferredLearningStyle: 'mixed',
            timeConstraints: {
              hoursPerWeek: 10,
              targetCompletionWeeks: goal.estimated_timeline_weeks || 12
            },
            budgetConstraints: {
              maxCost: 2000
            }
          }
        }
      }
    );

    if (planningError) {
      console.log('Semantic planning engine not available, generating basic path');
    }

    // AI-Enhanced Path Generation
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const pathPrompt = `
    Generate an optimized learning path for this career goal:

    GOAL CONTEXT:
    - Target Role: ${goal.target_role}
    - Current Skills: ${JSON.stringify(goal.skill_gaps || [])}
    - Timeline: ${goal.estimated_timeline_weeks || 12} weeks
    - Path Type: ${pathType}
    - Intelligence: ${JSON.stringify(intelligence?.ai_insights || {})}

    AVAILABLE RESOURCES:
    - Career Nodes: ${JSON.stringify(careerNodes || [])}
    - Semantic Paths: ${JSON.stringify(semanticPaths?.data || [])}

    PATH REQUIREMENTS:
    - ${pathType === 'primary' ? 'Most direct and efficient path' : 
        pathType === 'alternative' ? 'Alternative approach with different skill focus' :
        'Accelerated path for faster completion'}

    Generate a personalized learning path with this structure:
    {
      "pathNodes": [
        {
          "id": "unique_node_id",
          "type": "skill|course|certification|project",
          "title": "Node Title",
          "description": "Detailed description",
          "estimatedWeeks": number,
          "difficulty": 1-5,
          "prerequisites": ["node_id1", "node_id2"],
          "costEstimate": number,
          "importance": 0.1-1.0,
          "marketRelevance": 0.1-1.0,
          "personalizedReason": "Why this is important for the user"
        }
      ],
      "pathMetrics": {
        "totalWeeks": number,
        "totalCost": number,
        "difficultyProgression": [1, 2, 3, 4, 5],
        "successRate": 0.1-1.0,
        "personalizationScore": 0.1-1.0,
        "marketAlignmentScore": 0.1-1.0
      },
      "pathStrategy": {
        "focusAreas": ["area1", "area2"],
        "learningApproach": "project-based|theoretical|mixed",
        "keyMilestones": ["milestone1", "milestone2"],
        "riskMitigation": ["risk1", "risk2"]
      }
    }
    `;

    const pathResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert learning path designer. Create personalized, efficient learning paths. Always respond with valid JSON.' },
          { role: 'user', content: pathPrompt }
        ],
        temperature: 0.4,
      }),
    });

    const pathData = await pathResponse.json();
    let generatedPath;
    
    try {
      generatedPath = JSON.parse(pathData.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse path response:', pathData.choices[0].message.content);
      throw new Error('Invalid path generation response');
    }

    // Store the learning path
    const { data: savedPath, error: saveError } = await supabase
      .from('goal_learning_paths')
      .insert({
        goal_id: goalId,
        user_id: userId,
        path_type: pathType,
        path_nodes: generatedPath.pathNodes,
        estimated_completion_weeks: generatedPath.pathMetrics.totalWeeks,
        cost_estimate: generatedPath.pathMetrics.totalCost,
        difficulty_level: Math.ceil(generatedPath.pathMetrics.difficultyProgression.reduce((a, b) => a + b, 0) / generatedPath.pathMetrics.difficultyProgression.length),
        success_rate: generatedPath.pathMetrics.successRate,
        personalization_score: generatedPath.pathMetrics.personalizationScore,
        market_alignment_score: generatedPath.pathMetrics.marketAlignmentScore,
        generated_by: 'ai_enhanced',
        is_active: true,
      })
      .select()
      .single();

    if (saveError) {
      throw new Error(`Failed to save learning path: ${saveError.message}`);
    }

    // Generate progress milestones
    const milestones = generatedPath.pathNodes.map((node: any, index: number) => ({
      goal_id: goalId,
      title: `Complete ${node.title}`,
      description: node.description,
      order_index: index,
      completed: false,
    }));

    const { error: milestonesError } = await supabase
      .from('goal_progress')
      .insert(milestones);

    if (milestonesError) {
      console.error('Failed to create milestones:', milestonesError);
    }

    console.log('✅ Learning path generated successfully');

    return new Response(JSON.stringify({
      success: true,
      learningPath: {
        id: savedPath.id,
        pathType,
        nodes: generatedPath.pathNodes,
        metrics: generatedPath.pathMetrics,
        strategy: generatedPath.pathStrategy,
      },
      milestonesCreated: milestones.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Learning path generation error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});