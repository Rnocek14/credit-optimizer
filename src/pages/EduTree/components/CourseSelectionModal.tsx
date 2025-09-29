import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRequirementOptions, type CourseSearchFilters } from '@/hooks/useRequirementOptions';
import { useAddCourseToPlan } from '@/hooks/useUserPlan';
import { Loader2 } from 'lucide-react';

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

  const getTransferFitColor = (fit: string) => {
    switch (fit) {
      case 'excellent':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'good':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
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

        {/* Course Results Table */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : courses && courses.length > 0 ? (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium">Provider</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Course</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Credits</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Cost</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Duration</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Transfer Fit</th>
                  <th className="px-4 py-2 text-left text-sm font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course.course_id} className="border-t hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm">{course.provider_name}</td>
                    <td className="px-4 py-3 text-sm font-medium">{course.title}</td>
                    <td className="px-4 py-3 text-sm">{course.credits}</td>
                    <td className="px-4 py-3 text-sm">${course.cost_usd}</td>
                    <td className="px-4 py-3 text-sm">{course.duration_weeks}w</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full border ${getTransferFitColor(
                          course.transfer_fit
                        )}`}
                      >
                        {course.transfer_fit}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        onClick={() => handleAddToPlan(course.course_id, course.provider_id)}
                        disabled={!planId || addCourseMutation.isPending}
                      >
                        {addCourseMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Add to Plan'
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
