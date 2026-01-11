import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { usePlanStore } from '../state/usePlanStore';
import { usePlanBasket } from '../state/usePlanBasket';
import { calculateOptionScore, getRecommendedReason, type ScoreBreakdown, type ProviderType } from '../utils/optionScoring';
import { groupOptionsByEquivalency, type ScoredOption, type OptionGroup } from '../utils/optionGrouping';
import { PolicyBadges, RecommendedBadge } from './PolicyBadges';
import { OptionGroupRow } from './OptionGroupRow';
import { useScoringPrefs } from '../state/useScoringPrefs';
import { validatePlan } from '../engine/constraints';
import { autoCompletePlan } from '../engine/autoComplete';
import { getAutoCompleteMessage } from '../engine/autoCompleteStatus';
import { ENV } from '@/config/env';
import ConstraintsPanel from './ConstraintsPanel';
import { usePlanBasketWithToasts, getBasketItemKey } from '../hooks/usePlanBasketWithToasts';
import { AutoFillPlanButton } from './AutoFillDialog';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { mapWeightsForEngine } from '../utils/weightMapping';
import type { ModuleData } from '../types/v5';
import { ScenarioManager } from './ScenarioManager';
import { TransferBadge } from './TransferBadge';
import { useInstitutionPolicyPack } from '@/lib/degree/useInstitutionPolicyPack';

interface MarketplaceOption {
  id: string;
  courseId: string;
  title: string;
  credits: number;
  provider: string;
  providerType?: ProviderType;
  providerCode?: string;
  level?: number;
  cost_usd: number | null;
  duration_weeks: number | null;
  score?: number;
  scoreBreakdown?: ScoreBreakdown;
  // CRI signals
  aceNccrs?: boolean;
  proctored?: boolean;
  providerRep?: number;
  // Phase 1 additions
  pace_type?: 'self_paced' | 'cohort';
  start_windows?: string[];
  workload_weekly_hours?: number;
  satisfies_requirements?: string[];
  prereq_course_ids?: string[];
  unlocks_count?: number;
  equivalency_key?: string;
}

interface MarketplacePanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  moduleLabel: string;
  creditsEarned: number;
  creditsRequired: number;
  options: MarketplaceOption[];
  sortBy: 'cheapest' | 'shortest' | 'credits' | 'best-match';
  setSortBy: (v: 'cheapest' | 'shortest' | 'credits' | 'best-match') => void;
  yearEarned: number;
  yearCap: number;
  allModules: Array<{ id: string; marketplaceOptions?: MarketplaceOption[] }>;
}

export function MarketplacePanel({
  open,
  onOpenChange,
  moduleId,
  moduleLabel,
  creditsEarned,
  creditsRequired,
  options,
  sortBy,
  setSortBy,
  yearEarned,
  yearCap,
  allModules
}: MarketplacePanelProps) {
  const toggleCourse = usePlanStore(s => s.toggleCourse);
  const selected = usePlanStore(s => s.selections[moduleId]?.selected || []);
  const liveEarned = usePlanStore(s => s.selections[moduleId]?.selectedCredits ?? 0);
  
  const { weights, setWeights, resetWeights } = useScoringPrefs();
  const [showWeights, setShowWeights] = useState(false);
  
  // Plan Basket integration
  const basket = usePlanBasket(s => s.items);
  const totals = usePlanBasket(s => s.getTotals());
  const constraints = usePlanBasket(s => s.constraints);
  const addItem = usePlanBasket(s => s.addItem);
  const removeItem = usePlanBasket(s => s.removeItem);
  const { addItemWithToast, removeItemWithToast } = usePlanBasketWithToasts();

  // Simple analytics logger (upgrade to proper telemetry later)
  const logAnalytics = (event: string, data: Record<string, any>) => {
    const payload = { timestamp: new Date().toISOString(), ...data };
    
    // Only log to console in dev
    if (!ENV.PROD) {
      console.log(`[Analytics] ${event}`, payload);
    }
    
    // TODO: Send to your analytics backend in all environments
    // Example: trackTelemetryEvent({ task: event, complexity: payload });
  };

  // Enrich options with scores (Guardrail #1: decorate, don't mutate)
  const scoredOptions: ScoredOption[] = useMemo(() => {
    return options.map(o => {
      const breakdown = calculateOptionScore(o, options, weights);
      const reason = getRecommendedReason(o, breakdown);
      return { 
        option: o, 
        score: breakdown.total, 
        breakdown,
        reason
      };
    });
  }, [options, weights]);
  
  // Group by equivalency (Guardrail #2: opt-in only when key exists + multiple options)
  const groupingResult = useMemo(() => {
    return groupOptionsByEquivalency(scoredOptions);
  }, [scoredOptions]);
  
  // Sort enriched options (uses grouped or ungrouped based on preference)
  const sortedScoredOptions = useMemo(() => {
    // Flatten to single list for sorting (preserves grouping info but sorts uniformly)
    const allScored = [...groupingResult.ungrouped];
    for (const group of groupingResult.groups) {
      allScored.push(group.bestOption);
      allScored.push(...group.alternatives);
    }
    
    if (sortBy === 'best-match') {
      return allScored.sort((a, b) => b.score - a.score);
    }
    if (sortBy === 'cheapest') {
      return allScored.sort((a, b) => {
        if (a.option.cost_usd === null) return 1;
        if (b.option.cost_usd === null) return -1;
        return a.option.cost_usd - b.option.cost_usd;
      });
    }
    if (sortBy === 'shortest') {
      return allScored.sort((a, b) => {
        if (a.option.duration_weeks === null) return 1;
        if (b.option.duration_weeks === null) return -1;
        return a.option.duration_weeks - b.option.duration_weeks;
      });
    }
    // credits
    return allScored.sort((a, b) => (b.option.credits ?? 0) - (a.option.credits ?? 0));
  }, [groupingResult, sortBy]);
  
  // For backwards compatibility - extract options for validators
  const sortedOptions = useMemo(() => 
    sortedScoredOptions.map(s => ({ ...s.option, score: s.score, scoreBreakdown: s.breakdown })),
    [sortedScoredOptions]
  );
  
  // Get resolved anchor policy from institution policy pack (Issue #4 fix)
  const targetSchool = constraints.target_school;
  const { data: policyData } = useInstitutionPolicyPack(
    typeof targetSchool === 'string' ? targetSchool : undefined
  );
  
  const anchorPolicy = useMemo(() => ({
    partner_name: policyData?.policy?.partner_name ?? (typeof targetSchool === 'string' ? targetSchool : undefined),
    max_alt_credits: policyData?.policy?.max_alt_credits ?? constraints.max_ace_credits ?? 90,
    min_residency_credits: policyData?.policy?.min_residency_credits,
    upper_division_min: policyData?.policy?.upper_division_min,
  }), [policyData, targetSchool, constraints.max_ace_credits]);
  
  // Calculate current ACE credits in basket for policy warnings
  const currentAceCredits = useMemo(() => {
    return basket
      .filter(b => b.providerType === 'mooc' || b.providerType === 'testing_center')
      .reduce((sum, b) => sum + b.credits, 0);
  }, [basket]);
  
  // Helper: check if option is in basket (uses optionId for identity, fallback to providerCode:courseId)
  const isOptionInBasket = (optionId: string, courseId: string, providerCode?: string) => {
    return basket.some(b => {
      // Check by optionId first (preferred)
      if (b.optionId && b.optionId === optionId) return true;
      // Fallback to providerCode:courseId composite key
      const bKey = getBasketItemKey(b);
      const optKey = `${providerCode || 'unknown'}:${courseId}`;
      return bKey === optKey;
    });
  };
  
  // Validate plan and get violations
  const violations = useMemo(() => 
    validatePlan(basket, sortedOptions, constraints),
    [basket, sortedOptions, constraints]
  );
  
  // Double-click protection state
  const [isAutoCompleting, setIsAutoCompleting] = useState(false);
  
  // Auto-complete handler
  const handleAutoComplete = () => {
    if (isAutoCompleting) return;
    
    setIsAutoCompleting(true);
    
    try {
      // Mock modules data structure for auto-complete
      const modules = [{ id: moduleId, marketplaceOptions: sortedOptions }];
      const result = autoCompletePlan(modules, basket, constraints, weights);
      
      // Add suggestions to basket
      result.suggestions.forEach(item => addItem(item));
      
      // Status-aware toast feedback (using centralized helper)
      const unfilledCount = modules.filter(m => 
        !basket.some(b => b.moduleId === m.id) && (m.marketplaceOptions?.length ?? 0) > 0
      ).length;
      
      const message = getAutoCompleteMessage(result.status, result.suggestions.length, unfilledCount);
      console.log(message);
      
      logAnalytics('autocomplete_run', {
        moduleId,
        status: result.status,
        constraintsUsed: Object.entries(constraints)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k]) => k),
        suggestionsCount: result.suggestions.length,
        totalCost: totals.totalCost,
        avgCRI: totals.avgCRI
      });
    } finally {
      setIsAutoCompleting(false);
    }
  };
  
  // Helper: format relative date
  const formatRelativeDate = (isoDate: string) => {
    const date = new Date(isoDate);
    const days = Math.floor((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (days < 0) return 'Past';
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    if (days < 7) return `${days}d`;
    if (days < 30) return `${Math.floor(days / 7)}w`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  const isWithin30Days = (isoDate: string) => {
    const days = Math.floor((new Date(isoDate).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    return days >= 0 && days <= 30;
  };

  const isAtMax = creditsEarned >= creditsRequired;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[520px] sm:w-[600px] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <span>{moduleLabel}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {sortedOptions.length} option{sortedOptions.length !== 1 ? 's' : ''} • {
                  sortedOptions.filter(o => o.cost_usd === 0).length
                } free
              </span>
            </div>
            <span className="text-sm text-muted-foreground">
              {liveEarned}/{creditsRequired} cr
            </span>
          </SheetTitle>
          <div className="text-xs text-muted-foreground">
            Year progress: {yearEarned}/{yearCap} cr
          </div>
        </SheetHeader>
        
        {/* Constraints Panel */}
        <ConstraintsPanel />
        
        {/* Plan Basket Summary */}
        {basket.length > 0 && (
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur p-4 border rounded-lg mb-4">
            <div className="grid grid-cols-3 gap-3 text-sm mb-3">
              <div>
                <div className="text-xs text-muted-foreground">Total Cost</div>
                <div className="font-semibold text-lg">
                  ${(totals.totalCost ?? 0).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Duration</div>
                <div className="font-semibold text-lg">
                  {totals.totalWeeks ?? 0}wks
                </div>
                <div className="text-xs text-muted-foreground">
                  (max ×{constraints.max_concurrent_courses ?? 2})
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Weekly Load</div>
                <div className="font-semibold text-lg">
                  {totals.totalWorkloadHours ?? 0}hrs/wk
                </div>
              </div>
            </div>
            
            {/* Violations */}
            {violations.length > 0 && (
              <div className="space-y-1 mb-3">
                {violations.map((v, i) => (
                  <div key={i} className={`text-xs px-2 py-1 rounded-md ${
                    v.severity === 'error' ? 'bg-destructive/10 text-destructive' :
                    v.severity === 'warning' ? 'bg-yellow-500/10 text-yellow-600' :
                    'bg-blue-500/10 text-blue-600'
                  }`}>
                    {v.severity === 'error' ? '🚫' : v.severity === 'warning' ? '⚠️' : 'ℹ️'} {v.message}
                  </div>
                ))}
              </div>
            )}
            
            {/* Auto-Complete Button - V2 Dialog */}
            {FEATURE_FLAGS.v5_autofill_enabled && (
              <AutoFillPlanButton
                modules={allModules as ModuleData[]}
                constraints={constraints}
                weights={mapWeightsForEngine(weights)}
                disabled={violations.some(v => v.severity === 'error')}
              />
            )}
            
            {/* Scenario Manager */}
            <ScenarioManager />
          </div>
        )}

        {/* Sort dropdown & Weight Tuner */}
        <div className="mb-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort by</span>
            <select
              value={sortBy}
              onChange={e => {
                const newSort = e.target.value as any;
                logAnalytics('marketplace_sort_changed', { 
                  from: sortBy, 
                  to: newSort,
                  moduleId,
                  optionCount: sortedOptions.length
                });
                setSortBy(newSort);
              }}
              className="text-xs px-2 py-1 rounded border border-border bg-background"
            >
              <option value="best-match">🎯 Best Match</option>
              <option value="cheapest">💰 Cheapest</option>
              <option value="shortest">⚡ Shortest</option>
              <option value="credits">📊 Most Credits</option>
            </select>
            
            <button
              className="text-xs px-2 py-1 rounded bg-accent hover:bg-accent/80 transition-colors ml-auto"
              onClick={() => setShowWeights(v => !v)}
            >
              ⚙️ Priorities
            </button>
          </div>

          {showWeights && (
            <div className="p-3 bg-accent/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium">Adjust what matters to you:</div>
                <button
                  onClick={resetWeights}
                  className="text-[10px] text-muted-foreground hover:text-foreground underline"
                >
                  Reset to default
                </button>
              </div>
              <div className="space-y-2">
                {(['cost', 'time', 'quality'] as const).map(key => (
                  <label key={key} className="flex items-center gap-2">
                    <span className="text-xs w-20 capitalize">
                      {key === 'cost' && '💰'} {key === 'time' && '⚡'} {key === 'quality' && '⭐'} {key}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(weights[key] * 100)}
                      onChange={(e) => {
                        const newValue = (+e.target.value) / 100;
                        logAnalytics('marketplace_weights_adjusted', {
                          dimension: key,
                          oldValue: weights[key],
                          newValue,
                          weights: { ...weights, [key]: newValue }
                        });
                        setWeights({ [key]: newValue });
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs w-10 text-right font-medium">{Math.round(weights[key] * 100)}%</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Options list - Grouped view when equivalency grouping active */}
        <div className="space-y-2">
          {/* Render grouped options first (if any) */}
          {groupingResult.groups.map((group, groupIndex) => (
            <OptionGroupRow
              key={group.key}
              group={group}
              isTopGroup={groupIndex === 0 && sortBy === 'best-match'}
              sortBy={sortBy}
              anchorPolicy={anchorPolicy}
              currentAceCredits={currentAceCredits}
              isInBasket={(optionId, courseId) => isOptionInBasket(optionId, courseId, group.bestOption.option.providerCode)}
              onAddToBasket={(option) => {
                addItemWithToast({
                  moduleId,
                  optionId: option.id,
                  courseId: option.courseId,
                  title: option.title,
                  credits: option.credits,
                  cost_usd: option.cost_usd,
                  duration_weeks: option.duration_weeks,
                  workload_weekly_hours: option.workload_weekly_hours ?? option.credits * 2.5,
                  cri_score: 0,
                  status: 'pinned',
                  providerType: option.providerType,
                  providerCode: option.providerCode,
                  equivalency_key: option.equivalency_key,
                  level: option.level ?? 100
                });
              }}
              onRemoveFromBasket={(optionId) => removeItemWithToast(optionId)}
            />
          ))}
          
          {/* Render ungrouped options */}
          {groupingResult.ungrouped
            .sort((a, b) => {
              if (sortBy === 'best-match') return b.score - a.score;
              if (sortBy === 'cheapest') {
                if (a.option.cost_usd === null) return 1;
                if (b.option.cost_usd === null) return -1;
                return a.option.cost_usd - b.option.cost_usd;
              }
              if (sortBy === 'shortest') {
                if (a.option.duration_weeks === null) return 1;
                if (b.option.duration_weeks === null) return -1;
                return a.option.duration_weeks - b.option.duration_weeks;
              }
              return (b.option.credits ?? 0) - (a.option.credits ?? 0);
            })
            .map((scored, index) => {
            const option = scored.option;
            const isSelected = selected.includes(option.courseId);
            const isInBasket = isOptionInBasket(option.id, option.courseId, option.providerCode);
            const optionCredits = Number(option.credits) || 0;
            const wouldExceedYearCap = !isSelected && yearEarned + optionCredits > yearCap;
            const disabled = (isAtMax && !isSelected) || wouldExceedYearCap;
            // Top option only if no groups and first ungrouped
            const isTopOption = groupingResult.groups.length === 0 && index === 0;

            return (
              <div
                key={option.id}
                className={`border rounded-lg p-3 flex items-center justify-between hover:bg-accent/50 transition-colors relative ${
                  isTopOption && sortBy === 'best-match' ? 'border-primary/50 bg-primary/5' : ''
                }`}
              >
                <div className="min-w-0 flex-1">
                  {/* Recommended Badge for top option */}
                  <RecommendedBadge 
                    reason={scored.reason}
                    isTopOption={isTopOption}
                    sortBy={sortBy}
                  />
                  
                  <div className="font-medium text-sm truncate">
                    {option.courseId}: {option.title}
                  </div>
                  
                  {/* Inline Auto-Fill Reasoning (Phase 1b) */}
                  {(() => {
                    const basketItem = basket.find(b => b.courseId === option.courseId);
                    return basketItem?.status === 'auto-filled' && basketItem.autoFillReason && (
                      <div className="text-xs text-muted-foreground mt-1 italic">
                        ✨ {basketItem.autoFillReason}
                      </div>
                    );
                  })()}
                  
                  {/* Policy-Aware Badges */}
                  <div className="mt-1">
                    <PolicyBadges 
                      option={option}
                      anchorPolicy={anchorPolicy}
                      currentAceCredits={currentAceCredits}
                    />
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                    <span>{option.credits} cr</span>
                    
                    {/* Unlock chip */}
                    {(option.unlocks_count ?? 0) > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        🔓 Unlocks {option.unlocks_count}
                      </Badge>
                    )}
                    
                    {/* Start date chip */}
                    {option.start_windows?.[0] && (
                      <Badge variant={isWithin30Days(option.start_windows[0]) ? 'default' : 'outline'} className="text-xs">
                        🗓️ Starts {formatRelativeDate(option.start_windows[0])}
                      </Badge>
                    )}
                    
                    {/* Workload chip */}
                    {option.workload_weekly_hours && (
                      <Badge variant={option.workload_weekly_hours > 15 ? 'destructive' : 'outline'} className="text-xs">
                        📊 {option.workload_weekly_hours}hrs/wk
                      </Badge>
                    )}
                    
                    {/* Provider badge */}
                    {option.providerType && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        option.providerType === 'university' ? 'bg-blue-100 text-blue-700' :
                        option.providerType === 'mooc' ? 'bg-purple-100 text-purple-700' :
                        option.providerType === 'bootcamp' ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {option.providerType === 'university' && '🎓'}
                        {option.providerType === 'mooc' && '🌐'}
                        {option.providerType === 'bootcamp' && '⚡'}
                        {option.providerType === 'testing_center' && '📝'}
                        {' '}{option.provider}
                      </span>
                    )}
                    
                    {/* Transfer Badge */}
                    <TransferBadge
                      courseCode={option.courseId}
                      providerCode={option.providerCode || ''}
                      providerType={option.providerType}
                    />
                    
                    {/* CRI Badge */}
                    {scored.breakdown && (
                      <span 
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          scored.breakdown.cri >= 80 ? 'bg-green-100 text-green-700' :
                          scored.breakdown.cri >= 60 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}
                        title="Credit Recognition Index – likelihood to transfer"
                      >
                        🛡️ CRI {scored.breakdown.cri}
                      </span>
                    )}
                    
                    {/* Price */}
                    {option.cost_usd !== null && (
                      <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-medium">
                        {option.cost_usd === 0 ? 'Included' : `$${new Intl.NumberFormat().format(option.cost_usd)}`}
                      </span>
                    )}
                    
                    {/* Duration */}
                    {option.duration_weeks && <span>• {option.duration_weeks}w</span>}
                    
                    {/* Why This? Popover */}
                    {scored.breakdown && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button 
                            className="text-[11px] underline text-muted-foreground hover:text-foreground"
                            aria-label={`View match breakdown for ${option.title}`}
                            onClick={() => logAnalytics('marketplace_explainer_viewed', {
                              moduleId,
                              courseId: option.courseId,
                              courseTitle: option.title,
                              score: scored.score,
                              cri: scored.breakdown?.cri,
                              weights,
                              sortBy
                            })}
                          >
                            Why this?
                          </button>
                        </PopoverTrigger>
                        <PopoverContent 
                          className="w-72 p-3" 
                          align="start"
                          role="dialog"
                          aria-label={`Match breakdown for ${option.title}`}
                        >
                          <div className="space-y-2">
                            <div className="text-sm font-semibold">
                              Match Score: {scored.score}/100
                            </div>
                            
                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">💰 Cost</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-green-500"
                                      style={{ width: `${scored.breakdown.cost}%` }}
                                    />
                                  </div>
                                  <span className="font-medium w-12 text-right">{scored.breakdown.cost}/100</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">⚡ Speed</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-blue-500"
                                      style={{ width: `${scored.breakdown.time}%` }}
                                    />
                                  </div>
                                  <span className="font-medium w-12 text-right">{scored.breakdown.time}/100</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">⭐ Quality</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-purple-500"
                                      style={{ width: `${scored.breakdown.quality}%` }}
                                    />
                                  </div>
                                  <span className="font-medium w-12 text-right">{scored.breakdown.quality}/100</span>
                                </div>
                              </div>
                              
                              <div className="pt-2 border-t mt-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-muted-foreground">🛡️ Credit Recognition (CRI)</span>
                                  <span className={`font-semibold ${
                                    scored.breakdown.cri >= 80 ? 'text-green-600' :
                                    scored.breakdown.cri >= 60 ? 'text-yellow-600' :
                                    'text-red-600'
                                  }`}>
                                    {scored.breakdown.cri}/100
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  Estimated likelihood this option transfers for degree credit at most schools. Based on provider type, ACE/NCCRS status, and assessment rigor.
                                </p>
                                
                                {scored.breakdown.cri < 50 && (
                                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-[10px] text-yellow-800">
                                    ⚠️ <strong>Transfer risk:</strong> Low likelihood of transfer. Check your school's transfer policy before enrolling.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 ml-2">
                  {/* Plan Basket Button */}
                  <Button
                    onClick={() => {
                      if (isInBasket) {
                        // Use optionId for removal (fixes identity issue #2)
                        removeItemWithToast(option.id);
                      } else {
                        addItemWithToast({
                          moduleId,
                          optionId: option.id, // Use requirement_option.id for identity
                          courseId: option.courseId,
                          title: option.title,
                          credits: option.credits,
                          cost_usd: option.cost_usd,
                          duration_weeks: option.duration_weeks,
                          workload_weekly_hours: option.workload_weekly_hours ?? option.credits * 2.5,
                          cri_score: scored.breakdown?.cri ?? 0,
                          status: 'pinned',
                          providerType: option.providerType,
                          providerCode: option.providerCode,
                          equivalency_key: option.equivalency_key,
                          level: option.level ?? 100
                        });
                      }
                    }}
                    size="sm"
                    variant={isInBasket ? 'default' : 'outline'}
                  >
                    {isInBasket ? '✓ In Plan' : '+ Add to Plan'}
                  </Button>
                  
                  {/* Select Button (existing functionality) */}
                  <button
                    onClick={() => toggleCourse(moduleId, option.courseId, optionCredits, creditsRequired)}
                    disabled={disabled}
                    className={`text-xs px-3 py-1.5 rounded transition-colors whitespace-nowrap ${
                      isSelected
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : disabled
                        ? 'bg-muted text-muted-foreground cursor-not-allowed'
                        : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                    title={
                      wouldExceedYearCap ? `Year cap reached (${yearCap} cr)` :
                      isAtMax && !isSelected ? 'Module max reached' : ''
                    }
                  >
                    {isSelected ? '✓ Selected' : disabled ? 'Cap Reached' : 'Select'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
