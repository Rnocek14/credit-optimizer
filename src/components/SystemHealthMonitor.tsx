import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCircuitBreakerClient } from '@/hooks/useCircuitBreakerClient';
import { supabase } from '@/integrations/supabase/client';

interface SystemHealth {
  timestamp: string;
  database_connections: number;
  active_users: number;
  error_rate: number;
  status: 'healthy' | 'warning' | 'critical';
}

const EDGE_FUNCTIONS = [
  'calculate-career-switch',
  'career-risk-analyzer', 
  'location-switch-optimizer',
  'backtrack-analyzer'
];

export function SystemHealthMonitor() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { getServiceHealth } = useCircuitBreakerClient();

  const checkSystemHealth = async () => {
    try {
      const { data, error } = await supabase.rpc('system_health_check');
      
      if (!error && data) {
        setSystemHealth(data as unknown as SystemHealth);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to check system health:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkSystemHealth();
    
    // Check system health every 30 seconds
    const interval = setInterval(checkSystemHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          System Health Monitor
          {systemHealth && getStatusIcon(systemHealth.status)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {systemHealth && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{systemHealth.database_connections}</div>
                <div className="text-sm text-muted-foreground">DB Connections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{systemHealth.active_users}</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{(systemHealth.error_rate * 100).toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Error Rate</div>
              </div>
              <div className="text-center">
                <Badge variant={
                  systemHealth.status === 'healthy' ? 'default' : 
                  systemHealth.status === 'warning' ? 'destructive' : 'destructive'
                } className={getStatusColor(systemHealth.status)}>
                  {systemHealth.status.toUpperCase()}
                </Badge>
              </div>
            </div>

            {systemHealth.status !== 'healthy' && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {systemHealth.status === 'warning' 
                    ? 'System performance is degraded. Some features may be slower than usual.'
                    : 'System is experiencing critical issues. Please try again later.'
                  }
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        <div className="space-y-2">
          <h4 className="font-medium">Edge Functions Status</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {EDGE_FUNCTIONS.map(service => {
              const health = getServiceHealth(service);
              return (
                <div key={service} className="flex items-center justify-between p-2 rounded border">
                  <span className="text-sm font-medium">{service}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={health.isHealthy ? 'default' : 'destructive'}>
                      {health.state}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {health.successRate.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {lastUpdate && (
          <div className="text-xs text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}