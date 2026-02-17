import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Clock, DollarSign, Laptop, MapPin, TrendingUp, AlertCircle, GraduationCap, CheckCircle2, Shield, ShieldCheck, AlertTriangle, ArrowRight, School } from 'lucide-react';
import type { MarketplaceDegreeTemplate } from '@/pages/EduTree/v5/types/templates';
import { isAltCreditOptimization } from '@/types/optimizationTypes';
import { useNavigate } from 'react-router-dom';
import { usePlanBasket } from '@/pages/EduTree/v5/state/usePlanBasket';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProviderBadge, type ProviderCode, PROVIDER_CONFIG } from './ProviderBadge';
import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { TemplateDetailDrawer } from './TemplateDetailDrawer';
import { calculateStrategySavings, MIN_SAVINGS_TO_SHOW_BANNER } from '@/lib/templateSavingsCalculator';
import { StrategySavingsBanner } from './StrategySavingsBanner';
import { useTransferVerification } from '../hooks/useTransferVerification';
import { useVerifiedPolicyForInstitution } from '@/pages/EduTree/v5/hooks/useVerifiedPolicy';
import { calculateTieredSavings, shouldShowSavings, type TieredTransferResult } from '@/lib/tieredSavingsCalculator';
import { normalizeProviderCode, normalizeCourseCode } from '@/lib/providerNormalization';
import { calculateDegreeSafetyScore, type DegreeSafetyInput } from '@/lib/degree/degreeSafetyScore';
import { DegreeSafetyBadge } from '@/components/degree/DegreeSafetyBadge';
import { AssociateAnchorBadge } from '@/components/degree/AssociateAnchorBadge';
import { hasAssociateAnchor } from '@/types/associateDegree';
import { TwoPhaseTimeline } from './TwoPhaseTimeline';
import { computeTwoPhaseBreakdown } from '@/lib/twoPhaseTimeline';
interface TemplateCardProps {
  template: MarketplaceDegreeTemplate;
  isSelected: boolean;
  onToggleSelect: (templateId: string) => void;
}

export function TemplateCard({ template, isSelected, onToggleSelect }: TemplateCardProps) {
  const navigate = useNavigate();
  const { constraints } = usePlanBasket();
  
  const isMatchingAnchor = constraints.target_school === template.anchorSchool;
  const isIncomplete = !template.yearTemplates || template.yearTemplates.length === 0;
  const isExplicitMultiSchool = template.optimization === 'multi-school';

  const handleSelect = () => {
    if (isIncomplete) return;
    navigate(`/edu-tree-v5?templateId=${template.id}`);
  };

  const timeMonths = Math.round(template.totals.weeks / 4.33);
  const roiYears = (template.totals.costUsd / 60000).toFixed(1); // Assume $60K salary gain

  // Compute two-phase breakdown for alt-credit paths
  const twoPhaseBreakdown = useMemo(() => {
    // Reconstruct templateData from twoPhaseData for the computation
    const templateData = template.twoPhaseData ? {
      altCredits: template.twoPhaseData.altCredits,
      institutionalCredits: template.twoPhaseData.institutionalCredits,
      altCostUsd: template.twoPhaseData.altCostUsd,
      institutionalCostUsd: template.twoPhaseData.institutionalCostUsd,
      planWeeks: template.twoPhaseData.planWeeks,
    } : null;
    
    return computeTwoPhaseBreakdown(
      templateData,
      template.optimization,
      template.totals.weeks
    );
  }, [template.twoPhaseData, template.optimization, template.totals.weeks]);

  const deliveryBadgeConfig = {
    fully_online: { label: '100% Online', variant: 'default' as const },
    hybrid: { label: `Hybrid (${template.inPersonWeeks}w on-campus)`, variant: 'secondary' as const },
    in_person_required: { label: 'In-Person Required', variant: 'outline' as const },
  };

  const deliveryBadge = deliveryBadgeConfig[template.deliveryMode];

  // Extract ALL alt-credit options for transfer verification (deduplicated)
  // This includes preferred + alternatives so Standard templates show meaningful coverage
  const { allCourses, totalSlots, slotsWithAltOptions } = useMemo(() => {
    const seen = new Set<string>();
    const courses: Array<{ code: string; providerCode: string | null; credits: number; costUsd: number }> = [];
    let slotCount = 0;
    let slotsWithAlt = 0;
    
    template.yearTemplates?.forEach(year => {
      year.moduleTemplates?.forEach(module => {
        slotCount++; // Count every module slot
        // Check if this slot has any alt-credit options
        const hasAltOption = module.options?.some(opt => opt && opt.providerCode);
        if (hasAltOption) slotsWithAlt++;
        
        // Include ALL options (preferred + alternatives) for comprehensive coverage
        module.options?.forEach(option => {
          // Only count alt-credit options (skip institutional courses with null provider)
          if (option && option.providerCode) {
            const key = `${normalizeProviderCode(option.providerCode)}::${normalizeCourseCode(option.courseId || '')}`;
            if (!seen.has(key)) {
              seen.add(key);
              courses.push({
                code: option.courseId || '',
                providerCode: option.providerCode,
                credits: option.credits || 0,
                costUsd: option.cost_usd || 0,
              });
            }
          }
        });
      });
    });
    
    return { allCourses: courses, totalSlots: slotCount, slotsWithAltOptions: slotsWithAlt };
  }, [template.yearTemplates]);

  // Get verified policy for anchor school
  const { policy } = useVerifiedPolicyForInstitution(template.anchorSchool);
  
  // Get transfer verifications with tier info
  const { data: transferVerifications } = useTransferVerification(
    allCourses,
    template.anchorSchool,
    policy
  );

  // Calculate provider mix from yearTemplates
  const providerMix = useMemo(() => {
    const providers = new Map<string, { credits: number; count: number }>();
    
    template.yearTemplates?.forEach(year => {
      year.moduleTemplates?.forEach(module => {
        const option = module.options?.find(o => o.courseId === module.recommendedCourseId) || module.options?.[0];
        if (option?.providerCode) {
          const existing = providers.get(option.providerCode) || { credits: 0, count: 0 };
          providers.set(option.providerCode, {
            credits: existing.credits + (option.credits || 0),
            count: existing.count + 1,
          });
        }
      });
    });

    return Array.from(providers.entries())
      .map(([code, data]) => ({ code: code as ProviderCode, ...data }))
      .sort((a, b) => b.credits - a.credits)
      .slice(0, 4); // Show top 4 providers
  }, [template.yearTemplates]);

  const totalProviderCredits = useMemo(() => 
    providerMix.reduce((sum, p) => sum + p.credits, 0),
    [providerMix]
  );

  // A path is "multi-school" if explicitly tagged OR uses 2+ external providers
  const isMultiSchool = isExplicitMultiSchool || providerMix.length >= 2;

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);



  // Calculate multi-school strategy savings if baseline exists
  const strategySavings = useMemo(() => 
    calculateStrategySavings(template),
    [template]
  );

  // Calculate tiered savings - FIX: use normalized provider codes and handle duplicates
  const tieredSavings = useMemo(() => {
    if (!transferVerifications || !strategySavings) return null;
    
    // Helper to create canonical key - normalize both course code and provider
    const keyOf = (courseCode: string, providerCode?: string | null) =>
      providerCode 
        ? `${normalizeCourseCode(courseCode)}:${normalizeProviderCode(providerCode)}` 
        : `${normalizeCourseCode(courseCode)}:`;
    
    // Build a map with aggregated credits/cost (handles duplicate course codes)
    const costMap = new Map<string, { credits: number; costUsd: number }>();
    for (const c of allCourses) {
      const k = keyOf(c.code, c.providerCode);
      const prev = costMap.get(k) ?? { credits: 0, costUsd: 0 };
      costMap.set(k, { 
        credits: prev.credits + (c.credits ?? 0), 
        costUsd: prev.costUsd + (c.costUsd ?? 0) 
      });
    }
    
    // Deduplicate verifications by key, keeping the best tier to avoid double-counting
    const tierRank = (t: 'A' | 'B' | 'C') => (t === 'A' ? 3 : t === 'B' ? 2 : 1);
    const verMap = new Map<string, TieredTransferResult>();
    
    for (const v of transferVerifications) {
      const k = keyOf(v.courseCode, v.providerCode);
      const c = costMap.get(k);
      const result: TieredTransferResult = {
        ...v,
        credits: c?.credits ?? 0,
        costUsd: c?.costUsd ?? 0,
      };
      
      const prev = verMap.get(k);
      if (!prev || tierRank(result.tier) > tierRank(prev.tier)) {
        verMap.set(k, result);
      }
    }
    
    const tieredResults = Array.from(verMap.values());
    
    const result = calculateTieredSavings(template, tieredResults, policy ?? null);
    
    // Dev invariant check
    if (result && import.meta.env.DEV) {
      const { guaranteedSavings, possibleSavings, maximumSavings } = result;
      if (!(guaranteedSavings <= possibleSavings && possibleSavings <= maximumSavings)) {
        console.warn('[TIERED_SAVINGS] invariant violated', result);
      }
    }
    
    return result;
  }, [transferVerifications, strategySavings, template, policy, allCourses]);

  // Determine what to show in savings display
  const showTieredSavings = shouldShowSavings(tieredSavings);
  const hasVerifiedSavings = tieredSavings && tieredSavings.guaranteedSavings > 0 && tieredSavings.policyVerified;

  // Calculate data quality metrics for trust indicator
  const dataQuality = useMemo(() => {
    if (!tieredSavings) return null;
    
    const totalAltOptions = tieredSavings.totalCourses;
    if (totalAltOptions === 0) return null;
    
    const rulesFound = tieredSavings.breakdown.tierA.count + tieredSavings.breakdown.tierB.count;
    const evidenceLinked = tieredSavings.breakdown.tierA.count;
    
    const rulesFoundPercent = Math.round((rulesFound / totalAltOptions) * 100);
    const evidenceLinkedPercent = rulesFound > 0 
      ? Math.round((evidenceLinked / rulesFound) * 100) 
      : 0;
    
    // Determine quality level
    let level: 'high' | 'medium' | 'low';
    let label: string;
    let icon: typeof ShieldCheck | typeof Shield | typeof AlertTriangle;
    
    if (rulesFoundPercent >= 80 && evidenceLinkedPercent >= 50) {
      level = 'high';
      label = 'Verified';
      icon = ShieldCheck;
    } else if (rulesFoundPercent >= 50) {
      level = 'medium';
      label = 'Partial';
      icon = Shield;
    } else {
      level = 'low';
      label = 'Limited';
      icon = AlertTriangle;
    }
    
    return {
      level,
      label,
      icon,
      rulesFoundPercent,
      evidenceLinkedPercent,
      rulesFound,
      evidenceLinked,
      totalAltOptions,
      totalSlots,
      slotsWithAltOptions, // How many slots have at least one alt-credit option
    };
  }, [tieredSavings, totalSlots, slotsWithAltOptions]);

  // Calculate Degree Safety Score
  const degreeSafetyScore = useMemo(() => {
    const totalCourses = allCourses.length;
    if (totalCourses === 0) return null;
    
    const coursesWithRules = tieredSavings 
      ? tieredSavings.breakdown.tierA.count + tieredSavings.breakdown.tierB.count
      : 0;
    const coursesWithEvidence = tieredSavings?.breakdown.tierA.count ?? 0;
    
    // Extract unique providers
    const providers = [...new Set(
      allCourses
        .map(c => c.providerCode)
        .filter((p): p is string => Boolean(p))
    )];
    
    const input: DegreeSafetyInput = {
      targetSchool: template.anchorSchool,
      totalCourses,
      coursesWithRules,
      coursesWithEvidence,
      providers,
      hasAssociatePathway: hasAssociateAnchor(template.anchorSchool),
    };
    
    return calculateDegreeSafetyScore(input);
  }, [allCourses, tieredSavings, template.anchorSchool]);

  return (
    <Card className={cn(
      "relative hover:shadow-lg transition-shadow",
      isIncomplete && "opacity-75 border-dashed border-amber-500/50",
      isSelected && "ring-2 ring-primary border-primary"
    )}>
      {/* Incomplete Warning Badge */}
      {isIncomplete && (
        <div className="absolute -top-3 -left-3 z-10">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="destructive" className="shadow-md gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Coming Soon
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">This template is not yet available. Course data is being prepared.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      
      {/* Badge */}
      {template.marketplace.badge && !isIncomplete && (
        <div className="absolute -top-3 -right-3 z-10">
          <Badge className="shadow-md" variant={
            template.marketplace.badge === 'Cheapest' ? 'default' :
            template.marketplace.badge === 'Fastest' ? 'secondary' :
            template.marketplace.badge === 'Most Popular' ? 'default' : 'outline'
          }>
            {template.marketplace.badge}
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg leading-tight mb-1">
              {isMultiSchool 
                ? `Multi-School ${template.programId || 'Degree'} Path`
                : template.marketplace.title}
            </CardTitle>
            <CardDescription className="text-sm">
              {isMultiSchool
                ? `Low-cost credits first → finish at ${template.anchorSchool}`
                : template.marketplace.tagline}
            </CardDescription>
          </div>
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggleSelect(template.id)}
            aria-label="Select for comparison"
          />
        </div>

        {/* Anchor School Badge + Multi-School Badge + Safety Indicators */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant={isMatchingAnchor ? "default" : "outline"} className="gap-1">
            <GraduationCap className="h-3 w-3" />
            {template.anchorSchool}
          </Badge>
          {isMultiSchool && (
            <Badge variant="info" className="gap-1">
              <School className="h-3 w-3" />
              Multi-School
            </Badge>
          )}
          {isMatchingAnchor && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Matches your graduation school</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {/* In-state pricing warning - data-driven only, no school-name fallback */}
          {template.pricingMetadata?.inStateOnly === true && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-amber-600 border-amber-400 dark:text-amber-400 dark:border-amber-600 gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Residency Req
                  </Badge>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">
                    {template.pricingMetadata?.residencyNote || 
                      `${template.anchorSchool} pricing shown may be for in-state residents only. Out-of-state rates may differ.`}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {/* Associate Anchor Badge - shows if AA/AS block transfer available */}
          <AssociateAnchorBadge targetSchool={template.anchorSchool} compact />
          {/* Degree Safety Score Badge */}
          {degreeSafetyScore && (
            <DegreeSafetyBadge safetyScore={degreeSafetyScore} compact />
          )}
          {/* Pricing Provenance Badge - honest copy, no fake dates */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className="text-xs cursor-help">
                  {template.catalogYear} Catalog
                </Badge>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="text-xs space-y-1">
                  <p className="font-medium">Pricing Source</p>
                  <p>Based on {template.anchorSchool} {template.catalogYear} catalog rates</p>
                  {template.pricingMetadata?.sourceUrl && (
                    <p className="text-muted-foreground">Source: {template.pricingMetadata.sourceUrl}</p>
                  )}
                  <p className="text-muted-foreground">Rates subject to change. Verify with institution.</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Multi-School Transfer Flow Summary */}
        {isMultiSchool && providerMix.length > 0 && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            {providerMix.map((p, i) => (
              <span key={p.code} className="inline-flex items-center gap-1">
                {i > 0 && <span>+</span>}
                <span className="font-medium text-foreground">{PROVIDER_CONFIG[p.code]?.label ?? p.code}</span>
              </span>
            ))}
            <ArrowRight className="h-3 w-3 mx-0.5" />
            <span className="font-medium text-foreground">{template.anchorSchool}</span>
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="text-2xl font-bold">
                ${(template.totals.costUsd / 1000).toFixed(1)}K
              </div>
              <div className="text-xs text-muted-foreground">Total Cost</div>
            </div>
          </div>
          <TwoPhaseTimeline 
            breakdown={twoPhaseBreakdown} 
            variant="compact"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Cost Recovery Hint */}
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-muted-foreground">
            Cost recovery: {parseFloat(roiYears) < 1 ? 'Faster than typical' : parseFloat(roiYears) < 2 ? 'Quick payback' : 'Standard timeline'}
          </span>
        </div>

        {/* Lifestyle Fit */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">
            {template.lifestyle.avgWeeklyHours} hrs/week • {template.lifestyle.paceType}
          </span>
        </div>

        {/* Delivery Mode */}
        <div className="flex items-center gap-2">
          {template.deliveryMode === 'fully_online' ? (
            <Laptop className="h-4 w-4 text-muted-foreground" />
          ) : (
            <MapPin className="h-4 w-4 text-muted-foreground" />
          )}
          <Badge variant={deliveryBadge.variant}>{deliveryBadge.label}</Badge>
        </div>

        {/* Evidence Summary - replaces star rating with defensible claim */}
        {dataQuality && dataQuality.rulesFound > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>{dataQuality.rulesFound} transfer rules evaluated</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Based on {dataQuality.rulesFound} verified transfer policies from {template.anchorSchool}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Alt-Credit Verification Indicator */}
        {dataQuality && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className={cn(
                    "flex items-center gap-1.5 text-xs cursor-pointer transition-colors",
                    dataQuality.level === 'high' && "text-emerald-600 dark:text-emerald-400",
                    dataQuality.level === 'medium' && "text-amber-600 dark:text-amber-400",
                    dataQuality.level === 'low' && "text-orange-600 dark:text-orange-400"
                  )}
                  onClick={() => setIsDrawerOpen(true)}
                >
                  <dataQuality.icon className="h-3.5 w-3.5" />
                  <span>{dataQuality.label}</span>
                  <span className="text-muted-foreground">
                    ({dataQuality.rulesFound}/{dataQuality.totalAltOptions} alt-credit verified)
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <p className="font-medium">Alt-Credit Rule Coverage</p>
                  <p>{dataQuality.rulesFound} of {dataQuality.totalAltOptions} alt-credit options have verified transfer rules</p>
                  <p className="text-muted-foreground">Alt-credit availability: {dataQuality.slotsWithAltOptions}/{dataQuality.totalSlots} slots ({dataQuality.totalAltOptions} unique options)</p>
                  {dataQuality.evidenceLinked > 0 && (
                    <p>{dataQuality.evidenceLinked} are evidence-linked (Tier A)</p>
                  )}
                  <p className="text-muted-foreground pt-1">Click to view detailed breakdown</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        {/* Fallback Transfer Coverage Hint when no tiered data */}
        {!dataQuality && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div 
                  className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => setIsDrawerOpen(true)}
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span>Transfer verification available</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">View details to see transfer coverage % by provider</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Strategy Savings Banner - ONLY if verified baseline exists */}
        {strategySavings && strategySavings.dollarSavings >= MIN_SAVINGS_TO_SHOW_BANNER && 
         template.baselineStatus !== 'missing' && template.baselineStatus !== 'estimated' ? (
          <StrategySavingsBanner 
            savings={strategySavings} 
            tieredSavings={tieredSavings}
            variant="card" 
          />
        ) : !template.singleSchoolBaseline || template.baselineStatus === 'missing' ? (
          // No baseline data - show placeholder
          <div className="rounded-md bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
            <span className="font-medium">Savings: —</span>
            <span className="ml-2">(single-school baseline not yet available)</span>
          </div>
        ) : null}

        {/* Provider Mix - only show if no strategy savings banner */}
        {providerMix.length > 0 && (!strategySavings || strategySavings.dollarSavings < MIN_SAVINGS_TO_SHOW_BANNER) && (
          <div className="rounded-md bg-muted/60 px-3 py-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Multi-Provider Path
              </span>
              <span className="text-[11px] text-muted-foreground">
                {totalProviderCredits} credits
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {providerMix.map(({ code, credits }) => {
                const config = PROVIDER_CONFIG[code];
                const pct = totalProviderCredits > 0
                  ? Math.round((credits / totalProviderCredits) * 100)
                  : 0;

                return (
                  <TooltipProvider key={code}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          "inline-flex items-center gap-1 rounded-full border px-2 py-1",
                          config?.className
                        )}>
                          {config?.icon && <config.icon className="h-3 w-3" />}
                          <span className="text-[11px] font-medium">
                            {config?.label ?? code}
                          </span>
                          <span className="text-[10px] opacity-80">
                            {credits}cr · {pct}%
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">{credits} credits ({pct}%) via {config?.label ?? code}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-1">
                  <Button 
                    onClick={handleSelect} 
                    className="w-full"
                    disabled={isIncomplete}
                    variant={isIncomplete ? "outline" : "default"}
                  >
                    {isIncomplete ? "Coming Soon" : "Select Path"}
                  </Button>
                </div>
              </TooltipTrigger>
              {isIncomplete && (
                <TooltipContent>
                  <p className="text-xs">This template is being prepared and will be available soon.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
          <Button 
            variant="ghost" 
            onClick={() => setIsDrawerOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            Details →
          </Button>
        </div>
      </CardContent>

      <TemplateDetailDrawer
        template={template}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
      />
    </Card>
  );
}
