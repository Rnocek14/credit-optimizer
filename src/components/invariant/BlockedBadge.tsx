/**
 * BlockedBadge Component
 * 
 * Compact badge for showing blocked/warning status in lists and cards.
 * Marketplace-safe messaging by default.
 * 
 * SEVERITY SEMANTICS:
 * - 'hard': Blocking violations (shown as blocked)
 * - 'warn': Non-blocking warnings
 */

import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { useBlockedReason } from '@/hooks/useBlockedReason';
import type { InvariantReport, AudienceLevel } from '@/lib/invariant';

interface BlockedBadgeProps {
  report: InvariantReport | null | undefined;
  audience?: AudienceLevel;
  showPassing?: boolean;
  size?: 'sm' | 'md';
}

/**
 * BlockedBadge Component
 * 
 * Shows a compact status badge for template validation state.
 * 
 * @example
 * ```tsx
 * <BlockedBadge report={template.invariantReport} audience="marketplace" />
 * ```
 */
export function BlockedBadge({
  report,
  audience = 'marketplace',
  showPassing = false,
  size = 'sm',
}: BlockedBadgeProps) {
  const {
    isBlocked,
    hasWarnings,
    primaryBlocker,
    hardCount,
    warnCount,
    badgeText,
  } = useBlockedReason(report, { audience });
  
  // Don't show anything if passing (unless showPassing is true)
  if (!isBlocked && !hasWarnings) {
    if (!showPassing) return null;
    
    return (
      <Badge variant="outline" className="gap-1 text-green-600 border-green-200 bg-green-50">
        <CheckCircle className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
        Valid
      </Badge>
    );
  }
  
  const tooltipContent = isBlocked
    ? primaryBlocker?.title ?? 'Template blocked'
    : `${warnCount} warning${warnCount > 1 ? 's' : ''}`;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={isBlocked ? 'destructive' : 'outline'}
            className={`gap-1 ${
              !isBlocked ? 'text-amber-600 border-amber-200 bg-amber-50' : ''
            }`}
          >
            {isBlocked ? (
              <XCircle className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
            ) : (
              <AlertTriangle className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
            )}
            {badgeText ?? (isBlocked ? 'Blocked' : 'Warning')}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Simple text message for blocked templates (marketplace-safe)
 */
export function BlockedMessage({
  report,
  audience = 'marketplace',
}: {
  report: InvariantReport | null | undefined;
  audience?: AudienceLevel;
}) {
  const { isBlocked, primaryBlocker } = useBlockedReason(report, { audience });
  
  if (!isBlocked) return null;
  
  return (
    <div className="flex items-center gap-2 text-sm text-destructive">
      <XCircle className="h-4 w-4" />
      <span>{primaryBlocker?.title ?? 'This template is currently unavailable'}</span>
    </div>
  );
}
