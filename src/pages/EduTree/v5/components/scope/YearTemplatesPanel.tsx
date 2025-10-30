/**
 * Year Templates Panel (Phase 2)
 * Displays 4 year-level templates with preview and apply functionality
 */

import { useState, useMemo, useEffect } from 'react';
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
import type { YearTemplate } from '../../types/templates';
import type { ModuleData, MarketplaceOption } from '../../types/v5';
import type { PartnerPolicy } from '../../engine/yearPlanner';

interface YearTemplatesPanelProps {
  year: number;
  modules: ModuleData[];
  allOptions: MarketplaceOption[];
  anchorPolicy?: PartnerPolicy;
  programId?: string;
  onApplyTemplate: (template: YearTemplate & { semesterDistribution: any; warnings: any }) => void;
}

export function YearTemplatesPanel({
  year,
  modules,
  allOptions,
  anchorPolicy,
  programId,
  onApplyTemplate,
}: YearTemplatesPanelProps) {
  const basket = usePlanBasket(s => s.items);
  const constraints = usePlanBasket(s => s.constraints);
  
  const { data: blocks = [] } = useRequirementBlocks(programId, !!programId);

  const [previewingTemplate, setPreviewingTemplate] = useState<(YearTemplate & { semesterDistribution: any; warnings: any }) | null>(null);

  // Generate templates on mount
  const basketKey = useMemo(
    () => basket.map(i => i.courseId).sort().join(','),
    [basket]
  );

  const { data: templates, isLoading } = useQuery({
    queryKey: ['year-templates', year, basketKey, constraints.max_budget_usd],
    queryFn: () =>
      generateYearTemplates(
        year,
        modules,
        blocks,
        allOptions,
        [], // Generate with empty basket so plans aren't "already satisfied"
        constraints,
        anchorPolicy
      ) as (YearTemplate & { semesterDistribution: any; warnings: any })[],
    staleTime: 5000,
  });

  // Diagnostic log
  useEffect(() => {
    console.log('[YearTemplatesPanel] Generation inputs:', {
      year,
      modulesCount: modules?.length ?? 0,
      allOptionsCount: allOptions?.length ?? 0,
      blocksCount: blocks?.length ?? 0,
      basketSize: basket.length,
      templatesGenerated: templates?.length ?? 0,
      moduleSample: modules?.[0]
    });
  }, [year, modules, allOptions, blocks, basket, templates]);

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

  // Empty state
  if (!templates || templates.length === 0) {
    return (
      <Alert>
        <AlertDescription className="text-center py-8">
          <div className="text-4xl mb-2">📝</div>
          <div className="font-medium">No year templates available</div>
          <div className="text-sm text-muted-foreground mt-1">
            All requirements may already be met, or courses need to be added to the catalog.
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {templates.map(template => {
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
            <Card key={template.id} className="hover:border-primary/50 transition-colors">
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
                    onClick={() => onApplyTemplate(template)}
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
