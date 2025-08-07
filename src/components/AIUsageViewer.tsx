import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { RefreshCw, TrendingUp, Clock, Zap, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UsageRecord {
  id: string;
  created_at: string;
  task: string;
  route: string;
  model: string | null;
  complexity: string | null;
  latency_ms: number | null;
  tokens_in: number | null;
  tokens_out: number | null;
  success: boolean;
  error_message: string | null;
  request_id: string | null;
}

interface UsageStats {
  totalRequests: number;
  successRate: number;
  averageLatency: number;
  totalTokens: number;
  lastHour: number;
}

export const AIUsageViewer = () => {
  const [usage, setUsage] = useState<UsageRecord[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d'>('24h');
  const { toast } = useToast();

  const fetchUsage = async () => {
    setLoading(true);
    try {
      const timeframeDates = {
        '1h': new Date(Date.now() - 60 * 60 * 1000),
        '24h': new Date(Date.now() - 24 * 60 * 60 * 1000),
        '7d': new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      };

      const { data, error } = await supabase
        .from('ai_model_usage')
        .select('*')
        .gte('created_at', timeframeDates[timeframe].toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch AI usage data",
          variant: "destructive"
        });
        return;
      }

      setUsage(data || []);
      
      // Calculate stats
      const totalRequests = data?.length || 0;
      const successfulRequests = data?.filter(r => r.success).length || 0;
      const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0;
      const averageLatency = data?.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / totalRequests || 0;
      const totalTokens = data?.reduce((sum, r) => sum + (r.tokens_in || 0) + (r.tokens_out || 0), 0) || 0;
      const lastHour = data?.filter(r => 
        new Date(r.created_at) > new Date(Date.now() - 60 * 60 * 1000)
      ).length || 0;

      setStats({
        totalRequests,
        successRate: Math.round(successRate * 100) / 100,
        averageLatency: Math.round(averageLatency),
        totalTokens,
        lastHour
      });
    } catch (err) {
      console.error('Failed to fetch usage:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, [timeframe]);

  const getComplexityColor = (complexity: string | null) => {
    switch (complexity) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getTaskIcon = (task: string) => {
    switch (task) {
      case 'chat': return '💬';
      case 'json': return '📄';
      case 'image': return '🖼️';
      default: return '🤖';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">AI Model Usage</h3>
        <div className="flex gap-2">
          <div className="flex gap-1">
            {(['1h', '24h', '7d'] as const).map((tf) => (
              <Button
                key={tf}
                size="sm"
                variant={timeframe === tf ? 'default' : 'outline'}
                onClick={() => setTimeframe(tf)}
              >
                {tf}
              </Button>
            ))}
          </div>
          <Button size="sm" onClick={fetchUsage} disabled={loading}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{stats.totalRequests}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Success Rate</p>
                <p className="text-2xl font-bold">{stats.successRate}%</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Latency</p>
                <p className="text-2xl font-bold">{stats.averageLatency}ms</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <span className="text-purple-500">🎯</span>
              <div>
                <p className="text-sm text-muted-foreground">Total Tokens</p>
                <p className="text-2xl font-bold">{stats.totalTokens.toLocaleString()}</p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Last Hour</p>
                <p className="text-2xl font-bold">{stats.lastHour}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card>
        <div className="p-4 border-b">
          <h4 className="font-medium">Recent Requests</h4>
        </div>
        <div className="max-h-96 overflow-auto">
          {usage.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No usage data found for the selected timeframe
            </div>
          ) : (
            <div className="space-y-2 p-4">
              {usage.map((record) => (
                <div
                  key={record.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    record.success ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{getTaskIcon(record.task)}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={record.success ? 'default' : 'destructive'}>
                          {record.route}
                        </Badge>
                        {record.complexity && (
                          <Badge variant={getComplexityColor(record.complexity)}>
                            {record.complexity}
                          </Badge>
                        )}
                        {record.model && (
                          <Badge variant="outline">
                            {record.model}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(record.created_at).toLocaleTimeString()}
                        {record.request_id && (
                          <span className="ml-2 font-mono text-xs">
                            {record.request_id.slice(-8)}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right text-sm">
                    {record.success ? (
                      <div>
                        {record.latency_ms && (
                          <p className="text-muted-foreground">{record.latency_ms}ms</p>
                        )}
                        {(record.tokens_in || record.tokens_out) && (
                          <p className="text-xs text-muted-foreground">
                            {record.tokens_in || 0}→{record.tokens_out || 0} tokens
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-red-600">
                        <p>Failed</p>
                        {record.error_message && (
                          <p className="text-xs max-w-32 truncate" title={record.error_message}>
                            {record.error_message}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};