import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface LoadingSkeletonProps {
  variant?: 'dashboard' | 'chart' | 'table' | 'card';
  count?: number;
  nodeCount?: number; // Keep for backward compatibility
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ 
  variant = 'card', 
  count = 1,
  nodeCount = 12 
}) => {
  // If nodeCount is provided but variant is default, use the old behavior
  if (variant === 'card' && nodeCount !== 12) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 animate-pulse" style={{ height: 800, width: '100%' }}>
        {/* Loading Stats */}
        <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-sm border rounded-lg p-3 shadow">
          <div className="text-sm space-y-1">
            <div className="h-4 bg-gray-200 rounded w-16"></div>
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-14"></div>
          </div>
        </div>

        {/* Loading Controls */}
        <div className="absolute top-4 left-4 z-20 flex gap-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-9 w-20 bg-white border rounded shadow"></div>
          ))}
        </div>

        {/* Skeleton Nodes */}
        <div className="absolute inset-0 p-8">
          <div className="grid grid-cols-4 gap-8">
            {Array.from({ length: nodeCount }, (_, i) => (
              <div
                key={i}
                className="w-28 h-20 bg-white border-2 border-gray-200 rounded-lg shadow-lg animate-pulse"
                style={{ 
                  animationDelay: `${i * 100}ms`,
                  animationDuration: '1.5s'
                }}
              >
                <div className="p-2 space-y-1">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-2 bg-gray-100 rounded w-3/4"></div>
                  <div className="h-1 bg-gray-100 rounded w-full mt-2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Loading indicator */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading skill tree...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderDashboardSkeleton = () => (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      
      {/* Metrics grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {/* Content skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <div className="space-x-2">
                  <Skeleton className="h-6 w-16 inline-block" />
                  <Skeleton className="h-6 w-16 inline-block" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderChartSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-end h-40">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton 
                key={i} 
                className="w-8" 
                style={{ height: `${20 + Math.random() * 80}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-8" />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderTableSkeleton = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <div className="space-x-2">
                <Skeleton className="h-6 w-16 inline-block" />
                <Skeleton className="h-6 w-20 inline-block" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const renderCardSkeleton = () => (
    Array.from({ length: count }).map((_, i) => (
      <Card key={i}>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
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
    ))
  );

  switch (variant) {
    case 'dashboard':
      return renderDashboardSkeleton();
    case 'chart':
      return renderChartSkeleton();
    case 'table':
      return renderTableSkeleton();
    case 'card':
    default:
      return <div className="space-y-4">{renderCardSkeleton()}</div>;
  }
};