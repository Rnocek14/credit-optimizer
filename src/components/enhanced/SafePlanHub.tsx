import React, { Suspense } from 'react';
import { EnhancedErrorBoundary } from './EnhancedErrorBoundary';
import { LoadingFallback } from './LoadingFallback';

const PlanHub = React.lazy(() => import('@/pages/PlanHub'));

export function SafePlanHub() {
  console.log('SafePlanHub: Rendering with enhanced error boundary and suspense');
  
  return (
    <EnhancedErrorBoundary>
      <Suspense 
        fallback={
          <LoadingFallback
            isLoading={true}
            hasData={false}
            fallbackMessage="Loading your career planning hub..."
          >
            <div />
          </LoadingFallback>
        }
      >
        <PlanHub />
      </Suspense>
    </EnhancedErrorBoundary>
  );
}