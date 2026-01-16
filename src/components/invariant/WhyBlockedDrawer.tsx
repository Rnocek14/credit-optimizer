/**
 * WhyBlockedDrawer Component
 * 
 * Admin-focused drawer for displaying detailed invariant violation explanations.
 * Shows hard failures, warnings, suggested fixes, and affected courses.
 * Now includes actionable fix buttons for quick admin workflows.
 * 
 * SEVERITY SEMANTICS:
 * - 'hard': Blocking violations (template cannot proceed)
 * - 'warn': Non-blocking warnings
 */

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Info,
  Lightbulb,
  Wrench,
  XCircle,
} from 'lucide-react';
import { useBlockedReason } from '@/hooks/useBlockedReason';
import { FixActionList } from './FixActionButton';
import { getPrioritizedFixes, type FixActionContext } from '@/lib/invariant/actionableFixes';
import type { InvariantReport, AnyViolation, ExplainedViolation } from '@/lib/invariant';

interface WhyBlockedDrawerProps {
  report: InvariantReport | null | undefined;
  templateName?: string;
  templateId?: string;
  institutionCode?: string;
  programCode?: string;
  policyPackId?: string;
  trigger?: React.ReactNode;
  onStatusChange?: (status: string) => void;
  onRerunValidation?: () => void;
}

/**
 * Type guard for ExplainedViolation
 */
function isExplainedViolation(v: AnyViolation): v is ExplainedViolation {
  return !v.isUnknownCode;
}

/**
 * Violation Card Component with actionable fixes
 */
function ViolationCard({ 
  violation,
  isHardFailure,
  context,
  onStatusChange,
  onRerunValidation,
}: { 
  violation: AnyViolation;
  isHardFailure: boolean;
  context: FixActionContext;
  onStatusChange?: (status: string) => void;
  onRerunValidation?: () => void;
}) {
  const isExplained = isExplainedViolation(violation);
  
  // Get actionable fixes for this violation
  const fixes = getPrioritizedFixes(violation.code, context, { maxFixes: 3 });
  
  return (
    <AccordionItem value={violation.code} className="border rounded-lg mb-2">
      <AccordionTrigger className="px-4 py-3 hover:no-underline">
        <div className="flex items-center gap-3 text-left">
          {isHardFailure ? (
            <XCircle className="h-5 w-5 text-destructive shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="font-medium">{violation.title}</div>
            <div className="text-sm text-muted-foreground truncate">
              {violation.code}
            </div>
          </div>
          {isExplained && (
            <Badge variant="outline" className="shrink-0 text-xs">
              {violation.category}
            </Badge>
          )}
          {!isExplained && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              Unknown
            </Badge>
          )}
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        <div className="space-y-4">
          {/* Explanation */}
          <div>
            <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
              <Info className="h-4 w-4" />
              What this means
            </h4>
            <p className="text-sm text-muted-foreground">
              {violation.explanation}
            </p>
          </div>
          
          {/* Impact */}
          {isExplained && (
            <div>
              <h4 className="text-sm font-medium mb-1 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Impact
              </h4>
              <p className="text-sm text-muted-foreground">
                {violation.impact}
              </p>
            </div>
          )}
          
          {/* Quick Actions - NEW */}
          {fixes.length > 0 && (
            <div className="pt-2">
              <Separator className="mb-4" />
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Quick Actions
              </h4>
              <FixActionList
                fixes={fixes}
                context={context}
                onStatusChange={onStatusChange}
                onRerunValidation={onRerunValidation}
                layout="vertical"
                maxVisible={3}
              />
            </div>
          )}
          
          {/* Suggested Fixes (text-based fallback) */}
          {isExplained && violation.suggestedFixes.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Additional Guidance
              </h4>
              <ul className="space-y-1">
                {violation.suggestedFixes.map((fix, i) => (
                  <li 
                    key={i}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />
                    {fix}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Affected Courses */}
          {violation.affectedCourses && violation.affectedCourses.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Affected Courses</h4>
              <div className="flex flex-wrap gap-1">
                {violation.affectedCourses.map((course) => (
                  <Badge key={course} variant="secondary" className="text-xs">
                    {course}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Original Message (debug) */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground font-mono">
              {violation.originalMessage}
            </p>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

/**
 * WhyBlockedDrawer Component
 */
export function WhyBlockedDrawer({
  report,
  templateName,
  templateId,
  institutionCode,
  programCode,
  policyPackId,
  trigger,
  onStatusChange,
  onRerunValidation,
}: WhyBlockedDrawerProps) {
  const [open, setOpen] = useState(false);
  const {
    isBlocked,
    hasWarnings,
    wouldFailStrict,
    hardFailures,
    warnings,
    hardCount,
    warnCount,
    badgeText,
  } = useBlockedReason(report, { audience: 'admin' });
  
  // Build context for actionable fixes
  const context: FixActionContext = {
    templateId,
    institutionCode,
    programCode,
    policyPackId,
  };
  
  // Don't render if no issues
  if (!isBlocked && !hasWarnings) {
    return null;
  }
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger ?? (
          <Button 
            variant={isBlocked ? "destructive" : "outline"} 
            size="sm"
            className="gap-2"
          >
            {isBlocked ? (
              <XCircle className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
            {badgeText ?? 'View Issues'}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {isBlocked ? (
              <>
                <XCircle className="h-5 w-5 text-destructive" />
                Template Blocked
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Template Warnings
              </>
            )}
          </SheetTitle>
          <SheetDescription>
            {templateName ? `Issues with "${templateName}"` : 'Template validation issues'}
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-12rem)] mt-6 pr-4">
          {/* Status Summary */}
          <div className="flex items-center gap-4 mb-6 p-4 rounded-lg bg-muted">
            <div className="flex items-center gap-2">
              {isBlocked ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <span className="text-sm font-medium">
                {isBlocked ? 'Blocked' : 'Passing'}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">
              {hardCount > 0 && `${hardCount} hard failure${hardCount > 1 ? 's' : ''}`}
              {hardCount > 0 && warnCount > 0 && ', '}
              {warnCount > 0 && `${warnCount} warning${warnCount > 1 ? 's' : ''}`}
            </div>
            {wouldFailStrict && !isBlocked && (
              <Badge variant="outline" className="text-amber-600">
                Would fail strict
              </Badge>
            )}
          </div>
          
          {/* Hard Failures Section */}
          {hardFailures.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-destructive">
                <XCircle className="h-4 w-4" />
                Hard Failures ({hardCount})
              </h3>
              <Accordion type="single" collapsible className="space-y-2">
                {hardFailures.map((v) => (
                  <ViolationCard 
                    key={v.code} 
                    violation={v} 
                    isHardFailure={true}
                    context={context}
                    onStatusChange={onStatusChange}
                    onRerunValidation={onRerunValidation}
                  />
                ))}
              </Accordion>
            </div>
          )}
          
          {/* Warnings Section */}
          {warnings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                Warnings ({warnCount})
              </h3>
              <Accordion type="single" collapsible className="space-y-2">
                {warnings.map((v) => (
                  <ViolationCard 
                    key={v.code} 
                    violation={v} 
                    isHardFailure={false}
                    context={context}
                    onStatusChange={onStatusChange}
                    onRerunValidation={onRerunValidation}
                  />
                ))}
              </Accordion>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
