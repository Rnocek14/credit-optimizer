import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import systemDiagnostics from '@/lib/systemDiagnostics';
import { PlayCircle, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

export default function DiagnosticsRunner() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      await systemDiagnostics.runFullSystemValidation();
      setLastRun(new Date().toLocaleString());
    } catch (error) {
      console.error('Diagnostics failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'WARN': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'FAIL': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5" />
          System Diagnostics
        </CardTitle>
        <CardDescription>
          Validate all edge functions, workflows, and system health
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Button 
            onClick={runDiagnostics} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <PlayCircle className="h-4 w-4" />
            {isRunning ? 'Running Diagnostics...' : 'Run Full Validation'}
          </Button>
          
          {lastRun && (
            <Badge variant="outline" className="text-xs">
              Last run: {lastRun}
            </Badge>
          )}
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">System Components</h4>
          
          <div className="grid gap-2">
            <div className="flex items-center justify-between p-2 rounded-lg border">
              <span className="text-sm">Edge Functions</span>
              <div className="flex items-center gap-2">
                {getStatusIcon('pending')}
                <span className="text-xs text-muted-foreground">Ping, Error, Success Tests</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-2 rounded-lg border">
              <span className="text-sm">Career Planning</span>
              <div className="flex items-center gap-2">
                {getStatusIcon('pending')}
                <span className="text-xs text-muted-foreground">Pivot Paths, Roadmap Generation</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-2 rounded-lg border">
              <span className="text-sm">Pivot Workflow</span>
              <div className="flex items-center gap-2">
                {getStatusIcon('pending')}
                <span className="text-xs text-muted-foreground">End-to-End Career Switch</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-2 rounded-lg border">
              <span className="text-sm">Gamification</span>
              <div className="flex items-center gap-2">
                {getStatusIcon('pending')}
                <span className="text-xs text-muted-foreground">Analytics, Feature Flags</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Open browser console to see detailed results and logs
        </div>
      </CardContent>
    </Card>
  );
}