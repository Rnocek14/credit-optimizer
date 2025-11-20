import * as React from 'react';
import type { OptimizedPlanWarnings } from '@/types/optimizer';

type PolicyStatus = 'ok' | 'warning';

export interface PolicyStatusPillProps {
  warnings: OptimizedPlanWarnings | null | undefined;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

function getPolicyStatus(
  warnings: OptimizedPlanWarnings | null | undefined
): { status: PolicyStatus; label: string; details: string[] } {
  if (!warnings) {
    return {
      status: 'ok',
      label: 'Policy-compliant',
      details: [],
    };
  }

  const details: string[] = [];

  if (warnings.exceedsAltCreditCap) {
    details.push('Exceeds alternative credit cap');
  }

  if (warnings.exceedsTotalTransferCap) {
    details.push('Exceeds total transfer credit cap');
  }

  if (warnings.belowResidencyMin) {
    details.push('Below minimum institutional residency credits');
  }

  if (warnings.missingGenEdCredits && warnings.missingGenEdCredits.length > 0) {
    const cats = warnings.missingGenEdCredits.join(', ');
    details.push(`Missing General Education credits in: ${cats}`);
  }

  if (details.length === 0) {
    return {
      status: 'ok',
      label: 'Policy-compliant',
      details: [],
    };
  }

  return {
    status: 'warning',
    label: 'Policy review needed',
    details,
  };
}

export function PolicyStatusPill({
  warnings,
  size = 'sm',
  showLabel = true,
  className = '',
}: PolicyStatusPillProps) {
  const { status, label, details } = getPolicyStatus(warnings);

  const base =
    'inline-flex items-center gap-1 rounded-full border text-xs font-medium px-2 py-0.5';
  const sizeClasses =
    size === 'md' ? 'text-xs md:text-sm px-3 py-1' : 'text-[11px] md:text-xs';
  const toneClasses =
    status === 'ok'
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300'
      : 'border-amber-500/40 bg-amber-500/10 text-amber-500 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-300';

  const icon =
    status === 'ok' ? (
      <span aria-hidden>✅</span>
    ) : (
      <span aria-hidden>⚠️</span>
    );

  return (
    <div
      className={[
        base,
        sizeClasses,
        toneClasses,
        'max-w-full',
        'cursor-default',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      title={
        details.length
          ? details.join(' • ')
          : 'Based on current Life Path policy model'
      }
    >
      {icon}
      {showLabel && <span className="truncate">{label}</span>}
    </div>
  );
}
