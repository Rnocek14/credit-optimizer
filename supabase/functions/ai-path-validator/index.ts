import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { pathNodes, userContext = {}, validationType = 'logical' } = await req.json();

    console.log(`🔍 Validating path with ${pathNodes?.length} nodes`);

    if (!pathNodes || pathNodes.length < 2) {
      throw new Error('Path must contain at least 2 nodes');
    }

    // Get detailed node information
    const nodeIds = pathNodes.map((n: any) => n.id || n);
    const { data: nodes, error } = await supabaseClient
      .from('career_graph_nodes')
      .select('*')
      .in('id', nodeIds);

    if (error) {
      throw new Error(`Error fetching nodes: ${error.message}`);
    }

    // Arrange nodes in path order
    const orderedNodes = nodeIds.map((id: string) => nodes?.find((n: any) => n.id === id)).filter(Boolean);

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const pathDescription = orderedNodes.map((node: any, i: number) => 
      `${i + 1}. ${node.node_type.toUpperCase()}: ${node.title} - ${node.description || 'No description'}`
    ).join('\n');

    const prompt = `Analyze this career learning path for logical flow and effectiveness:

CAREER PATH:
${pathDescription}

USER CONTEXT:
- Experience Level: ${userContext.experienceLevel || 'Unknown'}
- Current Skills: ${userContext.currentSkills?.join(', ') || 'Unknown'}
- Career Goal: ${userContext.careerGoal || 'Unknown'}
- Time Constraint: ${userContext.timeConstraint || 'Unknown'}

VALIDATION CRITERIA:
1. Logical Progression: Does each step build upon the previous?
2. Skill Dependencies: Are prerequisites properly ordered?
3. Difficulty Scaling: Is the complexity appropriate?
4. Relevance: How well does this path align with the career goal?
5. Efficiency: Are there unnecessary steps or better alternatives?
6. Practical Feasibility: Can this realistically be completed?

Provide validation results as JSON:
{
  "isValid": true/false,
  "overallScore": 0-100,
  "validationResults": {
    "logicalProgression": { "score": 0-100, "issues": ["issue1", "issue2"] },
    "skillDependencies": { "score": 0-100, "issues": [] },
    "difficultyScaling": { "score": 0-100, "issues": [] },
    "relevance": { "score": 0-100, "issues": [] },
    "efficiency": { "score": 0-100, "issues": [] },
    "feasibility": { "score": 0-100, "issues": [] }
  },
  "recommendations": [
    {
      "type": "reorder|add|remove|replace",
      "description": "What to change",
      "priority": "high|medium|low",
      "nodeIndex": 2
    }
  ],
  "estimatedTimeToCompletion": "6 months",
  "confidenceLevel": 85,
  "reasoning": "Overall assessment explanation"
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: 'You are an expert career path advisor. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 3000,
      }),
    });

    const aiResult = await response.json();
    console.log('🤖 Path validation complete');

    let validationResult;
    try {
      validationResult = JSON.parse(aiResult.choices[0].message.content);
    } catch (e) {
      console.error('Failed to parse AI response, using fallback validation');
      validationResult = createFallbackValidation(orderedNodes);
    }

    // Store validation results in database for future reference
    const { error: insertError } = await supabaseClient
      .from('path_validations')
      .insert({
        path_nodes: nodeIds,
        validation_result: validationResult,
        user_context: userContext,
        validation_type: validationType,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError && !insertError.message.includes('does not exist')) {
      console.warn('Could not store validation result:', insertError.message);
    }

    console.log(`✅ Path validation score: ${validationResult.overallScore}/100`);

    return new Response(
      JSON.stringify({
        success: true,
        pathNodes: orderedNodes,
        validation: validationResult,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Path validation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        validation: null
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function createFallbackValidation(nodes: any[]) {
  return {
    isValid: true,
    overallScore: 75,
    validationResults: {
      logicalProgression: { score: 80, issues: [] },
      skillDependencies: { score: 75, issues: ["Unable to verify all dependencies"] },
      difficultyScaling: { score: 70, issues: [] },
      relevance: { score: 80, issues: [] },
      efficiency: { score: 75, issues: [] },
      feasibility: { score: 80, issues: [] }
    },
    recommendations: [
      {
        type: "add",
        description: "Consider adding more foundational skills",
        priority: "medium",
        nodeIndex: 1
      }
    ],
    estimatedTimeToCompletion: `${Math.ceil(nodes.length * 1.5)} months`,
    confidenceLevel: 60,
    reasoning: "Fallback validation - manual review recommended"
  };
}