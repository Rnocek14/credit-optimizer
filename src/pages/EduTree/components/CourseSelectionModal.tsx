import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRequirementOptions, type CourseSearchFilters } from '@/hooks/useRequirementOptions';
import { useAddCourseToPlan } from '@/hooks/useUserPlan';
import { Loader2 } from 'lucide-react';
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
  const { data: courses, isLoading } = useRequirementOptions(requirementId, filters, { 
    enabled: open && !!requirementId 
  });
  const addCourseMutation = useAddCourseToPlan();

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


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Find a Course: {requirementTitle}</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Max Cost</label>
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
            <label className="text-sm font-medium mb-2 block">Provider Type</label>
            <Select
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  providerTypes: value ? [value] : undefined,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All providers" />
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
            <label className="text-sm font-medium mb-2 block">Modality</label>
            <Select
              onValueChange={(value) =>
                setFilters((prev) => ({
                  ...prev,
                  modality: value ? [value] : undefined,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All modalities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="in_person">In Person</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Course Results Grid */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : courses && courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <MarketplaceCourseCard
                key={course.course_id}
                course={course}
                requirementTitle={requirementTitle}
                onAddToPlan={handleAddToPlan}
                isAdding={addCourseMutation.isPending}
                disabled={!planId}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No courses found matching your filters
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
