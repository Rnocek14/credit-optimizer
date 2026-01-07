import { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { validateTemplate, getValidationSummary, type TemplateValidationResult } from '../utils/templateValidator';

interface TemplateValidationBannerProps {
  template: any;
  onDismiss?: () => void;
}

/**
 * Runtime validation banner that warns users when a template
 * doesn't meet graduation requirements (120 credits, residency, upper-div)
 */
export function TemplateValidationBanner({ template, onDismiss }: TemplateValidationBannerProps) {
  const [expanded, setExpanded] = useState(false);
  
  const validationResult = useMemo<TemplateValidationResult | null>(() => {
    if (!template) return null;
    try {
      return validateTemplate(template);
    } catch (e) {
      console.error('[TemplateValidationBanner] Validation error:', e);
      return null;
    }
  }, [template]);
  
  // Don't show if template is valid or validation failed
  if (!validationResult) return null;
  if (validationResult.valid && validationResult.issues.length === 0) {
    return null; // All good, no banner needed
  }
  
  const errors = validationResult.issues.filter(i => i.type === 'error');
  const warnings = validationResult.issues.filter(i => i.type === 'warning');
  const hasErrors = errors.length > 0;
  const { metrics } = validationResult;
  
  return (
    <div 
      className={`rounded-lg border px-4 py-3 ${
        hasErrors 
          ? 'bg-destructive/10 border-destructive/30' 
          : 'bg-amber-500/10 border-amber-500/30'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {hasErrors ? (
            <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          )}
          
          <div>
            <div className={`font-semibold ${hasErrors ? 'text-destructive' : 'text-amber-700'}`}>
              {hasErrors 
                ? 'Template may not lead to graduation' 
                : 'Template has warnings'}
            </div>
            
            <div className="text-sm text-muted-foreground mt-1">
              {getValidationSummary(validationResult)}
            </div>
            
            {/* Expanded details */}
            {expanded && (
              <div className="mt-3 space-y-2 text-sm">
                {/* Credit metrics */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-background/50 rounded p-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Credits:</span>
                    <span className={metrics.totalCredits >= 120 ? 'text-green-600' : 'text-destructive'}>
                      {metrics.totalCredits}/120
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">University:</span>
                    <span>{metrics.universityCredits}cr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Upper-Div (300+):</span>
                    <span>{metrics.upperDivCredits}cr</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MOOC/Alt:</span>
                    <span>{metrics.moocCredits}cr</span>
                  </div>
                </div>
                
                {/* Issues list */}
                {errors.length > 0 && (
                  <div className="space-y-1">
                    <div className="font-medium text-destructive text-xs">Errors:</div>
                    {errors.map((issue, i) => (
                      <div key={i} className="text-xs flex items-center gap-1.5 text-destructive/90">
                        <XCircle className="h-3 w-3" />
                        {issue.message}
                        {issue.details?.shortfall && (
                          <span className="text-muted-foreground">
                            ({issue.details.shortfall} needed)
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {warnings.length > 0 && (
                  <div className="space-y-1">
                    <div className="font-medium text-amber-600 text-xs">Warnings:</div>
                    {warnings.map((issue, i) => (
                      <div key={i} className="text-xs flex items-center gap-1.5 text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        {issue.message}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Unfilled modules */}
                {metrics.unfilledModules.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Modules needing more options: </span>
                    {metrics.unfilledModules.join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
          
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground"
              onClick={onDismiss}
            >
              ✕
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
