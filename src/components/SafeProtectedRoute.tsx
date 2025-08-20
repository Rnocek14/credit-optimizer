import React from 'react';
import { EnhancedErrorBoundary } from './enhanced/EnhancedErrorBoundary';
import { LoadingFallback } from './enhanced/LoadingFallback';
import ProtectedRoute from './ProtectedRoute';

interface SafeProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  requireOnboarding?: boolean;
  redirectIfComplete?: boolean;
}

export function SafeProtectedRoute(props: SafeProtectedRouteProps) {
  return (
    <EnhancedErrorBoundary
      onError={(error) => {
        console.error('ProtectedRoute error:', error);
      }}
    >
      <ProtectedRoute {...props} />
    </EnhancedErrorBoundary>
  );
}