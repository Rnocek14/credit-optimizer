import { type ReactNode } from 'react';
import { ChevronRight, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { V6_COPY } from '../copy';

interface V6YearSectionProps {
  year: number;
  isExpanded: boolean;
  onToggle: () => void;
  creditsSummary: { planned: number; required: number };
  modulesCount: number;
  /** Visual "lock" — user can always click to override */
  isVisuallyLocked?: boolean;
  children: ReactNode;
}

export function V6YearSection({
  year,
  isExpanded,
  onToggle,
  creditsSummary,
  modulesCount,
  isVisuallyLocked = false,
  children,
}: V6YearSectionProps) {
  if (!isExpanded) {
    // Collapsed state — compact summary
    return (
      <button
        onClick={onToggle}
        className="w-full text-left px-6 py-4 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30 hover:bg-muted/50 hover:border-muted-foreground/30 transition-all group cursor-pointer"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isVisuallyLocked && <Lock className="w-4 h-4 text-muted-foreground/50" />}
            <h3 className="font-bold text-lg text-muted-foreground group-hover:text-foreground transition-colors">
              Year {year}
            </h3>
            <Badge variant="secondary" className="text-xs">
              {modulesCount} modules • {creditsSummary.required} cr
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{V6_COPY.yearClickToExpand}</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
        {isVisuallyLocked && (
          <p className="text-xs text-muted-foreground/60 mt-1 ml-7">
            {V6_COPY.yearLocked(year)}
          </p>
        )}
      </button>
    );
  }

  // Expanded — render children (YearCard + ModuleCards from V5)
  return <div>{children}</div>;
}
