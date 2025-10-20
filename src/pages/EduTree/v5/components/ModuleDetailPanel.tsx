import { useState, useMemo } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUserPlanSelections } from '@/hooks/useUserPlanSelections';
import { useAddCourseToPlan, useRemoveCourseFromPlan } from '@/hooks/useUserPlan';
import { useTransferAnalysis } from '@/hooks/useTransferAnalysis';
import { trackTelemetryEvent } from '@/utils/telemetry';
import type { ModuleData, MarketplaceOption } from '../types/v5';
import type { TransferRule } from '@/hooks/useTransferRules';

interface ModuleDetailPanelProps {
  module: ModuleData;
  onClose: () => void;
  transferRules: TransferRule[];
  planId?: string;
}

export function ModuleDetailPanel({ module, onClose, transferRules, planId }: ModuleDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'current' | 'marketplace'>('current');
  const [providerFilter, setProviderFilter] = useState<string>('all');
  const [maxCostFilter, setMaxCostFilter] = useState<string>('all');
  
  const { data: planSelections } = useUserPlanSelections(planId);
  const addCourse = useAddCourseToPlan();
  const removeCourse = useRemoveCourseFromPlan();
  const { getTransferFit } = useTransferAnalysis('bs_cs', transferRules);

  // Get current selections for this module
  const currentSelections = useMemo(() => {
    if (!planSelections) return [];
    return Array.from(planSelections.values())
      .filter((s: any) => s.requirement_id === module.requirementId)
      .map((s: any) => ({
        id: s.course?.id,
        title: s.course?.title || 'Unknown',
        provider: s.provider?.name || 'Unknown',
        credits: s.course?.credits || 0,
      }));
  }, [planSelections, module.requirementId]);

  // Calculate credits remaining
  const creditsEarned = currentSelections.reduce((sum, s) => sum + s.credits, 0);
  const creditsRemaining = module.creditsRequired - creditsEarned;

  // Filter marketplace options
  const filteredOptions = useMemo(() => {
    let options = module.marketplaceOptions || [];
    
    if (providerFilter !== 'all') {
      options = options.filter(opt => opt.provider?.toLowerCase().includes(providerFilter));
    }
    
    if (maxCostFilter !== 'all') {
      const maxCost = parseInt(maxCostFilter);
      options = options.filter(opt => (opt.cost_usd || 0) <= maxCost);
    }
    
    return options;
  }, [module.marketplaceOptions, providerFilter, maxCostFilter]);

  // Check if course is already selected
  const isSelected = (courseId: string) => {
    return currentSelections.some(s => s.id === courseId);
  };

  // Check if adding would exceed credits
  const wouldExceedCredits = (credits: number) => {
    return creditsEarned + credits > module.creditsRequired;
  };

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent className="w-[600px] overflow-y-auto" data-testid="side-panel">
        <SheetHeader>
          <SheetTitle>{module.label}</SheetTitle>
          <SheetDescription>{module.description}</SheetDescription>
        </SheetHeader>

        {/* What's Missing Section */}
        <div className="py-4 border-b mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Credits: {creditsEarned} / {module.creditsRequired}
            </span>
            {creditsRemaining > 0 && (
              <Badge variant="outline" className="text-xs">
                {creditsRemaining} cr remaining
              </Badge>
            )}
            {creditsRemaining === 0 && (
              <Badge variant="default" className="text-xs">
                ✅ Complete
              </Badge>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'current' | 'marketplace')} className="mt-6">
          <TabsList className="w-full">
            <TabsTrigger value="current" className="flex-1">
              Current ({currentSelections.length})
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="flex-1">
              Marketplace ({module.optionsCount || 0})
            </TabsTrigger>
          </TabsList>

          {/* Current Tab */}
          <TabsContent value="current" className="space-y-3 mt-4">
            {currentSelections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No courses selected yet. Switch to Marketplace to browse options.
              </div>
            ) : (
              currentSelections.map((course) => (
                <Card key={course.id}>
                  <CardHeader>
                    <CardTitle className="text-sm">{course.title}</CardTitle>
                    <CardDescription>{course.provider} • {course.credits} cr</CardDescription>
                  </CardHeader>
                  <CardFooter>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (!planId) return;
                        removeCourse.mutate(course.id);
                        trackTelemetryEvent({
                          task: 'course_removed_from_plan',
                          complexity: { courseId: course.id, requirementId: module.requirementId }
                        });
                      }}
                      disabled={!planId}
                    >
                      Remove
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Marketplace Tab */}
          <TabsContent value="marketplace" className="space-y-4 mt-4">
            {/* Filters */}
            <div className="grid grid-cols-2 gap-3">
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All providers</SelectItem>
                  <SelectItem value="university">Universities</SelectItem>
                  <SelectItem value="mooc">MOOCs</SelectItem>
                  <SelectItem value="testing">Testing Centers</SelectItem>
                </SelectContent>
              </Select>

              <Select value={maxCostFilter} onValueChange={setMaxCostFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Max cost" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any cost</SelectItem>
                  <SelectItem value="200">Under $200</SelectItem>
                  <SelectItem value="500">Under $500</SelectItem>
                  <SelectItem value="1000">Under $1,000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Course Options */}
            {filteredOptions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No courses match your filters. Try adjusting your criteria.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOptions.map((option) => {
                  const transferFit = getTransferFit(option.id);
                  const selected = isSelected(option.id);
                  const exceedsCredits = wouldExceedCredits(option.credits);

                  return (
                    <Card key={option.id}>
                      <CardHeader>
                        <CardTitle className="text-sm">{option.title}</CardTitle>
                        <CardDescription>
                          {option.provider || 'Unknown'}
                          {option.accreditation && ` • ${option.accreditation}`}
                          {' • '}{option.credits} cr
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge variant={transferFit.level === 'excellent' ? 'default' : 'outline'}>
                            {transferFit.level === 'excellent' && '✅ '}
                            {transferFit.level}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            ${option.cost_usd ?? '—'}
                          </span>
                          {option.duration_weeks && (
                            <span className="text-xs text-muted-foreground">
                              • {option.duration_weeks} weeks
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{transferFit.reason}</p>
                      </CardContent>
                      <CardFooter>
                        <Button
                          size="sm"
                          onClick={() => {
                            if (!planId) return;
                            addCourse.mutate({
                              planId,
                              requirementId: module.requirementId!,
                              courseId: option.id,
                              providerId: option.providerId,
                            });
                            trackTelemetryEvent({
                              task: 'course_selected_from_marketplace',
                              complexity: {
                                courseId: option.id,
                                transferFit: transferFit.level,
                              },
                            });
                          }}
                          disabled={selected || exceedsCredits || !planId}
                          variant={selected ? 'outline' : 'default'}
                          data-testid={`select-course-btn-${option.id}`}
                        >
                          {selected ? '✅ Selected' : exceedsCredits ? 'Exceeds Credits' : 'Select Course'}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
