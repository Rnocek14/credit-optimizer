import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SimpleFallbackProps {
  title: string;
  description?: string;
  onRetry?: () => void;
}

export function SimpleFallback({ title, description, onRetry }: SimpleFallbackProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="bg-muted/50 border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            {description || 'This component is not yet available or failed to load.'}
          </p>
        </div>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" className="mt-4">
            Retry
          </Button>
        )}
      </CardContent>
    </Card>
  );
}