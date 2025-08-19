/**
 * Authentication Debug Panel
 * Shows current auth state to help debug issues
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/authHelper';
import { useQuery } from '@tanstack/react-query';

export const AuthDebugPanel = () => {
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);

  const { data: currentUser, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['current-user'],
    queryFn: getCurrentUser
  });

  const checkSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    setSessionInfo({ session: !!session, user: session?.user?.id, error: error?.message });
  };

  const testDbAccess = async () => {
    try {
      const { data, error } = await supabase
        .from('career_goals')
        .select('count')
        .limit(1);
      
      setTestResult({ success: !error, error: error?.message });
    } catch (error: any) {
      setTestResult({ success: false, error: error.message });
    }
  };

  useEffect(() => {
    checkSession();
  }, []);

  if (!import.meta.env.DEV) return null;

  return (
    <Card className="fixed top-4 right-4 w-80 z-50 bg-background/95 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">🔐 Auth Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div>
          <strong>getCurrentUser:</strong>
          <Badge variant={currentUser ? 'default' : 'destructive'} className="ml-2">
            {userLoading ? 'Loading...' : currentUser ? 'Success' : 'Failed'}
          </Badge>
          {currentUser && (
            <div className="mt-1 text-muted-foreground">
              ID: {currentUser.id}<br />
              Dev: {currentUser.isDevUser ? 'Yes' : 'No'}
            </div>
          )}
          {userError && (
            <div className="mt-1 text-red-600">Error: {userError.message}</div>
          )}
        </div>

        <div>
          <strong>Supabase Session:</strong>
          <Badge variant={sessionInfo?.session ? 'default' : 'destructive'} className="ml-2">
            {sessionInfo?.session ? 'Active' : 'None'}
          </Badge>
          <Button size="sm" variant="outline" onClick={checkSession} className="ml-2">
            Check
          </Button>
        </div>

        <div>
          <strong>DB Access:</strong>
          <Badge variant={testResult?.success ? 'default' : 'destructive'} className="ml-2">
            {testResult?.success ? 'Success' : testResult ? 'Failed' : 'Not tested'}
          </Badge>
          <Button size="sm" variant="outline" onClick={testDbAccess} className="ml-2">
            Test
          </Button>
          {testResult?.error && (
            <div className="mt-1 text-red-600">Error: {testResult.error}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};