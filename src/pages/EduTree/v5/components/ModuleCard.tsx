import { useState, useMemo, useCallback, useEffect } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { CourseCard } from './CourseCard';
import { ModuleData } from '../types/v5';
import { usePlanStore } from '../state/usePlanStore';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DraggableCourseChip } from './drag/DraggableCourseChip';
import { usePlanBasket } from '../state/usePlanBasket';
import { usePlanBasketWithToasts } from '../hooks/usePlanBasketWithToasts';
import { SelectedCourseChips } from './SelectedCourseChips';
import { TemplateActions } from './TemplateActions';
import { EmptyTemplateState } from './EmptyTemplateState';
import type { NodeSelectedSummary } from '../types/nodeProgress';
import { trackTelemetryEvent } from '@/utils/telemetry';
import { FEATURE_FLAGS } from '../config/featureFlags';
import { useAutoFillModule } from '../hooks/useAutoFillModule';
import { Sparkles } from 'lucide-react';
import { safeTrack } from '../utils/safeTelemetry';
import { shouldSample } from '@/utils/telemetrySampling';

// Helper: Pluralization utility (reusable across components)
const plural = (n: number, singular: string, pluralForm: string) => (n === 1 ? singular : pluralForm);

// Helper: Determine options display state
type OptionsState = 'loading' | 'empty' | 'filtered' | 'has';
const getOptionsState = (
  marketplaceOptions: ModuleData['marketplaceOptions'],
  derivedOptionsCount: number
): OptionsState => {
  if (marketplaceOptions === undefined) return 'loading';
  if (marketplaceOptions.length === 0) return 'empty';
  if (derivedOptionsCount === 0) return 'filtered';
  return 'has';
};

interface ModuleCardProps extends ModuleData {
  selectedSummary?: NodeSelectedSummary;
  onToggle: () => void;
  onCourseClick?: (courseId: string) => void;
  cheapestOption?: number | null;
  onOpenPanel?: () => void;
  yearEarned?: number;
  yearCap?: number;
}

export function ModuleCard({ 
  id,
  label, 
  icon, 
  description, 
  courses, 
  creditsEarned, 
  creditsRequired,
  isCollapsed,
  onToggle,
  onCourseClick,
  optionsCount,
  marketplaceOptions,
  cheapestOption,
  onOpenPanel,
  yearEarned = 0,
  yearCap = 30,
  selectedSummary
}: ModuleCardProps) {
  // Derive options count locally (belt + suspenders: guards against stale prop)
  // Memoized for performance with large marketplace options arrays
  const derivedOptionsCount = useMemo(
    () => marketplaceOptions?.length ?? optionsCount ?? 0,
    [marketplaceOptions, optionsCount]
  );
  
  const progress = creditsRequired > 0 ? (creditsEarned / creditsRequired) * 100 : 0;
  const selections = usePlanStore(s => s.selections);
  const toggleCourse = usePlanStore(s => s.toggleCourse);
  const selectedIds = selections[id]?.selected ?? [];
  
  const basket = usePlanBasket(s => s.items);
  const moduleStates = usePlanBasket(s => s.moduleStates);
  const { removeItemWithToast } = usePlanBasketWithToasts();
  
  const basketItems = basket.filter(b => b.moduleId === id);
  const { quickPick } = useAutoFillModule();
  
  // Mismatch detection: log if optionsCount prop doesn't match actual array length
  useEffect(() => {
    const propCount = optionsCount ?? 0;
    const actualCount = marketplaceOptions?.length ?? 0;
    
    if (propCount !== actualCount && process.env.NODE_ENV === 'development') {
      console.warn(
        `[ModuleCard] optionsCount mismatch for ${id}:`,
        { propCount, actualCount, hasMarketplaceOptions: !!marketplaceOptions }
      );
    }
    
    // Telemetry for production (sampled at 10% to reduce noise, override with ?telemetry=full)
    const fullTelemetry = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('telemetry') === 'full';
    if (propCount === 0 && actualCount > 0 && (fullTelemetry || shouldSample(0.1))) {
      safeTrack({
        task: 'v5_options_count_mismatch',
        scope: 'module',
        complexity: { moduleId: id, propCount, actualCount }
      });
    }
  }, [id, optionsCount, marketplaceOptions]);
  
  // Defensive log if marketplaceOptions is undefined (prevents silent "0 options" bugs)
  useEffect(() => {
    if (marketplaceOptions === undefined && progress < 100) {
      console.warn(`[ModuleCard] marketplaceOptions is undefined for incomplete module ${id}`);
    }
  }, [id, marketplaceOptions, progress]);
  
  // Hydration lag detector: log if marketplaceOptions stays undefined >3s
  useEffect(() => {
    if (marketplaceOptions !== undefined) return;
    
    const timer = setTimeout(() => {
      safeTrack({
        task: 'v5_marketplace_hydration_lag',
        scope: 'module',
        complexity: { moduleId: id, waitedMs: 3000 }
      });
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [marketplaceOptions, id]);
  
  // Break-glass invariant: catch derived/array mismatches in dev
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && marketplaceOptions) {
      if (derivedOptionsCount !== marketplaceOptions.length) {
        console.warn(
          '[ModuleCard] INVARIANT: Derived count does not match array length',
          { id, derivedOptionsCount, arrayLength: marketplaceOptions.length }
        );
      }
    }
  }, [id, derivedOptionsCount, marketplaceOptions]);
  
  // 4-state machine for module view
  const getModuleViewState = (): 'empty' | 'template-intact' | 'modified' | 'custom' => {
    const moduleState = moduleStates[id];
    const hasItems = basketItems.length > 0;
    
    if (!hasItems && !moduleState?.templateId) return 'empty';
    if (!hasItems && moduleState?.templateId) return 'template-intact'; // Empty but template applied
    if (hasItems && moduleState?.templateId) {
      // Check if modified (has manual additions/removals)
      const allFromTemplate = basketItems.every(item => 
        item.status === 'auto-filled' && item.source?.templateId === moduleState.templateId
      );
      return allFromTemplate ? 'template-intact' : 'modified';
    }
    return 'custom'; // Has items but no template provenance
  };
  
  const viewState = getModuleViewState();
  
  const [sortBy, setSortBy] = useState<'cheapest' | 'shortest' | 'credits'>('cheapest');

  const sortedOptions = useMemo(() => {
    if (!marketplaceOptions) return [];
    
    const opts = [...marketplaceOptions];
    
    if (sortBy === 'cheapest') {
      return opts.sort((a, b) => {
        if (a.cost_usd === null) return 1;
        if (b.cost_usd === null) return -1;
        return a.cost_usd - b.cost_usd;
      });
    } else if (sortBy === 'shortest') {
      return opts.sort((a, b) => {
        if (a.duration_weeks === null) return 1;
        if (b.duration_weeks === null) return -1;
        return a.duration_weeks - b.duration_weeks;
      });
    }
    // Most credits
    return opts.sort((a, b) => b.credits - a.credits);
  }, [marketplaceOptions, sortBy]);
  
  // Phase 0: Simple stateful CSS border (no SVG geometry issues)
  const getProgressBorderClass = useCallback((progress: number): string => {
    if (progress === 0) return 'border-[3px] border-border'; // Gray
    if (progress < 100) return 'border-[3px] border-green-500 dark:border-green-400'; // Bright green
    return 'border-[3px] border-warning shadow-[0_0_12px_oklch(0.85_0.15_70/0.3)]'; // Gold + glow
  }, []);
  
  // Full-card click handler with guards
  const onCardActivate = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!FEATURE_FLAGS.V5_SIMPLIFIED_CARDS || !onOpenPanel) return;
    
    // Selection guard
    const sel = window.getSelection?.();
    if (sel && sel.type === 'Range') return;
    
    // Interactive-descendant guard
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, select, textarea, [contenteditable], [data-interactive]')) {
      return;
    }
    
    // Track & open
    void trackTelemetryEvent({
      task: 'module_card_clicked',
      scope: 'module',
      complexity: { 
        moduleId: id, 
        optionsCount: derivedOptionsCount, 
        hasBasket: basketItems.length > 0,
        source: 'card_click' 
      }
    });
    
    onOpenPanel();
  }, [onOpenPanel, id, derivedOptionsCount, basketItems.length]);
  
  const onCardKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!FEATURE_FLAGS.V5_SIMPLIFIED_CARDS || !onOpenPanel) return;
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      void trackTelemetryEvent({
        task: 'module_card_clicked',
        scope: 'module',
        complexity: { 
          moduleId: id, 
          optionsCount: derivedOptionsCount,
          source: 'keyboard' 
        }
      });
      onOpenPanel();
    }
  }, [onOpenPanel, id, derivedOptionsCount]);
  
  const onChevronToggle = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    void trackTelemetryEvent({
      task: 'module_chevron_toggled',
      scope: 'module',
      complexity: { 
        moduleId: id, 
        expanded: isCollapsed 
      }
    });
    onToggle();
  }, [onToggle, id, isCollapsed]);
  
  return (
    <div
      data-module-card
      data-module-id={id}
      className={`
        module-card bg-card rounded-lg relative transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none
        ${getProgressBorderClass(progress)}
        ${onOpenPanel ? 'cursor-pointer hover:scale-[1.01] hover:shadow-md' : ''}
      `}
      onClick={onOpenPanel ? onCardActivate : undefined}
      onKeyDown={onOpenPanel ? onCardKeyDown : undefined}
      tabIndex={onOpenPanel ? 0 : undefined}
      role={onOpenPanel ? "button" : undefined}
      aria-label={onOpenPanel ? `Open ${label} module to browse options` : undefined}
    >
      {/* Module Header: 2-row clean layout */}
      <div className="module-header p-3 space-y-2">
        {/* Row 1: Icon + Title + Status + Credits */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {icon && <span className="text-xl flex-shrink-0">{icon}</span>}
            <h3 className="font-semibold text-sm truncate">{label}</h3>
            {progress >= 100 && (
              <Badge variant="default" className="text-[10px] flex-shrink-0">
                ✓ Complete
              </Badge>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs font-semibold">{creditsEarned}/{creditsRequired}</div>
            <div className="text-[10px] text-muted-foreground">credits</div>
          </div>
        </div>

        {/* Row 2: Options count + Quick Pick + Chevron */}
        <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onOpenPanel?.();
            }}
            className="hover:text-foreground transition-colors flex-1 text-left"
            data-interactive="true"
          >
            {derivedOptionsCount} {plural(derivedOptionsCount, 'option', 'options')} available
          </button>
          
          {/* Quick Pick button - only show if incomplete and has options */}
          {progress < 100 && derivedOptionsCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                quickPick({
                  id,
                  label,
                  icon,
                  description,
                  courses,
                  creditsEarned,
                  creditsRequired,
                  isCollapsed,
                  optionsCount,
                  marketplaceOptions,
                });
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/10 rounded transition-colors border border-primary/20"
              title="Automatically pick the best option for this module"
              data-interactive="true"
            >
              <Sparkles className="h-3 w-3" />
              Quick Pick
            </button>
          )}

          <button
            onClick={onChevronToggle}
            className="min-w-[44px] min-h-[44px] p-2 flex items-center justify-center hover:bg-muted rounded transition-colors flex-shrink-0"
            aria-label={isCollapsed ? 'Expand module details' : 'Collapse module details'}
            data-interactive="true"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        
        {progress >= 100 && (
          <div className="sr-only" role="status" aria-live="polite">
            {label} module completed!
          </div>
        )}
      </div>
      
      {/* Expanded content */}
      {!isCollapsed && (
        <div className="p-3 pt-0 space-y-3" onClick={e => e.stopPropagation()}>
          {/* Description */}
          {description && (
            <p className="text-xs text-muted-foreground italic">
              {description}
            </p>
          )}

          {/* Course Chips (if selected) */}
          {basketItems.length > 0 && (
            <>
              <SelectedCourseChips 
                moduleId={id}
                moduleLabel={label}
                basketItems={basketItems}
                onRemove={removeItemWithToast}
                creditsRequired={creditsRequired}
              />
              {viewState === 'modified' && (
                <p className="text-xs text-muted-foreground italic">
                  ✏️ Modified from template
                </p>
              )}
            </>
          )}

          {/* Empty template state */}
          {viewState === 'template-intact' && basketItems.length === 0 && (
            <EmptyTemplateState
              templateLabel={moduleStates[id]?.templateLabel}
              onBrowseTemplates={() => onOpenPanel?.()}
              onAddCourse={() => onOpenPanel?.()}
            />
          )}

          {/* Clear CTA to open dock - show even for complete modules to allow changes */}
          {derivedOptionsCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenPanel?.();
              }}
              className="w-full mt-3 py-2 text-xs text-primary hover:text-primary/80 hover:bg-primary/5 rounded transition-colors border border-primary/20"
              data-interactive="true"
            >
              Open in dock to manage courses →
            </button>
          )}
          
          {/* Smart empty state with context (can disable with localStorage) */}
          {FEATURE_FLAGS.SMART_EMPTY_STATES && derivedOptionsCount === 0 && progress < 100 && (() => {
            const state = getOptionsState(marketplaceOptions, derivedOptionsCount);
            return (
              <div className="text-xs text-muted-foreground text-center mt-3 px-2 space-y-1">
                {state === 'loading' && <p className="italic">Loading options…</p>}
                {state === 'empty' && <p>No marketplace options available yet</p>}
                {state === 'filtered' && <p>No eligible options match current filters</p>}
              </div>
            );
          })()}
        </div>
      )}
      
      {/* Old expanded view (keep for now if needed) */}
      {!isCollapsed && false && (
        <>
          {/* Courses List - Expandable */}
          {!isCollapsed && courses.length > 0 && (
            <div className="module-courses p-4 pt-0 space-y-2" onClick={e => e.stopPropagation()}>
              {courses.map(course => (
                <CourseCard
                  key={course.courseId}
                  courseId={course.courseId}
                  title={course.title}
                  credits={course.credits}
                  subject={course.subject}
                  onClick={() => onCourseClick?.(course.courseId)}
                />
              ))}
            </div>
          )}
          
          {/* Available Options - Expandable */}
          {!isCollapsed && marketplaceOptions && marketplaceOptions.length > 0 && (
            <div className="module-courses p-4 pt-0 space-y-2" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-muted-foreground">
                  Available Options
                </div>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-xs px-2 py-1 rounded border border-border bg-background hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  data-interactive="true"
                >
                  <option value="cheapest">💰 Cheapest</option>
                  <option value="shortest">⚡ Shortest</option>
                  <option value="credits">📊 Most Credits</option>
                </select>
              </div>
              {sortedOptions.map(option => {
                const isSelected = selectedIds.includes(option.courseId);
                const optionCredits = Number(option.credits) || 0;
                const wouldExceedYearCap = !isSelected && yearEarned + optionCredits > yearCap;
                const atMax = !isSelected && (selections[id]?.selectedCredits ?? 0) >= creditsRequired;
                
                return (
                  <DraggableCourseChip key={option.id} course={option}>
                    <div
                      className={`course-card bg-background rounded-md p-1.5 hover:bg-accent/50 transition-all flex items-center gap-2 ${
                        isSelected ? 'border-2 border-primary bg-primary/5' : 'border border-border'
                      }`}
                    >
                      <Checkbox 
                        checked={isSelected}
                        onCheckedChange={() => {
                          if (!atMax && !wouldExceedYearCap) {
                            toggleCourse(id, option.courseId, optionCredits, creditsRequired);
                          }
                        }}
                        disabled={atMax || wouldExceedYearCap}
                        data-interactive="true"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-medium truncate leading-tight">
                          {option.courseId}: {option.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5 flex-wrap">
                          <span>{option.credits} cr</span>
                          
                          {/* Provider badge with icon */}
                          {option.providerType && (
                            <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              option.providerType === 'university' 
                                ? 'bg-blue-100 text-blue-700'
                                : option.providerType === 'mooc'
                                ? 'bg-purple-100 text-purple-700'
                                : option.providerType === 'bootcamp'
                                ? 'bg-orange-100 text-orange-700'
                                : option.providerType === 'testing_center'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {option.providerType === 'university' && '🎓'}
                              {option.providerType === 'mooc' && '🌐'}
                              {option.providerType === 'bootcamp' && '⚡'}
                              {option.providerType === 'testing_center' && '📝'}
                              {' '}{option.provider}
                            </span>
                          )}
                          
                          {/* Price badge */}
                      {option.cost_usd !== null && (
                        <span className="ml-1 px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-medium">
                          {option.cost_usd === 0 ? 'Included' : `$${new Intl.NumberFormat().format(option.cost_usd)}`}
                        </span>
                      )}
                          
                          {/* Duration */}
                          {option.duration_weeks && (
                            <span className="ml-1 text-[10px]">
                              {option.duration_weeks}w
                            </span>
                          )}
                        </div>
                      </div>
                      {isSelected ? (
                        <Badge variant="default" className="text-[10px] px-2 py-0.5 whitespace-nowrap">
                          ✓ Selected
                        </Badge>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!atMax && !wouldExceedYearCap) {
                              toggleCourse(id, option.courseId, optionCredits, creditsRequired);
                            }
                          }}
                          disabled={atMax || wouldExceedYearCap}
                          className={`text-[10px] px-2 py-1 rounded transition-colors whitespace-nowrap ${
                            atMax || wouldExceedYearCap
                              ? 'bg-muted text-muted-foreground cursor-not-allowed'
                              : 'bg-primary/10 text-primary hover:bg-primary/20'
                          }`}
                          title={
                            wouldExceedYearCap && !isSelected
                              ? `Year cap reached (${yearCap} cr)`
                              : atMax
                              ? 'Module max reached'
                              : ''
                          }
                          data-interactive="true"
                        >
                          {(atMax || wouldExceedYearCap) ? 'Cap Reached' : 'Select'}
                        </button>
                      )}
                    </div>
                  </DraggableCourseChip>
                );
              })}
            </div>
          )}

          {/* Enhanced empty state */}
          {!isCollapsed && (!marketplaceOptions || marketplaceOptions.length === 0) && courses.length === 0 && (
            <div className="p-8 text-center space-y-3">
              <div className="text-5xl">🔍</div>
              <div>
                <h4 className="font-semibold text-sm">No courses available</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Marketplace options for {label} are being curated.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
