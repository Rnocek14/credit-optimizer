/**
 * Enhanced Loading State Component for Maya + CRI Integration
 * Now using the new design system for better visual polish
 */

import React from 'react';
import { EnhancedLoadingState } from './EnhancedLoadingState';

interface LoadingStateProps {
  type?: 'intelligence' | 'market' | 'analytics' | 'general';
  message?: string;
}

export function LoadingState({ type = 'general', message }: LoadingStateProps) {
  return <EnhancedLoadingState type={type} message={message} />;
}