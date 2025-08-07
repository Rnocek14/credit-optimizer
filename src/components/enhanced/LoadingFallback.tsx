import React from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface LoadingFallbackProps {
  isLoading: boolean;
  hasData: boolean;
  error?: string | null;
  onRetry?: () => void;
  children: React.ReactNode;
  fallbackMessage?: string;
}

export function LoadingFallback({ 
  isLoading, 
  hasData, 
  error, 
  onRetry, 
  children, 
  fallbackMessage = "Loading your personalized career data..." 
}: LoadingFallbackProps) {
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
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground text-center">{fallbackMessage}</p>
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