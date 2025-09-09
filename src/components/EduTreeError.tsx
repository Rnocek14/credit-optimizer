import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface EduTreeErrorProps {
  error?: Error;
  onRetry?: () => void;
}

export function EduTreeError({ error, onRetry }: EduTreeErrorProps) {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Education Tree Error</CardTitle>
          <CardDescription>
            Something went wrong loading the education tree. This could be due to a network issue or data loading problem.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {import.meta.env.DEV && error && (
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
              <strong>Dev Error:</strong> {error.message}
            </div>
          )}
          
          <div className="flex gap-2">
            <Button onClick={handleRetry} variant="outline" className="flex-1">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={handleGoHome} variant="default" className="flex-1">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}