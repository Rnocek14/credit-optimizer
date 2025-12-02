import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, Clock, Play, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SeedJobState, SeedResult } from '@/hooks/useOptimizerSeeder';

interface SeedingJobCardProps {
  jobName: string;
  title: string;
  description: string;
  state: SeedJobState;
  onRun: () => Promise<void>;
  icon?: React.ReactNode;
}

function StatusBadge({ state }: { state: SeedJobState }) {
  if (state.isRunning) {
    return (
      <Badge variant="secondary" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Running
      </Badge>
    );
  }
  
  if (state.error) {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Error
      </Badge>
    );
  }
  
  if (state.lastResult?.success) {
    return (
      <Badge variant="default" className="gap-1 bg-green-600 hover:bg-green-700">
        <CheckCircle2 className="h-3 w-3" />
        Success
      </Badge>
    );
  }
  
  if (state.lastResult && !state.lastResult.success) {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="h-3 w-3" />
        Failed
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="gap-1">
      <Clock className="h-3 w-3" />
      Never Run
    </Badge>
  );
}

function TableResultSummary({ tables }: { tables: Record<string, SeedResult> }) {
  const entries = Object.entries(tables);
  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 text-xs">
      {entries.map(([tableName, result]) => (
        <div key={tableName} className="flex justify-between items-center p-1.5 bg-muted/50 rounded">
          <span className="font-mono truncate">{tableName}</span>
          <Badge variant="secondary" className="text-xs ml-2">
            {result.inserted}
          </Badge>
        </div>
      ))}
    </div>
  );
}

export function SeedingJobCard({ 
  jobName, 
  title, 
  description, 
  state, 
  onRun,
  icon 
}: SeedingJobCardProps) {
  const [isRunning, setIsRunning] = useState(false);

  const handleRun = async () => {
    setIsRunning(true);
    try {
      await onRun();
    } finally {
      setIsRunning(false);
    }
  };

  const lastRunTime = state.lastResult?.runAt 
    ? new Date(state.lastResult.runAt).toLocaleString()
    : null;

  return (
    <Card className={cn(
      "transition-all",
      state.isRunning && "ring-2 ring-primary/50",
      state.lastResult?.success && "border-green-500/30"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {icon || <Database className="h-5 w-5 text-muted-foreground" />}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <StatusBadge state={state} />
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Last run time */}
        {lastRunTime && (
          <p className="text-xs text-muted-foreground">
            Last run: {lastRunTime}
          </p>
        )}

        {/* Error message */}
        {state.error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive font-medium">Error</p>
            <p className="text-xs text-destructive/80 mt-1">{state.error}</p>
          </div>
        )}

        {/* Results summary */}
        {state.lastResult?.tables && Object.keys(state.lastResult.tables).length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Seeded Data</p>
            <TableResultSummary tables={state.lastResult.tables} />
          </div>
        )}

        {/* Run button */}
        <Button 
          onClick={handleRun}
          disabled={isRunning || state.isRunning}
          className="w-full"
          size="lg"
        >
          {isRunning || state.isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Run Job
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
