import { ChevronDown, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { LoadHealth, CreditsSummary, ModulesSummary } from '../types/v5';

interface YearCardProps {
  year: number;
  isCollapsed: boolean;
  onToggle: () => void;
  onClick?: () => void;
  creditsSummary: CreditsSummary;
  loadHealth: LoadHealth;
  modulesSummary: ModulesSummary;
  warnings?: string[];
}

export function YearCard({ 
  year, 
  isCollapsed, 
  onToggle,
  onClick,
  creditsSummary,
  loadHealth,
  modulesSummary,
  warnings 
}: YearCardProps) {
  const progressPercentage = creditsSummary.required > 0 
    ? (creditsSummary.planned / creditsSummary.required) * 100 
    : 0;

  const getLoadHealthBadge = () => {
    switch (loadHealth) {
      case 'underloaded':
        return { emoji: '🟡', label: 'Light', variant: 'warning' as const };
      case 'overloaded':
        return { emoji: '🔴', label: 'Heavy', variant: 'destructive' as const };
      default:
        return { emoji: '🟢', label: 'Balanced', variant: 'success' as const };
    }
  };

  const loadBadge = getLoadHealthBadge();
  
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        
        // Check if clicking a button (like collapse chevron)
        const target = e.target as HTMLElement;
        if (target.closest('button')) {
          return; // Let the button handle it
        }
        
        // Card body click: open panel if available, else toggle
        if (onClick) {
          onClick();
        } else {
          onToggle();
        }
      }}
      className={`
        year-card
        px-6 py-4 rounded-lg border-2 cursor-pointer
        transition-all duration-200
        min-w-[200px]
        flex flex-col gap-3
        hover:scale-[1.02] hover:shadow-lg
        ${isCollapsed 
          ? 'collapsed bg-primary/5 border-primary border-dashed opacity-70 min-h-[90px]' 
          : 'expanded bg-primary/10 border-primary min-h-[140px]'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-center gap-2 text-primary font-bold text-lg">
        <span>Year {year}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          aria-label={isCollapsed ? 'Expand year' : 'Collapse year'}
          className="p-1 hover:bg-primary/10 rounded transition-colors"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>
      
      {isCollapsed ? (
        /* Collapsed State: Compact Summary */
        <div className="text-center text-xs text-muted-foreground">
          {modulesSummary.total} modules • {modulesSummary.completed} complete • {creditsSummary.planned} cr
        </div>
      ) : (
        /* Expanded State: Full Details */
        <>
          {/* Progress Bar */}
          <div className="space-y-1">
            <Progress value={progressPercentage} className="h-1.5" />
            <div className="text-center text-[10px] text-muted-foreground">
              {creditsSummary.planned} / {creditsSummary.required} cr
            </div>
          </div>
          
          {/* Status Badges */}
          <div className="flex justify-center gap-2 flex-wrap">
            <Badge variant={loadBadge.variant} size="sm" className="text-[10px]">
              {loadBadge.emoji} {loadBadge.label}
            </Badge>
            {creditsSummary.planned >= 30 && (
              <Badge variant="destructive" size="sm" className="text-[10px]">
                🔒 Year Cap
              </Badge>
            )}
            <Badge variant="secondary" size="sm" className="text-[10px]">
              📚 {modulesSummary.total} modules
            </Badge>
          </div>
          
          {/* Semester Planning Placeholder */}
          <div className="mt-2 pt-2 border-t border-muted">
            <div className="text-center text-[10px] text-muted-foreground">
              📅 Semester planning coming soon
            </div>
          </div>
          
          {/* Warnings */}
          {warnings && warnings.length > 0 && (
            <div className="text-center text-[9px] text-destructive">
              ⚠️ {warnings[0]}
              {warnings.length > 1 && ` +${warnings.length - 1} more`}
            </div>
          )}
        </>
      )}
    </div>
  );
}
