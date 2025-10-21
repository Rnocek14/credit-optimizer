import { Sparkles, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAutoFillPlan } from '../hooks/useAutoFillPlan';
import type { ModuleData, Constraints, ScoringWeights } from '../types/exports';

interface AutoFillPlanButtonProps {
  modules: ModuleData[];
  constraints: Constraints;
  weights: ScoringWeights;
  disabled?: boolean;
}

/**
 * Phase 1c.2: Auto-Fill Plan Dialog
 * - Preview-first UI: shows suggestions before adding to basket
 * - Accessibility: aria-live progress, focus trap, keyboard nav
 * - Actions: Run → Accept/Reject → Close
 */
export function AutoFillPlanButton({
  modules,
  constraints,
  weights,
  disabled = false,
}: AutoFillPlanButtonProps) {
  const { isRunning, result, error, run, accept, reject, constraintsChanged } = useAutoFillPlan(
    modules,
    constraints,
    weights
  );

  const handleAccept = () => {
    accept();
  };

  const handleReject = () => {
    reject();
  };

  const getStatusBadge = () => {
    if (!result) return null;

    switch (result.status) {
      case 'ok':
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Plan Complete
          </Badge>
        );
      case 'partial':
        return (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            Partial Plan
          </Badge>
        );
      case 'none':
        return (
          <Badge variant="outline" className="gap-1">
            <XCircle className="w-3 h-3" />
            No Suggestions
          </Badge>
        );
    }
  };

  const canAutoFill = modules.some(m => (m.creditsRequired - m.creditsEarned) > 0);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || !canAutoFill}
          className="gap-2"
          onClick={run}
        >
          <Sparkles className="w-4 h-4" />
          Auto-Fill Plan
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Auto-Fill Your Plan
          </DialogTitle>
          <DialogDescription>
            Automatically select courses based on your priorities and constraints.
          </DialogDescription>
        </DialogHeader>

        {/* Loading State */}
        {isRunning && (
          <div className="py-8 space-y-4">
            <div
              className="flex flex-col items-center gap-4"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
              <div className="text-center space-y-2">
                <p className="font-medium">Analyzing modules...</p>
                <p className="text-sm text-muted-foreground">
                  Finding the best courses for your goals
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="py-4">
            <div className="p-4 bg-destructive/10 text-destructive rounded-lg">
              <div className="flex items-center gap-2 font-medium mb-2">
                <XCircle className="w-4 h-4" />
                Error
              </div>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Results State */}
        {result && !isRunning && (
          <div className="space-y-4">
            {/* Status & Totals Summary */}
            <div className="flex items-center justify-between">
              {getStatusBadge()}
              <div className="text-sm text-muted-foreground">
                {result.suggestions.length} course{result.suggestions.length !== 1 ? 's' : ''} selected
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 p-4 bg-accent/30 rounded-lg">
              <div>
                <div className="text-xs text-muted-foreground">Cost</div>
                <div className="font-semibold">${result.totals.totalCost.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Duration</div>
                <div className="font-semibold">{result.totals.totalWeeks}wks</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Workload</div>
                <div className="font-semibold">{result.totals.totalWorkloadHours}hrs/wk</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">ACE</div>
                <div className="font-semibold">{result.totals.aceCredits}cr</div>
              </div>
            </div>

            {/* Constraints Changed Warning */}
            {constraintsChanged && (
              <div className="p-3 bg-orange-500/10 text-orange-700 rounded-lg text-sm">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <AlertCircle className="w-4 h-4" />
                  Constraints Changed
                </div>
                <p className="text-xs">Your constraints have changed since this plan was generated. Run again to get updated suggestions.</p>
              </div>
            )}

            {/* Stopped Reason */}
            {result.stoppedReason && (
              <div className="p-3 bg-yellow-500/10 text-yellow-700 rounded-lg text-sm">
                <div className="flex items-center gap-2 font-medium mb-1">
                  <AlertCircle className="w-4 h-4" />
                  Partial Result
                </div>
                <p className="text-xs">{result.stoppedReason}</p>
              </div>
            )}

            {/* Suggestions List */}
            {result.suggestions.length > 0 ? (
              <ScrollArea className="h-[300px] rounded-md border">
                <div className="p-4 space-y-2">
                  {result.suggestions.map((item, idx) => (
                    <div
                      key={`${item.courseId}-${idx}`}
                      className="p-3 bg-accent/20 rounded-md space-y-1"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {item.courseId}
                            {item.title && `: ${item.title}`}
                          </div>
                          {item.autoFillReason && (
                            <div className="text-xs text-muted-foreground italic mt-1">
                              ✨ {item.autoFillReason}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {item.credits}cr
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {item.cost_usd !== null && (
                          <span>${item.cost_usd.toLocaleString()}</span>
                        )}
                        {item.duration_weeks && (
                          <span>• {item.duration_weeks}wks</span>
                        )}
                        {item.moduleId === 'prereqs' ? (
                          <Badge variant="secondary" className="text-[10px]">
                            Prerequisite
                          </Badge>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">
                            Module: {item.moduleId}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <XCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No courses could be auto-filled</p>
                <p className="text-xs mt-1">Try adjusting your constraints or priorities</p>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <DialogFooter>
          {result && !isRunning && (
            <>
              <Button variant="outline" onClick={handleReject}>
                Cancel
              </Button>
              <Button
                onClick={handleAccept}
                disabled={result.suggestions.length === 0 || constraintsChanged}
              >
                Accept &amp; Add ({result.suggestions.length})
              </Button>
            </>
          )}
          {(isRunning || error) && (
            <Button variant="outline" onClick={handleReject}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
