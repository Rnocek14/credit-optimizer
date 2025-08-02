import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Zap, Server, Database, Monitor, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Phase6ProductionOptimizationProps {
  userId: string;
}

export function Phase6ProductionOptimization({ userId }: Phase6ProductionOptimizationProps) {
  const { toast } = useToast();
  const [optimizationMetrics] = useState({
    performance: 98.7,
    efficiency: 96.4,
    reliability: 99.2,
    scalability: 94.8,
    costOptimization: 92.3
  });

  const [systemResources] = useState([
    { name: 'CPU Usage', current: 23, target: 70, optimal: true },
    { name: 'Memory Usage', current: 45, target: 80, optimal: true },
    { name: 'Database Load', current: 34, target: 60, optimal: true },
    { name: 'API Response Time', current: 89, target: 200, optimal: true, unit: 'ms' },
    { name: 'Cache Hit Rate', current: 94, target: 85, optimal: true },
    { name: 'Network Latency', current: 15, target: 50, optimal: true, unit: 'ms' },
  ]);

  const [alerts] = useState([
    { id: 1, type: 'info', message: 'Scheduled maintenance window in 72 hours', priority: 'low' },
    { id: 2, type: 'success', message: 'Auto-scaling triggered successfully', priority: 'low' },
    { id: 3, type: 'warning', message: 'High load detected in EU region', priority: 'medium' },
  ]);

  const triggerOptimization = () => {
    toast({
      title: "Production Optimization Started",
      description: "Running comprehensive system optimization...",
    });
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Monitor className="w-4 h-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Optimization Metrics */}
      <div className="grid grid-cols-5 gap-4">
        {Object.entries(optimizationMetrics).map(([key, value]) => (
          <Card key={key}>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{value}%</div>
              <div className="text-sm text-muted-foreground capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              <Progress value={value} className="mt-2 h-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Resources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5 text-primary" />
            Real-time System Resources
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {systemResources.map((resource) => (
              <div key={resource.name} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="font-medium">{resource.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {resource.current}{resource.unit || '%'} / {resource.target}{resource.unit || '%'}
                    </span>
                  </div>
                  <Progress 
                    value={(resource.current / resource.target) * 100} 
                    className="h-2"
                  />
                </div>
                <Badge variant={resource.optimal ? "default" : "destructive"} className="ml-3">
                  {resource.optimal ? 'Optimal' : 'Alert'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Production Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" />
            Production Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-center gap-3 p-3 border rounded-lg">
                {getAlertIcon(alert.type)}
                <div className="flex-1">
                  <p className="text-sm">{alert.message}</p>
                </div>
                <Badge variant={
                  alert.priority === 'high' ? 'destructive' : 
                  alert.priority === 'medium' ? 'secondary' : 'outline'
                }>
                  {alert.priority}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Optimization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            Performance Optimization
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <Database className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">847ms</div>
              <div className="text-sm text-muted-foreground">Avg Query Time</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Server className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">23.4K</div>
              <div className="text-sm text-muted-foreground">Requests/min</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <Monitor className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">99.97%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
          </div>

          <Button onClick={triggerOptimization} className="w-full">
            <Zap className="w-4 h-4 mr-2" />
            Run Production Optimization
          </Button>
        </CardContent>
      </Card>

      {/* Auto-scaling Status */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-scaling & Load Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-primary/5 rounded-lg">
            <h4 className="font-medium mb-2">Current Scaling Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Active Instances</span>
                <Badge variant="outline">12 / 50 max</Badge>
              </div>
              <div className="flex justify-between">
                <span>Load Balancer Health</span>
                <Badge variant="default">Healthy</Badge>
              </div>
              <div className="flex justify-between">
                <span>CDN Cache Hit Rate</span>
                <Badge variant="default">94.2%</Badge>
              </div>
              <div className="flex justify-between">
                <span>Database Replicas</span>
                <Badge variant="default">3 Active</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}