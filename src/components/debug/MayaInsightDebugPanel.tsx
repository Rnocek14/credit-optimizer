import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, CheckCircle, Clock, Database, Copy, Play, Users, User } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/authHelper';

export const MayaInsightDebugPanel: React.FC = () => {
  const [testingManual, setTestingManual] = React.useState(false);
  const [testingGenerator, setTestingGenerator] = React.useState(false);

  // Get insight counts (both RLS and total)
  const { data: insightCounts, refetch: refetchCounts } = useQuery({
    queryKey: ['maya-insight-counts'],
    queryFn: async () => {
      const [last5m, last24h, recent, totalRecent] = await Promise.all([
        supabase
          .from('maya_proactive_insights')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()),
        supabase
          .from('maya_proactive_insights')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from('maya_proactive_insights')
          .select('id, title, priority, created_at, user_id, insight_type')
          .order('created_at', { ascending: false })
          .limit(5),
        // Get all users' recent insights (service role would see all)
        supabase
          .from('maya_proactive_insights')
          .select('user_id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
      ]);

      return {
        last5m: last5m.count || 0,
        last24h: last24h.count || 0,
        recent: recent.data || [],
        totalRecent: totalRecent.count || 0
      };
    },
    refetchInterval: 30000
  });

  // Get context tracking for current dev user
  const { data: contextData } = useQuery({
    queryKey: ['maya-context-tracking'],
    queryFn: async () => {
      const { data } = await supabase
        .from('maya_context_tracking')
        .select('id, user_id, context_type, event_type, created_at')
        .eq('user_id', '2b458624-d498-4cca-a63d-9341cc20e363')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
    refetchInterval: 30000
  });

  const handleTestManual = async () => {
    setTestingManual(true);
    try {
      const currentUser = await getCurrentUser();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (currentUser?.isDevUser) {
        headers['x-dev-user-id'] = currentUser.id;
      }
      
      const result = await supabase.functions.invoke('maya-manual-insights', { headers });
      
      if (!result.error) {
        const data = result.data;
        const perf = data?.performance;
        toast.success(
          `Manual: ${data.generatedCount} created` +
          (perf ? ` • parsed ${perf.parsed_count}, inserted ${perf.inserted_count}, tok ${perf.tokens_in}/${perf.tokens_out}` : '')
        );
        console.log('Manual insights result:', data);
        refetchCounts();
      } else {
        toast.error(`Manual insights failed: ${result.error.message}`);
        console.error('Manual insights error:', result.error);
      }
    } catch (error) {
      console.error('Manual test error:', error);
      toast.error(`Manual test failed: ${error}`);
    } finally {
      setTestingManual(false);
    }
  };

  const handleTestGenerator = async () => {
    setTestingGenerator(true);
    try {
      const currentUser = await getCurrentUser();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (currentUser?.isDevUser) {
        headers['x-dev-user-id'] = currentUser.id;
      }
      
      const result = await supabase.functions.invoke('maya-insight-generator', { headers });
      
      if (!result.error) {
        const data = result.data;
        toast.success(
          `Generator: ${data.generatedFor}/${data.totalUsers || '?'} users • insights ${data.insightsInserted || 0} (parsed ${data.parsedCount || 0}) • tok ${data.tokensIn || 0}/${data.tokensOut || 0}`
        );
        console.log('Generator result:', data);
        refetchCounts();
      } else {
        toast.error(`Generator failed: ${result.error.message}`);
        console.error('Generator error:', result.error);
      }
    } catch (error) {
      console.error('Generator test error:', error);
      toast.error(`Generator test failed: ${error}`);
    } finally {
      setTestingGenerator(false);
    }
  };

  const copyDiagnostics = () => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      counts: insightCounts,
      recentActivity: contextData?.slice(0, 3),
      recentInsights: insightCounts?.recent?.slice(0, 3),
      status: insightCounts?.last5m && insightCounts.last5m > 0 ? 'Active' : 'Waiting'
    };
    
    navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
    toast.success('Diagnostics copied to clipboard');
  };

  const getUserName = (userId: string) => {
    const userMap: Record<string, string> = {
      '2b458624-d498-4cca-a63d-9341cc20e363': 'Aisha',
      '3c459625-e499-5ddb-b64d-a442dd21f474': 'Mateo', 
      '4d56a736-f5aa-6eec-c75e-b553ee32e585': 'Jade'
    };
    return userMap[userId] || 'Unknown';
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Maya Insights Debug Panel
          </div>
          <Button
            onClick={copyDiagnostics}
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enhanced Insight Counts */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-md bg-white dark:bg-gray-800">
            <div className="text-2xl font-bold text-green-600">
              {insightCounts?.last5m || 0}
              {insightCounts?.totalRecent && insightCounts.totalRecent !== insightCounts?.last5m && (
                <span className="text-xs text-muted-foreground ml-1">
                  /{insightCounts.totalRecent}
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">Last 5 minutes</div>
            <div className="text-xs text-muted-foreground">RLS visible / total</div>
          </div>
          <div className="text-center p-3 rounded-md bg-white dark:bg-gray-800">
            <div className="text-2xl font-bold text-blue-600">{insightCounts?.last24h || 0}</div>
            <div className="text-sm text-muted-foreground">Last 24 hours</div>
          </div>
        </div>

        {/* Separate Test Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={handleTestManual}
            disabled={testingManual}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {testingManual ? (
              <Clock className="h-3 w-3 animate-spin" />
            ) : (
              <User className="h-3 w-3" />
            )}
            {testingManual ? 'Testing...' : 'Manual (Current User)'}
          </Button>
          
          <Button 
            onClick={handleTestGenerator}
            disabled={testingGenerator}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            {testingGenerator ? (
              <Clock className="h-3 w-3 animate-spin" />
            ) : (
              <Users className="h-3 w-3" />
            )}
            {testingGenerator ? 'Testing...' : 'Generator (All Dev)'}
          </Button>
        </div>

        {/* Recent Activity */}
        <div className="space-y-2">
          <h4 className="font-medium text-amber-800 dark:text-amber-200">Recent Context Activity</h4>
          {contextData && contextData.length > 0 ? (
            <div className="space-y-1">
              {contextData.map(item => (
                <div key={item.id} className="flex items-center justify-between text-xs p-2 bg-white dark:bg-gray-800 rounded">
                  <span>{item.context_type} - {item.event_type}</span>
                  <span className="text-muted-foreground">
                    {new Date(item.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-2 bg-white dark:bg-gray-800 rounded">
              No recent activity found
            </div>
          )}
        </div>

        {/* Enhanced Recent Insights */}
        <div className="space-y-2">
          <h4 className="font-medium text-amber-800 dark:text-amber-200">Recent Insights</h4>
          {insightCounts?.recent && insightCounts.recent.length > 0 ? (
            <div className="space-y-1">
              {insightCounts.recent.map(insight => (
                <div key={insight.id} className="flex items-center justify-between text-xs p-2 bg-white dark:bg-gray-800 rounded">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Badge variant={insight.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-xs shrink-0">
                      {insight.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {getUserName(insight.user_id)}
                    </Badge>
                    <span className="truncate text-xs">{insight.title}</span>
                  </div>
                  <span className="text-muted-foreground shrink-0 ml-2">
                    {new Date(insight.created_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-2 bg-white dark:bg-gray-800 rounded">
              No insights generated yet
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <Button 
          onClick={() => {
            refetchCounts();
            toast.success('Data refreshed');
          }}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Refresh Data
        </Button>

        {/* Enhanced Status Indicator */}
        <div className="flex items-center justify-between text-sm p-2 bg-white dark:bg-gray-800 rounded">
          <div className="flex items-center gap-2">
            {insightCounts?.last5m && insightCounts.last5m > 0 ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : (
              <AlertCircle className="h-3 w-3 text-amber-500" />
            )}
            <span>Pipeline: {insightCounts?.last5m && insightCounts.last5m > 0 ? 'Active' : 'Waiting'}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Auto-refresh: 30s
          </div>
        </div>
      </CardContent>
    </Card>
  );
};