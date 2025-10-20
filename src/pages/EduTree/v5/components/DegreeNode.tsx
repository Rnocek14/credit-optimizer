import { ChevronDown, ChevronRight, GraduationCap, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { fmtCurrency, fmtCredits, fmtPercentage, fmtDuration } from '@/lib/formatters';
import type { DegreeSummary, DegreeStatus } from '../types/v5';

interface DegreeNodeProps extends DegreeSummary {
  isCollapsed: boolean;
  onToggle: () => void;
  yearCount: number;
}

export function DegreeNode({
  degreeTitle,
  degreeLevel,
  totalCreditsRequired,
  totalCreditsPlanned,
  totalCreditsEarned,
  estimatedMonths,
  estimatedCost,
  warnings,
  isCollapsed,
  onToggle,
  yearCount
}: DegreeNodeProps) {
  // Earned progress (main progress bar - actual completion)
  const earnedProgressPct = totalCreditsRequired > 0
    ? (totalCreditsEarned / totalCreditsRequired) * 100
    : 0;

  // Planned coverage (badge indicator - what's scheduled)
  const plannedCoveragePct = totalCreditsRequired > 0 
    ? (totalCreditsPlanned / totalCreditsRequired) * 100 
    : 0;

  const getDegreeStatus = (): DegreeStatus => {
    const ratio = totalCreditsEarned / totalCreditsRequired;
    if (ratio >= 1.0) return 'on-track';  // Completed or close to completion
    if (ratio >= 0.75) return 'ahead';    // Above expected pace for time in program
    return 'behind';                       // Needs to accelerate to finish on time
  };

  const getStatusBadge = () => {
    const status = getDegreeStatus();
    switch (status) {
      case 'ahead':
        return { emoji: '🚀', label: 'Ahead', variant: 'success' as const };
      case 'behind':
        return { emoji: '⚠️', label: 'Behind', variant: 'destructive' as const };
      default:
        return { emoji: '✅', label: 'On Track', variant: 'default' as const };
    }
  };

  const getDegreeLevelBadge = () => {
    switch (degreeLevel) {
      case 'associate':
        return 'A.S.';
      case 'master':
        return 'M.S.';
      default:
        return 'B.S.';
    }
  };

  const statusBadge = getStatusBadge();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={!isCollapsed}
      aria-label={`Degree summary for ${degreeTitle}`}
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      className={`
        degree-node
        px-8 py-6 rounded-xl border-3 cursor-pointer
        transition-all duration-300
        bg-gradient-to-r from-primary/5 to-secondary/5
        hover:shadow-xl hover:scale-[1.01]
        focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        ${isCollapsed 
          ? 'collapsed border-primary/30 border-dashed min-h-[70px]' 
          : 'expanded border-primary min-h-[180px]'
        }
      `}
    >
      {isCollapsed ? (
        /* Collapsed State */
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-semibold">{degreeTitle}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              {fmtCredits(totalCreditsEarned, totalCreditsRequired)} ({fmtPercentage(earnedProgressPct)})
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">Planned: {fmtCredits(totalCreditsPlanned, totalCreditsRequired)}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">~{fmtDuration(estimatedMonths)}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{fmtCurrency(estimatedCost)}</span>
          </div>
          <ChevronRight className="h-5 w-5 text-primary" />
        </div>
      ) : (
        /* Expanded State */
        <div className="space-y-4">
          {/* Header Row */}
          <div className="flex items-start justify-between">
            {/* Left: Title and Icon */}
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-lg bg-primary/10 border-2 border-primary">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-foreground">{degreeTitle}</h2>
                  <Badge variant="outline" className="text-xs">
                    {getDegreeLevelBadge()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {yearCount}-year program • {totalCreditsRequired} credits required
                </p>
              </div>
            </div>

            {/* Right: Collapse Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggle();
              }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Hide
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* Progress Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progress: {fmtCredits(totalCreditsEarned, totalCreditsRequired)} earned</span>
              <span className="text-muted-foreground">{fmtPercentage(earnedProgressPct)}</span>
            </div>
            <Progress value={earnedProgressPct} className="h-2" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="text-xs">
                📚 Planned: {fmtCredits(totalCreditsPlanned, totalCreditsRequired)} ({fmtPercentage(plannedCoveragePct)})
              </Badge>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="flex items-center justify-between">
            {/* Status Badges */}
            <div className="flex gap-2">
              <Badge variant={statusBadge.variant} className="text-xs">
                {statusBadge.emoji} {statusBadge.label}
              </Badge>
              {warnings && warnings.length > 0 && (
                <Popover>
                  <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <button
                      aria-haspopup="dialog"
                      aria-label={`View ${warnings.length} planning warning${warnings.length !== 1 ? 's' : ''}`}
                    >
                      <Badge variant="destructive" className="text-xs cursor-pointer hover:bg-destructive/90">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
                      </Badge>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-80" 
                    align="start"
                    role="dialog"
                    aria-label="Planning warnings"
                  >
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Planning Warnings</h4>
                      <div className="text-xs text-muted-foreground space-y-1">
                        {warnings.map((warning, idx) => (
                          <div key={idx} className="flex items-start gap-2">
                            <span className="text-destructive">•</span>
                            <span>{warning}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {/* Estimates */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>~{fmtDuration(estimatedMonths)}</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>{fmtCurrency(estimatedCost)}</span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
