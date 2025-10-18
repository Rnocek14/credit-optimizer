/**
 * LoadingStates - Skeleton loaders for marketplace and validation
 */
import React from 'react';
import { Card } from '@/components/ui/card';

export const MarketplaceLoadingSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[1, 2, 3].map((i) => (
      <Card key={i} className="p-4 animate-pulse">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 bg-muted rounded-md" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-3 bg-muted rounded w-1/2" />
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-5/6" />
        </div>
      </Card>
    ))}
  </div>
);

export const PolicyValidationLoadingSkeleton: React.FC = () => (
  <Card className="p-4 animate-pulse">
    <div className="space-y-3">
      <div className="h-6 bg-muted rounded w-2/3" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-3 bg-muted rounded w-1/3" />
            <div className="h-3 bg-muted rounded w-1/4" />
          </div>
        ))}
      </div>
    </div>
  </Card>
);
