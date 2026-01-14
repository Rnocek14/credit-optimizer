import { useState, useMemo } from 'react';
import { ENV } from '@/config/env';
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
import { TransferCoveragePanel } from './TransferCoveragePanel';
import { YearComparisonTable } from './YearComparisonTable';
import { SlotAltOptions } from './SlotAltOptions';
import { PreApprovalEmailModal } from '@/components/transfer/PreApprovalEmailModal';
import { useTransferVerification } from '../hooks/useTransferVerification';
import { useAltOptionsForSlots, type AltCreditOption } from '@/hooks/useAltOptionsForRequirementArea';
import { computeTransferCoverage } from '@/lib/transferCoverage';
import { normalizeProviderCode, normalizeCourseCode } from '@/lib/providerNormalization';
import { DollarSign, Clock, BookOpen, GitCompareArrows, List, Mail, Lock } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { PreApprovalCourse } from '@/lib/transfer/preApprovalEmail';

// Debug flag: only log in dev or with ?debug=1
const isDebug = () => 
  !ENV.PROD || new URLSearchParams(window.location.search).get('debug') === '1';

interface TemplateDetailDrawerProps {
  template: MarketplaceDegreeTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TemplateDetailDrawer({ template, open, onOpenChange }: TemplateDetailDrawerProps) {
  // Check if comparison view is available - show tab when ANY baseline exists (verified, estimated, or missing)
  // We show the tab with appropriate messaging for each status
  const hasVerifiedBaseline =
    template.baselineStatus === 'verified' &&
    (template.singleSchoolBaseline?.costUsd ?? 0) > 0;
  
  // Show comparison tab whenever there's baseline data OR we want to explain why it's missing
  const hasComparison = template.singleSchoolBaseline !== undefined || template.baselineStatus !== undefined;
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  
  // Collect ALL alt-credit options (deduplicated) for comprehensive transfer coverage
  // This ensures Standard templates (which default to institutional) still show alt-credit rule coverage
  const selectedCourses = useMemo(() => {
    const seen = new Set<string>();
    const courses: Array<{ code: string; providerCode: string | null }> = [];
    template.yearTemplates?.forEach(year => {
      year.moduleTemplates?.forEach(module => {
        // Include ALL options for comprehensive coverage
        module.options?.forEach(option => {
          // Only count alt-credit options (skip institutional courses with null provider)
          if (option?.courseId && option.providerCode) {
            const key = `${normalizeProviderCode(option.providerCode)}::${normalizeCourseCode(option.courseId)}`;
            if (!seen.has(key)) {
              seen.add(key);
              courses.push({
                code: option.courseId,
                providerCode: option.providerCode,
              });
            }
          }
        });
      });
    });
    return courses;
  }, [template.yearTemplates]);

  // Batch verify transfers for selected courses
  const { data: transferVerifications } = useTransferVerification(
    selectedCourses,
    template.anchorSchool
  );

  // Build lookup map for course display (using normalized provider codes for consistent matching)
  const transferStatusMap = useMemo(() => {
    const map = new Map();
    transferVerifications?.forEach(v => {
      const normalizedKey = `${normalizeProviderCode(v.providerCode)}:${v.courseCode}`;
      map.set(normalizedKey, v);
    });
    return map;
  }, [transferVerifications]);

  // Compute coverage breakdown
  const coverageBreakdown = useMemo(() => {
    if (!transferVerifications) return null;
    return computeTransferCoverage(transferVerifications, template.anchorSchool);
  }, [transferVerifications, template.anchorSchool]);

  // Build courses list for pre-approval email (external courses only, deduped)
  const externalCourses = useMemo((): PreApprovalCourse[] => {
    const seen = new Set<string>();
    const courses: PreApprovalCourse[] = [];
    template.yearTemplates?.forEach(year => {
      year.moduleTemplates?.forEach(module => {
        const option = module.options?.find(o => o.courseId === module.recommendedCourseId) 
          || module.options?.[0];
        // Only include non-anchor-school courses (actual transfers)
        if (option?.courseId && option.providerCode?.toUpperCase() !== template.anchorSchool?.toUpperCase()) {
          // Dedupe by (providerCode, courseId)
          const key = `${(option.providerCode || '').toUpperCase()}:${option.courseId}`;
          if (!seen.has(key)) {
            seen.add(key);
            // Warn when credits default to 3 for observability (dev only)
            if (!option.credits && isDebug()) {
              console.warn('[TransferBatch] Missing credits, defaulting to 3', {
                providerCode: option.providerCode,
                courseId: option.courseId,
                moduleId: module.moduleId,
                anchorSchool: template.anchorSchool,
              });
            }
            courses.push({
              sourceInstitution: option.providerCode || 'Unknown',
              courseCode: option.courseId,
              courseTitle: option.courseId, // Could be enhanced with title lookup
              credits: option.credits || 3,
              providerType: option.providerType,
            });
          }
        }
      });
    });
    return courses;
  }, [template.yearTemplates, template.anchorSchool]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh] flex flex-col">
        <DrawerHeader>
          <DrawerTitle>{template.marketplace.title}</DrawerTitle>
          <DrawerDescription>
            Complete course breakdown • {template.anchorSchool} • {template.catalogYear} Catalog
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="px-4" style={{ height: 'calc(90vh - 160px)' }}>
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

            {/* Transfer Coverage Panel */}
            {coverageBreakdown && (
              <TransferCoveragePanel coverage={coverageBreakdown} />
            )}

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
                  <YearComparisonTable template={template} baselineStatus={template.baselineStatus} />
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

        <DrawerFooter className="flex-row gap-2">
          {externalCourses.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setEmailModalOpen(true)}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              Request Pre-Approval ({externalCourses.length})
            </Button>
          )}
          <DrawerClose asChild>
            <Button variant="outline">Close</Button>
          </DrawerClose>
        </DrawerFooter>

        {/* Pre-Approval Email Modal */}
        <PreApprovalEmailModal
          open={emailModalOpen}
          onOpenChange={setEmailModalOpen}
          targetInstitution={template.anchorSchool}
          degreeProgram={template.marketplace.title}
          catalogYear={template.catalogYear}
          courses={externalCourses}
        />
      </DrawerContent>
    </Drawer>
  );
}

// Extracted course breakdown component with alt-credit options
function CourseBreakdown({ 
  template, 
  transferStatusMap 
}: { 
  template: MarketplaceDegreeTemplate; 
  transferStatusMap: Map<string, any>;
}) {
  // Collect all unique requirement areas from module targetCanonicalIds
  const requirementAreas = useMemo(() => {
    const areas = new Set<string>();
    template.yearTemplates?.forEach(year => {
      year.moduleTemplates?.forEach(module => {
        // targetCanonicalIds contains the requirement area(s) for this slot
        module.targetCanonicalIds?.forEach(id => areas.add(id));
      });
    });
    return Array.from(areas);
  }, [template.yearTemplates]);

  // Batch fetch alt options for all requirement areas
  const { data: altOptionsByArea } = useAltOptionsForSlots({
    institutionCode: template.anchorSchool,
    requirementAreas,
    enabled: requirementAreas.length > 0,
  });

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

              // Use normalized provider code for map lookup (matches how we stored it)
              const transferKey = `${normalizeProviderCode(option.providerCode || '')}:${option.courseId}`;
              const transferStatus = transferStatusMap.get(transferKey);

              // Get alt options for this slot's requirement area
              const primaryReqArea = module.targetCanonicalIds?.[0];
              const slotAltOptions = primaryReqArea && altOptionsByArea 
                ? (altOptionsByArea[primaryReqArea] || [])
                : [];

              return (
                <div 
                  key={moduleIdx}
                  className="rounded-lg border bg-card/50 p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate flex items-center gap-1.5">
                        {option.courseId}
                        {/* Cap-limited badge: shows when slot was flipped from alt-credit due to cap */}
                        {module.isCapLimited && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                  <Lock className="h-2.5 w-2.5" />
                                  Cap-limited
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <p className="text-xs">
                                  Alt-credit cap reached for {template.anchorSchool}. 
                                  This slot must be taken as an institutional course unless you swap another alt-credit slot.
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
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

                  {/* Alt Credit Options for this slot */}
                  {slotAltOptions.length > 0 && (
                    <SlotAltOptions options={slotAltOptions} maxVisible={3} />
                  )}
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
