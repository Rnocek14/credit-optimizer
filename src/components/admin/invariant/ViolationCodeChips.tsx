/**
 * Violation Code Chips
 * 
 * Displays invariant violation codes as clickable chips,
 * grouped by severity (errors first, then warnings).
 */

import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { getExplainer, isKnownInvariantCode, type InvariantCode } from '@/lib/invariant';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

interface ViolationCodeChipsProps {
  codes: string[];
  selectedCode: string | null;
  onSelectCode: (code: string) => void;
  className?: string;
}

interface CodeChipProps {
  code: string;
  isSelected: boolean;
  onClick: () => void;
}

// ============================================
// HELPERS
// ============================================

function getCodeSeverity(code: string): 'hard' | 'warn' | 'unknown' {
  if (!isKnownInvariantCode(code)) return 'unknown';
  const explainer = getExplainer(code as InvariantCode);
  return explainer?.severity ?? 'unknown';
}

function getCodeTitle(code: string): string {
  if (!isKnownInvariantCode(code)) return 'Unknown Invariant';
  const explainer = getExplainer(code as InvariantCode);
  return explainer?.title ?? code;
}

// Group and sort codes: errors first, then warnings, then unknown
function groupCodes(codes: string[]): { errors: string[]; warnings: string[]; unknown: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const unknown: string[] = [];

  for (const code of codes) {
    const severity = getCodeSeverity(code);
    if (severity === 'hard') {
      errors.push(code);
    } else if (severity === 'warn') {
      warnings.push(code);
    } else {
      unknown.push(code);
    }
  }

  return { errors, warnings, unknown };
}

// ============================================
// SUBCOMPONENTS
// ============================================

function CodeChip({ code, isSelected, onClick }: CodeChipProps) {
  const severity = getCodeSeverity(code);
  const title = getCodeTitle(code);
  
  const Icon = severity === 'hard' ? AlertCircle : AlertTriangle;
  
  const baseStyles = 'cursor-pointer transition-all border-2';
  const selectedStyles = 'ring-2 ring-offset-2 ring-primary';
  
  const severityStyles = {
    hard: 'bg-destructive/10 text-destructive border-destructive/30 hover:bg-destructive/20',
    warn: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20',
    unknown: 'bg-muted text-muted-foreground border-border hover:bg-muted/80',
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              baseStyles,
              severityStyles[severity],
              isSelected && selectedStyles,
              'gap-1.5 px-3 py-1.5'
            )}
            onClick={onClick}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">{title}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-mono text-xs">{code}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ViolationCodeChips({
  codes,
  selectedCode,
  onSelectCode,
  className,
}: ViolationCodeChipsProps) {
  const { errors, warnings, unknown } = groupCodes(codes);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Errors (hard blockers) */}
      {errors.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-destructive uppercase tracking-wide flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Blocking ({errors.length})
          </h5>
          <div className="flex flex-wrap gap-2">
            {errors.map((code) => (
              <CodeChip
                key={code}
                code={code}
                isSelected={selectedCode === code}
                onClick={() => onSelectCode(code)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-yellow-600 dark:text-yellow-400 uppercase tracking-wide flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Warnings ({warnings.length})
          </h5>
          <div className="flex flex-wrap gap-2">
            {warnings.map((code) => (
              <CodeChip
                key={code}
                code={code}
                isSelected={selectedCode === code}
                onClick={() => onSelectCode(code)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Unknown codes */}
      {unknown.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Unknown ({unknown.length})
          </h5>
          <div className="flex flex-wrap gap-2">
            {unknown.map((code) => (
              <CodeChip
                key={code}
                code={code}
                isSelected={selectedCode === code}
                onClick={() => onSelectCode(code)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
