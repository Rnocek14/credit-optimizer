import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  BookOpen, 
  MessageSquare, 
  Database, 
  Zap, 
  Settings,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync: string;
  features: string[];
  dataPoints: number;
}

interface SyncStatus {
  type: 'calendar' | 'courses' | 'progress' | 'notifications';
  status: 'syncing' | 'completed' | 'failed';
  message: string;
  timestamp: string;
}

export const AdvancedIntegrationEcosystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState('platforms');
  const [syncStatuses, setSyncStatuses] = useState<SyncStatus[]>([]);

  const integrations: Integration[] = [
    {
      id: 'linkedin-learning',
      name: 'LinkedIn Learning',
      icon: <BookOpen className="h-4 w-4" />,
      description: 'Sync courses and certifications from LinkedIn Learning',
      status: 'connected',
      lastSync: '2 hours ago',
      features: ['Course Import', 'Progress Tracking', 'Certificate Sync'],
      dataPoints: 1247
    },
    {
      id: 'google-calendar',
      name: 'Google Calendar',
      icon: <Calendar className="h-4 w-4" />,
      description: 'Schedule learning sessions and track study time',
      status: 'connected',
      lastSync: '15 minutes ago',
      features: ['Schedule Management', 'Time Tracking', 'Reminders'],
      dataPoints: 89
    },
    {
      id: 'slack',
      name: 'Slack',
      icon: <MessageSquare className="h-4 w-4" />,
      description: 'Team notifications and progress sharing',
      status: 'connected',
      lastSync: '1 hour ago',
      features: ['Progress Notifications', 'Team Updates', 'Achievement Sharing'],
      dataPoints: 156
    },
    {
      id: 'notion',
      name: 'Notion',
      icon: <Database className="h-4 w-4" />,
      description: 'Export learning paths and notes to Notion workspace',
      status: 'disconnected',
      lastSync: 'Never',
      features: ['Notes Export', 'Progress Dashboard', 'Task Management'],
      dataPoints: 0
    },
    {
      id: 'coursera',
      name: 'Coursera',
      icon: <BookOpen className="h-4 w-4" />,
      description: 'Import completed courses and specializations',
      status: 'error',
      lastSync: '2 days ago',
      features: ['Course Import', 'Certificate Tracking', 'Skill Mapping'],
      dataPoints: 342
    },
    {
      id: 'udemy',
      name: 'Udemy',
      icon: <BookOpen className="h-4 w-4" />,
      description: 'Track Udemy course progress and certificates',
      status: 'connected',
      lastSync: '6 hours ago',
      features: ['Progress Sync', 'Certificate Import', 'Review Integration'],
      dataPoints: 78
    }
  ];

  const apiEndpoints = [
    {
      name: 'Learning Progress API',
      endpoint: '/api/v1/progress',
      method: 'GET',
      description: 'Retrieve user learning progress and completion data',
      status: 'active',
      usage: '1,247 calls/hour'
    },
    {
      name: 'Skill Assessment API',
      endpoint: '/api/v1/skills/assess',
      method: 'POST',
      description: 'Submit skill assessment results and get recommendations',
      status: 'active',
      usage: '342 calls/hour'
    },
    {
      name: 'Learning Path Export',
      endpoint: '/api/v1/paths/export',
      method: 'GET',
      description: 'Export learning paths in various formats (JSON, XML, SCORM)',
      status: 'active',
      usage: '89 calls/hour'
    },
    {
      name: 'Webhook Notifications',
      endpoint: '/api/v1/webhooks',
      method: 'POST',
      description: 'Real-time notifications for progress updates and achievements',
      status: 'beta',
      usage: '2,156 events/hour'
    }
  ];

  const handleConnect = useCallback((integrationId: string) => {
    console.log(`Connecting to ${integrationId}`);
    // Simulate connection process
  }, []);

  const handleDisconnect = useCallback((integrationId: string) => {
    console.log(`Disconnecting from ${integrationId}`);
  }, []);

  const handleSync = useCallback((integrationId: string) => {
    const newSyncStatus: SyncStatus = {
      type: integrationId as any,
      status: 'syncing',
      message: `Starting sync with ${integrationId}...`,
      timestamp: new Date().toISOString()
    };
    
    setSyncStatuses(prev => [newSyncStatus, ...prev.slice(0, 4)]);
    
    // Simulate sync completion
    setTimeout(() => {
      setSyncStatuses(prev => 
        prev.map(status => 
          status.timestamp === newSyncStatus.timestamp
            ? { ...status, status: 'completed', message: `Successfully synced with ${integrationId}` }
            : status
        )
      );
    }, 2000);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'disconnected': return <AlertCircle className="h-4 w-4 text-gray-400" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'disconnected': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Integration Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Integration Ecosystem
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {integrations.filter(i => i.status === 'connected').length}
              </p>
              <p className="text-sm text-muted-foreground">Active Connections</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {integrations.reduce((sum, i) => sum + i.dataPoints, 0).toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Data Points Synced</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">99.8%</p>
              <p className="text-sm text-muted-foreground">Uptime</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">4.2K</p>
              <p className="text-sm text-muted-foreground">API Calls/Hour</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="platforms">Learning Platforms</TabsTrigger>
          <TabsTrigger value="productivity">Productivity Tools</TabsTrigger>
          <TabsTrigger value="api">API & Webhooks</TabsTrigger>
        </TabsList>

        <TabsContent value="platforms" className="space-y-4">
          <div className="grid gap-4">
            {integrations.filter(i => ['linkedin-learning', 'coursera', 'udemy'].includes(i.id)).map((integration) => (
              <Card key={integration.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {integration.icon}
                      <div>
                        <h3 className="font-medium">{integration.name}</h3>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(integration.status)}
                      <Badge className={getStatusColor(integration.status)}>
                        {integration.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    {integration.features.map((feature) => (
                      <Badge key={feature} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Last sync: {integration.lastSync} • {integration.dataPoints.toLocaleString()} data points
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleSync(integration.id)}
                        variant="outline" 
                        size="sm"
                        disabled={integration.status === 'disconnected'}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Sync
                      </Button>
                      {integration.status === 'connected' ? (
                        <Button 
                          onClick={() => handleDisconnect(integration.id)}
                          variant="outline" 
                          size="sm"
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => handleConnect(integration.id)}
                          size="sm"
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="productivity" className="space-y-4">
          <div className="grid gap-4">
            {integrations.filter(i => ['google-calendar', 'slack', 'notion'].includes(i.id)).map((integration) => (
              <Card key={integration.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {integration.icon}
                      <div>
                        <h3 className="font-medium">{integration.name}</h3>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(integration.status)}
                      <Badge className={getStatusColor(integration.status)}>
                        {integration.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    {integration.features.map((feature) => (
                      <Badge key={feature} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Last sync: {integration.lastSync} • {integration.dataPoints.toLocaleString()} data points
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        onClick={() => handleSync(integration.id)}
                        variant="outline" 
                        size="sm"
                        disabled={integration.status === 'disconnected'}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Sync
                      </Button>
                      {integration.status === 'connected' ? (
                        <Button 
                          onClick={() => handleDisconnect(integration.id)}
                          variant="outline" 
                          size="sm"
                        >
                          Disconnect
                        </Button>
                      ) : (
                        <Button 
                          onClick={() => handleConnect(integration.id)}
                          size="sm"
                        >
                          Connect
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Endpoints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {apiEndpoints.map((endpoint, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{endpoint.method}</Badge>
                      <code className="text-sm bg-muted px-2 py-1 rounded">{endpoint.endpoint}</code>
                    </div>
                    <Badge className={endpoint.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                      {endpoint.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Usage: {endpoint.usage}</span>
                    <Button variant="outline" size="sm">
                      View Docs
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Sync Activity */}
          {syncStatuses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Sync Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {syncStatuses.map((status, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        status.status === 'syncing' ? 'bg-blue-500 animate-pulse' :
                        status.status === 'completed' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium">{status.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(status.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {status.status}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};