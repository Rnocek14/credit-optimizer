import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, AlertCircle, CheckCircle, Clock, Database } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getCurrentUser } from '@/lib/authHelper';

export const MayaInsightDebugPanel: React.FC = () => {
  const [testing, setTesting] = React.useState(false);

  // Get insight counts
  const { data: insightCounts, refetch: refetchCounts } = useQuery({
    queryKey: ['maya-insight-counts'],
    queryFn: async () => {
      const [last5m, last24h, recent] = await Promise.all([
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
          .select('id, title, priority, created_at, user_id')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      return {
        last5m: last5m.count || 0,
        last24h: last24h.count || 0,
        recent: recent.data || []
      };
    },
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  // Get context tracking for dev user
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

  const handleTestFunction = async () => {
    setTesting(true);
    try {
      console.log('Testing Maya insight generator...');
      
      // Get current user for dev mode support
      const currentUser = await getCurrentUser();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Add dev user ID header if in dev mode
      if (currentUser?.isDevUser) {
        headers['x-dev-user-id'] = currentUser.id;
      }
      
      // Test both functions
      const [genResult, manualResult] = await Promise.allSettled([
        supabase.functions.invoke('maya-insight-generator', {
          headers
        }),
        supabase.functions.invoke('maya-manual-insights', {
          headers
        })
      ]);

      console.log('Generator result:', genResult);
      console.log('Manual result:', manualResult);

      let successCount = 0;
      let messages = [];

      if (genResult.status === 'fulfilled' && !genResult.value.error) {
        successCount++;
        messages.push(`Generator: ${JSON.stringify(genResult.value.data)}`);
      } else {
        messages.push(`Generator failed: ${genResult.status === 'fulfilled' ? genResult.value.error.message : 'Request failed'}`);
      }

      if (manualResult.status === 'fulfilled' && !manualResult.value.error) {
        successCount++;
        messages.push(`Manual: ${JSON.stringify(manualResult.value.data)}`);
      } else {
        messages.push(`Manual failed: ${manualResult.status === 'fulfilled' ? manualResult.value.error.message : 'Request failed'}`);
      }

      if (successCount > 0) {
        toast.success(`${successCount}/2 functions succeeded. Check console for details.`);
        refetchCounts();
      } else {
        toast.error('Both functions failed. Check console for details.');
      }

      console.log('Test results:', messages);
    } catch (error) {
      console.error('Test error:', error);
      toast.error(`Test failed: ${error}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
          <Database className="h-4 w-4" />
          Maya Insights Debug Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Insight Counts */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-md bg-white dark:bg-gray-800">
            <div className="text-2xl font-bold text-green-600">{insightCounts?.last5m || 0}</div>
            <div className="text-sm text-muted-foreground">Last 5 minutes</div>
          </div>
          <div className="text-center p-3 rounded-md bg-white dark:bg-gray-800">
            <div className="text-2xl font-bold text-blue-600">{insightCounts?.last24h || 0}</div>
            <div className="text-sm text-muted-foreground">Last 24 hours</div>
          </div>
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

        {/* Recent Insights */}
        <div className="space-y-2">
          <h4 className="font-medium text-amber-800 dark:text-amber-200">Recent Insights</h4>
          {insightCounts?.recent && insightCounts.recent.length > 0 ? (
            <div className="space-y-1">
              {insightCounts.recent.map(insight => (
                <div key={insight.id} className="flex items-center justify-between text-xs p-2 bg-white dark:bg-gray-800 rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant={insight.priority === 'urgent' ? 'destructive' : 'secondary'} className="text-xs">
                      {insight.priority}
                    </Badge>
                    <span className="truncate">{insight.title}</span>
                  </div>
                  <span className="text-muted-foreground">
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

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={handleTestFunction}
            disabled={testing}
            variant="outline"
            size="sm"
          >
            {testing ? (
              <>
                <Clock className="h-3 w-3 mr-1 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="h-3 w-3 mr-1" />
                Test Both
              </>
            )}
          </Button>
          <Button 
            onClick={() => {
              refetchCounts();
              toast.success('Data refreshed');
            }}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1">
            {insightCounts?.last5m && insightCounts.last5m > 0 ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : (
              <AlertCircle className="h-3 w-3 text-amber-500" />
            )}
            <span>Pipeline Status: {insightCounts?.last5m && insightCounts.last5m > 0 ? 'Active' : 'Waiting'}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};