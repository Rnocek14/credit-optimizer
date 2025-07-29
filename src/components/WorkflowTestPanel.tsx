import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export function WorkflowTestPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const testWorkflowCreation = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      // Use Aisha Khan's user ID for testing
      const testUserId = '2b458624-d498-4cca-a63d-9341cc20e363';
      
      console.log('Testing workflow creation...');
      
      const { data, error } = await supabase.functions.invoke('autonomous-workflow-engine', {
        body: {
          action: {
            type: 'create_workflow',
            templateName: 'senior_product_manager_transition',
            customization: {
              target_role: 'Senior Product Manager',
              location: 'San Francisco, CA',
              timeline: '6 months'
            },
            userId: testUserId
          }
        }
      });

      if (error) {
        console.error('Function invocation error:', error);
        throw error;
      }

      console.log('Function response:', data);
      setResult(data);

      if (data.success) {
        toast({
          title: "Test Successful",
          description: `Workflow created with ${data.workflow.steps?.length || 0} steps`,
        });
        
        // Check the database
        const { data: dbWorkflow, error: dbError } = await supabase
          .from('autonomous_workflows')
          .select(`
            *,
            workflow_steps (
              id,
              title,
              action_type,
              status,
              step_order
            )
          `)
          .eq('id', data.workflow.id)
          .single();
          
        if (!dbError) {
          console.log('Database verification:', dbWorkflow);
          setResult({ ...data, dbVerification: dbWorkflow });
        }
      } else {
        throw new Error(data.error || 'Failed to create workflow');
      }
    } catch (err: any) {
      console.error('Test error:', err);
      toast({
        title: "Test Failed",
        description: err.message,
        variant: "destructive",
      });
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Phase 6.3 Workflow Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={testWorkflowCreation}
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Testing...' : 'Test Workflow Creation for Aisha Khan'}
        </Button>
        
        {result && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">Test Result:</h3>
            <pre className="text-sm overflow-auto max-h-96">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}