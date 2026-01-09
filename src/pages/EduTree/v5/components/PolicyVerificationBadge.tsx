/**
 * Policy Verification Badge
 * 
 * Displays verification status of institution policies.
 * Shows "Verified" for live packs, "Estimated" for fallbacks.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, AlertCircle, Loader2, ShieldCheck, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export type VerificationStatus = 'verified' | 'estimated' | 'unverified' | 'loading';

interface PolicyVerificationBadgeProps {
  status: VerificationStatus;
  confidence?: number; // 0-100
  source?: string;
  evidenceUrl?: string;
  verifiedAt?: string;
  compact?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<VerificationStatus, {
  icon: typeof CheckCircle2;
  label: string;
  variant: 'default' | 'secondary' | 'outline' | 'destructive';
  description: string;
}> = {
  verified: {
    icon: ShieldCheck,
    label: 'Verified',
    variant: 'default',
    description: 'Policy values verified from official sources',
  },
  estimated: {
    icon: AlertCircle,
    label: 'Estimated',
    variant: 'secondary',
    description: 'Using estimated values - official verification pending',
  },
  unverified: {
    icon: ShieldAlert,
    label: 'Unverified',
    variant: 'outline',
    description: 'Policy not verified - values may be inaccurate',
  },
  loading: {
    icon: Loader2,
    label: 'Loading',
    variant: 'outline',
    description: 'Checking verification status...',
  },
};

export function PolicyVerificationBadge({
  status,
  confidence,
  source,
  evidenceUrl,
  verifiedAt,
  compact = false,
  className,
}: PolicyVerificationBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const badge = (
    <Badge
      variant={config.variant}
      className={cn(
        'gap-1',
        status === 'verified' && 'bg-emerald-600 hover:bg-emerald-700',
        status === 'loading' && 'animate-pulse',
        className
      )}
    >
      <Icon className={cn('h-3 w-3', status === 'loading' && 'animate-spin')} />
      {!compact && config.label}
    </Badge>
  );

  const tooltipContent = (
    <div className="space-y-1 max-w-xs">
      <div className="font-medium">{config.label}</div>
      <div className="text-xs text-muted-foreground">{config.description}</div>
      
      {confidence !== undefined && (
        <div className="text-xs">
          Confidence: <span className="font-mono">{confidence}%</span>
        </div>
      )}
      
      {source && (
        <div className="text-xs">
          Source: <span className="font-mono">{source}</span>
        </div>
      )}
      
      {verifiedAt && (
        <div className="text-xs">
          Verified: {new Date(verifiedAt).toLocaleDateString()}
        </div>
      )}
      
      {evidenceUrl && (
        <a 
          href={evidenceUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline block"
        >
          View source →
        </a>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="top" className="p-2">
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Helper to determine verification status from policy data
 */
export function getVerificationStatus(
  verified: boolean,
  isLoading: boolean,
  confidence?: number
): VerificationStatus {
  if (isLoading) return 'loading';
  if (verified) return 'verified';
  if (confidence !== undefined && confidence >= 75) return 'estimated';
  return 'unverified';
}
