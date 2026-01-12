import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MarketplaceDegreeTemplate } from '@/pages/EduTree/v5/types/templates';
import { ProviderBadge } from './ProviderBadge';
import { TransferStatusBadge } from './TransferStatusBadge';
import { YearComparisonTable } from './YearComparisonTable';
import { useTransferVerification } from '../hooks/useTransferVerification';
import { useMemo } from 'react';
import { DollarSign, Clock, BookOpen, GitCompareArrows, List } from 'lucide-react';

interface TemplateDetailDrawerProps {
  template: MarketplaceDegreeTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateDetailDrawer({ template, open, onOpenChange }: TemplateDetailDrawerProps) {
  // Check if comparison view is available
  const hasComparison = !!template.singleSchoolBaseline?.yearBreakdown;
  
  // Collect all courses for transfer verification
  const allCourses = useMemo(() => {
    const courses: Array<{ code: string; providerCode: string | null }> = [];
    template.yearTemplates?.forEach(year => {
      year.moduleTemplates?.forEach(module => {
        module.options?.forEach(option => {
          if (option?.courseId) {
            courses.push({
              code: option.courseId,
              providerCode: option.providerCode || null,
            });
          }
        });
      });
    });
    return courses;
  }, [template.yearTemplates]);

  // Batch verify transfers
  const { data: transferVerifications } = useTransferVerification(
    allCourses,
    template.anchorSchool
  );

  const transferStatusMap = useMemo(() => {
    const map = new Map();
    transferVerifications?.forEach(v => {
      map.set(`${v.providerCode}:${v.courseCode}`, v);
    });
    return map;
  }, [transferVerifications]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle>{template.marketplace.title}</DrawerTitle>
          <DrawerDescription>
            Complete course breakdown • {template.anchorSchool} • {template.catalogYear} Catalog
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-6 pb-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs">Total Cost</span>
                </div>
                <div className="text-2xl font-bold">
                  ${(template.totals.costUsd / 1000).toFixed(1)}K
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Duration</span>
                </div>
                <div className="text-2xl font-bold">
                  {Math.round(template.totals.weeks / 4.33)}mo
                </div>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <BookOpen className="h-4 w-4" />
                  <span className="text-xs">Credits</span>
                </div>
                <div className="text-2xl font-bold">
                  {template.totals.credits}
                </div>
              </div>
            </div>

            {/* Tabs for Comparison vs Course Details */}
            {hasComparison ? (
              <Tabs defaultValue="comparison" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="comparison" className="gap-2">
                    <GitCompareArrows className="h-4 w-4" />
                    <span className="hidden sm:inline">Single vs Multi-School</span>
                    <span className="sm:hidden">Compare</span>
                  </TabsTrigger>
                  <TabsTrigger value="courses" className="gap-2">
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">Course Details</span>
                    <span className="sm:hidden">Courses</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="comparison" className="mt-4">
                  <YearComparisonTable template={template} />
                </TabsContent>
                
                <TabsContent value="courses" className="mt-4">
                  <CourseBreakdown 
                    template={template} 
                    transferStatusMap={transferStatusMap} 
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <CourseBreakdown 
                template={template} 
                transferStatusMap={transferStatusMap} 
              />
            )}
          </div>
        </ScrollArea>

        <DrawerFooter>
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// Extracted course breakdown component
function CourseBreakdown({ 
  template, 
  transferStatusMap 
}: { 
  template: MarketplaceDegreeTemplate; 
  transferStatusMap: Map<string, any>;
}) {
  return (
    <div className="space-y-6">
      {template.yearTemplates?.map((year, yearIdx) => (
        <div key={yearIdx} className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold">Year {yearIdx + 1}</h3>
            <Badge variant="outline" className="text-xs">
              {year.moduleTemplates?.length || 0} courses
            </Badge>
          </div>
          
          <div className="space-y-2">
            {year.moduleTemplates?.map((module, moduleIdx) => {
              const option = module.options?.find(o => o.courseId === module.recommendedCourseId) 
                || module.options?.[0];
              
              if (!option) return null;

              const transferKey = `${option.providerCode}:${option.courseId}`;
              const transferStatus = transferStatusMap.get(transferKey);

              return (
                <div 
                  key={moduleIdx}
                  className="rounded-lg border bg-card/50 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {option.courseId}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {module.moduleId}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {option.credits || 3}cr
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {option.providerCode && (
                      <ProviderBadge 
                        providerCode={option.providerCode as any}
                        className="text-[10px]"
                      />
                    )}
                    
                    {transferStatus && (
                      <TransferStatusBadge
                        status={transferStatus.status}
                        sourceCourse={option.courseId}
                        sourceProvider={option.providerCode || undefined}
                        targetCourse={transferStatus.rule?.target_course_code}
                        targetSchool={template.anchorSchool}
                        confidence={transferStatus.rule?.confidence}
                        evidenceUrl={transferStatus.rule?.evidence_url}
                        ruleSource={transferStatus.rule?.rule_source}
                      />
                    )}

                    {option.cost_usd && (
                      <span className="text-xs text-muted-foreground">
                        ${option.cost_usd}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {yearIdx < (template.yearTemplates?.length || 0) - 1 && (
            <Separator className="my-4" />
          )}
        </div>
      ))}
    </div>
  );
}
