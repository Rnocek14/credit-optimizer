/**
 * Course Options List Component
 * Displays up to 3 course options with transfer states and evidence badges
 */

import { EvidenceChip } from './EvidenceChip';
import { TransferStateChip, type TransferState } from './TransferStateChip';
import { Badge } from '@/components/ui/badge';

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
}

interface CourseOptionsListProps {
  options: CourseOptionData[];
  maxDisplay?: number;
  onOptionClick?: (courseId: string) => void;
}

export function CourseOptionsList({ 
  options, 
  maxDisplay = 3,
  onOptionClick 
}: CourseOptionsListProps) {
  if (!options || options.length === 0) {
    return null;
  }

  const displayOptions = options.slice(0, maxDisplay);

  return (
    <div className="mt-2 space-y-1.5">
      {displayOptions.map((option) => (
        <div
          key={option.courseId}
          className="p-1.5 rounded border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group"
          onClick={() => onOptionClick?.(option.courseId)}
          title={`${option.title} - ${option.provider}`}
        >
          <div className="flex items-start justify-between gap-1">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-medium text-foreground truncate">
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
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
