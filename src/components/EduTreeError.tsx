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
      // Force a clean reload instead of just refresh
      window.location.reload();
    }
  };

  // Extract useful error information
  const errorMessage = error?.message || 'An unknown error occurred';
  const isDataError = error?.name === 'EduTreeDataError';
  const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                        errorMessage.toLowerCase().includes('fetch');

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <CardTitle className="text-xl">Education Tree Error</CardTitle>
          <CardDescription>
            {isDataError ? (
              'Failed to load curriculum data from the database. This could be a temporary network issue or a data configuration problem.'
            ) : isNetworkError ? (
              'Network connection problem detected. Please check your internet connection and try again.'
            ) : (
              'Something went wrong loading the education tree. This could be due to a network issue or data loading problem.'
            )}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {process.env.NODE_ENV !== "production" && error && (
            <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md max-h-32 overflow-y-auto">
              <strong>Developer Error Details:</strong>
              <div className="mt-1 font-mono text-xs">{errorMessage}</div>
              {error.stack && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs opacity-70">Stack Trace</summary>
                  <pre className="mt-1 text-xs whitespace-pre-wrap">{error.stack}</pre>
                </details>
              )}
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
          
          {(isDataError || isNetworkError) && (
            <div className="text-xs text-muted-foreground text-center">
              {isDataError ? 'If this persists, there may be a database configuration issue.' : 
               'If this persists, please check your network connection.'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}