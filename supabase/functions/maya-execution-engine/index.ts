import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExecutionRequest {
  userId: string;
  workflowId: string;
  stepId?: string;
  action: 'execute_step' | 'validate_progress' | 'generate_explanation';
  context?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, workflowId, stepId, action, context }: ExecutionRequest = await req.json();

    console.log(`Maya execution: ${action} for user ${userId}, workflow ${workflowId}`);

    switch (action) {
      case 'execute_step':
        return await executeWorkflowStep(supabaseClient, userId, workflowId, stepId!, context);
      
      case 'validate_progress':
        return await validateProgress(supabaseClient, userId, workflowId);
      
      case 'generate_explanation':
        return await generateExplanation(supabaseClient, userId, workflowId, stepId!, context);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in maya-execution-engine:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function executeWorkflowStep(supabase: any, userId: string, workflowId: string, stepId: string, context: any) {
  // Get workflow and step details
  const { data: workflow } = await supabase
    .from('autonomous_workflows')
    .select('*')
    .eq('id', workflowId)
    .eq('user_id', userId)
    .single();

  if (!workflow) {
    throw new Error('Workflow not found');
  }

  // Execute step based on workflow type
  let result;
  switch (workflow.workflow_type) {
    case 'career_transition':
      result = await executeCareerTransitionStep(supabase, userId, stepId, context);
      break;
    case 'skill_development':
      result = await executeSkillDevelopmentStep(supabase, userId, stepId, context);
      break;
    case 'market_analysis':
      result = await executeMarketAnalysisStep(supabase, userId, stepId, context);
      break;
    default:
      result = await executeGenericStep(supabase, userId, stepId, context);
  }

  // Update workflow progress
  const newProgress = Math.min(100, workflow.progress_percentage + 10);
  await supabase
    .from('autonomous_workflows')
    .update({ 
      progress_percentage: newProgress,
      last_action_at: new Date().toISOString(),
      status: newProgress >= 100 ? 'completed' : 'in_progress'
    })
    .eq('id', workflowId);

  return new Response(
    JSON.stringify({
      success: true,
      result,
      newProgress,
      explanation: `Step completed: ${result.title || 'Workflow step'}`,
      nextActions: result.nextActions || []
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function executeCareerTransitionStep(supabase: any, userId: string, stepId: string, context: any) {
  // Simulate career transition step execution
  const steps = {
    'skill_gap_analysis': {
      title: 'Skill Gap Analysis',
      action: 'Analyzed current skills vs target role requirements',
      nextActions: ['Update skill profile', 'Enroll in recommended courses']
    },
    'transition_planning': {
      title: 'Transition Planning',
      action: 'Created detailed transition timeline',
      nextActions: ['Set learning milestones', 'Update resume']
    },
    'market_research': {
      title: 'Market Research',
      action: 'Researched target role market conditions',
      nextActions: ['Apply to relevant positions', 'Network with professionals']
    }
  };

  return steps[stepId as keyof typeof steps] || {
    title: 'Generic Step',
    action: 'Completed workflow step',
    nextActions: ['Continue to next step']
  };
}

async function executeSkillDevelopmentStep(supabase: any, userId: string, stepId: string, context: any) {
  // Simulate skill development step execution
  return {
    title: 'Skill Development',
    action: 'Updated skill progress and recommendations',
    nextActions: ['Practice new skills', 'Take assessment']
  };
}

async function executeMarketAnalysisStep(supabase: any, userId: string, stepId: string, context: any) {
  // Simulate market analysis step execution
  return {
    title: 'Market Analysis',
    action: 'Generated market insights and recommendations',
    nextActions: ['Review market trends', 'Adjust career strategy']
  };
}

async function executeGenericStep(supabase: any, userId: string, stepId: string, context: any) {
  return {
    title: 'Workflow Step',
    action: 'Completed automated workflow step',
    nextActions: ['Review results', 'Continue workflow']
  };
}

async function validateProgress(supabase: any, userId: string, workflowId: string) {
  const { data: workflow } = await supabase
    .from('autonomous_workflows')
    .select('*')
    .eq('id', workflowId)
    .eq('user_id', userId)
    .single();

  return new Response(
    JSON.stringify({
      valid: true,
      progress: workflow?.progress_percentage || 0,
      status: workflow?.status || 'planning',
      recommendations: [
        'Continue with current workflow',
        'Consider adding additional steps',
        'Review progress regularly'
      ]
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function generateExplanation(supabase: any, userId: string, workflowId: string, stepId: string, context: any) {
  const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
  
  if (!OPENAI_API_KEY) {
    return new Response(
      JSON.stringify({
        explanation: 'This step helps advance your career goals through automated analysis and recommendations.',
        reasoning: 'Maya uses AI to identify optimal next steps based on your career trajectory.',
        confidence: 0.8
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get workflow context
  const { data: workflow } = await supabase
    .from('autonomous_workflows')
    .select('*')
    .eq('id', workflowId)
    .single();

  const prompt = `Explain why this workflow step is important for the user's career development:
    
    Workflow Type: ${workflow?.workflow_type}
    Target Outcome: ${workflow?.target_outcome}
    Current Progress: ${workflow?.progress_percentage}%
    Step Context: ${JSON.stringify(context)}
    
    Provide a clear, actionable explanation of:
    1. Why this step matters
    2. How it fits into their career journey
    3. What specific benefits they'll gain
    
    Keep it concise and motivating.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are Maya, an AI career co-pilot. Provide clear, actionable explanations.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.7
      }),
    });

    const data = await response.json();
    const explanation = data.choices[0].message.content;

    return new Response(
      JSON.stringify({
        explanation,
        reasoning: 'Generated using AI analysis of your career context',
        confidence: 0.9,
        source: 'maya_ai'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('OpenAI error:', error);
    return new Response(
      JSON.stringify({
        explanation: 'This step is designed to advance your career goals through targeted action and analysis.',
        reasoning: 'Maya recommends this based on your career trajectory and industry best practices.',
        confidence: 0.7
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}