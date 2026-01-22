import { AlertTriangle, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type PlanInvariantResult,
  getViolationCounts,
  getWorstSeverity,
} from "@/lib/planValidation";
import { Button } from "@/components/ui/button";

interface PlanValidationBannerProps {
  result?: PlanInvariantResult;
  isLoading?: boolean;
  onOpenDrawer?: () => void;
  className?: string;
}

/**
 * Banner showing overall plan validation status
 * Displays at top of plan page with click to expand details
 */
export function PlanValidationBanner({
  result,
  isLoading,
  onOpenDrawer,
  className,
}: PlanValidationBannerProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border px-4 py-3",
          "border-muted bg-muted/30 animate-pulse",
          className
        )}
      >
        <div className="h-5 w-5 rounded-full bg-muted" />
        <div className="h-4 w-48 rounded bg-muted" />
      </div>
    );
  }

  if (!result) return null;

  const { blocks, warns } = getViolationCounts(result.violations);
  const status = getWorstSeverity(result.violations);

  const config = {
    block: {
      border: "border-destructive/30",
      bg: "bg-destructive/5",
      text: "text-destructive",
      Icon: XCircle,
      title: `Plan is blocked (${blocks} issue${blocks === 1 ? "" : "s"})`,
      subtitle: "These issues must be resolved before you can complete your degree.",
    },
    warn: {
      border: "border-amber-500/30",
      bg: "bg-amber-50 dark:bg-amber-950/20",
      text: "text-amber-700 dark:text-amber-400",
      Icon: AlertTriangle,
      title: `Plan has warnings (${warns})`,
      subtitle: "Review these recommendations to optimize your plan.",
    },
    info: {
      border: "border-blue-500/30",
      bg: "bg-blue-50 dark:bg-blue-950/20",
      text: "text-blue-700 dark:text-blue-400",
      Icon: AlertTriangle,
      title: "Plan notes available",
      subtitle: "Some informational notes are available.",
    },
    ok: {
      border: "border-green-500/30",
      bg: "bg-green-50 dark:bg-green-950/20",
      text: "text-green-700 dark:text-green-400",
      Icon: CheckCircle2,
      title: "Plan looks good",
      subtitle: "All requirements are on track for completion.",
    },
  };

  const { border, bg, text, Icon, title, subtitle } = config[status];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3",
        border,
        bg,
        className
      )}
    >
      <Icon className={cn("h-5 w-5 shrink-0", text)} />

      <div className="flex-1 min-w-0">
        <p className={cn("text-sm font-medium", text)}>{title}</p>
        <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
      </div>

      {onOpenDrawer && result.violations.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onOpenDrawer}
          className={cn("shrink-0", text)}
        >
          View details
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      )}

      {/* Credit totals summary */}
      {result.totals && (
        <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground border-l pl-4 ml-2">
          <span>
            <strong>{result.totals.total}</strong> credits
          </span>
          <span>
            <strong>{result.totals.institutional}</strong> institutional
          </span>
          <span>
            <strong>{result.totals.alt}</strong> alt
          </span>
        </div>
      )}
    </div>
  );
}
