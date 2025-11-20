import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DollarSign, Clock, GraduationCap, Building2, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { MarketplaceDegreeTemplate } from '@/pages/EduTree/v5/types/templates';
import { ProviderBadge, PROVIDER_CONFIG, type ProviderCode } from './ProviderBadge';
import { TransferStatusBadge, type TransferStatus } from './TransferStatusBadge';
import { useMemo } from 'react';

interface TemplateDetailsDrawerProps {
  template: MarketplaceDegreeTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transferStatusMap?: Map<string, { 
    courseCode: string; 
    providerCode: string; 
    status: TransferStatus;
    rule?: any;
  }>;
}

export function TemplateDetailsDrawer({ 
  template, 
  open, 
  onOpenChange,
  transferStatusMap 
}: TemplateDetailsDrawerProps) {
  // Provider mix calculation
  const providerMix = useMemo(() => {
    if (!template) return [];
    
    const providerCredits = new Map<string, number>();
    
    template.yearTemplates.forEach(year => {
      year.moduleTemplates.forEach(module => {
        module.options.forEach(option => {
          const code = option.providerCode?.toUpperCase() || 'UNKNOWN';
          providerCredits.set(code, (providerCredits.get(code) || 0) + (option.credits || 0));
        });
      });
    });
    
    return Array.from(providerCredits.entries())
      .map(([code, credits]) => ({ code: code as ProviderCode, credits }))
      .sort((a, b) => b.credits - a.credits);
  }, [template]);

  const totalProviderCredits = useMemo(() => 
    providerMix.reduce((sum, p) => sum + p.credits, 0),
    [providerMix]
  );

  // Policy compliance calculations
  const policyMetrics = useMemo(() => {
    if (!template) return null;

    const altCreditProviders = ['SOPHIA', 'STUDYCOM', 'CLEP', 'DSST'];
    let altCredits = 0;
    let residencyCredits = 0;
    let upperDivisionCredits = 0;

    template.yearTemplates.forEach(year => {
      year.moduleTemplates.forEach(module => {
        module.options.forEach(option => {
          const isAltCredit = altCreditProviders.includes(option.providerCode?.toUpperCase() || '');
          const isResidency = option.providerCode?.toUpperCase() === template.anchorSchool?.toUpperCase();
          const isUpperDiv = (option.level || 0) >= 300;
          const credits = option.credits || 0;

          if (isAltCredit) altCredits += credits;
          if (isResidency) residencyCredits += credits;
          if (isUpperDiv) upperDivisionCredits += credits;
        });
      });
    });

    // Anchor-specific caps (TESU example)
    const altCreditCap = template.anchorSchool === 'TESU' ? 90 : 90;
    const residencyMin = template.anchorSchool === 'TESU' ? 30 : 30;
    const upperDivMin = template.anchorSchool === 'TESU' ? 18 : 15;

    return {
      altCredits,
      altCreditCap,
      altCreditStatus: altCredits <= altCreditCap ? 'ok' : 'warn',
      residencyCredits,
      residencyMin,
      residencyStatus: residencyCredits >= residencyMin ? 'ok' : 'warn',
      upperDivisionCredits,
      upperDivMin,
      upperDivStatus: upperDivisionCredits >= upperDivMin ? 'ok' : 'warn',
    };
  }, [template]);

  if (!template) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-xl">{template.marketplace.title}</SheetTitle>
          <SheetDescription className="text-sm">
            {template.marketplace.tagline}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-6 py-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <GraduationCap className="h-3.5 w-3.5" />
                  Total Credits
                </div>
                <div className="text-2xl font-bold">{template.totals.credits}</div>
              </div>
              
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <DollarSign className="h-3.5 w-3.5" />
                  Est. Cost
                </div>
                <div className="text-2xl font-bold">
                  ${template.totals.costUsd.toLocaleString()}
                </div>
              </div>
              
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Clock className="h-3.5 w-3.5" />
                  Timeline
                </div>
                <div className="text-2xl font-bold">
                  {Math.round(template.totals.weeks / 4)} mo
                </div>
              </div>
              
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Building2 className="h-3.5 w-3.5" />
                  Anchor School
                </div>
                <div className="text-lg font-bold">{template.anchorSchool}</div>
              </div>
            </div>

            {/* Provider Mix */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Provider Distribution</h3>
                <span className="text-xs text-muted-foreground">
                  {totalProviderCredits} credits
                </span>
              </div>
              
              <div className="space-y-2">
                {providerMix.map(({ code, credits }) => {
                  const config = PROVIDER_CONFIG[code];
                  const pct = totalProviderCredits > 0
                    ? Math.round((credits / totalProviderCredits) * 100)
                    : 0;

                  return (
                    <div key={code} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1">
                        <ProviderBadge providerCode={code} className="text-xs" />
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${config?.className?.includes('purple') ? 'bg-purple-500' : 
                              config?.className?.includes('orange') ? 'bg-orange-500' :
                              config?.className?.includes('amber') ? 'bg-amber-500' :
                              config?.className?.includes('sky') ? 'bg-sky-500' :
                              config?.className?.includes('indigo') ? 'bg-indigo-500' :
                              'bg-gray-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-xs font-medium tabular-nums">
                        {credits}cr · {pct}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Policy Compliance */}
            {policyMetrics && (
              <div className="rounded-lg border bg-card p-4">
                <h3 className="font-semibold text-sm mb-3">Policy Compliance</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Alt Credit Usage</span>
                    <div className="flex items-center gap-2">
                      {policyMetrics.altCreditStatus === 'ok' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                      )}
                      <span className="font-mono text-xs">
                        {policyMetrics.altCredits}/{policyMetrics.altCreditCap} cr
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Residency Requirement</span>
                    <div className="flex items-center gap-2">
                      {policyMetrics.residencyStatus === 'ok' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                      )}
                      <span className="font-mono text-xs">
                        {policyMetrics.residencyCredits}/{policyMetrics.residencyMin} cr
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Upper Division</span>
                    <div className="flex items-center gap-2">
                      {policyMetrics.upperDivStatus === 'ok' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                      )}
                      <span className="font-mono text-xs">
                        {policyMetrics.upperDivisionCredits}/{policyMetrics.upperDivMin} cr
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <Separator />

            {/* Year-by-Year Course List */}
            <div className="space-y-4">
              <h3 className="font-semibold">Complete Course Plan</h3>
              
              {template.yearTemplates.map((year, idx) => (
                <div key={year.id} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Year {idx + 1}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {year.est.credits} credits · ${year.est.costUsd.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="space-y-1.5 pl-3 border-l-2 border-border/50">
                    {year.moduleTemplates.map((module) => 
                      module.options.map((option, optIdx) => {
                        const key = `${option.providerCode?.toUpperCase()}:${option.courseId}`;
                        const transferStatus = transferStatusMap?.get(key);
                        
                        return (
                          <div 
                            key={`${module.moduleId}-${optIdx}`}
                            className="flex items-start gap-2 text-sm p-2 rounded-md hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{option.title}</div>
                              <div className="flex items-center gap-2 flex-wrap mt-1">
                                <span className="text-xs text-muted-foreground">
                                  {option.credits || 0} cr
                                </span>
                                {option.providerCode && (
                                  <ProviderBadge 
                                    providerCode={option.providerCode.toUpperCase() as ProviderCode} 
                                    className="text-[10px]"
                                  />
                                )}
                                {transferStatus && (
                                  <TransferStatusBadge
                                    status={transferStatus.status}
                                    sourceCourse={option.courseId}
                                    sourceProvider={option.providerCode || undefined}
                                    targetSchool={template.anchorSchool}
                                    targetCourse={transferStatus.rule?.target_course_code}
                                    confidence={transferStatus.rule?.confidence}
                                    evidenceUrl={transferStatus.rule?.evidence_url}
                                    ruleSource={transferStatus.rule?.rule_source}
                                  />
                                )}
                                {option.level && option.level >= 300 && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                                    Upper Div
                                  </Badge>
                                )}
                              </div>
                            </div>
                            
                            {option.cost_usd !== null && (
                              <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                                ${option.cost_usd}
                              </span>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Metadata Footer */}
            <div className="text-xs text-muted-foreground pt-4 border-t space-y-1">
              <div>Catalog Year: {template.catalogYear}</div>
              <div>Policy Version: {template.policyVersion}</div>
              <div>Last Verified: {new Date(template.lastVerified).toLocaleDateString()}</div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
