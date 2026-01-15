import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronDown, ExternalLink, Clock, DollarSign, FileCheck, Link2Off } from 'lucide-react';
import type { AltCreditOption } from '@/hooks/useAltOptionsForRequirementArea';
import { cn } from '@/lib/utils';
import { sanitizeCourseUrl } from '@/lib/urlValidation';

interface SlotAltOptionsProps {
  options: AltCreditOption[];
  maxVisible?: number;
  className?: string;
}

function getConfidenceLabel(confidence: number): { label: string; variant: 'default' | 'secondary' | 'outline' } {
  if (confidence >= 0.9) return { label: 'High', variant: 'default' };
  if (confidence >= 0.8) return { label: 'Good', variant: 'secondary' };
  return { label: 'Fair', variant: 'outline' };
}

function formatSourceCode(code: string): string {
  const labels: Record<string, string> = {
    CLEP: 'CLEP',
    SOPHIA: 'Sophia',
    STUDY_COM: 'Study.com',
    DSST: 'DSST',
  };
  return labels[code] || code;
}

export function SlotAltOptions({ options, maxVisible = 3, className }: SlotAltOptionsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!options.length) {
    return null;
  }

  const visibleOptions = options.slice(0, maxVisible);
  const hiddenOptions = options.slice(maxVisible);
  const hasMore = hiddenOptions.length > 0;

  return (
    <div className={cn('mt-2 pt-2 border-t border-border/50', className)}>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5">
        Alt Credit Options
      </div>
      
      <div className="space-y-1.5">
        {visibleOptions.map((opt) => (
          <AltOptionRow key={opt.id} option={opt} />
        ))}
      </div>

      {hasMore && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-1 h-6 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className={cn(
                'h-3 w-3 mr-1 transition-transform',
                isOpen && 'rotate-180'
              )} />
              {isOpen ? 'Show less' : `Show ${hiddenOptions.length} more`}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1.5 mt-1.5">
            {hiddenOptions.map((opt) => (
              <AltOptionRow key={opt.id} option={opt} />
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function AltOptionRow({ option }: { option: AltCreditOption }) {
  const conf = getConfidenceLabel(option.confidence);
  
  // Pass both URL and its database verification status for defense-in-depth
  // Uses providerUrl (already filtered by hook) but double-checks with sanitizer
  const safeProviderUrl = sanitizeCourseUrl(option.providerUrl, option.urlStatus);
  
  // Check if there's a raw URL that's pending verification
  // providerUrlRaw is ONLY used for this hint, never for href
  const hasRawUrl = !!option.providerUrlRaw?.trim();
  const isPendingVerification = !safeProviderUrl && hasRawUrl && option.urlStatus === 'unknown';
  
  return (
    <div className="flex items-center gap-2 text-xs bg-muted/30 rounded px-2 py-1.5">
      {/* Provider badge */}
      <Badge variant="outline" className="text-[10px] shrink-0">
        {formatSourceCode(option.sourceCode)}
      </Badge>
      
      {/* Title - truncated */}
      <span className="flex-1 truncate font-medium" title={option.title}>
        {option.title}
      </span>
      
      {/* Confidence badge */}
      <Badge variant={conf.variant} className="text-[10px] shrink-0">
        {conf.label}
      </Badge>
      
      {/* Exam-based indicator */}
      {option.examBased && (
        <span title="Exam-based">
          <FileCheck className="h-3 w-3 text-muted-foreground shrink-0" />
        </span>
      )}
      
      {/* Cost */}
      {option.costUsd && (
        <span className="flex items-center gap-0.5 text-muted-foreground shrink-0">
          <DollarSign className="h-3 w-3" />
          {option.costUsd}
        </span>
      )}
      
      {/* Duration */}
      {option.durationWeeks && (
        <span className="flex items-center gap-0.5 text-muted-foreground shrink-0">
          <Clock className="h-3 w-3" />
          {option.durationWeeks}w
        </span>
      )}
      
      {/* Link to provider - only if URL passes all validation layers */}
      {safeProviderUrl ? (
        <a 
          href={safeProviderUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="h-3 w-3" />
        </a>
      ) : isPendingVerification ? (
        // Show subtle indicator when URL exists but is pending verification
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="text-muted-foreground/50 shrink-0 cursor-help">
              <Link2Off className="h-3 w-3" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            Link pending verification
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}
