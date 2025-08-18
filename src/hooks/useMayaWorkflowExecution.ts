import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCertificateEngine } from './useCertificateEngine';

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_type: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  step_order: number;
  context_data?: any;
  result_data?: any;
  completed_at?: string;
}

export interface WorkflowExecution {
  id: string;
  user_id: string;
  workflow_type: string;
  title: string;
  description: string;
  status: 'planning' | 'active' | 'paused' | 'completed' | 'failed';
  progress_percentage: number;
  context_data: any;
  created_at: string;
  updated_at: string;
  last_action_at?: string;
}

export interface StepExecution {
  step_id: string;
  result: any;
  next_actions: string[];
  explanation?: string;
  progress_update: number;
}

export function useMayaWorkflowExecution(userId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { generateCertificate } = useCertificateEngine();

  // Fetch user workflows
  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['workflows', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('autonomous_workflows')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as WorkflowExecution[];
    },
    enabled: !!userId,
  });

  // Execute workflow step
  const executeStep = useMutation({
    mutationFn: async ({ workflowId, stepId, context }: { 
      workflowId: string; 
      stepId: string; 
      context?: any 
    }) => {
      const { data, error } = await supabase.functions.invoke('maya-execution-engine', {
        body: {
          action: 'execute_step',
          userId,
          workflowId,
          stepId,
          context
        }
      });
      
      if (error) throw error;
      return data as StepExecution;
    },
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['workflows', userId] });
      
      // Update workflow progress
      await supabase
        .from('autonomous_workflows')
        .update({ 
          progress_percentage: data.progress_update,
          last_action_at: new Date().toISOString(),
          status: data.progress_update >= 100 ? 'completed' : 'active'
        })
        .eq('id', variables.workflowId);

      // If workflow completed, generate certificate
      if (data.progress_update >= 100) {
        const workflow = workflows.find(w => w.id === variables.workflowId);
        if (workflow) {
          await generateCertificate({
            certificateType: 'workflow_completion',
            certificateData: {
              title: `${workflow.title} Workflow Completion`,
              description: `Successfully completed the ${workflow.title} autonomous workflow`,
              skills: [], // Would extract from workflow context
              metadata: { workflowType: workflow.workflow_type },
            }
          });
        }
      }
      
      toast({
        title: "Step Executed",
        description: data.progress_update >= 100 ? 
          "Workflow completed! Certificate generated." : 
          "Step completed successfully",
      });
    },
    onError: (error) => {
      console.error('Error executing step:', error);
      toast({
        title: "Execution Failed",
        description: "Unable to execute workflow step. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Validate workflow progress
  const validateProgress = useMutation({
    mutationFn: async (workflowId: string) => {
      const { data, error } = await supabase.functions.invoke('maya-execution-engine', {
        body: {
          action: 'validate_progress',
          userId,
          workflowId
        }
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', userId] });
      toast({
        title: "Progress Validated",
        description: "Workflow progress has been validated",
      });
    },
    onError: (error) => {
      console.error('Error validating progress:', error);
      toast({
        title: "Validation Failed",
        description: "Unable to validate workflow progress.",
        variant: "destructive",
      });
    },
  });

  // Generate step explanation
  const generateExplanation = useMutation({
    mutationFn: async ({ workflowId, stepId, context }: { 
      workflowId: string; 
      stepId: string; 
      context?: any 
    }) => {
      const { data, error } = await supabase.functions.invoke('maya-execution-engine', {
        body: {
          action: 'generate_explanation',
          userId,
          workflowId,
          stepId,
          context
        }
      });
      
      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.error('Error generating explanation:', error);
      toast({
        title: "Explanation Failed",
        description: "Unable to generate step explanation.",
        variant: "destructive",
      });
    },
  });

  return {
    workflows,
    isLoading,
    executeStep: executeStep.mutate,
    isExecuting: executeStep.isPending,
    validateProgress: validateProgress.mutate,
    isValidating: validateProgress.isPending,
    generateExplanation: generateExplanation.mutate,
    isGeneratingExplanation: generateExplanation.isPending,
    explanationData: generateExplanation.data,
  };
}