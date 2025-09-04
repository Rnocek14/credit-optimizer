import React from 'react';
import { Badge } from '@/components/ui/badge';

interface StepBadgeProps {
  stepNumber: number;
  isMainPath?: boolean;
}

export function StepBadge({ stepNumber, isMainPath = false }: StepBadgeProps) {
  if (!isMainPath || stepNumber <= 0) return null;
  
  return (
    <Badge 
      variant="default"
      className="absolute -top-2 -left-2 z-20 w-6 h-6 rounded-full p-0 flex items-center justify-center bg-primary text-primary-foreground font-bold text-xs"
      data-testid="lp-step-badge"
    >
      {stepNumber}
    </Badge>
  );
}