import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEnhancedMaya } from '@/hooks/useEnhancedMaya';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function MayaPhase5Test() {
  const [testResults, setTestResults] = useState<any>({});
  const [testStage, setTestStage] = useState('');
  const { sendEnhancedRequest, loading, lastResponse } = useEnhancedMaya();
  const { toast } = useToast();

  const runPhase5Test = async (forceWorkflow = false) => {
    try {
      setTestStage('Phase 1: Triggering Enhanced Maya Request');
      
      // Test request for Aisha Khan's career transition
      const testRequest = forceWorkflow 
        ? "Create an autonomous workflow to transition me to a Senior Product Manager role within 3 months with skill development tracking, market monitoring, and automated alerts."
        : "Help me plan a 3-month transition to a Senior Product Manager role. What are my biggest gaps and what steps should I take next?";
      
      const response = await sendEnhancedRequest(testRequest, {
        careerPath: 'Senior Product Manager',
        location: 'United States',
        goals: [{ target_role: 'Senior Product Manager' }],
        skillLevel: 3
      });

      setTestStage('Phase 2: Verifying Data Integration');
      
      // Check if Aisha's data was loaded
      const aishaUserId = '2b458624-d498-4cca-a63d-9341cc20e363';
      
      // Verify user profile data
      const { data: profileData } = await supabase
        .from('ai_resume_drafts')
        .select('cri_average, readiness_score')
        .eq('user_id', aishaUserId)
        .order('created_at', { ascending: false })
        .limit(1);

      setTestStage('Phase 3: Checking Market Intelligence');
      
      // Verify market trends data
      const { data: marketData } = await supabase
        .from('market_trends')
        .select('*')
        .ilike('career_path', '%Product Manager%')
        .limit(1);

      setTestStage('Phase 4: Testing Personalized Insights');
      
      // Check if personalized recommendations were created
      const { data: recommendations } = await supabase
        .from('personalized_recommendations')
        .select('*')
        .eq('user_id', aishaUserId)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(5);

      setTestStage('Phase 5: Validating Autonomous Actions');
      
      // Check for autonomous workflows
      const { data: workflows } = await supabase
        .from('autonomous_workflows')
        .select('*')
        .eq('user_id', aishaUserId)
        .order('created_at', { ascending: false })
        .limit(3);

      // Check for market alerts
      const { data: alerts } = await supabase
        .from('market_alerts')
        .select('*')
        .eq('user_id', aishaUserId)
        .order('created_at', { ascending: false })
        .limit(3);

      // Check conversation sessions
      const { data: sessions } = await supabase
        .from('conversation_sessions')
        .select('*')
        .eq('user_id', aishaUserId)
        .order('created_at', { ascending: false })
        .limit(1);

      setTestResults({
        response,
        profileData: profileData?.[0],
        marketData: marketData?.[0],
        recommendations,
        workflows,
        alerts,
        sessions: sessions?.[0],
        timestamp: new Date().toISOString()
      });

      setTestStage('✅ Phase 5 Test Complete');
      
      toast({
        title: "Phase 5 Test Complete",
        description: "Maya's Enhanced Response System test completed successfully",
      });

    } catch (error) {
      console.error('Phase 5 test error:', error);
      setTestStage(`❌ Test Failed: ${error}`);
      toast({
        title: "Test Failed",
        description: `Phase 5 test encountered an error: ${error}`,
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Maya Enhanced Response System - Phase 5 Test</CardTitle>
        <CardDescription>
          Complete system test using Aisha Khan's UUID (2b458624-d498-4cca-a63d-9341cc20e363)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={() => runPhase5Test(false)} 
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Running Test...' : 'Run Phase 5 Test'}
          </Button>
          <Button 
            onClick={() => runPhase5Test(true)} 
            disabled={loading}
            variant="outline"
            className="flex-1"
          >
            Force Workflow Test
          </Button>
        </div>

        {testStage && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="font-medium">{testStage}</p>
          </div>
        )}

        {testResults.response && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Profile Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p>CRI Score: <Badge>{testResults.profileData?.cri_average || 'N/A'}</Badge></p>
                    <p>Readiness: <Badge>{testResults.profileData?.readiness_score || 'N/A'}</Badge></p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Market Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <p>Demand: <Badge>{testResults.marketData?.demand_score || 'N/A'}</Badge></p>
                    <p>Salary: <Badge>${testResults.marketData?.average_salary || 'N/A'}</Badge></p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Database Records Created</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium">Recommendations</p>
                    <Badge variant="outline">{testResults.recommendations?.length || 0}</Badge>
                  </div>
                  <div>
                    <p className="font-medium">Workflows</p>
                    <Badge variant="outline">{testResults.workflows?.length || 0}</Badge>
                  </div>
                  <div>
                    <p className="font-medium">Alerts</p>
                    <Badge variant="outline">{testResults.alerts?.length || 0}</Badge>
                  </div>
                  <div>
                    <p className="font-medium">Sessions</p>
                    <Badge variant="outline">{testResults.sessions ? 1 : 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {lastResponse && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Maya's Response</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-40 overflow-y-auto text-sm bg-muted p-3 rounded">
                    {lastResponse.response}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}