import { ChevronDown, ChevronRight, GraduationCap, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
  const progressPercentage = totalCreditsRequired > 0 
    ? (totalCreditsPlanned / totalCreditsRequired) * 100 
    : 0;

  const completionPercentage = totalCreditsRequired > 0
    ? (totalCreditsEarned / totalCreditsRequired) * 100
    : 0;

  const getDegreeStatus = (): DegreeStatus => {
    const ratio = totalCreditsPlanned / totalCreditsRequired;
    if (ratio >= 1.0) return 'on-track';
    if (ratio >= 0.9) return 'ahead';
    return 'behind';
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

  return (
    <div
      onClick={onToggle}
      className={`
        degree-node
        px-8 py-6 rounded-xl border-3 cursor-pointer
        transition-all duration-300
        bg-gradient-to-r from-primary/5 to-secondary/5
        hover:shadow-xl hover:scale-[1.01]
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
              {totalCreditsPlanned}/{totalCreditsRequired} cr ({Math.round(progressPercentage)}%)
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">~{estimatedMonths} months</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">${estimatedCost.toLocaleString()}</span>
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
              <span className="font-medium">Progress: {totalCreditsPlanned}/{totalCreditsRequired} credits</span>
              <span className="text-muted-foreground">{Math.round(progressPercentage)}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Metrics Grid */}
          <div className="flex items-center justify-between">
            {/* Status Badges */}
            <div className="flex gap-2">
              <Badge variant={statusBadge.variant} className="text-xs">
                {statusBadge.emoji} {statusBadge.label}
              </Badge>
              {warnings && warnings.length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Estimates */}
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>~{estimatedMonths} months</span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                <span>${estimatedCost.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Warnings Detail */}
          {warnings && warnings.length > 0 && (
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-destructive">
                {warnings.slice(0, 3).map((warning, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span>•</span>
                    <span>{warning}</span>
                  </div>
                ))}
                {warnings.length > 3 && (
                  <div className="mt-1 text-muted-foreground">
                    + {warnings.length - 3} more issue{warnings.length - 3 !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
