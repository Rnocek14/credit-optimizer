import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ConfidenceBadgeProps {
  confidence: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ConfidenceBadge({ 
  confidence, 
  showLabel = true, 
  size = 'md',
  className 
}: ConfidenceBadgeProps) {
  const getColor = () => {
    if (confidence >= 95) return 'bg-green-500 text-white';
    if (confidence >= 80) return 'bg-green-400 text-white';
    if (confidence >= 60) return 'bg-yellow-500 text-black';
    if (confidence >= 40) return 'bg-orange-500 text-white';
    return 'bg-red-500 text-white';
  };

  const getLabel = () => {
    if (confidence >= 95) return 'Canonical';
    if (confidence >= 80) return 'High';
    if (confidence >= 60) return 'Medium';
    if (confidence >= 40) return 'Low';
    return 'Uncertain';
  };

  const getDescription = () => {
    if (confidence >= 95) return 'Explicit statement in official catalog/policy document';
    if (confidence >= 80) return 'Explicit in FAQ or student resources page';
    if (confidence >= 60) return 'Implied or calculated from other values';
    if (confidence >= 40) return 'Mentioned but ambiguous or potentially outdated';
    return 'Not found or highly uncertain';
  };

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-xs px-2 py-0.5',
    lg: 'text-sm px-2.5 py-1',
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          className={cn(
            getColor(),
            sizeClasses[size],
            'cursor-help',
            className
          )}
        >
          {confidence}%{showLabel && ` · ${getLabel()}`}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="max-w-xs">
          <div className="font-medium">{getLabel()} Confidence</div>
          <div className="text-xs text-muted-foreground">{getDescription()}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
