import React from 'react';
import { Card } from '@/components/ui/card';

interface SkeletonNodeProps {
  id: string;
  area?: string;
  level_year?: number;
}

export function SkeletonNode({ id, area, level_year }: SkeletonNodeProps) {
  return (
    <Card className="p-4 w-80 bg-muted/50 border-dashed animate-pulse">
      <div className="space-y-3">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-4 bg-muted-foreground/20 rounded w-20"></div>
          <div className="h-6 bg-muted-foreground/20 rounded w-16"></div>
        </div>
        
        {/* Title skeleton */}
        <div className="h-6 bg-muted-foreground/30 rounded w-48"></div>
        
        {/* Progress skeleton */}
        <div className="flex items-center gap-2">
          <div className="h-2 bg-muted-foreground/20 rounded flex-1"></div>
          <div className="h-4 bg-muted-foreground/20 rounded w-12"></div>
        </div>
        
        {/* Course placeholders */}
        <div className="space-y-2">
          <div className="h-3 bg-muted-foreground/15 rounded w-full"></div>
          <div className="h-3 bg-muted-foreground/15 rounded w-3/4"></div>
          <div className="h-3 bg-muted-foreground/15 rounded w-5/6"></div>
        </div>
      </div>
    </Card>
  );
}