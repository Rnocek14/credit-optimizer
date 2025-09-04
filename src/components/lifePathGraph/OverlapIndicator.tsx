import React from 'react';
import { Badge } from '@/components/ui/badge';

interface OverlapIndicatorProps {
  count: number;
  goals?: string[];
}

export function OverlapIndicator({ count, goals = [] }: OverlapIndicatorProps) {
  if (count <= 1) return null;
  
  return (
    <Badge 
      variant="secondary"
      className="absolute -top-1 -right-1 z-20 w-5 h-5 rounded-full p-0 flex items-center justify-center bg-accent text-accent-foreground font-bold text-xs"
      title={goals.length > 0 ? `Shared by: ${goals.join(', ')}` : `Used by ${count} paths`}
    >
      ×{count}
    </Badge>
  );
}