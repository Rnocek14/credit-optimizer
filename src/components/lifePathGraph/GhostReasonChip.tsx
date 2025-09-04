import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, DollarSign, AlertTriangle, BookOpen, Lock } from 'lucide-react';

interface GhostReasonChipProps {
  reason: string;
  details?: {
    time?: string;
    cost?: string;
    cap?: string;
    requirement?: string;
  };
}

export function GhostReasonChip({ reason, details }: GhostReasonChipProps) {
  const getReasonIcon = () => {
    if (reason.includes('exam cap') || reason.includes('Exceeds')) return <BookOpen className="w-3 h-3" />;
    if (reason.includes('budget') || reason.includes('cost')) return <DollarSign className="w-3 h-3" />;
    if (reason.includes('time')) return <Clock className="w-3 h-3" />;
    if (reason.includes('Unlock') || reason.includes('prerequisite')) return <Lock className="w-3 h-3" />;
    return <AlertTriangle className="w-3 h-3" />;
  };

  const getReasonColor = () => {
    if (reason.includes('Unlock') || reason.includes('prerequisite')) {
      return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-200';
    }
    if (reason.includes('Exceeds') || reason.includes('cap')) {
      return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-200';
    }
    return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-950 dark:text-gray-200';
  };

  return (
    <Badge 
      variant="outline"
      className={`text-xs px-2 py-1 flex items-center gap-1 ${getReasonColor()}`}
    >
      {getReasonIcon()}
      <span>{reason}</span>
      {details?.time && <span className="text-xs opacity-75">({details.time})</span>}
      {details?.cost && <span className="text-xs opacity-75">({details.cost})</span>}
      {details?.cap && <span className="text-xs opacity-75">({details.cap})</span>}
    </Badge>
  );
}