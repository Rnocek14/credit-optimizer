import React from 'react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface EduTreeSkeletonProps {
  stage?: 'loading' | 'partial' | 'layout';
}

export function EduTreeSkeleton({ stage = 'loading' }: EduTreeSkeletonProps) {
  if (stage === 'layout') {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-4">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-sm text-muted-foreground">Calculating optimal layout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-[600px] p-6 space-y-6">
      {/* Year columns skeleton */}
      <div className="flex gap-8 overflow-x-auto">
        {[1, 2, 3, 4].map(year => (
          <div key={year} className="flex-none space-y-4">
            <Skeleton className="h-6 w-20" /> {/* Year label */}
            
            {/* Block skeletons for each year */}
            {[1, 2, 3].map(blockIndex => (
              <Card key={blockIndex} className="w-72 p-4 space-y-3">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-3/4" /> {/* Block title */}
                  <Skeleton className="h-4 w-full" /> {/* Block description */}
                </div>
                
                {/* Course skeletons */}
                <div className="space-y-2">
                  {[1, 2, 3].map(courseIndex => (
                    <div key={courseIndex} className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-16" /> {/* Course code */}
                      <Skeleton className="h-4 flex-1" /> {/* Course name */}
                    </div>
                  ))}
                </div>
                
                {/* Progress bar skeleton */}
                <Skeleton className="h-2 w-full" />
              </Card>
            ))}
          </div>
        ))}
      </div>

      {/* Specialization tracks skeleton */}
      {stage === 'partial' && (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-6 w-40" /> {/* "Choose Specialization" */}
          <div className="flex gap-6">
            {['Web Development', 'Mobile Development'].map(track => (
              <Card key={track} className="w-64 p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <div className="space-y-2">
                  {[1, 2].map(courseIndex => (
                    <Skeleton key={courseIndex} className="h-4 w-full" />
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function EduTreeProgressSkeleton() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
          <span className="text-sm font-medium">Loading education data...</span>
        </div>
        
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span>Fetching courses and requirements</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse animation-delay-150" />
            <span>Building prerequisite network</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse animation-delay-300" />
            <span>Calculating optimal layout</span>
          </div>
        </div>
      </div>
    </div>
  );
}