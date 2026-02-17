import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { fetchPhase1TestResults } from '@/shared/lib/api';
import { useToast } from '@/hooks/use-toast';

interface SmartGoal {
  id: string;
  title: string;
  description: string;
  goal_type: 'career' | 'skill' | 'certification' | 'project';
  target_date: string;
  smart_criteria: {
    specific: string;
    measurable: string;
    achievable: string;
    relevant: string;
    time_bound: string;
  };
  priority: 'high' | 'medium' | 'low';
  estimated_duration_weeks: number;
}

export function Phase1TestPanel() {
  const [isLoading, setIsLoading] = React.useState(false);
  const [smartGoals, setSmartGoals] = React.useState<SmartGoal[]>([]);
  const [testResults, setTestResults] = React.useState<any>(null);
  const { toast } = useToast();

  const testSmartGoals = async () => {
    setIsLoading(true);
    try {
      console.log('Testing generate-smart-goals edge function...');
      
      const { data, error } = await supabase.functions.invoke('generate-smart-goals', {
        body: { user_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }
      });

      if (error) {
        console.error('Error calling generate-smart-goals:', error);
        toast({ title: 'Error', description: 'Failed to generate smart goals', variant: 'destructive' });
        return;
      }

      console.log('Smart goals response:', data);
      setSmartGoals(data.goals || []);
      setTestResults(data);
      
      toast({ 
        title: 'Success!', 
        description: `Generated ${data.goals?.length || 0} smart goals for beginner user`
      });

    } catch (error) {
      console.error('Exception calling smart goals:', error);
      toast({ title: 'Error', description: 'Exception during smart goal generation', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const testDatabaseSetup = async () => {
    try {
      const data = await fetchPhase1TestResults();

      console.log('Database test results:', data);
      toast({ 
        title: 'Database Connected', 
        description: `Found ${data.length} test records` 
      });
    } catch (error) {
      console.error('Database connection error:', error);
      toast({ title: 'Database Error', description: (error as Error).message, variant: 'destructive' });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Phase 1 + Smart Goals Testing</CardTitle>
          <CardDescription>
            Test the complete Phase 1 pipeline: database setup, user experience detection, and smart goal generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button onClick={testDatabaseSetup} variant="outline">
              Test Database Setup
            </Button>
            <Button onClick={testSmartGoals} disabled={isLoading}>
              {isLoading ? 'Generating Goals...' : 'Test Smart Goals Generation'}
            </Button>
          </div>

          {testResults && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Test Results Summary:</h4>
              <ul className="text-sm space-y-1">
                <li>• Experience Level: <Badge variant="secondary">{testResults.user_profile?.experience_level}</Badge></li>
                <li>• Skill Count: {testResults.user_profile?.skill_count}</li>
                <li>• Has Onboarded: {testResults.user_profile?.has_onboarded ? 'Yes' : 'No'}</li>
                <li>• Goals Generated: {smartGoals.length}</li>
                <li>• Generated At: {new Date(testResults.generated_at).toLocaleString()}</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {smartGoals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Generated Smart Goals</h3>
          {smartGoals.map((goal) => (
            <Card key={goal.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{goal.title}</CardTitle>
                    <CardDescription>{goal.description}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={getPriorityColor(goal.priority)}>{goal.priority}</Badge>
                    <Badge variant="outline">{goal.goal_type}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Duration:</strong> {goal.estimated_duration_weeks} weeks</p>
                    <p><strong>Target Date:</strong> {new Date(goal.target_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">SMART Criteria:</h5>
                    <ul className="space-y-1 text-xs">
                      <li><strong>Specific:</strong> {goal.smart_criteria.specific}</li>
                      <li><strong>Measurable:</strong> {goal.smart_criteria.measurable}</li>
                      <li><strong>Achievable:</strong> {goal.smart_criteria.achievable}</li>
                      <li><strong>Relevant:</strong> {goal.smart_criteria.relevant}</li>
                      <li><strong>Time-bound:</strong> {goal.smart_criteria.time_bound}</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}