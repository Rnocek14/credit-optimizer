/**
 * ModuleDetailPanel - Comprehensive side panel for managing module courses
 * Replaces CourseSelectionPanel with integrated marketplace
 */
import React, { useState, useMemo } from 'react';
import { HierarchicalRequirement } from '../../types/requirementsHierarchy';
import { PlanNode, SubRequirementStatus } from '../../types/v4';
import { MarketplaceCourse, useCourseMarketplace } from '@/hooks/useCourseMarketplace';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertCircle, Info } from 'lucide-react';

interface ModuleDetailPanelProps {
  module: HierarchicalRequirement | null;
  sequences: HierarchicalRequirement[]; // Child sequences (for bucket-level)
  currentCourses: PlanNode[];
  validation: SubRequirementStatus | undefined;
  isOpen: boolean;
  onClose: () => void;
  onAddCourse: (moduleId: string, course: MarketplaceCourse) => void;
  onRemoveCourse: (courseId: string) => void;
  onReplaceCourse: (courseId: string, newCourse: MarketplaceCourse) => void;
}

export function ModuleDetailPanel({
  module,
  sequences,
  currentCourses,
  validation,
  isOpen,
  onClose,
  onAddCourse,
  onRemoveCourse,
  onReplaceCourse,
}: ModuleDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'marketplace'>('overview');
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);

  if (!module || !validation) return null;

  const isBucket = module.level === 'bucket';
  const progressPercent = validation.creditsNeeded > 0
    ? (validation.creditsEarned / validation.creditsNeeded) * 100
    : validation.completed.length > 0 ? 100 : 0;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[600px] sm:max-w-[600px] p-0">
        {/* Header (Fixed) */}
        <div className="sticky top-0 bg-background border-b p-6 z-10">
          <div className="flex items-start gap-4">
            {module.icon && <span className="text-4xl">{module.icon}</span>}
            <div className="flex-1">
              <SheetTitle className="text-2xl">{module.label}</SheetTitle>
              {module.description && (
                <SheetDescription className="mt-1">{module.description}</SheetDescription>
              )}
            </div>
          </div>

          {/* Progress Summary */}
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Progress</span>
              <span className="text-muted-foreground">
                {validation.creditsEarned} / {validation.creditsNeeded} credits
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">📋 Current Courses</TabsTrigger>
              <TabsTrigger value="marketplace">🛒 Browse Marketplace</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content (Scrollable) */}
        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="p-6 space-y-6">
            {activeTab === 'overview' && (
              <>
                {/* For bucket-level modules, group by sequence */}
                {isBucket && sequences.length > 0 ? (
                  sequences.map(seq => {
                    const seqCourses = currentCourses.filter(c => c.data.moduleId === seq.id);
                    
                    return (
                      <div key={seq.id} className="space-y-3">
                        <div className="flex items-center gap-2">
                          {seq.icon && <span className="text-2xl">{seq.icon}</span>}
                          <h3 className="font-semibold text-lg">{seq.label}</h3>
                          <Badge variant="outline">
                            {seqCourses.length} / {seq.courseIds?.length || 0}
                          </Badge>
                        </div>
                        <CourseList
                          courses={seqCourses}
                          onRemove={onRemoveCourse}
                          onReplace={(id) => {
                            setReplaceTargetId(id);
                            setActiveTab('marketplace');
                          }}
                        />
                      </div>
                    );
                  })
                ) : (
                  // Standalone sequence: show all courses
                  <CourseList
                    courses={currentCourses}
                    onRemove={onRemoveCourse}
                    onReplace={(id) => {
                      setReplaceTargetId(id);
                      setActiveTab('marketplace');
                    }}
                  />
                )}

                {/* Missing Courses Alert */}
                {validation.missing.length > 0 && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Still Need</AlertTitle>
                    <AlertDescription>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {validation.missing.map(courseId => (
                          <Badge key={courseId} variant="destructive">
                            {courseId}
                          </Badge>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </>
            )}

            {activeTab === 'marketplace' && (
              <MarketplaceBrowser
                moduleId={module.id}
                missingCourses={validation.missing}
                onAddCourse={(course) => {
                  if (replaceTargetId) {
                    onReplaceCourse(replaceTargetId, course);
                    setReplaceTargetId(null);
                  } else {
                    onAddCourse(module.id, course);
                  }
                  setActiveTab('overview');
                }}
                replaceMode={!!replaceTargetId}
              />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// Sub-component: Course List
function CourseList({ courses, onRemove, onReplace }: {
  courses: PlanNode[];
  onRemove: (id: string) => void;
  onReplace: (id: string) => void;
}) {
  if (courses.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No courses added yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {courses.map(course => (
        <Card key={course.id} className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="font-medium">{course.data.label}</div>
              <div className="text-sm text-muted-foreground">
                {course.data.credits} credits • {course.data.status}
              </div>
              {course.data.providerId && (
                <Badge variant="outline" className="text-xs mt-1">
                  🛒 {course.data.providerId}
                </Badge>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => onReplace(course.id)}>
                Replace
              </Button>
              <Button variant="ghost" size="sm" onClick={() => onRemove(course.id)}>
                Remove
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

// Sub-component: Marketplace Browser
function MarketplaceBrowser({ moduleId, missingCourses, onAddCourse, replaceMode }: {
  moduleId: string;
  missingCourses: string[];
  onAddCourse: (course: MarketplaceCourse) => void;
  replaceMode: boolean;
}) {
  const { courses, loading } = useCourseMarketplace();
  const [search, setSearch] = useState('');

  // Filter marketplace courses by module context
  const filtered = useMemo(() => {
    return courses.filter(c => {
      if (search && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
      // Match by missing course IDs or skill tags
      return missingCourses.some(missing => c.title.includes(missing)) ||
             c.skill_tags?.some(tag => moduleId.toLowerCase().includes(tag.toLowerCase()));
    });
  }, [courses, search, missingCourses, moduleId]);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search marketplace..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {replaceMode && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Replace Mode</AlertTitle>
          <AlertDescription>Select a course to replace the selected one.</AlertDescription>
        </Alert>
      )}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading courses...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">No courses found</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(course => (
            <Card key={course.id} className="p-3 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="font-medium">{course.title}</div>
                  <div className="text-sm text-muted-foreground">{course.platform}</div>
                  <Badge variant="outline" className="text-xs mt-1">
                    {course.validation_score}% Match
                  </Badge>
                </div>
                <Button size="sm" onClick={() => onAddCourse(course)}>
                  {replaceMode ? 'Replace' : 'Add'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
