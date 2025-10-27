import { useState, useMemo, useCallback } from 'react';
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
  const progress = creditsRequired > 0 ? (creditsEarned / creditsRequired) * 100 : 0;
  const selections = usePlanStore(s => s.selections);
  const toggleCourse = usePlanStore(s => s.toggleCourse);
  const selectedIds = selections[id]?.selected ?? [];
  
  const basket = usePlanBasket(s => s.items);
  const moduleStates = usePlanBasket(s => s.moduleStates);
  const { removeItemWithToast } = usePlanBasketWithToasts();
  
  const basketItems = basket.filter(b => b.moduleId === id);
  
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
  
  // Phase 1: SVG-based progressive border (replaces fragile conic-gradient)
  const getBorderClass = useCallback((progress: number): string => {
    if (!FEATURE_FLAGS.v5_module_border_progress) {
      return 'border-2 border-border';
    }
    // Always 3px to prevent layout shift
    return progress === 0 ? 'border-[3px] border-border' : 'border-[3px] border-transparent';
  }, []);
  
  // SVG progress border overlay
  const ProgressBorder = useCallback(({ progress }: { progress: number }) => {
    if (!FEATURE_FLAGS.v5_module_border_progress || progress === 0) return null;
    
    const progressClamped = Math.max(0, Math.min(100, progress));
    const color = progressClamped >= 100 ? '#f59e0b' : '#22c55e';
    
    // Rounded rect path (viewBox 0-100)
    const path = "M8,2 H92 Q98,2 98,8 V92 Q98,92 92,98 H8 Q2,98 2,92 V8 Q2,2 8,2 Z";
    const perimeter = 360;
    const dashLength = (progressClamped / 100) * perimeter;
    const gapLength = perimeter - dashLength;
    
    const prefersReducedMotion = typeof window !== 'undefined' && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    return (
      <svg 
        className="absolute inset-0 pointer-events-none rounded-lg" 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
          strokeDasharray={`${dashLength} ${gapLength}`}
          strokeDashoffset="0"
          style={{
            transition: prefersReducedMotion ? 'none' : 'stroke-dasharray 0.3s ease-out, stroke 0.3s ease-out'
          }}
        />
      </svg>
    );
  }, []);
  
  // Full-card click handler with guards
  const onCardActivate = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!FEATURE_FLAGS.v5_module_border_progress || !onOpenPanel) return;
    
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
        optionsCount, 
        hasBasket: basketItems.length > 0,
        source: 'card_click' 
      }
    });
    
    onOpenPanel();
  }, [onOpenPanel, id, optionsCount, basketItems.length]);
  
  const onCardKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!FEATURE_FLAGS.v5_module_border_progress || !onOpenPanel) return;
    
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      void trackTelemetryEvent({
        task: 'module_card_clicked',
        scope: 'module',
        complexity: { 
          moduleId: id, 
          optionsCount,
          source: 'keyboard' 
        }
      });
      onOpenPanel();
    }
  }, [onOpenPanel, id, optionsCount]);
  
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
      className={`module-card bg-card rounded-lg overflow-visible relative transition-all duration-200 ${
        getBorderClass(progress)
      } ${
        FEATURE_FLAGS.v5_module_border_progress 
          ? 'cursor-pointer hover:scale-[1.01] hover:shadow-md' 
          : ''
      }`}
      style={
        FEATURE_FLAGS.v5_module_border_progress && progress >= 100
          ? { boxShadow: '0 0 12px rgba(245, 158, 11, 0.25)' }
          : undefined
      }
      onClick={FEATURE_FLAGS.v5_module_border_progress ? onCardActivate : undefined}
      onKeyDown={FEATURE_FLAGS.v5_module_border_progress ? onCardKeyDown : undefined}
      tabIndex={FEATURE_FLAGS.v5_module_border_progress && onOpenPanel ? 0 : undefined}
      role={FEATURE_FLAGS.v5_module_border_progress && onOpenPanel ? "button" : undefined}
      aria-label={FEATURE_FLAGS.v5_module_border_progress && onOpenPanel ? `Open ${label} module to browse options` : undefined}
    >
      {/* SVG progress border overlay */}
      <ProgressBorder progress={progress} />
      {/* Module Header - Phase 2: Two-row structure */}
      <div className="module-header p-3 space-y-1">
        {/* Row 1: Identity + Status */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="text-2xl flex-shrink-0">{icon}</div>
            <h3 className="font-semibold text-sm truncate">{label}</h3>
            {FEATURE_FLAGS.v5_module_border_progress && progress >= 100 && (
              <Badge variant="default" size="sm" className="bg-amber-500 text-white flex-shrink-0 hover:bg-amber-500">
                ✓ Complete
              </Badge>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-sm font-semibold">{creditsEarned}/{creditsRequired} cr</div>
          </div>
        </div>
        
        {/* Row 2: Metadata + Actions */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {optionsCount > 0 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenPanel?.();
                  }}
                  className="text-primary hover:underline"
                  data-interactive="true"
                >
                  {optionsCount} {optionsCount === 1 ? 'option' : 'options'}
                </button>
                {cheapestOption !== undefined && cheapestOption !== null && (
                  <span>{cheapestOption === 0 ? 'Free' : `from $${cheapestOption}`}</span>
                )}
              </>
            )}
          </div>
          <button
            onClick={FEATURE_FLAGS.v5_module_border_progress ? onChevronToggle : (e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="p-1 rounded hover:bg-accent transition-colors touch-target-icon"
            aria-label={isCollapsed ? `Expand ${label}` : `Collapse ${label}`}
            aria-expanded={!isCollapsed}
            data-interactive="true"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
        
        {FEATURE_FLAGS.v5_module_border_progress && progress >= 100 && (
          <div className="sr-only" role="status" aria-live="polite">
            {label} module completed!
          </div>
        )}
      </div>
      
      {/* State-based rendering */}
      {!isCollapsed && (viewState === 'template-intact' || viewState === 'modified' || viewState === 'custom') && basketItems.length > 0 ? (
        <div className="p-4 pt-0 space-y-3" onClick={e => e.stopPropagation()}>
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
          <TemplateActions 
            moduleId={id}
            hasTemplate={!!moduleStates[id]?.templateId}
            onChangeTemplate={() => onOpenPanel?.()}
            onAddCourse={() => onOpenPanel?.()}
          />
        </div>
      ) : !isCollapsed && viewState === 'template-intact' && basketItems.length === 0 ? (
        <div className="p-4 pt-0" onClick={e => e.stopPropagation()}>
          <EmptyTemplateState
            templateLabel={moduleStates[id]?.templateLabel}
            onBrowseTemplates={() => onOpenPanel?.()}
            onAddCourse={() => onOpenPanel?.()}
          />
        </div>
      ) : (
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
