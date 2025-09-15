import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
  title?: string;
  description?: string;
  showRetry?: boolean;
  showReload?: boolean;
}

export function ErrorFallback({ 
  error, 
  resetError, 
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again or refresh the page.",
  showRetry = true,
  showReload = false
}: ErrorFallbackProps) {
  const handleReload = () => {
    window.location.reload();
  };

  return (
    <Card className="border-destructive/50 bg-destructive/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {description}
        </p>
        
        {import.meta.env.DEV && error && (
          <details className="text-xs bg-muted p-3 rounded border">
            <summary className="cursor-pointer font-medium mb-2">
              Error Details (Development)
            </summary>
            <div className="space-y-2">
              <div>
                <strong>Message:</strong> {error.message}
              </div>
              {error.stack && (
                <div>
                  <strong>Stack Trace:</strong>
                  <pre className="mt-1 overflow-auto max-h-32 text-xs bg-background p-2 rounded">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}
        
        <div className="flex gap-2">
          {showRetry && (
            <Button onClick={resetError} variant="default" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          )}
          
          {showReload && (
            <Button onClick={handleReload} variant="outline" size="sm" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reload Page
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}