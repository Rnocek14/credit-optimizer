import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Cpu, 
  Database, 
  Pause, 
  Play, 
  RefreshCw, 
  Shield, 
  Zap,
  Server,
  Brain,
  Network
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical';
  uptime: string;
  lastCheck: Date;
  components: {
    ai_engine: 'online' | 'offline' | 'degraded';
    database: 'online' | 'offline' | 'degraded';
    workflow_engine: 'online' | 'offline' | 'degraded';
    market_data: 'online' | 'offline' | 'degraded';
  };
  metrics: {
    cpu_usage: number;
    memory_usage: number;
    active_workflows: number;
    api_response_time: number;
  };
}

interface LiveActivity {
  id: string;
  type: 'workflow_created' | 'insight_generated' | 'alert_triggered' | 'user_action';
  description: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error';
  userId?: string;
  workflowId?: string;
}

export function MayaControlDashboard() {
  const { toast } = useToast();
  const [isSystemPaused, setIsSystemPaused] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Mock system health data
  const [systemHealth] = useState<SystemHealth>({
    status: 'healthy',
    uptime: '15 days, 7 hours',
    lastCheck: new Date(),
    components: {
      ai_engine: 'online',
      database: 'online',
      workflow_engine: 'online',
      market_data: 'degraded'
    },
    metrics: {
      cpu_usage: 45,
      memory_usage: 67,
      active_workflows: 23,
      api_response_time: 142
    }
  });

  // Mock live activity
  const [liveActivity] = useState<LiveActivity[]>([
    {
      id: '1',
      type: 'workflow_created',
      description: 'Created "Data Analyst Path" workflow for user John Doe',
      timestamp: new Date(Date.now() - 30000),
      status: 'success',
      userId: 'user_123',
      workflowId: 'wf_456'
    },
    {
      id: '2',
      type: 'insight_generated',
      description: 'Generated market insight: "Python demand increasing in SF"',
      timestamp: new Date(Date.now() - 120000),
      status: 'success'
    },
    {
      id: '3',
      type: 'alert_triggered',
      description: 'Market alert triggered for React Developer positions',
      timestamp: new Date(Date.now() - 180000),
      status: 'warning'
    },
    {
      id: '4',
      type: 'user_action',
      description: 'User completed "Advanced Python" course milestone',
      timestamp: new Date(Date.now() - 300000),
      status: 'success',
      userId: 'user_789'
    }
  ]);

  const handleEmergencyPause = () => {
    setIsSystemPaused(!isSystemPaused);
    toast({
      title: isSystemPaused ? "System Resumed" : "Emergency Pause Activated",
      description: isSystemPaused 
        ? "All Maya operations have been resumed." 
        : "All autonomous operations have been paused.",
      variant: isSystemPaused ? "default" : "destructive"
    });
  };

  const getComponentStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'degraded': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'offline': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'workflow_created': return <Zap className="h-4 w-4 text-blue-600" />;
      case 'insight_generated': return <Brain className="h-4 w-4 text-purple-600" />;
      case 'alert_triggered': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'user_action': return <Activity className="h-4 w-4 text-green-600" />;
      default: return <Activity className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      // Simulate real-time updates
      console.log('Refreshing dashboard data...');
    }, 5000);
    
    return () => clearInterval(interval);
  }, [autoRefresh]);

  return (
    <div className="space-y-6">
      {/* Emergency Controls */}
      <Card className={isSystemPaused ? "border-red-200 bg-red-50" : ""}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Emergency Controls
              </CardTitle>
              <CardDescription>
                System-wide controls for Maya operations
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto Refresh
              </Button>
              <Button
                variant={isSystemPaused ? "default" : "destructive"}
                onClick={handleEmergencyPause}
              >
                {isSystemPaused ? (
                  <><Play className="h-4 w-4 mr-2" /> Resume All</>
                ) : (
                  <><Pause className="h-4 w-4 mr-2" /> Emergency Pause</>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        {isSystemPaused && (
          <CardContent>
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>System Paused:</strong> All autonomous Maya operations are currently paused. 
                Click "Resume All" to restore normal operations.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">System Overview</TabsTrigger>
          <TabsTrigger value="activity">Live Activity</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="health">Health Monitor</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* System Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">System Status</p>
                    <p className="text-2xl font-bold text-green-600">Healthy</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Workflows</p>
                    <p className="text-2xl font-bold">{systemHealth.metrics.active_workflows}</p>
                  </div>
                  <Zap className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                    <p className="text-2xl font-bold">{systemHealth.uptime}</p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Response Time</p>
                    <p className="text-2xl font-bold">{systemHealth.metrics.api_response_time}ms</p>
                  </div>
                  <Activity className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Component Status */}
          <Card>
            <CardHeader>
              <CardTitle>Component Status</CardTitle>
              <CardDescription>Real-time status of Maya's core components</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Brain className="h-5 w-5" />
                    <div>
                      <p className="font-medium">AI Engine</p>
                      <p className="text-sm text-muted-foreground">Core intelligence system</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getComponentStatusIcon(systemHealth.components.ai_engine)}
                    <Badge variant={systemHealth.components.ai_engine === 'online' ? 'default' : 'secondary'}>
                      {systemHealth.components.ai_engine}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Database</p>
                      <p className="text-sm text-muted-foreground">Data storage and retrieval</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getComponentStatusIcon(systemHealth.components.database)}
                    <Badge variant={systemHealth.components.database === 'online' ? 'default' : 'secondary'}>
                      {systemHealth.components.database}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Server className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Workflow Engine</p>
                      <p className="text-sm text-muted-foreground">Autonomous workflow processing</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getComponentStatusIcon(systemHealth.components.workflow_engine)}
                    <Badge variant={systemHealth.components.workflow_engine === 'online' ? 'default' : 'secondary'}>
                      {systemHealth.components.workflow_engine}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Network className="h-5 w-5" />
                    <div>
                      <p className="font-medium">Market Data</p>
                      <p className="text-sm text-muted-foreground">Real-time market intelligence</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getComponentStatusIcon(systemHealth.components.market_data)}
                    <Badge variant={systemHealth.components.market_data === 'online' ? 'default' : 'secondary'}>
                      {systemHealth.components.market_data}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Activity Stream</CardTitle>
              <CardDescription>
                Real-time monitoring of Maya's autonomous operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {liveActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="mt-1">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {activity.timestamp.toLocaleTimeString()}
                        </span>
                        <span className={`text-xs ${getStatusColor(activity.status)}`}>
                          {activity.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cpu className="h-5 w-5" />
                  CPU Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current Usage</span>
                    <span>{systemHealth.metrics.cpu_usage}%</span>
                  </div>
                  <Progress value={systemHealth.metrics.cpu_usage} />
                  <p className="text-xs text-muted-foreground">
                    {systemHealth.metrics.cpu_usage < 70 ? 'Normal' : 'High'} usage detected
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Memory Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current Usage</span>
                    <span>{systemHealth.metrics.memory_usage}%</span>
                  </div>
                  <Progress value={systemHealth.metrics.memory_usage} />
                  <p className="text-xs text-muted-foreground">
                    {systemHealth.metrics.memory_usage < 80 ? 'Normal' : 'High'} usage detected
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resource Limits & Alerts</CardTitle>
              <CardDescription>
                Configure automatic alerts when resource usage exceeds thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">CPU Alert Threshold</p>
                    <p className="text-sm text-muted-foreground">Alert when CPU usage exceeds this level</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">85%</p>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Memory Alert Threshold</p>
                    <p className="text-sm text-muted-foreground">Alert when memory usage exceeds this level</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">90%</p>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Workflow Limit</p>
                    <p className="text-sm text-muted-foreground">Maximum concurrent workflows</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">50</p>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Health Monitor</CardTitle>
              <CardDescription>
                Comprehensive health checks and diagnostic information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="font-medium">API Health</p>
                    <p className="text-sm text-muted-foreground">All endpoints responsive</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="font-medium">Database Health</p>
                    <p className="text-sm text-muted-foreground">Connections stable</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
                    <p className="font-medium">External APIs</p>
                    <p className="text-sm text-muted-foreground">Market data delayed</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Recent Health Checks</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Last full system check</span>
                      <span className="text-muted-foreground">2 minutes ago ✓</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Database connectivity</span>
                      <span className="text-muted-foreground">1 minute ago ✓</span>
                    </div>
                    <div className="flex justify-between">
                      <span>AI engine response</span>
                      <span className="text-muted-foreground">30 seconds ago ✓</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Market data sync</span>
                      <span className="text-yellow-600">5 minutes ago ⚠</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button>Run Full Diagnostic</Button>
                  <Button variant="outline">Export Health Report</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}