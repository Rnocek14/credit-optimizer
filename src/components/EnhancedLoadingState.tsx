/**
 * Enhanced Loading State Components with Beautiful Animations
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, BarChart3, Target, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EnhancedLoadingStateProps {
  type?: 'intelligence' | 'market' | 'analytics' | 'general' | 'card' | 'list';
  message?: string;
  className?: string;
  showIcon?: boolean;
}

export function EnhancedLoadingState({ 
  type = 'general', 
  message,
  className,
  showIcon = true 
}: EnhancedLoadingStateProps) {
  const getIcon = () => {
    switch (type) {
      case 'intelligence':
        return <Brain className="h-6 w-6 text-primary animate-pulse" />;
      case 'market':
      case 'analytics':
        return <BarChart3 className="h-6 w-6 text-primary animate-pulse" />;
      case 'card':
        return <Target className="h-6 w-6 text-primary animate-pulse" />;
      default:
        return <Loader2 className="h-6 w-6 text-primary animate-spin" />;
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
      case 'card':
        return message || 'Loading content...';
      case 'list':
        return message || 'Loading items...';
      default:
        return message || 'Loading...';
    }
  };

  if (type === 'card') {
    return (
      <Card className={cn("animate-fade-in-up", className)}>
        <CardHeader>
          <div className="flex items-center space-x-3">
            {showIcon && getIcon()}
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (type === 'list') {
    return (
      <div className={cn("space-y-3 animate-fade-in-up", className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 rounded-lg border bg-card">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card className={cn("animate-fade-in-up", className)}>
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-4">
          {showIcon && getIcon()}
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

// Specialized loading components for common patterns
export function LoadingCard({ className, ...props }: Omit<EnhancedLoadingStateProps, 'type'>) {
  return <EnhancedLoadingState type="card" className={className} {...props} />;
}

export function LoadingList({ className, ...props }: Omit<EnhancedLoadingStateProps, 'type'>) {
  return <EnhancedLoadingState type="list" className={className} {...props} />;
}

export function LoadingAnalytics({ className, ...props }: Omit<EnhancedLoadingStateProps, 'type'>) {
  return <EnhancedLoadingState type="analytics" className={className} {...props} />;
}

// Quick skeleton patterns
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {[...Array(lines)].map((_, i) => (
        <Skeleton 
          key={i} 
          className={cn(
            "h-4",
            i === lines - 1 ? "w-2/3" : "w-full"
          )} 
        />
      ))}
    </div>
  );
}

export function SkeletonHeader({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}