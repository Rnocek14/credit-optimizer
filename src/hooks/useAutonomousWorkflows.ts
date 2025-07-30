import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AutonomousWorkflow {
  id: string;
  user_id: string;
  workflow_type: string;
  title: string;
  description: string;
  target_outcome: string;
  status: string;
  priority: string;
  estimated_duration_days: number;
  target_completion_date: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  context_data: any;
  config: any;
  progress_percentage: number;
  last_action_at: string;
  workflow_steps?: WorkflowStep[];
}

export interface WorkflowStep {
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
  estimated_duration_hours: number;
  action_config: any;
  execution_result?: any;
  error_message?: string;
  created_at: string;
  updated_at: string;
  executed_at?: string;
  dependencies?: string[];
  retry_count: number;
  max_retries: number;
}

export interface WorkflowTemplate {
  id: string;
  template_name: string;
  title: string;
  description: string;
  category: string;
  target_personas: any;
  estimated_duration_days: number;
  success_rate: number;
  template_steps: any;
  required_context: any;
  is_active: boolean;
  usage_count: number;
}

export function useAutonomousWorkflows() {
  const [workflows, setWorkflows] = useState<AutonomousWorkflow[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchUserWorkflows = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('autonomous_workflows')
        .select(`
          *,
          workflow_steps (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setWorkflows(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching workflows:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWorkflowTemplates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (error) throw error;

      setTemplates(data || []);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createWorkflow = useCallback(async (templateName: string, customization: any) => {
    try {
      setLoading(true);
      setError(null);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { data, error } = await supabase.functions.invoke('autonomous-workflow-engine', {
        body: {
          type: 'create_workflow',
          templateName,
          customization,
          userId: user.user.id
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Workflow Created",
          description: `Successfully created ${data.workflow.title}`,
        });
        
        await fetchUserWorkflows(); // Refresh the list
        return data.workflow;
      } else {
        throw new Error(data.error || 'Failed to create workflow');
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      console.error('Error creating workflow:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, fetchUserWorkflows]);

  const executeStep = useCallback(async (stepId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('autonomous-workflow-engine', {
        body: {
          type: 'execute_step',
          stepId
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Step Executed",
          description: `Successfully completed: ${data.step.title}`,
        });
        
        await fetchUserWorkflows(); // Refresh the list
        return data.execution_result;
      } else {
        throw new Error(data.error || 'Failed to execute step');
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Execution Error",
        description: err.message,
        variant: "destructive",
      });
      console.error('Error executing step:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, fetchUserWorkflows]);

  const pauseWorkflow = useCallback(async (workflowId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('autonomous-workflow-engine', {
        body: {
          type: 'pause_workflow',
          workflowId
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Workflow Paused",
          description: "Workflow has been paused successfully",
        });
        
        await fetchUserWorkflows();
        return data.workflow;
      } else {
        throw new Error(data.error || 'Failed to pause workflow');
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      console.error('Error pausing workflow:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, fetchUserWorkflows]);

  const resumeWorkflow = useCallback(async (workflowId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('autonomous-workflow-engine', {
        body: {
          type: 'resume_workflow',
          workflowId
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Workflow Resumed",
          description: "Workflow has been resumed successfully",
        });
        
        await fetchUserWorkflows();
        return data.workflow;
      } else {
        throw new Error(data.error || 'Failed to resume workflow');
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      console.error('Error resuming workflow:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, fetchUserWorkflows]);

  const cancelWorkflow = useCallback(async (workflowId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('autonomous-workflow-engine', {
        body: {
          type: 'cancel_workflow',
          workflowId
        }
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Workflow Cancelled",
          description: "Workflow has been cancelled successfully",
        });
        
        await fetchUserWorkflows();
        return data.workflow;
      } else {
        throw new Error(data.error || 'Failed to cancel workflow');
      }
    } catch (err: any) {
      setError(err.message);
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
      console.error('Error cancelling workflow:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [toast, fetchUserWorkflows]);

  const getWorkflowStatus = useCallback(async (workflowId: string) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase.functions.invoke('autonomous-workflow-engine', {
        body: {
          type: 'get_workflow',
          workflowId
        }
      });

      if (error) throw error;

      return data.workflow;
    } catch (err: any) {
      setError(err.message);
      console.error('Error getting workflow status:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const getActiveWorkflows = useCallback(() => {
    return workflows.filter(w => w.status === 'active' || w.status === 'planning');
  }, [workflows]);

  const getCompletedWorkflows = useCallback(() => {
    return workflows.filter(w => w.status === 'completed');
  }, [workflows]);

  const getNextStepsForUser = useCallback(() => {
    const activeWorkflows = getActiveWorkflows();
    const nextSteps: Array<WorkflowStep & { workflow_title: string }> = [];

    activeWorkflows.forEach(workflow => {
      const pendingSteps = workflow.workflow_steps?.filter(
        step => step.status === 'pending' && !step.requires_user_input
      ) || [];
      
      // Get the next step that can be executed (considering dependencies)
      const nextStep = pendingSteps.find(step => {
        if (!step.dependencies || step.dependencies.length === 0) return true;
        
        // Check if all dependencies are completed
        const deps = workflow.workflow_steps?.filter(s => 
          step.dependencies?.includes(s.id)
        ) || [];
        
        return deps.every(dep => dep.status === 'completed');
      });

      if (nextStep) {
        nextSteps.push({
          ...nextStep,
          workflow_title: workflow.title
        });
      }
    });

    return nextSteps.slice(0, 5); // Return top 5 next steps
  }, [workflows, getActiveWorkflows]);

  return {
    workflows,
    templates,
    loading,
    error,
    fetchUserWorkflows,
    fetchWorkflowTemplates,
    createWorkflow,
    executeStep,
    pauseWorkflow,
    resumeWorkflow,
    cancelWorkflow,
    getWorkflowStatus,
    getActiveWorkflows,
    getCompletedWorkflows,
    getNextStepsForUser
  };
}