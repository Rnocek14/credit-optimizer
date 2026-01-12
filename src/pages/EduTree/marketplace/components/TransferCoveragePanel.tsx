import { Badge } from '@/components/ui/badge';
import { Shield, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  TransferCoverageBreakdown, 
  getCoverageLevel, 
  getCoverageBadgeClasses 
} from '@/lib/transferCoverage';

interface TransferCoveragePanelProps {
  coverage: TransferCoverageBreakdown;
  className?: string;
}

/**
 * Shows transfer verification coverage with provider breakdown
 */
export function TransferCoveragePanel({ coverage, className }: TransferCoveragePanelProps) {
  const level = getCoverageLevel(coverage.coveragePercent);
  const badgeClasses = getCoverageBadgeClasses(level);
  
  // Sort providers by total courses (descending)
  const sortedProviders = Object.entries(coverage.byProvider)
    .sort((a, b) => b[1].total - a[1].total);
  
  if (coverage.totalPairs === 0) {
    return null; // No transferable courses to show
  }
  
  return (
    <div className={className}>
      <div className="rounded-lg border bg-card/50 p-4 space-y-3">
        {/* Header with main coverage % */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Transfer Verification Coverage</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="text-xs">
                    Coverage reflects availability of verified mapping rules in the system, 
                    not a guarantee of acceptance. Check with your target school for final approval.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <Badge 
            variant="outline" 
            className={`${badgeClasses} font-semibold`}
          >
            {coverage.coveragePercent}% covered
          </Badge>
        </div>
        
        {/* Stats line */}
        <div className="text-xs text-muted-foreground">
          {coverage.coveredPairs} of {coverage.totalPairs} transferable courses have verified rules
        </div>
        
        {/* Provider breakdown chips */}
        {sortedProviders.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sortedProviders.map(([provider, stats]) => {
              const providerLevel = getCoverageLevel(stats.percent);
              const providerBadgeClasses = getCoverageBadgeClasses(providerLevel);
              
              return (
                <Badge
                  key={provider}
                  variant="outline"
                  className={`${providerBadgeClasses} text-[10px]`}
                >
                  {provider} {stats.percent}% ({stats.covered}/{stats.total})
                </Badge>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact coverage badge for cards
 */
export function TransferCoverageBadge({ 
  coverage 
}: { 
  coverage: TransferCoverageBreakdown | null;
}) {
  if (!coverage || coverage.totalPairs === 0) {
    return (
      <Badge variant="outline" className="text-[10px] text-muted-foreground">
        <Shield className="h-3 w-3 mr-1" />
        View coverage
      </Badge>
    );
  }
  
  const level = getCoverageLevel(coverage.coveragePercent);
  const badgeClasses = getCoverageBadgeClasses(level);
  
  return (
    <Badge variant="outline" className={`${badgeClasses} text-[10px]`}>
      <Shield className="h-3 w-3 mr-1" />
      {coverage.coveragePercent}% verified
    </Badge>
  );
}
