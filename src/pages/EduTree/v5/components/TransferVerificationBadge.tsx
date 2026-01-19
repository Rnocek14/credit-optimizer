/**
 * Transfer Verification Badge
 * 
 * Shows the verification status of a course's transfer to the anchor school.
 * This is a core UI component for building trust in decentralized degrees.
 */

import React, { useState } from 'react';
import { Check, AlertTriangle, X, Building2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PreApprovalEmailModal } from '@/components/transfer/PreApprovalEmailModal';
import { getEvidenceFreshnessLabel, isEvidenceStale } from '@/lib/transfer/evidenceDecay';

export type TransferStatus = 'verified' | 'elective-only' | 'unverified' | 'institutional' | 'loading';

interface TransferVerificationBadgeProps {
  status: TransferStatus;
  confidence?: number;
  targetEquivCode?: string;
  anchorSchool?: string;
  evidenceUrl?: string | null;
  /** ISO date string when evidence was last verified */
  lastVerifiedAt?: string | null;
  compact?: boolean;
  className?: string;
  // For pre-approval email
  courseCode?: string;
  courseTitle?: string;
  sourceProvider?: string;
  credits?: number;
  degreeProgram?: string;
  catalogYear?: string;
}

// Helper to get status-specific copy based on evidence availability
function getStatusLabel(status: TransferStatus, hasEvidence: boolean): string {
  switch (status) {
    case 'verified':
      return hasEvidence ? 'Verified (evidence linked)' : 'Rule found';
    case 'elective-only':
      return hasEvidence ? 'Elective (evidence linked)' : 'Elective rule found';
    case 'unverified':
      return 'Needs research';
    case 'institutional':
      return 'University Course';
    case 'loading':
      return 'Checking...';
    default:
      return 'Unknown';
  }
}

function getStatusDescription(status: TransferStatus, hasEvidence: boolean): string {
  switch (status) {
    case 'verified':
      return hasEvidence 
        ? 'This course has a verified transfer agreement with linked evidence'
        : 'Transfer rule found (no evidence link yet)';
    case 'elective-only':
      return hasEvidence
        ? 'This course transfers as elective credit only, with linked evidence'
        : 'Elective transfer rule found (no evidence link yet)';
    case 'unverified':
      return 'No verified transfer rule exists — needs research before relying on this';
    case 'institutional':
      return 'This is a course from the degree-granting university';
    case 'loading':
      return 'Verifying transfer status...';
    default:
      return 'Status unknown';
  }
}

const STATUS_CONFIG: Record<TransferStatus, {
  icon: React.ElementType;
  color: string;
  bgColor: string;
}> = {
  verified: {
    icon: Check,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  'elective-only': {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
  unverified: {
    icon: X,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  institutional: {
    icon: Building2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  loading: {
    icon: Check,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
  },
};

export function TransferVerificationBadge({
  status,
  confidence,
  targetEquivCode,
  anchorSchool,
  evidenceUrl,
  lastVerifiedAt,
  compact = false,
  className,
  courseCode,
  courseTitle,
  sourceProvider,
  credits,
  degreeProgram,
  catalogYear,
}: TransferVerificationBadgeProps) {
  const [emailModalOpen] = useState(false);
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.unverified;
  const Icon = config.icon;
  const hasEvidence = Boolean(evidenceUrl && evidenceUrl.trim());
  
  const label = getStatusLabel(status, hasEvidence);
  const description = getStatusDescription(status, hasEvidence);
  
  const confidencePercent = confidence ? Math.round(confidence * 100) : null;

  // Evidence freshness calculation (P1 tighten-up: user-facing staleness)
  const freshnessInfo = hasEvidence && lastVerifiedAt 
    ? getEvidenceFreshnessLabel(lastVerifiedAt) 
    : null;
  const isStale = lastVerifiedAt ? isEvidenceStale(lastVerifiedAt) : false;

  // Check if pre-approval email can be shown (not institutional, has course info)
  const canShowPreApproval = status !== 'institutional' && status !== 'loading' && courseCode && anchorSchool;
  
  const tooltipContent = (
    <div className="space-y-1 max-w-[250px]">
      <p className="font-medium">{label}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
      {targetEquivCode && (
        <p className="text-sm">
          <span className="text-muted-foreground">Maps to:</span>{' '}
          <span className="font-mono">{targetEquivCode}</span>
          {anchorSchool && <span className="text-muted-foreground"> @ {anchorSchool}</span>}
        </p>
      )}
      {confidencePercent !== null && (
        <p className="text-sm">
          <span className="text-muted-foreground">Confidence:</span>{' '}
          <span className={cn(
            confidencePercent >= 90 ? 'text-primary' :
            confidencePercent >= 80 ? 'text-accent-foreground' :
            'text-destructive'
          )}>
            {confidencePercent}%
          </span>
        </p>
      )}
      {/* P1: Evidence freshness indicator */}
      {freshnessInfo && (
        <p className="text-sm flex items-center gap-1">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">Evidence:</span>{' '}
          <span className={cn(
            freshnessInfo.color === 'green' ? 'text-primary' :
            freshnessInfo.color === 'yellow' ? 'text-accent-foreground' :
            freshnessInfo.color === 'orange' ? 'text-accent-foreground' :
            'text-destructive'
          )}>
            {freshnessInfo.label}
          </span>
          {isStale && (
            <span className="text-destructive text-xs">(stale)</span>
          )}
        </p>
      )}
      {!hasEvidence && status !== 'institutional' && status !== 'loading' && (
        <p className="text-sm text-muted-foreground italic flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          No evidence link
        </p>
      )}
    </div>
  );
  
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'inline-flex items-center justify-center w-5 h-5 rounded-full',
                config.bgColor,
                className
              )}
            >
              <Icon className={cn('w-3 h-3', config.color)} />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" align="center">
            {tooltipContent}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium',
              config.bgColor,
              config.color,
              className
            )}
          >
            <Icon className="w-3 h-3" />
            {label}
            {confidencePercent !== null && status !== 'institutional' && (
              <span className="opacity-70">({confidencePercent}%)</span>
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" align="center">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Hook to get transfer status for a course
 * Memoized and cached via React Query in useTransferRule
 */
export function useTransferVerificationStatus(
  providerCode: string | undefined,
  courseId: string | undefined,
  targetSchool: string | undefined
): TransferStatus {
  // If no course info, return loading
  if (!providerCode || !courseId || !targetSchool) {
    return 'loading';
  }
  
  // If provider is the target school, it's institutional
  if (providerCode.toUpperCase() === targetSchool.toUpperCase()) {
    return 'institutional';
  }
  
  // Default to loading - actual status should come from useTransferRule hook
  return 'loading';
}
