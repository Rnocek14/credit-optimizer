import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { useEduTreeQueries } from '../hooks/useEduTreeQueries';
import { EduTreeSkeleton, EduTreeProgressSkeleton } from './EduTreeSkeleton';

interface EduTreeLoadingFallbackProps {
  children: React.ReactNode;
  showDetailedProgress?: boolean;
}

export function EduTreeLoadingFallback({ children, showDetailedProgress = true }: EduTreeLoadingFallbackProps) {
  const { 
    loading, 
    errors, 
    isCriticalDataReady, 
    allDataLoaded,
    queries
  } = useEduTreeQueries();

  // Calculate loading progress
  const totalSteps = 5;
  const completedSteps = Object.values(loading).filter(isLoading => !isLoading).length;
  const progress = (completedSteps / totalSteps) * 100;

  // Handle critical errors that prevent any rendering
  const criticalErrors = [errors.courses, errors.blocks].filter(Boolean);
  const hasCriticalError = criticalErrors.length > 0;

  if (hasCriticalError) {
    return (
      <div className="min-h-[600px] flex items-center justify-center p-4">
        <Card className="max-w-lg w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <WifiOff className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Unable to Load Education Data</CardTitle>
            <CardDescription>
              We couldn't load the essential education data. Please check your connection and try again.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {criticalErrors.map((error, index) => (
                <div key={index} className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  if (errors.courses) queries.courses.refetch();
                  if (errors.blocks) queries.blocks.refetch();
                }}
                variant="outline" 
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Loading
              </Button>
              <Button onClick={() => window.location.reload()} variant="default" className="flex-1">
                <Wifi className="w-4 h-4 mr-2" />
                Refresh Page
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show loading state while critical data is loading
  if (!isCriticalDataReady) {
    if (showDetailedProgress) {
      return (
        <div className="min-h-[600px] flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-lg">Loading Education Tree</CardTitle>
              <CardDescription>
                Setting up your personalized learning pathway...
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{completedSteps}/{totalSteps} completed</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
              
              <div className="space-y-3 text-sm">
                <LoadingStep 
                  label="Loading courses"
                  isLoading={loading.courses}
                  error={errors.courses}
                  onRetry={() => queries.courses.refetch()}
                />
                <LoadingStep 
                  label="Loading requirements" 
                  isLoading={loading.blocks}
                  error={errors.blocks}
                  onRetry={() => queries.blocks.refetch()}
                />
                <LoadingStep 
                  label="Building course relationships"
                  isLoading={loading.blockMembers}
                  error={errors.blockMembers}
                  onRetry={() => queries.blockMembers.refetch()}
                />
                <LoadingStep 
                  label="Setting up prerequisites"
                  isLoading={loading.gates}
                  error={errors.gates}
                  onRetry={() => queries.gates.refetch()}
                />
                <LoadingStep 
                  label="Creating pathway connections"
                  isLoading={loading.gateEdges}
                  error={errors.gateEdges}
                  onRetry={() => queries.gateEdges.refetch()}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return <EduTreeProgressSkeleton />;
  }

  // Show partial content with remaining loading states
  if (!allDataLoaded && isCriticalDataReady) {
    return (
      <div className="relative">
        <div className="absolute top-4 right-4 z-10">
          <Card className="p-3 bg-background/95 backdrop-blur-sm">
            <div className="flex items-center space-x-2 text-sm">
              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
              <span>Finalizing layout...</span>
            </div>
          </Card>
        </div>
        
        <EduTreeSkeleton stage="partial" />
      </div>
    );
  }

  // Show non-critical errors as overlays
  const nonCriticalErrors = Object.entries(errors)
    .filter(([key]) => !['courses', 'blocks'].includes(key))
    .filter(([, error]) => error)
    .map(([key, error]) => ({ key, error }));

  return (
    <div className="relative">
      {nonCriticalErrors.length > 0 && (
        <div className="absolute top-4 left-4 z-10">
          <Card className="p-3 bg-warning/10 border-warning">
            <div className="flex items-center space-x-2 text-sm">
              <AlertCircle className="w-4 h-4 text-warning" />
              <span>Some features may be limited</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.location.reload()}
                className="ml-2 h-6"
              >
                Dismiss
              </Button>
            </div>
          </Card>
        </div>
      )}
      
      {children}
    </div>
  );
}

interface LoadingStepProps {
  label: string;
  isLoading: boolean;
  error?: string;
  onRetry: () => void;
}

function LoadingStep({ label, isLoading, error, onRetry }: LoadingStepProps) {
  if (error) {
    return (
      <div className="flex items-center justify-between text-destructive">
        <span>{label}</span>
        <Button size="sm" variant="ghost" onClick={onRetry} className="h-6 text-xs">
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-muted-foreground">
        <div className="animate-spin w-3 h-3 border border-primary border-t-transparent rounded-full" />
        <span>{label}...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2 text-green-600">
      <div className="w-3 h-3 bg-green-600 rounded-full" />
      <span>{label}</span>
    </div>
  );
}