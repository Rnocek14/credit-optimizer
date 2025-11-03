/**
 * Year Templates Panel (Phase 2)
 * Displays 4 year-level templates with preview and apply functionality
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Plus, AlertTriangle, Calendar } from 'lucide-react';
import { generateYearTemplates } from '../../engine/yearTemplateGenerator';
import { usePlanBasket } from '../../state/usePlanBasket';
import { useRequirementBlocks } from '../../hooks/useRequirementBlocks';
import { safeTrack } from '../../utils/safeTelemetry';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import type { YearTemplate } from '../../types/templates';
import type { ModuleData, MarketplaceOption } from '../../types/v5';
import type { PartnerPolicy } from '../../engine/yearPlanner';

interface YearTemplatesPanelProps {
  year: number;
  modules: ModuleData[];
  allOptions: MarketplaceOption[];
  anchorPolicy?: PartnerPolicy;
  programId?: string;
  focusTerm?: 'fall' | 'spring'; // Target semester for smart filtering
  onApplyTemplate: (template: YearTemplate & { semesterDistribution: any; warnings: any }) => void;
}

export function YearTemplatesPanel({
  year,
  modules,
  allOptions,
  anchorPolicy,
  programId,
  focusTerm,
  onApplyTemplate,
}: YearTemplatesPanelProps) {
  const basket = usePlanBasket(s => s.items);
  const constraints = usePlanBasket(s => s.constraints);
  
  const { data: blocks = [] } = useRequirementBlocks(programId, !!programId);

  const [previewingTemplate, setPreviewingTemplate] = useState<(YearTemplate & { semesterDistribution: any; warnings: any }) | null>(null);
  const [localFocusTerm, setLocalFocusTerm] = useState<'fall' | 'spring' | undefined>(focusTerm);
  const firstCardRef = useRef<HTMLDivElement>(null);
  const uiHintAppliedRef = useRef(false);

  // Debounce focus term to prevent double-runs when toggling Fall↔Spring
  const debouncedFocusTerm = useDebouncedValue(localFocusTerm, 80);

  // One-shot UI hint consumption - only apply once when opened from lane
  useEffect(() => {
    if (uiHintAppliedRef.current) return;
    if (focusTerm) {
      uiHintAppliedRef.current = true;
      setLocalFocusTerm(focusTerm);
      
      // Track focus change (safe telemetry - never throws)
      safeTrack({
        task: 'year_templates_focus_set',
        scope: 'year',
        complexity: { term: focusTerm, reason: 'lane', year }
      });
    }
  }, [focusTerm, year]);

  // Generate templates with stable memo key to prevent thrash
  const basketKey = useMemo(
    () => basket.map(i => i.courseId).sort().join(','),
    [basket]
  );

  const constraintsKey = useMemo(
    () => JSON.stringify({
      maxBudget: constraints.max_budget_usd,
      targetSchool: constraints.target_school,
      maxWeekly: constraints.max_weekly_hours,
      targetGrad: constraints.target_graduation_date,
    }),
    [constraints]
  );

  // Wave 1 Fix: Check remaining credits (not just earned vs required)
  const hasUnmetModules = useMemo(() => {
    return modules.some(m => {
      const need = m.creditsRequired - (m.creditsEarned || 0);
      return need > 0;
    });
  }, [modules]);

  const generationKey = useMemo(
    () => JSON.stringify({ year, basketKey, constraintsKey, focusTerm: debouncedFocusTerm }),
    [year, basketKey, constraintsKey, debouncedFocusTerm]
  );

  const { data: templates, isLoading } = useQuery({
    queryKey: ['year-templates', generationKey],
    queryFn: () => {
      // Wave 1 Rollback: Always generate templates for comparison/optimization
      // Users may want to see alternatives even when requirements are met
      console.log('[YearTemplatesPanel] Generating templates:', { 
        year, 
        hasUnmetModules,
        modulesCount: modules.length,
        allOptionsCount: allOptions.length
      });

      return generateYearTemplates(
        year,
        modules,
        blocks,
        allOptions,
        basket, // Use current basket to avoid duplicates
        constraints,
        anchorPolicy
      ) as (YearTemplate & { semesterDistribution: any; warnings: any })[];
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // Sort templates to prioritize target semester when localFocusTerm is set
  const sortedTemplates = useMemo(() => {
    if (!templates) return templates;
    
    // No focus term = default order from generator
    if (!localFocusTerm) return templates;
    
    return [...templates].sort((a, b) => {
      // Primary: More courses in target term
      const aCourses = (a as any).semesterDistribution?.[localFocusTerm]?.length ?? 0;
      const bCourses = (b as any).semesterDistribution?.[localFocusTerm]?.length ?? 0;
      if (bCourses !== aCourses) return bCourses - aCourses;
      
      // Tie-breaker 1: Lower cost
      const aCost = (a as any).metadata?.totalCost ?? Infinity;
      const bCost = (b as any).metadata?.totalCost ?? Infinity;
      if (aCost !== bCost) return aCost - bCost;
      
      // Tie-breaker 2: Shorter duration
      const aWeeks = (a as any).metadata?.totalWeeks ?? Infinity;
      const bWeeks = (b as any).metadata?.totalWeeks ?? Infinity;
      if (aWeeks !== bWeeks) return aWeeks - bWeeks;
      
      // Tie-breaker 3: Higher CRI
      const aCri = (a as any).metadata?.avgCri ?? 0;
      const bCri = (b as any).metadata?.avgCri ?? 0;
      return bCri - aCri;
    });
  }, [templates, localFocusTerm]);

  // Diagnostic log with telemetry
  useEffect(() => {
    const first3 = sortedTemplates?.slice(0, 3).map(t => ({
      id: t.id,
      label: t.label,
      fallCourses: (t as any).semesterDistribution?.fall?.length ?? 0,
      springCourses: (t as any).semesterDistribution?.spring?.length ?? 0,
      cost: (t as any).metadata?.totalCost,
      weeks: (t as any).metadata?.totalWeeks,
    }));
    
    console.log('[YearTemplatesPanel] Render state:', {
      year,
      modulesCount: modules?.length ?? 0,
      allOptionsCount: allOptions?.length ?? 0,
      blocksCount: blocks?.length ?? 0,
      basketSize: basket.length,
      templatesGenerated: templates?.length ?? 0,
      focusTerm: localFocusTerm,
      sortedCount: sortedTemplates?.length ?? 0,
      first3Templates: first3
    });
    
    // Track sorting telemetry when templates are sorted
    if (sortedTemplates && sortedTemplates.length > 0 && localFocusTerm) {
      safeTrack({
        task: 'year_templates_sorted',
        scope: 'year',
        complexity: {
          term: localFocusTerm,
          sort: ['termLoad', 'cost', 'weeks', 'cri'],
          top3: sortedTemplates.slice(0, 3).map(t => t.id),
          year
        }
      });
    }
    
    // Track empty state
    if (templates && templates.length === 0) {
      safeTrack({
        task: 'year_templates_empty',
        scope: 'year',
        complexity: {
          year,
          term: localFocusTerm,
          constraintsSnapshot: {
            maxBudget: constraints.max_budget_usd,
            targetSchool: constraints.target_school
          }
        }
      });
    }
    
    // Focus first card when opened from lane with focus term (double-raf guards against portal/layout shifts)
    if (debouncedFocusTerm && sortedTemplates && sortedTemplates.length > 0 && firstCardRef.current) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() => firstCardRef.current?.focus())
      );
    }
  }, [year, modules, allOptions, blocks, basket, templates, debouncedFocusTerm, sortedTemplates, constraints]);

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // Empty state with helpful context
  if (!sortedTemplates || sortedTemplates.length === 0) {
    const allSatisfied = !hasUnmetModules;
    
    return (
      <Alert>
        <AlertDescription className="text-center py-8">
          <div className="text-4xl mb-2">📝</div>
          <div className="font-medium">No templates could be generated</div>
          <div className="text-sm text-muted-foreground mt-2 space-y-1">
            <div>Possible reasons:</div>
            <div>• Insufficient marketplace options for modules</div>
            <div>• Constraints too tight (budget, CRI, ACE cap)</div>
            <div>• Missing course data in database</div>
          </div>
          <div className="text-sm text-muted-foreground mt-3">
            Try: Increasing budget, relaxing constraints, or check console logs with <code className="px-1 py-0.5 bg-muted rounded">?debug=1</code>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      {/* Target semester indicator with toggle */}
      {localFocusTerm && (
        <div 
          className="mb-4 flex items-center justify-between px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary">
              🎯 Target: {localFocusTerm === 'fall' ? 'Fall' : 'Spring'} • Year {year}
            </span>
            <span className="text-xs text-muted-foreground">
              (Sorted by {localFocusTerm} load → cost → time → CRI)
            </span>
          </div>
          <button
            onClick={() => {
              const newTerm = localFocusTerm === 'fall' ? 'spring' : 'fall';
              setLocalFocusTerm(newTerm);
              
              // Track toggle (safe telemetry - never throws)
              safeTrack({
                task: 'year_templates_focus_set',
                scope: 'year',
                complexity: { term: newTerm, reason: 'toggle', year }
              });
            }}
            className="text-xs text-primary hover:text-primary/80 hover:underline font-medium px-2 py-1 rounded hover:bg-primary/10 transition-colors"
            aria-label={`Switch target to ${localFocusTerm === 'fall' ? 'Spring' : 'Fall'}`}
          >
            Switch to {localFocusTerm === 'fall' ? 'Spring' : 'Fall'}
          </button>
        </div>
      )}

      <div className="template-gallery">
        {sortedTemplates.map((template, idx) => {
          const badgeColor = {
            Cheapest: 'bg-green-500/10 text-green-700 dark:text-green-400 hover:bg-green-500/20',
            Fastest: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20',
            Balanced: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20',
            Prestige: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20',
          }[template.badge || 'Balanced'];

          const totalCourses =
            (template as any).semesterDistribution?.fall?.length +
            (template as any).semesterDistribution?.spring?.length;

          const firstWarning = (template as any).warnings?.[0];

          return (
            <Card 
              key={template.id} 
              className="hover:border-primary/50 transition-colors"
              ref={idx === 0 ? firstCardRef : undefined}
              tabIndex={idx === 0 ? 0 : -1}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-lg">{template.label}</CardTitle>
                      {template.badge && (
                        <Badge variant="secondary" className={badgeColor}>
                          {template.badge}
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="font-mono text-sm">
                      {template.summary}
                    </CardDescription>
                  </div>
                </div>

                {/* First warning preview */}
                {firstWarning && (
                  <Alert variant={firstWarning.severity === 'error' ? 'destructive' : 'default'} className="mt-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      {firstWarning.message}
                    </AlertDescription>
                  </Alert>
                )}
              </CardHeader>

              <CardContent>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewingTemplate(template)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      console.log('[YearTemplatesPanel] Apply clicked:', {
                        templateId: template.id,
                        fallCourses: (template as any).semesterDistribution?.fall?.length ?? 0,
                        springCourses: (template as any).semesterDistribution?.spring?.length ?? 0,
                        totalCourses,
                      });
                      onApplyTemplate(template);
                    }}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Apply Template
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground mt-2 text-center">
                  {totalCourses} courses • {template.moduleTemplates.length} modules
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Preview Modal */}
      {previewingTemplate && (
        <Dialog open onOpenChange={() => setPreviewingTemplate(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {previewingTemplate.label}
                {previewingTemplate.badge && (
                  <Badge variant="secondary">{previewingTemplate.badge}</Badge>
                )}
              </DialogTitle>
              <DialogDescription>{previewingTemplate.summary}</DialogDescription>
            </DialogHeader>

            {/* Semester Breakdown */}
            <div className="space-y-6 mt-4">
              {/* Fall Semester */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-5 w-5 text-orange-500" />
                  <h4 className="font-semibold text-lg">
                    Fall Semester (
                    {(previewingTemplate as any).semesterDistribution.fall.reduce(
                      (sum: number, i: any) => sum + i.credits,
                      0
                    )}
                    cr)
                  </h4>
                </div>
                <div className="space-y-2">
                  {(previewingTemplate as any).semesterDistribution.fall.map((item: any) => (
                    <div
                      key={item.courseId}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground">{item.provider}</div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-medium">${item.cost_usd}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.credits}cr • {item.duration_weeks}w
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spring Semester */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-5 w-5 text-green-500" />
                  <h4 className="font-semibold text-lg">
                    Spring Semester (
                    {(previewingTemplate as any).semesterDistribution.spring.reduce(
                      (sum: number, i: any) => sum + i.credits,
                      0
                    )}
                    cr)
                  </h4>
                </div>
                <div className="space-y-2">
                  {(previewingTemplate as any).semesterDistribution.spring.map((item: any) => (
                    <div
                      key={item.courseId}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{item.title}</div>
                        <div className="text-xs text-muted-foreground">{item.provider}</div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-medium">${item.cost_usd}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.credits}cr • {item.duration_weeks}w
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warnings */}
              {(previewingTemplate as any).warnings?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Warnings</h4>
                  {(previewingTemplate as any).warnings.map((warning: any, idx: number) => (
                    <Alert
                      key={idx}
                      variant={warning.severity === 'error' ? 'destructive' : 'default'}
                    >
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-sm">{warning.message}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setPreviewingTemplate(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  onApplyTemplate(previewingTemplate);
                  setPreviewingTemplate(null);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Apply Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
