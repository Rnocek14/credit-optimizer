import { CheckCircle, AlertCircle, Star, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRequirementEligibility } from "@/hooks/usePlanValidation";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EligibleCourse } from "@/lib/planValidation";

interface EligibilityPanelProps {
  planId?: string;
  blockId?: string;
  onSelectCourse?: (course: EligibleCourse) => void;
  className?: string;
}

/**
 * Panel showing ranked eligible courses for a requirement block
 * Displays after user clicks on a block to fill it
 */
export function EligibilityPanel({
  planId,
  blockId,
  onSelectCourse,
  className,
}: EligibilityPanelProps) {
  const { data, isLoading, error } = useRequirementEligibility(planId, blockId);

  if (!planId || !blockId) {
    return (
      <div className={cn("p-4 text-sm text-muted-foreground", className)}>
        Select a requirement block to see eligible courses.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={cn("space-y-3 p-4", className)}>
        <Skeleton className="h-6 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("p-4 text-sm text-destructive", className)}>
        Failed to load eligible courses. Please try again.
      </div>
    );
  }

  if (!data || data.eligible_courses.length === 0) {
    return (
      <div className={cn("p-4", className)}>
        <p className="text-sm text-muted-foreground">
          No eligible courses found for this block.
        </p>
        {data?.caps && (
          <div className="mt-2 text-xs text-muted-foreground">
            {data.caps.alt_remaining !== undefined && (
              <span>Alt credits remaining: {data.caps.alt_remaining}</span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="px-4 pt-4">
        <h3 className="text-sm font-semibold">{data.block_title}</h3>
        <p className="text-xs text-muted-foreground">
          {getRuleDescription(data.rule_type, data.k, data.credits_needed)}
        </p>
        {data.caps && (
          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
            {data.caps.alt_remaining !== undefined && (
              <span>Alt remaining: {data.caps.alt_remaining} cr</span>
            )}
            {data.caps.transfer_remaining !== undefined && (
              <span>Transfer remaining: {data.caps.transfer_remaining} cr</span>
            )}
          </div>
        )}
      </div>

      <ScrollArea className="h-[400px]">
        <div className="space-y-2 px-4 pb-4">
          {data.eligible_courses.map((course, index) => (
            <EligibleCourseCard
              key={course.course_id}
              course={course}
              rank={index + 1}
              onSelect={onSelectCourse}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function EligibleCourseCard({
  course,
  rank,
  onSelect,
}: {
  course: EligibleCourse;
  rank: number;
  onSelect?: (course: EligibleCourse) => void;
}) {
  const isTopPick = rank <= 3;

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        isTopPick
          ? "border-primary/30 bg-primary/5"
          : "border-border bg-card hover:bg-muted/50"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Rank badge */}
        <div
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium",
            isTopPick
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {rank}
        </div>

        <div className="flex-1 min-w-0 space-y-2">
          {/* Title and provider */}
          <div>
            <p className="text-sm font-medium text-foreground line-clamp-1">
              {course.title}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {course.provider_code && (
                <span>{course.provider_code}</span>
              )}
              <span>{course.credits} credits</span>
              {course.cri_score > 0 && (
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {course.cri_score.toFixed(1)}
                </span>
              )}
            </div>
          </div>

          {/* Eligibility flags */}
          <div className="flex flex-wrap gap-1.5">
            {course.eligibility.transfer_accepted && (
              <EligibilityBadge ok label="Transfer OK" />
            )}
            {course.eligibility.within_alt_cap && (
              <EligibilityBadge ok label="Within cap" />
            )}
            {course.eligibility.within_transfer_cap === false && (
              <EligibilityBadge ok={false} label="Over transfer cap" />
            )}
            {course.eligibility.within_alt_cap === false && (
              <EligibilityBadge ok={false} label="Over alt cap" />
            )}
          </div>

          {/* Explain tooltips */}
          {course.explain.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-0.5">
              {course.explain.slice(0, 2).map((exp, i) => (
                <li key={i} className="flex items-start gap-1">
                  <span className="text-muted-foreground/60">•</span>
                  {exp}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Score and action */}
        <div className="flex flex-col items-end gap-2">
          <div className="text-right">
            <div className="text-lg font-semibold text-foreground">
              {course.score}
            </div>
            <div className="text-[10px] text-muted-foreground uppercase">
              score
            </div>
          </div>
          {onSelect && (
            <Button
              size="sm"
              variant={isTopPick ? "default" : "outline"}
              onClick={() => onSelect(course)}
              className="h-7 text-xs"
            >
              Add to plan
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function EligibilityBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "h-5 gap-1 px-1.5 text-[10px]",
        ok
          ? "bg-accent text-accent-foreground"
          : "bg-muted text-muted-foreground"
      )}
    >
      {ok ? (
        <CheckCircle className="h-2.5 w-2.5" />
      ) : (
        <AlertCircle className="h-2.5 w-2.5" />
      )}
      {label}
    </Badge>
  );
}

function getRuleDescription(
  ruleType: string,
  k?: number | null,
  creditsNeeded?: number | null
): string {
  switch (ruleType) {
    case "ALL":
      return "Complete all courses in this block";
    case "K_OF_N":
      return `Complete any ${k ?? "?"} courses from this block`;
    case "CREDITS":
      return `Earn ${creditsNeeded ?? "?"} credits from this block`;
    default:
      return "Complete required courses";
  }
}
