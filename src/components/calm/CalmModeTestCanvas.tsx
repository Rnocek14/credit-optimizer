import React, { useEffect, useState, useMemo } from 'react';
import { CalmSkillTreeEngine } from './CalmSkillTreeEngine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface CalmModeTestCanvasProps {
  testMode: 'isolated' | 'with-data' | 'force-error';
  onStatusChange?: (status: 'loading' | 'success' | 'error') => void;
}

export const CalmModeTestCanvas: React.FC<CalmModeTestCanvasProps> = ({
  testMode,
  onStatusChange
}) => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [debugLogs, setDebugLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log('🧪 CalmTest:', logEntry);
    setDebugLogs(prev => [...prev.slice(-9), logEntry]); // Keep last 10 logs
  };

  useEffect(() => {
    addLog(`Test mode changed to: ${testMode}`);
    setStatus('loading');
    onStatusChange?.('loading');

    // Simulate initialization delay
    const timer = setTimeout(() => {
      if (testMode === 'force-error') {
        setStatus('error');
        onStatusChange?.('error');
        addLog('Error mode activated - this is intentional');
      } else {
        setStatus('success');
        onStatusChange?.('success');
        addLog('Test canvas initialized successfully');
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [testMode, onStatusChange]);

  // Mock data for isolated testing
  const mockNodes = useMemo(() => [
    {
      id: 'test-skill-1',
      type: 'skill',
      title: 'Test Skill 1',
      description: 'This is a test skill for isolated testing',
      data: { category: 'Testing' }
    },
    {
      id: 'test-skill-2', 
      type: 'skill',
      title: 'Test Skill 2',
      description: 'Another test skill',
      data: { category: 'Testing' }
    },
    {
      id: 'test-job-1',
      type: 'job',
      title: 'Test Job',
      description: 'A test job role',
      data: { category: 'Career' }
    }
  ], []);

  const mockEdges = useMemo(() => [
    {
      id: 'edge-1-2',
      from_id: 'test-skill-1',
      to_id: 'test-skill-2',
      edge_type: 'teaches',
      reasoning: 'Test relationship'
    },
    {
      id: 'edge-2-job',
      from_id: 'test-skill-2',
      to_id: 'test-job-1',
      edge_type: 'qualifies_for',
      reasoning: 'Skill leads to job'
    }
  ], []);

  const handleNodeClick = (node: any) => {
    addLog(`Node clicked: ${node.title || node.id}`);
  };

  const handleReload = () => {
    addLog('Reload requested');
    setStatus('loading');
    setTimeout(() => setStatus('success'), 1000);
  };

  // Force error for testing
  if (testMode === 'force-error' && status === 'error') {
    throw new Error('Intentional test error for error boundary testing');
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'loading':
        return 'bg-blue-500';
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium">Test Status: {status}</span>
          <Badge variant="outline">{testMode}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
          <span className="text-sm text-muted-foreground">
            {testMode === 'isolated' ? 'Mock Data' : testMode === 'with-data' ? 'Real Data' : 'Error Test'}
          </span>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="relative">
        {status === 'loading' && (
          <div className="absolute inset-0 z-10 bg-background/80 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Initializing calm mode test...</p>
            </div>
          </div>
        )}
        
        <div className="h-[400px] border rounded-lg bg-background/50">
          <CalmSkillTreeEngine
            nodes={testMode === 'isolated' ? mockNodes : []}
            edges={testMode === 'isolated' ? mockEdges : []}
            loading={status === 'loading'}
            error={status === 'error' ? 'Test error state' : null}
            onNodeClick={handleNodeClick}
            onReload={handleReload}
          />
        </div>
      </div>

      {/* Debug Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Debug Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 p-3 rounded font-mono text-xs max-h-32 overflow-y-auto">
            {debugLogs.length > 0 ? (
              debugLogs.map((log, index) => (
                <div key={index} className="text-muted-foreground">
                  {log}
                </div>
              ))
            ) : (
              <div className="text-muted-foreground">No logs yet...</div>
            )}
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={() => setDebugLogs([])}
          >
            Clear Logs
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}