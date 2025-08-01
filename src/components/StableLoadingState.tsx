import React, { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface StableLoadingStateProps {
  isLoading: boolean;
  hasData: boolean;
  minimumDisplayTime?: number;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function StableLoadingState({
  isLoading,
  hasData,
  minimumDisplayTime = 500,
  children,
  fallback
}: StableLoadingStateProps) {
  const [shouldShowLoading, setShouldShowLoading] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (isLoading && !shouldShowLoading) {
      setShouldShowLoading(true);
      setLoadingStartTime(Date.now());
    } else if (!isLoading && shouldShowLoading && loadingStartTime) {
      const elapsed = Date.now() - loadingStartTime;
      
      if (elapsed < minimumDisplayTime) {
        // Keep loading state for minimum time to prevent flicker
        setTimeout(() => {
          setShouldShowLoading(false);
          setLoadingStartTime(null);
        }, minimumDisplayTime - elapsed);
      } else {
        setShouldShowLoading(false);
        setLoadingStartTime(null);
      }
    }
  }, [isLoading, shouldShowLoading, loadingStartTime, minimumDisplayTime]);

  if (shouldShowLoading || (isLoading && !hasData)) {
    return (
      <div className="space-y-4 animate-pulse">
        {fallback || (
          <>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

interface StableMetricCardProps {
  title: string;
  value: string | number;
  isLoading: boolean;
  className?: string;
}

export function StableMetricCard({ title, value, isLoading, className = "" }: StableMetricCardProps) {
  return (
    <div className={`p-4 rounded-lg border bg-card ${className}`}>
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <StableLoadingState 
        isLoading={isLoading} 
        hasData={!!value}
        fallback={<Skeleton className="h-8 w-16" />}
      >
        <p className="text-2xl font-bold">{value}</p>
      </StableLoadingState>
    </div>
  );
}
