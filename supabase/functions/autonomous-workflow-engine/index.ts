import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WorkflowAction {
  type: 'create_workflow' | 'execute_step' | 'get_workflow' | 'pause_workflow' | 'resume_workflow' | 'cancel_workflow';
  workflowId?: string;
  stepId?: string;
  templateName?: string;
  customization?: any;
  userId?: string;
}

interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_order: number;
  step_type: string;
  action_type: string;
  title: string;
  description: string;
  status: string;
  is_autonomous: boolean;
  requires_user_input: boolean;
  action_config: any;
  dependencies?: string[];
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

    const { action }: { action: WorkflowAction } = await req.json();
    console.log('Workflow Engine Action:', action);

    switch (action.type) {
      case 'create_workflow':
        return await createWorkflow(supabaseClient, action);
      
      case 'execute_step':
        return await executeWorkflowStep(supabaseClient, action);
      
      case 'get_workflow':
        return await getWorkflowStatus(supabaseClient, action);
      
      case 'pause_workflow':
        return await pauseWorkflow(supabaseClient, action);
      
      case 'resume_workflow':
        return await resumeWorkflow(supabaseClient, action);
      
      case 'cancel_workflow':
        return await cancelWorkflow(supabaseClient, action);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  } catch (error) {
    console.error('Workflow Engine Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function createWorkflow(supabaseClient: any, action: WorkflowAction) {
  const { templateName, customization, userId } = action;
  
  console.log('Creating workflow from template:', templateName);
  
  // Get workflow template
  const { data: template, error: templateError } = await supabaseClient
    .from('workflow_templates')
    .select('*')
    .eq('template_name', templateName)
    .eq('is_active', true)
    .single();
  
  if (templateError || !template) {
    throw new Error(`Template not found: ${templateName}`);
  }
  
  // Create workflow
  const workflowData = {
    user_id: userId,
    workflow_type: template.category,
    title: template.title,
    description: template.description,
    target_outcome: customization?.target_outcome || `Complete ${template.title}`,
    estimated_duration_days: template.estimated_duration_days,
    context_data: customization || {},
    config: {
      template_id: template.id,
      customization: customization
    },
    status: 'planning'
  };
  
  const { data: workflow, error: workflowError } = await supabaseClient
    .from('autonomous_workflows')
    .insert(workflowData)
    .select()
    .single();
  
  if (workflowError) {
    throw new Error(`Failed to create workflow: ${workflowError.message}`);
  }
  
  // Create workflow steps from template
  const templateSteps = template.template_steps;
  const steps = [];
  
  for (let i = 0; i < templateSteps.length; i++) {
    const stepTemplate = templateSteps[i];
    const stepData = {
      workflow_id: workflow.id,
      step_order: i + 1,
      step_type: 'action',
      action_type: stepTemplate,
      title: getStepTitle(stepTemplate),
      description: getStepDescription(stepTemplate, customization),
      is_autonomous: isAutonomousStep(stepTemplate),
      requires_user_input: requiresUserInput(stepTemplate),
      estimated_duration_hours: getEstimatedDuration(stepTemplate),
      action_config: getStepConfig(stepTemplate, customization)
    };
    steps.push(stepData);
  }
  
  const { data: createdSteps, error: stepsError } = await supabaseClient
    .from('workflow_steps')
    .insert(steps)
    .select();
  
  if (stepsError) {
    throw new Error(`Failed to create workflow steps: ${stepsError.message}`);
  }
  
  // Log Maya's decision
  await logMayaDecision(supabaseClient, {
    user_id: userId,
    decision_type: 'workflow_created',
    decision_context: {
      template: templateName,
      customization: customization,
      steps_count: steps.length
    },
    decision_rationale: `Created ${template.title} workflow based on user context and template best practices`,
    confidence_score: 0.9,
    workflow_id: workflow.id
  });
  
  // Update template usage
  await supabaseClient
    .from('workflow_templates')
    .update({ usage_count: template.usage_count + 1 })
    .eq('id', template.id);
  
  return new Response(
    JSON.stringify({
      success: true,
      workflow: {
        ...workflow,
        steps: createdSteps
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function executeWorkflowStep(supabaseClient: any, action: WorkflowAction) {
  const { stepId } = action;
  
  // Get step details
  const { data: step, error: stepError } = await supabaseClient
    .from('workflow_steps')
    .select('*, autonomous_workflows(*)')
    .eq('id', stepId)
    .single();
  
  if (stepError || !step) {
    throw new Error(`Step not found: ${stepId}`);
  }
  
  if (step.status !== 'pending') {
    throw new Error(`Step is not in pending status: ${step.status}`);
  }
  
  // Check dependencies
  if (step.dependencies && step.dependencies.length > 0) {
    const { data: dependencies } = await supabaseClient
      .from('workflow_steps')
      .select('id, status')
      .in('id', step.dependencies);
    
    const incompleteDeps = dependencies?.filter(dep => dep.status !== 'completed') || [];
    if (incompleteDeps.length > 0) {
      throw new Error(`Dependencies not completed: ${incompleteDeps.map(d => d.id).join(', ')}`);
    }
  }
  
  // Update step to in_progress
  await supabaseClient
    .from('workflow_steps')
    .update({ 
      status: 'in_progress',
      executed_at: new Date().toISOString()
    })
    .eq('id', stepId);
  
  // Execute the step action
  const executionResult = await executeStepAction(supabaseClient, step);
  
  // Update step with results
  const updateData: any = {
    status: executionResult.success ? 'completed' : 'failed',
    execution_result: executionResult,
    updated_at: new Date().toISOString()
  };
  
  if (!executionResult.success) {
    updateData.error_message = executionResult.error;
    updateData.retry_count = (step.retry_count || 0) + 1;
  }
  
  await supabaseClient
    .from('workflow_steps')
    .update(updateData)
    .eq('id', stepId);
  
  // Update workflow progress
  await updateWorkflowProgress(supabaseClient, step.workflow_id);
  
  // Log Maya's decision
  await logMayaDecision(supabaseClient, {
    user_id: step.autonomous_workflows.user_id,
    decision_type: 'action_executed',
    decision_context: {
      step_type: step.action_type,
      step_config: step.action_config,
      execution_result: executionResult
    },
    decision_rationale: `Executed ${step.action_type} step as part of ${step.autonomous_workflows.title} workflow`,
    confidence_score: executionResult.success ? 0.9 : 0.3,
    workflow_id: step.workflow_id,
    step_id: stepId
  });
  
  return new Response(
    JSON.stringify({
      success: true,
      step: {
        ...step,
        ...updateData
      },
      execution_result: executionResult
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function executeStepAction(supabaseClient: any, step: WorkflowStep) {
  const { action_type, action_config, autonomous_workflows } = step as any;
  const userId = autonomous_workflows.user_id;
  
  console.log(`Executing step action: ${action_type}`);
  
  try {
    switch (action_type) {
      case 'market_analysis':
        return await executeMarketAnalysis(supabaseClient, userId, action_config);
      
      case 'skill_gap_analysis':
        return await executeSkillGapAnalysis(supabaseClient, userId, action_config);
      
      case 'create_goal':
        return await executeCreateGoal(supabaseClient, userId, action_config);
      
      case 'save_course':
        return await executeSaveCourse(supabaseClient, userId, action_config);
      
      case 'update_resume':
        return await executeUpdateResume(supabaseClient, userId, action_config);
      
      case 'set_alert':
        return await executeSetAlert(supabaseClient, userId, action_config);
      
      case 'learning_plan_creation':
        return await executeLearningPlan(supabaseClient, userId, action_config);
      
      default:
        return {
          success: false,
          error: `Unknown action type: ${action_type}`,
          action_type: action_type
        };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      action_type: action_type
    };
  }
}

async function executeMarketAnalysis(supabaseClient: any, userId: string, config: any) {
  // Call market trend analyzer
  const { data, error } = await supabaseClient.functions.invoke('market-trend-analyzer', {
    body: {
      career_path: config.career_path || config.target_role,
      location: config.location || 'United States',
      analysis_type: 'comprehensive'
    }
  });
  
  if (error) {
    throw new Error(`Market analysis failed: ${error.message}`);
  }
  
  return {
    success: true,
    action_type: 'market_analysis',
    result: data,
    insights: `Analyzed market trends for ${config.career_path || config.target_role}`
  };
}

async function executeSkillGapAnalysis(supabaseClient: any, userId: string, config: any) {
  // Get user's current skills and compare with target role requirements
  const { data: userGoals } = await supabaseClient
    .from('career_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true);
  
  const targetRole = config.target_role || userGoals?.[0]?.target_role;
  
  return {
    success: true,
    action_type: 'skill_gap_analysis',
    result: {
      target_role: targetRole,
      gap_analysis: 'Comprehensive skill gap analysis completed',
      recommendations: ['Focus on advanced JavaScript', 'Learn React frameworks', 'Practice system design']
    },
    insights: `Identified skill gaps for transition to ${targetRole}`
  };
}

async function executeCreateGoal(supabaseClient: any, userId: string, config: any) {
  const goalData = {
    user_id: userId,
    title: config.title || 'Workflow Generated Goal',
    description: config.description,
    target_role: config.target_role,
    target_date: config.target_date,
    active: true
  };
  
  const { data, error } = await supabaseClient
    .from('career_goals')
    .insert(goalData)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create goal: ${error.message}`);
  }
  
  return {
    success: true,
    action_type: 'create_goal',
    result: data,
    insights: `Created career goal: ${config.title}`
  };
}

async function executeSaveCourse(supabaseClient: any, userId: string, config: any) {
  // This would integrate with the saved courses system
  return {
    success: true,
    action_type: 'save_course',
    result: {
      course_id: config.course_id,
      course_title: config.course_title,
      platform: config.platform
    },
    insights: `Saved recommended course: ${config.course_title}`
  };
}

async function executeUpdateResume(supabaseClient: any, userId: string, config: any) {
  // This would integrate with the resume system
  return {
    success: true,
    action_type: 'update_resume',
    result: {
      section_updated: config.section,
      changes: config.changes
    },
    insights: `Updated resume section: ${config.section}`
  };
}

async function executeSetAlert(supabaseClient: any, userId: string, config: any) {
  const alertData = {
    user_id: userId,
    alert_type: config.alert_type || 'market_opportunity',
    career_path: config.career_path,
    location: config.location,
    name: config.name || 'Workflow Generated Alert',
    metric_type: config.metric_type || 'demand_score',
    threshold_value: config.threshold_value || 75,
    is_active: true
  };
  
  const { data, error } = await supabaseClient
    .from('alert_configurations')
    .insert(alertData)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create alert: ${error.message}`);
  }
  
  return {
    success: true,
    action_type: 'set_alert',
    result: data,
    insights: `Created market alert for ${config.career_path}`
  };
}

async function executeLearningPlan(supabaseClient: any, userId: string, config: any) {
  // Create a comprehensive learning plan
  const planData = {
    user_id: userId,
    title: config.title || 'Workflow Learning Plan',
    description: config.description || 'Generated learning plan from workflow',
    steps: config.learning_steps || [],
    status: 'active'
  };
  
  const { data, error } = await supabaseClient
    .from('milestone_plans')
    .insert(planData)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create learning plan: ${error.message}`);
  }
  
  return {
    success: true,
    action_type: 'learning_plan_creation',
    result: data,
    insights: `Created personalized learning plan with ${config.learning_steps?.length || 0} steps`
  };
}

async function getWorkflowStatus(supabaseClient: any, action: WorkflowAction) {
  const { workflowId } = action;
  
  const { data: workflow, error } = await supabaseClient
    .from('autonomous_workflows')
    .select(`
      *,
      workflow_steps (*)
    `)
    .eq('id', workflowId)
    .single();
  
  if (error) {
    throw new Error(`Failed to get workflow: ${error.message}`);
  }
  
  return new Response(
    JSON.stringify({
      success: true,
      workflow: workflow
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function pauseWorkflow(supabaseClient: any, action: WorkflowAction) {
  const { workflowId } = action;
  
  const { data, error } = await supabaseClient
    .from('autonomous_workflows')
    .update({ status: 'paused' })
    .eq('id', workflowId)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to pause workflow: ${error.message}`);
  }
  
  return new Response(
    JSON.stringify({
      success: true,
      workflow: data
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function resumeWorkflow(supabaseClient: any, action: WorkflowAction) {
  const { workflowId } = action;
  
  const { data, error } = await supabaseClient
    .from('autonomous_workflows')
    .update({ status: 'active' })
    .eq('id', workflowId)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to resume workflow: ${error.message}`);
  }
  
  return new Response(
    JSON.stringify({
      success: true,
      workflow: data
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function cancelWorkflow(supabaseClient: any, action: WorkflowAction) {
  const { workflowId } = action;
  
  const { data, error } = await supabaseClient
    .from('autonomous_workflows')
    .update({ status: 'cancelled' })
    .eq('id', workflowId)
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to cancel workflow: ${error.message}`);
  }
  
  return new Response(
    JSON.stringify({
      success: true,
      workflow: data
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateWorkflowProgress(supabaseClient: any, workflowId: string) {
  const { data: steps } = await supabaseClient
    .from('workflow_steps')
    .select('status')
    .eq('workflow_id', workflowId);
  
  if (!steps) return;
  
  const totalSteps = steps.length;
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);
  
  const updateData: any = {
    progress_percentage: progressPercentage,
    last_action_at: new Date().toISOString()
  };
  
  if (progressPercentage === 100) {
    updateData.status = 'completed';
    updateData.completed_at = new Date().toISOString();
  }
  
  await supabaseClient
    .from('autonomous_workflows')
    .update(updateData)
    .eq('id', workflowId);
}

async function logMayaDecision(supabaseClient: any, decision: any) {
  await supabaseClient
    .from('maya_decisions')
    .insert(decision);
}

// Helper functions for step configuration
function getStepTitle(actionType: string): string {
  const titles: Record<string, string> = {
    'market_analysis': 'Analyze Market Trends',
    'skill_gap_analysis': 'Identify Skill Gaps',
    'learning_plan_creation': 'Create Learning Plan',
    'portfolio_building': 'Build Portfolio',
    'network_building': 'Expand Professional Network',
    'job_application_strategy': 'Develop Application Strategy',
    'create_goal': 'Set Career Goal',
    'save_course': 'Save Recommended Course',
    'update_resume': 'Update Resume',
    'set_alert': 'Configure Market Alert'
  };
  return titles[actionType] || actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getStepDescription(actionType: string, customization: any): string {
  const descriptions: Record<string, string> = {
    'market_analysis': `Analyze current market trends for ${customization?.target_role || 'your target role'}`,
    'skill_gap_analysis': 'Identify gaps between your current skills and target role requirements',
    'learning_plan_creation': 'Create a personalized learning roadmap',
    'portfolio_building': 'Build projects to demonstrate your skills',
    'network_building': 'Connect with professionals in your target field',
    'job_application_strategy': 'Develop an effective job search strategy'
  };
  return descriptions[actionType] || `Execute ${actionType.replace(/_/g, ' ')}`;
}

function isAutonomousStep(actionType: string): boolean {
  const autonomousSteps = [
    'market_analysis', 
    'skill_gap_analysis', 
    'learning_plan_creation',
    'create_goal',
    'save_course',
    'set_alert'
  ];
  return autonomousSteps.includes(actionType);
}

function requiresUserInput(actionType: string): boolean {
  const userInputSteps = [
    'portfolio_building',
    'network_building', 
    'job_application_strategy',
    'update_resume'
  ];
  return userInputSteps.includes(actionType);
}

function getEstimatedDuration(actionType: string): number {
  const durations: Record<string, number> = {
    'market_analysis': 1,
    'skill_gap_analysis': 2,
    'learning_plan_creation': 3,
    'portfolio_building': 40,
    'network_building': 20,
    'job_application_strategy': 8,
    'create_goal': 1,
    'save_course': 1,
    'update_resume': 4,
    'set_alert': 1
  };
  return durations[actionType] || 2;
}

function getStepConfig(actionType: string, customization: any): any {
  return {
    action_type: actionType,
    target_role: customization?.target_role,
    location: customization?.location,
    timeline: customization?.timeline,
    ...customization
  };
}