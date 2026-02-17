/**
 * V6ModulePanel — Trust-enhanced module panel.
 *
 * Renders in a Vaul Drawer (same as V5) but with:
 * - Credit-type badges (Institutional, ACE, CLEP, Transfer)
 * - "Why recommended" explanation for top option
 * - "Counts toward" requirement chip
 * - Academic language (no "dock", no "quick pick")
 *
 * Uses V5's basket hooks for add/remove. Zero engine changes.
 */

import { useState, useMemo, useCallback } from 'react';
import { Drawer as DrawerPrimitive } from 'vaul';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { X, Star, ChevronDown, ChevronUp, CheckCircle2, GraduationCap, Globe, Zap, FileText, Shield, Info } from 'lucide-react';
import { toast } from 'sonner';
import { usePlanBasket } from '@/pages/EduTree/v5/state/usePlanBasket';
import { usePlanBasketWithToasts } from '@/pages/EduTree/v5/hooks/usePlanBasketWithToasts';
import { calculateOptionScore } from '@/pages/EduTree/v5/utils/optionScoring';
import { useScoringPrefs } from '@/pages/EduTree/v5/state/useScoringPrefs';
import type { MarketplaceOption, ModuleData, ProviderType } from '@/pages/EduTree/v5/types/v5';
import { V6_COPY } from '../copy';

// ── Credit-type badge config ────────────────────────────────
const CREDIT_TYPE_LABELS: Record<string, { label: string; icon: typeof GraduationCap; className: string }> = {
  university: {
    label: 'Institutional',
    icon: GraduationCap,
    className: 'bg-primary/10 text-primary border-primary/20',
  },
  mooc: {
    label: 'ACE Recommended',
    icon: Globe,
    className: 'bg-accent text-accent-foreground border-accent',
  },
  bootcamp: {
    label: 'Competency-Based',
    icon: Zap,
    className: 'bg-secondary text-secondary-foreground border-secondary',
  },
  testing_center: {
    label: 'Credit by Exam',
    icon: FileText,
    className: 'bg-muted text-muted-foreground border-border',
  },
  transfer: {
    label: 'Transfer Credit',
    icon: Shield,
    className: 'bg-info/10 text-info border-info/20',
  },
};

function CreditTypeBadge({ providerType }: { providerType?: ProviderType }) {
  const config = CREDIT_TYPE_LABELS[providerType ?? ''];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border', config.className)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

// ── "Why recommended" logic ─────────────────────────────────
function getRecommendationReasons(option: MarketplaceOption, moduleLabel: string, anchorSchool?: string): string[] {
  const reasons: string[] = [];

  if (option.providerType === 'university' && anchorSchool) {
    reasons.push(`Direct institutional credit at ${anchorSchool}`);
  }

  if (option.cost_usd === 0) {
    reasons.push('No cost to complete');
  } else if (option.cost_usd != null && option.cost_usd < 200) {
    reasons.push(`Low cost — only $${option.cost_usd}`);
  }

  if (option.aceNccrs) {
    reasons.push('ACE/NCCRS accredited');
  }

  if (option.duration_weeks != null && option.duration_weeks <= 8) {
    reasons.push(`Completable in ${option.duration_weeks} weeks`);
  }

  if (option.cri_score && option.cri_score >= 80) {
    reasons.push(`High quality score (${option.cri_score}/100)`);
  }

  if (reasons.length === 0) {
    reasons.push('Best overall match for this requirement');
  }

  return reasons;
}

// ── Top Recommendation Card (memoized reasons) ──────────────
function TopRecommendationCard({
  option,
  moduleLabel,
  anchorSchool,
  isInBasket,
  onAdd,
}: {
  option: MarketplaceOption;
  moduleLabel: string;
  anchorSchool?: string;
  isInBasket: boolean;
  onAdd: () => void;
}) {
  const reasons = useMemo(
    () => getRecommendationReasons(option, moduleLabel, anchorSchool),
    [option, moduleLabel, anchorSchool]
  );

  return (
    <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 text-primary fill-primary" />
        <span className="text-sm font-semibold text-foreground">{V6_COPY.recommendedLabel}</span>
      </div>
      <div className="text-sm font-medium">{option.title}</div>
      <div className="flex items-center gap-2 flex-wrap">
        <CreditTypeBadge providerType={option.providerType} />
        <span className="text-xs text-muted-foreground">{option.provider}</span>
        <span className="text-xs font-semibold">
          {option.cost_usd != null ? (option.cost_usd === 0 ? 'Free' : `$${option.cost_usd}`) : '—'}
        </span>
        {option.duration_weeks && (
          <span className="text-xs text-muted-foreground">{option.duration_weeks} weeks</span>
        )}
      </div>
      <p className="text-xs text-muted-foreground italic">
        Recommended because: {reasons[0]?.toLowerCase()}.
      </p>
      <Collapsible>
        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline mt-1">
          <Info className="h-3 w-3" />
          {V6_COPY.whyThisRecommendation}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <ul className="space-y-1 text-xs text-muted-foreground list-disc list-inside">
            {reasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
      {!isInBasket && (
        <Button size="sm" className="w-full mt-2" onClick={onAdd}>
          Add to Plan
        </Button>
      )}
    </div>
  );
}

interface V6ModulePanelProps {
  open: boolean;
  onClose: () => void;
  module: ModuleData;
  moduleLabel: string;
  anchorSchool?: string;
  yearEarned?: number;
  yearCap?: number;
}

export function V6ModulePanel({
  open,
  onClose,
  module,
  moduleLabel,
  anchorSchool,
  yearEarned = 0,
  yearCap = 30,
}: V6ModulePanelProps) {
  const basket = usePlanBasket(s => s.items);
  const { addItemWithToast, removeItemWithToast } = usePlanBasketWithToasts();
  const { weights } = useScoringPrefs();
  const [sortBy, setSortBy] = useState<'best-match' | 'cheapest' | 'shortest'>('best-match');

  const options = module.marketplaceOptions ?? [];

  // Score and sort options
  const scoredOptions = useMemo(() => {
    const enriched = options.map(o => {
      const breakdown = calculateOptionScore(o, options, weights);
      return { ...o, score: breakdown.total, scoreBreakdown: breakdown };
    });

    const sorted = [...enriched];
    if (sortBy === 'cheapest') {
      sorted.sort((a, b) => (a.cost_usd ?? Infinity) - (b.cost_usd ?? Infinity));
    } else if (sortBy === 'shortest') {
      sorted.sort((a, b) => (a.duration_weeks ?? Infinity) - (b.duration_weeks ?? Infinity));
    } else {
      sorted.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    }
    return sorted;
  }, [options, weights, sortBy]);

  const topOption = scoredOptions[0] ?? null;

  // Live credits from basket
  const liveEarned = useMemo(() => {
    const seen = new Set<string>();
    let total = 0;
    for (const item of basket) {
      if (seen.has(item.courseId)) continue;
      const match =
        item.moduleId === module.id ||
        (module.requirementArea && item.requirementArea === module.requirementArea) ||
        (module.requirementArea && item.moduleId === module.requirementArea);
      if (match) {
        seen.add(item.courseId);
        total += item.credits;
      }
    }
    return total;
  }, [basket, module.id, module.requirementArea]);

  const progress = module.creditsRequired > 0 ? Math.min(100, (liveEarned / module.creditsRequired) * 100) : 0;
  const isComplete = liveEarned >= module.creditsRequired;

  const handleAdd = useCallback((option: MarketplaceOption) => {
    addItemWithToast({
      moduleId: module.id,
      courseId: option.courseId,
      title: option.title,
      credits: option.credits,
      cost_usd: option.cost_usd,
      duration_weeks: option.duration_weeks,
      workload_weekly_hours: option.workload_weekly_hours ?? option.credits * 2.5,
      cri_score: option.cri_score ?? 0,
      status: 'pinned',
      providerType: option.providerType,
    });
  }, [addItemWithToast, module.id]);

  const handleRemove = useCallback((courseId: string) => {
    removeItemWithToast(courseId);
  }, [removeItemWithToast]);

  if (!open) return null;

  return (
    <DrawerPrimitive.Root
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}
      direction="right"
    >
      <DrawerPrimitive.Portal>
        <DrawerPrimitive.Overlay className="fixed inset-0 bg-black/40 z-[140]" />
        <DrawerPrimitive.Content
          className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-background border-l border-border z-[141] flex flex-col outline-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {module.icon && <span className="text-lg">{module.icon}</span>}
                <h2 className="font-semibold text-base truncate">{moduleLabel}</h2>
              </div>
              <div className="flex items-center gap-3 mt-1">
                <Progress value={progress} className="flex-1 h-1.5 max-w-[120px]" />
                <span className="text-xs text-muted-foreground tabular-nums">
                  {liveEarned}/{module.creditsRequired} cr
                </span>
                {isComplete && (
                  <Badge variant="default" className="text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Complete
                  </Badge>
                )}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="flex-shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* "Counts toward" chip */}
            <div className="flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Counts toward:</span>
              <Badge variant="outline" className="text-xs">
                {moduleLabel} ({module.creditsRequired} cr)
              </Badge>
            </div>

            {/* Top recommendation card */}
            {topOption && !isComplete && (
              <TopRecommendationCard
                option={topOption}
                moduleLabel={moduleLabel}
                anchorSchool={anchorSchool}
                isInBasket={basket.some(b => b.courseId === topOption.courseId)}
                onAdd={() => handleAdd(topOption)}
              />
            )}

            {/* Sort control */}
            <div className="flex items-center gap-2 pt-2">
              <span className="text-xs text-muted-foreground">Sort by</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="text-xs px-2 py-1 rounded border border-border bg-background"
              >
                <option value="best-match">Best Match</option>
                <option value="cheapest">Lowest Cost</option>
                <option value="shortest">Shortest Duration</option>
              </select>
              <span className="text-xs text-muted-foreground ml-auto">
                {scoredOptions.length} {scoredOptions.length === 1 ? 'option' : 'options'}
              </span>
            </div>

            {/* Options list */}
            <div className="space-y-2">
              {scoredOptions.map((option, idx) => {
                const isInBasket = basket.some(b => b.courseId === option.courseId);
                const isTopPick = idx === 0;

                return (
                  <div
                    key={option.id}
                    className={cn(
                      'rounded-lg border p-3 transition-colors',
                      isInBasket
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border hover:border-primary/20 hover:bg-accent/30'
                    )}
                  >
                    {/* Row 1: Title + price */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{option.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{option.provider}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-semibold">
                          {option.cost_usd != null ? (option.cost_usd === 0 ? 'Free' : `$${option.cost_usd}`) : '—'}
                        </div>
                        {option.duration_weeks && (
                          <div className="text-[11px] text-muted-foreground">{option.duration_weeks} wks</div>
                        )}
                      </div>
                    </div>

                    {/* Row 2: Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap mt-2">
                      <CreditTypeBadge providerType={option.providerType} />
                      <span className="text-[11px] text-muted-foreground tabular-nums">{option.credits} cr</span>
                      {option.aceNccrs && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                          <Shield className="h-2.5 w-2.5" />
                          ACE
                        </span>
                      )}
                      {option.cri_score != null && option.cri_score >= 75 && (
                        <span className="text-[11px] text-muted-foreground">
                          Quality: {option.cri_score}/100
                        </span>
                      )}
                    </div>

                    {/* Row 3: Action */}
                    <div className="mt-2">
                      {isInBasket ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => handleRemove(option.courseId)}
                        >
                          Remove from Plan
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => handleAdd(option)}
                          disabled={isComplete}
                        >
                          Add to Plan
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {scoredOptions.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No approved equivalencies available for this requirement.
                </div>
              )}
            </div>
          </div>
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Portal>
    </DrawerPrimitive.Root>
  );
}
