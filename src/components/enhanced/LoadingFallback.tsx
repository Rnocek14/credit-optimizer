import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface LoadingFallbackProps {
  isLoading: boolean;
  hasData: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  fallbackMessage?: string;
  timeoutMs?: number;
}

export function LoadingFallback({ 
  isLoading, 
  hasData, 
  error, 
  onRetry, 
  children, 
  fallbackMessage = "Loading your personalized career data...",
  timeoutMs = 15000
}: LoadingFallbackProps) {
  const [hasTimedOut, setHasTimedOut] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (isLoading && !hasTimedOut) {
      timer = setTimeout(() => {
        setHasTimedOut(true);
      }, timeoutMs);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading, hasTimedOut, timeoutMs]);

  useEffect(() => {
    if (!isLoading) {
      setHasTimedOut(false);
    }
  }, [isLoading]);
  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-5 h-5" />
            Error Loading Data
          </CardTitle>
          <CardDescription>
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {onRetry && (
            <Button 
              onClick={onRetry} 
              variant="outline" 
              className="border-destructive text-destructive hover:bg-destructive/10"
            >
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          {hasTimedOut ? (
            <>
              <Clock className="w-8 h-8 text-warning mb-4" />
              <p className="text-sm text-muted-foreground text-center mb-4">
                This is taking longer than expected...
              </p>
              {onRetry && (
                <Button onClick={onRetry} variant="outline" size="sm">
                  Try Again
                </Button>
              )}
            </>
          ) : (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground text-center">{fallbackMessage}</p>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="w-8 h-8 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground text-center">No data available</p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline" className="mt-4">
              Refresh
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}