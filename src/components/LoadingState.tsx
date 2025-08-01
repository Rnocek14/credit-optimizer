/**
 * Optimized Loading State Component for Maya + CRI Integration
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, BarChart3 } from 'lucide-react';

interface LoadingStateProps {
  type?: 'intelligence' | 'market' | 'analytics' | 'general';
  message?: string;
}

export function LoadingState({ type = 'general', message }: LoadingStateProps) {
  const getIcon = () => {
    switch (type) {
      case 'intelligence':
        return <Brain className="h-6 w-6 text-primary animate-pulse" />;
      case 'market':
      case 'analytics':
        return <BarChart3 className="h-6 w-6 text-primary animate-pulse" />;
      default:
        return <Brain className="h-6 w-6 text-primary animate-pulse" />;
    }
  };

  const getMessage = () => {
    switch (type) {
      case 'intelligence':
        return message || 'Maya is analyzing your career data...';
      case 'market':
        return message || 'Loading real-time market intelligence...';
      case 'analytics':
        return message || 'Generating advanced analytics...';
      default:
        return message || 'Loading...';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          {getIcon()}
          <div className="text-sm text-muted-foreground">{getMessage()}</div>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}