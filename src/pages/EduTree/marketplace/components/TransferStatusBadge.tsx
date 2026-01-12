import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CheckCircle2, AlertCircle, HelpCircle, ExternalLink } from 'lucide-react';

export type TransferStatus = 'verified' | 'elective' | 'review' | 'unknown';

export type EvidenceType = 'policy_provider_acceptance' | 'equivalency_table' | 'catalog_statement' | 'other_official';

export interface TransferStatusBadgeProps {
  status: TransferStatus;
  sourceCourse?: string;
  sourceProvider?: string;
  targetCourse?: string | null;
  targetSchool?: string;
  confidence?: number | null;
  evidenceUrl?: string | null;
  ruleSource?: string | null;
  evidenceType?: EvidenceType | null;
  className?: string;
}

const getEvidenceLinkLabel = (evidenceType?: EvidenceType | null): string => {
  switch (evidenceType) {
    case 'policy_provider_acceptance':
      return 'Policy source (provider acceptance)';
    case 'equivalency_table':
      return 'Equivalency table (course mapping)';
    case 'catalog_statement':
      return 'Catalog statement';
    case 'other_official':
      return 'Official source';
    default:
      return 'View evidence';
  }
};

const STATUS_CONFIG: Record<TransferStatus, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}> = {
  verified: {
    label: 'Verified',
    icon: CheckCircle2,
    className: 'border-green-300/60 bg-green-500/5 text-green-700 dark:text-green-300',
  },
  elective: {
    label: 'Elective',
    icon: AlertCircle,
    className: 'border-yellow-300/60 bg-yellow-500/5 text-yellow-700 dark:text-yellow-300',
  },
  review: {
    label: 'Review',
    icon: AlertCircle,
    className: 'border-orange-300/60 bg-orange-500/5 text-orange-700 dark:text-orange-300',
  },
  unknown: {
    label: 'Unknown',
    icon: HelpCircle,
    className: 'border-border/60 bg-muted/30 text-muted-foreground',
  },
};

export function TransferStatusBadge({
  status,
  sourceCourse,
  sourceProvider,
  targetCourse,
  targetSchool,
  confidence,
  evidenceUrl,
  ruleSource,
  evidenceType,
  className,
}: TransferStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const badge = (
    <Badge 
      variant="outline" 
      className={`gap-1 text-[10px] px-1.5 py-0.5 ${config.className} ${className || ''}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );

  // If no additional details, just show the badge
  if (!targetSchool && !sourceCourse) {
    return badge;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="cursor-pointer focus:outline-none">
          {badge}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-xs">
        <div className="space-y-2">
          <div className="font-medium">Transfer Status</div>
          
          {sourceCourse && sourceProvider && (
            <div className="text-muted-foreground">
              <span className="font-medium">Source:</span>{' '}
              {sourceProvider} • {sourceCourse}
            </div>
          )}
          
          {targetSchool && (
            <div className="text-muted-foreground">
              <span className="font-medium">Target:</span> {targetSchool}
            </div>
          )}
          
          {status === 'verified' && targetCourse && (
            <div className="rounded-md bg-green-500/5 border border-green-500/20 px-2 py-1.5">
              <div className="text-green-700 dark:text-green-300 font-medium">
                ✓ Transfers as: {targetCourse}
              </div>
            </div>
          )}
          
          {status === 'elective' && (
            <div className="rounded-md bg-yellow-500/5 border border-yellow-500/20 px-2 py-1.5">
              <div className="text-yellow-700 dark:text-yellow-300">
                Transfers as free elective credit
              </div>
            </div>
          )}
          
          {status === 'review' && (
            <div className="rounded-md bg-orange-500/5 border border-orange-500/20 px-2 py-1.5">
              <div className="text-orange-700 dark:text-orange-300">
                ⚠️ Requires advisor verification
              </div>
            </div>
          )}
          
          {(ruleSource || confidence !== null) && (
            <div className="text-[11px] text-muted-foreground pt-1 border-t">
              {ruleSource && <div>Source: {ruleSource}</div>}
              {confidence !== null && confidence !== undefined && (
                <div>Confidence: {Math.round(confidence * 100)}%</div>
              )}
            </div>
          )}
          
          {evidenceUrl && (
            <a 
              href={evidenceUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              {getEvidenceLinkLabel(evidenceType)}
            </a>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
