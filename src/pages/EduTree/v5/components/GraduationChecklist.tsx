/**
 * GraduationChecklist - Real-time graduation readiness display
 * Shows progress toward degree completion requirements
 */

import { useMemo } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  validateGraduationReadiness, 
  getGraduationStatusLabel,
  type GraduationRequirement,
  type GraduationReadiness 
} from '../utils/graduationValidator';
import type { BasketItem } from '../state/usePlanBasket';
import type { PartnerPolicy } from '../engine/yearPlanner';

interface GraduationChecklistProps {
  basket: BasketItem[];
  policy: PartnerPolicy;
  compact?: boolean;
}

function RequirementRow({ requirement }: { requirement: GraduationRequirement }) {
  const getIcon = () => {
    switch (requirement.severity) {
      case 'ok':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };

  const progressPercent = requirement.required > 0 
    ? Math.min(100, (requirement.earned / requirement.required) * 100)
    : 100;

  // For transfer cap, invert the display (lower is better)
  const isTransferCap = requirement.name.includes('Transfer');
  const displayProgress = isTransferCap 
    ? Math.min(100, (requirement.earned / requirement.required) * 100)
    : progressPercent;

  return (
    <div className="flex items-center gap-3 py-2">
      {getIcon()}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium truncate">{requirement.name}</span>
          <span className={`text-xs ${requirement.met ? 'text-muted-foreground' : 'text-foreground'}`}>
            {isTransferCap 
              ? `${requirement.earned}/${requirement.required} used`
              : `${requirement.earned}/${requirement.required} cr`
            }
          </span>
        </div>
        <Progress 
          value={displayProgress} 
          className={`h-1.5 mt-1 ${
            requirement.severity === 'error' ? '[&>div]:bg-destructive' : 
            requirement.severity === 'warning' ? '[&>div]:bg-yellow-500' : ''
          }`} 
        />
      </div>
    </div>
  );
}

export function GraduationChecklist({ basket, policy, compact = false }: GraduationChecklistProps) {
  const readiness = useMemo(() => 
    validateGraduationReadiness(basket, policy), 
    [basket, policy]
  );

  const statusLabel = getGraduationStatusLabel(readiness);

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant={statusLabel.variant} className="text-xs">
          {statusLabel.label}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {readiness.progressPercent}% complete
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-sm">Graduation Readiness</h4>
        <div className="flex items-center gap-2">
          <Badge variant={statusLabel.variant}>{statusLabel.label}</Badge>
          {statusLabel.caveat && (
            <span className="text-xs text-muted-foreground" title={statusLabel.caveat}>ⓘ</span>
          )}
        </div>
      </div>

      {/* Requirements list */}
      <div className="space-y-1">
        <RequirementRow requirement={readiness.totalCredits} />
        <RequirementRow requirement={readiness.residency} />
        {readiness.upperDivision.required > 0 && (
          <RequirementRow requirement={readiness.upperDivision} />
        )}
        <RequirementRow requirement={readiness.transferCap} />
      </div>

      {/* Blockers */}
      {readiness.blockers.length > 0 && (
        <Collapsible defaultOpen>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-destructive hover:underline">
            <AlertCircle className="h-4 w-4" />
            {readiness.blockers.length} Blocker{readiness.blockers.length > 1 ? 's' : ''}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-1">
            {readiness.blockers.map((blocker, i) => (
              <div key={i} className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {blocker}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Warnings */}
      {readiness.warnings.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-yellow-600 dark:text-yellow-400 hover:underline">
            <AlertTriangle className="h-4 w-4" />
            {readiness.warnings.length} Warning{readiness.warnings.length > 1 ? 's' : ''}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-1">
            {readiness.warnings.map((warning, i) => (
              <div key={i} className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 rounded-md px-3 py-2">
                {warning}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Success state - with truth guard for unverified upper-division */}
      {readiness.isGraduationReady && !readiness.isUpperDivisionVerified && (
        <div className="flex items-center gap-2 text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 rounded-md px-3 py-2">
          <Info className="h-4 w-4" />
          <div>
            <span className="font-medium">Requirements met*</span>
            <span className="block text-xs opacity-80">Upper-division requirement unverified for this institution</span>
          </div>
        </div>
      )}
      
      {readiness.isGraduationReady && readiness.isUpperDivisionVerified && (
        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-500/10 rounded-md px-3 py-2">
          <CheckCircle className="h-4 w-4" />
          All graduation requirements verified!
        </div>
      )}
    </div>
  );
}

/**
 * Compact graduation status badge for DegreeNode
 */
export function GraduationStatusBadge({ basket, policy }: Omit<GraduationChecklistProps, 'compact'>) {
  const readiness = useMemo(() => 
    validateGraduationReadiness(basket, policy), 
    [basket, policy]
  );

  const statusLabel = getGraduationStatusLabel(readiness);

  return (
    <Badge variant={statusLabel.variant} className="text-xs">
      {statusLabel.label}
    </Badge>
  );
}
