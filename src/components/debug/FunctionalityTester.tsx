/**
 * Functionality Tester Component
 * Tests Save to Plan and Add to Resume functionality
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SaveToPlanButton } from '@/components/SaveToPlanButton';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/authHelper';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export const FunctionalityTester = () => {
  const [testResults, setTestResults] = useState<any>({});
  const [isRunning, setIsRunning] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser
  });

  const testSaveToPlan = async () => {
    setIsRunning(true);
    try {
      // Test authentication
      if (!currentUser?.id) {
        setTestResults(prev => ({ ...prev, auth: 'FAIL - No user' }));
        return;
      }
      setTestResults(prev => ({ ...prev, auth: 'PASS' }));

      // Test Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setTestResults(prev => ({ ...prev, session: 'FAIL - No session' }));
        return;
      }
      setTestResults(prev => ({ ...prev, session: 'PASS' }));

      // Test database access
      const { data: testQuery, error: testError } = await supabase
        .from('saved_plan_items')
        .select('count')
        .limit(1);
      
      if (testError) {
        setTestResults(prev => ({ ...prev, dbAccess: `FAIL - ${testError.message}` }));
        return;
      }
      setTestResults(prev => ({ ...prev, dbAccess: 'PASS' }));

      toast.success('All authentication tests passed!');
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, error: error.message }));
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const testAddToResume = () => {
    try {
      // Test localStorage functionality
      const testProject = {
        id: 'test-project-' + Date.now(),
        title: 'Test Project',
        type: 'portfolio',
        description: 'Test project for functionality testing',
        link: 'https://github.com/test',
        trackTitle: 'Test Track',
        criScore: 95
      };

      // Save to localStorage
      const existingProofs = JSON.parse(localStorage.getItem('proof_projects_for_resume') || '[]');
      const updatedProofs = [...existingProofs, testProject];
      localStorage.setItem('proof_projects_for_resume', JSON.stringify(updatedProofs));

      // Verify it was saved
      const savedProofs = JSON.parse(localStorage.getItem('proof_projects_for_resume') || '[]');
      const wasSaved = savedProofs.some((p: any) => p.id === testProject.id);

      if (wasSaved) {
        setTestResults(prev => ({ ...prev, localStorage: 'PASS' }));
        toast.success('localStorage test passed!');
      } else {
        setTestResults(prev => ({ ...prev, localStorage: 'FAIL - Not saved' }));
        toast.error('localStorage test failed!');
      }
    } catch (error: any) {
      setTestResults(prev => ({ ...prev, localStorage: `FAIL - ${error.message}` }));
      toast.error(`localStorage test failed: ${error.message}`);
    }
  };

  const clearTestData = () => {
    // Remove test projects from localStorage
    const existingProofs = JSON.parse(localStorage.getItem('proof_projects_for_resume') || '[]');
    const filteredProofs = existingProofs.filter((p: any) => !p.id.includes('test-project-'));
    localStorage.setItem('proof_projects_for_resume', JSON.stringify(filteredProofs));
    
    setTestResults({});
    toast.success('Test data cleared');
  };

  if (!import.meta.env.DEV) return null;

  return (
    <Card className="fixed bottom-4 right-4 w-96 z-50 bg-background/95 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">🧪 Functionality Tester</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {/* User Info */}
        <div>
          <strong>Current User:</strong>
          <div className="mt-1 text-muted-foreground">
            {currentUser ? (
              <>
                {currentUser.name} ({currentUser.id.substring(0, 8)}...)
                <Badge variant={currentUser.isDevUser ? 'default' : 'secondary'} className="ml-2">
                  {currentUser.isDevUser ? 'Dev' : 'Real'}
                </Badge>
              </>
            ) : (
              'Not authenticated'
            )}
          </div>
        </div>

        {/* Test Results */}
        <div className="space-y-1">
          {Object.entries(testResults).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span>{key}:</span>
              <Badge variant={value.toString().startsWith('PASS') ? 'default' : 'destructive'}>
                {value.toString()}
              </Badge>
            </div>
          ))}
        </div>

        {/* Test Save to Plan Button */}
        <div>
          <strong>Test Save to Plan:</strong>
          <SaveToPlanButton 
            item={{
              type: 'course',
              id: 'test-course-123',
              title: 'Test Course',
              description: 'Test course for functionality testing',
              timeEstimate: '2-3 weeks',
              skillTags: ['React', 'TypeScript']
            }}
            variant="outline"
            size="sm"
            compact={true}
            className="w-full mt-2"
          />
        </div>

        {/* Test Buttons */}
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={testSaveToPlan}
            disabled={isRunning}
            className="flex-1"
          >
            Test Auth
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={testAddToResume}
            className="flex-1"
          >
            Test Resume
          </Button>
        </div>

        <Button 
          size="sm" 
          variant="ghost" 
          onClick={clearTestData}
          className="w-full"
        >
          Clear Test Data
        </Button>
      </CardContent>
    </Card>
  );
};