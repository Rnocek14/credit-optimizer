import { X, AlertTriangle, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type PlanViolation,
  groupViolationsByBlock,
} from "@/lib/planValidation";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PlanViolationsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violations: PlanViolation[];
  blockTitles?: Record<string, string>;
}

/**
 * Drawer showing grouped list of plan violations
 * Opens from right side with details and suggested fixes
 */
export function PlanViolationsDrawer({
  open,
  onOpenChange,
  violations,
  blockTitles = {},
}: PlanViolationsDrawerProps) {
  const grouped = groupViolationsByBlock(violations);
  const groupKeys = Object.keys(grouped).sort((a, b) => {
    // Plan-level first, then by block
    if (a === "plan") return -1;
    if (b === "plan") return 1;
    return (blockTitles[a] ?? a).localeCompare(blockTitles[b] ?? b);
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <SheetTitle>Plan Issues</SheetTitle>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </SheetClose>
          </div>
          <p className="text-sm text-muted-foreground">
            {violations.length} issue{violations.length === 1 ? "" : "s"} found
          </p>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-4 -mx-6 px-6">
          <div className="space-y-6 pb-8">
            {groupKeys.map((key) => (
              <ViolationGroup
                key={key}
                groupKey={key}
                title={key === "plan" ? "Plan Rules" : blockTitles[key] ?? key}
                violations={grouped[key]}
              />
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function ViolationGroup({
  groupKey,
  title,
  violations,
}: {
  groupKey: string;
  title: string;
  violations: PlanViolation[];
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="space-y-2">
        {violations.map((v, i) => (
          <ViolationCard key={`${v.code}-${v.scope_key}-${i}`} violation={v} />
        ))}
      </div>
    </div>
  );
}

function ViolationCard({ violation }: { violation: PlanViolation }) {
  const config = {
    block: {
      icon: XCircle,
      iconClass: "text-destructive",
      borderClass: "border-destructive/30",
      bgClass: "bg-destructive/5",
    },
    warn: {
      icon: AlertTriangle,
      iconClass: "text-amber-600 dark:text-amber-400",
      borderClass: "border-amber-500/30",
      bgClass: "bg-amber-50 dark:bg-amber-950/20",
    },
    info: {
      icon: Info,
      iconClass: "text-blue-600 dark:text-blue-400",
      borderClass: "border-blue-500/30",
      bgClass: "bg-blue-50 dark:bg-blue-950/20",
    },
  };

  const { icon: Icon, iconClass, borderClass, bgClass } =
    config[violation.severity];

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        borderClass,
        bgClass
      )}
    >
      <div className="flex gap-3">
        <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", iconClass)} />
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-foreground">
              {violation.message}
            </p>
            <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {violation.code}
            </span>
          </div>

          {/* Details */}
          {violation.details && Object.keys(violation.details).length > 0 && (
            <div className="text-xs text-muted-foreground space-y-0.5">
              {Object.entries(violation.details).map(([key, value]) => (
                <div key={key} className="flex gap-2">
                  <span className="font-medium capitalize">
                    {key.replace(/_/g, " ")}:
                  </span>
                  <span>
                    {typeof value === "number"
                      ? value.toLocaleString()
                      : String(value)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
