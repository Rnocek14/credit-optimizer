/**
 * Course Options List Component
 * Displays up to 3 course options with transfer states and evidence badges
 */

import { EvidenceChip } from './EvidenceChip';
import { TransferStateChip, type TransferState } from './TransferStateChip';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { AlertTriangle } from 'lucide-react';
import type { DeadEndCheck } from '@/pages/EduTree/v5/engine/deadEndDetector';
import { formatDeadEndTooltip } from '@/pages/EduTree/v5/hooks/useDeadEndGuard';

export interface CourseOptionData {
  courseId: string;
  code: string;
  title: string;
  provider: string;
  credits?: number;
  cost?: number;
  evidence?: {
    ace?: boolean;
    clep?: boolean;
    url?: string;
  };
  transfer?: {
    state: TransferState;
    score?: number;
  };
  selected?: boolean;
  /** Dead-end annotation from feasibility checks */
  deadEnd?: DeadEndCheck;
}

interface CourseOptionsListProps {
  options: CourseOptionData[];
  maxDisplay?: number;
  onOptionClick?: (courseId: string) => void;
  /** Show dead-end options with tooltips */
  showDeadEndReasons?: boolean;
}

export function CourseOptionsList({ 
  options, 
  maxDisplay = 3,
  onOptionClick,
  showDeadEndReasons = false,
}: CourseOptionsListProps) {
  if (!options || options.length === 0) {
    return null;
  }

  // Filter out dead-ends unless we're in debug mode
  const filteredOptions = showDeadEndReasons 
    ? options 
    : options.filter(opt => !opt.deadEnd?.isDeadEnd);
    
  const displayOptions = filteredOptions.slice(0, maxDisplay);

  return (
    <TooltipProvider>
      <div className="mt-2 space-y-1.5">
        {displayOptions.map((option) => {
          const isDeadEnd = !!option.deadEnd?.isDeadEnd;
          const deadEndTooltip = isDeadEnd ? formatDeadEndTooltip(option.deadEnd!) : '';
          
          const optionContent = (
            <div
              key={option.courseId}
              className={`p-1.5 rounded border transition-colors group ${
                isDeadEnd 
                  ? 'border-destructive/50 bg-destructive/5 opacity-60 cursor-not-allowed' 
                  : 'border-border/50 bg-muted/20 hover:bg-muted/40 cursor-pointer'
              }`}
              onClick={() => !isDeadEnd && onOptionClick?.(option.courseId)}
              title={isDeadEnd ? undefined : `${option.title} - ${option.provider}`}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-medium text-foreground truncate flex items-center gap-1">
                    {isDeadEnd && <AlertTriangle className="h-3 w-3 text-destructive flex-shrink-0" />}
                    {option.code || option.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">
                    {option.provider}
                    {option.credits && ` • ${option.credits}cr`}
                    {option.cost && ` • $${option.cost}`}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {option.evidence?.ace && <EvidenceChip type="ACE" />}
                  {option.evidence?.clep && <EvidenceChip type="CLEP" />}
                  {option.transfer && (
                    <TransferStateChip 
                      state={option.transfer.state} 
                      score={option.transfer.score}
                    />
                  )}
                  {option.selected && (
                    <Badge 
                      variant="default" 
                      className="text-[10px] h-auto py-0.5 px-1.5"
                    >
                      Selected
                    </Badge>
                  )}
                  {isDeadEnd && (
                    <Badge 
                      variant="destructive" 
                      className="text-[10px] h-auto py-0.5 px-1.5"
                    >
                      Not viable
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          );
          
          // Wrap dead-end options with tooltip
          if (isDeadEnd && deadEndTooltip) {
            return (
              <Tooltip key={option.courseId}>
                <TooltipTrigger asChild>
                  {optionContent}
                </TooltipTrigger>
                <TooltipContent 
                  className="max-w-xs whitespace-pre-line text-xs"
                  side="left"
                >
                  {deadEndTooltip}
                </TooltipContent>
              </Tooltip>
            );
          }
          
          return optionContent;
        })}
      </div>
    </TooltipProvider>
  );
}
