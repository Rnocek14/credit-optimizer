import { CheckCircle2, AlertCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

type BlockStatus = "complete" | "incomplete" | "empty";

interface BlockStatusChipProps {
  status: BlockStatus;
  className?: string;
  showLabel?: boolean;
}

/**
 * Small chip indicating requirement block completion status
 * Used on block cards in the plan view
 */
export function BlockStatusChip({
  status,
  className,
  showLabel = false,
}: BlockStatusChipProps) {
  const config = {
    complete: {
      icon: CheckCircle2,
      label: "Complete",
      iconClass: "text-green-600 dark:text-green-400",
      bgClass: "bg-green-100 dark:bg-green-900/30",
      textClass: "text-green-700 dark:text-green-300",
    },
    incomplete: {
      icon: AlertCircle,
      label: "Incomplete",
      iconClass: "text-amber-600 dark:text-amber-400",
      bgClass: "bg-amber-100 dark:bg-amber-900/30",
      textClass: "text-amber-700 dark:text-amber-300",
    },
    empty: {
      icon: Circle,
      label: "Not started",
      iconClass: "text-muted-foreground",
      bgClass: "bg-muted/50",
      textClass: "text-muted-foreground",
    },
  };

  const { icon: Icon, label, iconClass, bgClass, textClass } = config[status];

  if (!showLabel) {
    return (
      <Icon
        className={cn("h-4 w-4", iconClass, className)}
        aria-label={label}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        bgClass,
        textClass,
        className
      )}
    >
      <Icon className={cn("h-3 w-3", iconClass)} />
      {label}
    </span>
  );
}

/**
 * Derive block status from validation state
 */
export function deriveBlockStatus(
  hasViolations: boolean,
  isIncomplete: boolean,
  hasAnyCourses: boolean
): BlockStatus {
  if (!hasAnyCourses) return "empty";
  if (isIncomplete || hasViolations) return "incomplete";
  return "complete";
}
