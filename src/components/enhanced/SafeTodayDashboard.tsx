import React from 'react';
import { EnhancedErrorBoundary } from './EnhancedErrorBoundary';
import { LoadingFallback } from './LoadingFallback';
import { TodayDashboard } from '@/components/TodayDashboard';

interface SafeTodayDashboardProps {
  onNextStepClick?: () => void;
}

export function SafeTodayDashboard({ onNextStepClick }: SafeTodayDashboardProps) {
  console.log('SafeTodayDashboard: Rendering with enhanced error boundary');
  
  return (
    <EnhancedErrorBoundary>
      <TodayDashboard onNextStepClick={onNextStepClick} />
    </EnhancedErrorBoundary>
  );
}