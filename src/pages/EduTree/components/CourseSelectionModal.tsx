import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useRequirementOptions, type CourseSearchFilters } from '@/hooks/useRequirementOptions';
import { useAddCourseToPlan } from '@/hooks/useUserPlan';
import { Loader2, X } from 'lucide-react';
import { MarketplaceCourseCard } from './MarketplaceCourseCard';

interface CourseSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirementId: string;
  requirementTitle: string;
  planId?: string;
}

export function CourseSelectionModal({
  open,
  onOpenChange,
  requirementId,
  requirementTitle,
  planId,
}: CourseSelectionModalProps) {
  const [filters, setFilters] = useState<CourseSearchFilters>({});
  const [compareSet, setCompareSet] = useState<Set<string>>(new Set());
  
  const { data: courses, isLoading } = useRequirementOptions(requirementId, filters, { 
    enabled: open && !!requirementId 
  });
  const addCourseMutation = useAddCourseToPlan();

  // Calculate route summary
  const routeSummary = useMemo(() => {
    if (!courses || courses.length === 0) return null;
    
    // For now, show aggregate stats from all courses
    const totalCourses = courses.length;
    const avgCost = Math.round(courses.reduce((sum, c) => sum + c.cost_usd, 0) / totalCourses);
    const avgDuration = Math.round(courses.reduce((sum, c) => sum + c.duration_weeks, 0) / totalCourses);
    const typicalCredits = courses[0]?.credits || 3;
    
    return {
      credits: typicalCredits,
      avgCost,
      avgDuration,
      totalOptions: totalCourses,
    };
  }, [courses]);

  const handleAddToPlan = (courseId: string, providerId: string) => {
    if (!planId) return;
    
    addCourseMutation.mutate(
      {
        planId,
        requirementId,
        courseId,
        providerId,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const handleCompareToggle = (courseId: string, selected: boolean) => {
    setCompareSet(prev => {
      const newSet = new Set(prev);
      if (selected && newSet.size < 3) {
        newSet.add(courseId);
      } else {
        newSet.delete(courseId);
      }
      return newSet;
    });
  };

  const clearComparison = () => setCompareSet(new Set());


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Find a Course: {requirementTitle}</DialogTitle>
        </DialogHeader>

        {/* Filters - Enhanced */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Max Cost</label>
            <Input
              type="number"
              placeholder="e.g. 1000"
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  maxCost: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Max Duration</label>
            <Select
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  maxDuration: value ? Number(value) : undefined,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">≤ 8 weeks</SelectItem>
                <SelectItem value="12">≤ 12 weeks</SelectItem>
                <SelectItem value="16">≤ 16 weeks</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Confidence</label>
            <Select
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  minConfidence: value || undefined,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="excellent">Excellent only</SelectItem>
                <SelectItem value="good">Good+</SelectItem>
                <SelectItem value="fair">Fair+</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-1.5 block">Provider Type</label>
            <Select
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  providerTypes: value ? [value] : undefined,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="university">University</SelectItem>
                <SelectItem value="mooc">MOOC</SelectItem>
                <SelectItem value="bootcamp">Bootcamp</SelectItem>
                <SelectItem value="testing_center">Testing Center</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Modality</label>
            <Select
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  modality: value ? [value] : undefined,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="in_person">In Person</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Comparison Bar */}
        {compareSet.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <span className="text-sm font-medium">
              {compareSet.size} course{compareSet.size !== 1 ? 's' : ''} selected for comparison
            </span>
            <Button variant="outline" size="sm" onClick={clearComparison}>
              <X className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          </div>
        )}

        {/* Course Results Grid - Scrollable */}
        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : courses && courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
              {courses.map((course) => (
                <MarketplaceCourseCard
                  key={course.course_id}
                  course={course}
                  requirementTitle={requirementTitle}
                  onAddToPlan={handleAddToPlan}
                  onCompareToggle={handleCompareToggle}
                  isAdding={addCourseMutation.isPending}
                  disabled={!planId}
                  isComparing={compareSet.has(course.course_id)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 space-y-3">
              <p className="text-base font-medium text-foreground">
                No courses found matching your filters
              </p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Try widening your search by adjusting the cost, duration, or confidence filters. 
                Or <button className="text-primary hover:underline">request a custom evaluation</button> for this requirement.
              </p>
            </div>
          )}
        </div>

        {/* Route Summary Bar - Sticky */}
        {routeSummary && (
          <div className="border-t border-border bg-muted/30 -mx-6 -mb-6 px-6 py-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-muted-foreground">Credits: </span>
                  <span className="font-semibold text-foreground">{routeSummary.credits} cr</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg Cost: </span>
                  <span className="font-semibold text-foreground">${routeSummary.avgCost}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Avg Duration: </span>
                  <span className="font-semibold text-foreground">{routeSummary.avgDuration} weeks</span>
                </div>
              </div>
              <div className="text-muted-foreground">
                {routeSummary.totalOptions} option{routeSummary.totalOptions !== 1 ? 's' : ''} available
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
