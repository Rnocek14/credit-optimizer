import * as React from 'react';
import { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { Violation } from '@/pages/EduTree/v5/engine/constraints';
import { cn } from '@/lib/utils';

interface PolicyStatusBannerProps {
  violations: Violation[];
  className?: string;
}

function getWorstSeverity(violations: Violation[]): 'ok' | 'warning' | 'error' {
  if (!violations.length) return 'ok';
  if (violations.some((v) => v.severity === 'error')) return 'error';
  if (violations.some((v) => v.severity === 'warning')) return 'warning';
  return 'ok';
}

export function PolicyStatusBanner({ violations, className }: PolicyStatusBannerProps) {
  const [expanded, setExpanded] = useState(false);

  const worst = getWorstSeverity(violations);

  if (worst === 'ok') {
    return (
      <div className={cn(
        'flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-xs',
        className
      )}>
        <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div className="flex flex-col">
          <span className="font-medium text-emerald-800 dark:text-emerald-300">
            Plan meets institutional policy checks
          </span>
          <span className="text-[11px] text-emerald-900/80 dark:text-emerald-200/80">
            No residency, transfer, or gen-ed issues detected.
          </span>
        </div>
      </div>
    );
  }

  const errorCount = violations.filter((v) => v.severity === 'error').length;
  const warningCount = violations.filter((v) => v.severity === 'warning').length;

  const borderClass =
    worst === 'error'
      ? 'border-destructive/30 bg-destructive/5'
      : 'border-amber-500/30 bg-amber-500/5';

  const IconComponent = worst === 'error' ? XCircle : AlertTriangle;
  const iconClass = worst === 'error' 
    ? 'text-destructive' 
    : 'text-amber-600 dark:text-amber-400';

  const title =
    worst === 'error'
      ? 'Plan violates one or more institutional policies'
      : 'Plan may need adjustments to fully meet policies';

  const summary = [
    errorCount ? `${errorCount} blocking issue${errorCount > 1 ? 's' : ''}` : null,
    warningCount ? `${warningCount} warning${warningCount > 1 ? 's' : ''}` : null,
  ]
    .filter(Boolean)
    .join(' • ');

  return (
    <div className={cn('rounded-xl border px-3 py-2 text-xs', borderClass, className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconComponent className={cn('h-4 w-4 shrink-0', iconClass)} />
          <div className="flex flex-col">
            <span className="font-medium text-foreground">{title}</span>
            <span className="text-[11px] text-muted-foreground">{summary}</span>
          </div>
        </div>

        {violations.length > 0 && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium hover:bg-accent transition-colors"
          >
            {expanded ? 'Hide' : 'View'}
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}
      </div>

      {expanded && (
        <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto pr-1">
          {violations.map((v, idx) => (
            <li key={idx} className="rounded-lg bg-background/60 px-2 py-1.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] leading-snug text-foreground">
                  {v.message}
                  {v.suggestedFix && (
                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                      Suggestion: {v.suggestedFix}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    'ml-2 shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                    v.severity === 'error'
                      ? 'bg-destructive/10 text-destructive'
                      : v.severity === 'warning'
                      ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {v.severity}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
