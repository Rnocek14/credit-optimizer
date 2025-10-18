/**
 * CourseSelectionPanel - Marketplace explorer for fulfilling sub-requirements
 * Shows available course options with filtering and selection
 */
import React, { useState, useMemo } from 'react';
import { SubRequirement, SubRequirementStatus, PlanNode } from '../types/v4';
import { useCourseMarketplace, MarketplaceCourse } from '@/hooks/useCourseMarketplace';
import { CreditPolicyEngine, DEFAULT_FL_POLICY } from '../engine/CreditPolicyEngine';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Clock, DollarSign, Award, CheckCircle2, Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CourseSelectionPanelProps {
  subRequirement: SubRequirement | null;
  validation: SubRequirementStatus | null;
  currentPlan: PlanNode[];
  isOpen: boolean;
  onClose: () => void;
  onSelectCourse: (missingCourseId: string, selectedCourse: MarketplaceCourse) => void;
}

export function CourseSelectionPanel({
  subRequirement,
  validation,
  currentPlan,
  isOpen,
  onClose,
  onSelectCourse,
}: CourseSelectionPanelProps) {
  const { courses, loading } = useCourseMarketplace();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'cost' | 'duration' | 'rating'>('rating');
  const policyEngine = useMemo(() => new CreditPolicyEngine(DEFAULT_FL_POLICY, 'ucf'), []);

  // Filter courses by missing requirement and search
  const filteredOptions = useMemo(() => {
    if (!validation || !subRequirement) return [];

    // Get missing course IDs
    const missingCourses = validation.missing;
    if (missingCourses.length === 0) return [];

    // Match courses from marketplace based on:
    // 1. Course title/label similarity
    // 2. Skill tags match
    // 3. Category match
    const options: Array<{ missingCourseId: string; course: MarketplaceCourse }> = [];

    missingCourses.forEach(missingCourseId => {
      const matchingCourses = courses.filter(c => {
        // Search filter
        if (searchQuery && !c.title.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }

        // Match by course ID in title (e.g., "CS 101" matches "CS101")
        if (c.title.includes(missingCourseId.replace(/(\D+)(\d+)/, '$1 $2'))) {
          return true;
        }

        // Match by category if defined
        if (subRequirement.category && c.skill_tags?.includes(subRequirement.category)) {
          return true;
        }

        // Match by skill tags overlap
        if (c.skill_tags && c.skill_tags.length > 0) {
          return true; // Basic match for now
        }

        return false;
      });

      matchingCourses.forEach(course => {
        options.push({ missingCourseId, course });
      });
    });

    // Sort options
    return options.sort((a, b) => {
      if (sortBy === 'cost') return (a.course.cost || 0) - (b.course.cost || 0);
      if (sortBy === 'duration') return (a.course.duration_hours || 0) - (b.course.duration_hours || 0);
      if (sortBy === 'rating') return b.course.validation_score - a.course.validation_score;
      return 0;
    });
  }, [courses, validation, subRequirement, searchQuery, sortBy]);

  if (!subRequirement || !validation) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-[500px] sm:max-w-[500px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {subRequirement.icon && <span className="text-xl">{subRequirement.icon}</span>}
            {subRequirement.label}
          </SheetTitle>
          <SheetDescription>
            {subRequirement.description || 'Select a course provider to fulfill this requirement'}
          </SheetDescription>
        </SheetHeader>

        {/* Filters */}
        <div className="space-y-3 mt-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Validation Score</SelectItem>
                <SelectItem value="cost">Cost (Low to High)</SelectItem>
                <SelectItem value="duration">Duration (Short to Long)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Missing Courses Summary */}
        {validation.missing.length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border">
            <div className="text-sm font-medium mb-2">Still need:</div>
            <div className="flex flex-wrap gap-1">
              {validation.missing.map((courseId) => (
                <Badge key={courseId} variant="secondary" className="text-xs">
                  {courseId}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Course Options List */}
        <ScrollArea className="h-[calc(100vh-400px)] mt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading options...</div>
          ) : filteredOptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No matching courses found. Try adjusting your search.
            </div>
          ) : (
            <div className="space-y-3 pr-4">
              {filteredOptions.map(({ missingCourseId, course }, idx) => {
                // Check policy for this course selection
                const mockCourseNode: PlanNode = {
                  id: `temp-${missingCourseId}`,
                  type: 'course' as any,
                  position: { x: 0, y: 0 },
                  data: {
                    label: missingCourseId,
                    credits: 3,
                    source: 'other',
                    providerId: course.platform,
                    category: subRequirement?.category as any,
                  }
                };
                
                const policyStatus = policyEngine.validateCourseSelection(mockCourseNode, currentPlan);
                const hasErrors = policyStatus.violations.some(v => v.severity === 'error');
                const hasWarnings = policyStatus.violations.some(v => v.severity === 'warning');

                return (
                <Card key={`${missingCourseId}-${course.id}-${idx}`} className="p-3 hover:shadow-md transition-shadow">
                  {/* Policy Warnings/Errors Banner */}
                  {policyStatus.violations.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {policyStatus.violations.filter(v => v.severity === 'error').map((violation, vi) => (
                        <div key={vi} className="px-2 py-1 rounded bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                          {violation.message}
                        </div>
                      ))}
                      {policyStatus.violations.filter(v => v.severity === 'warning').map((violation, vi) => (
                        <div key={vi} className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400">
                          {violation.message}
                        </div>
                      ))}
                      {policyStatus.violations.filter(v => v.severity === 'info').map((violation, vi) => (
                        <div key={vi} className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400">
                          {violation.message}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Course Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="font-medium text-sm">{course.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        For: <Badge variant="outline" className="text-[10px]">{missingCourseId}</Badge>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {course.platform}
                    </Badge>
                  </div>

                  {/* Course Metadata */}
                  <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                    {course.cost !== undefined && (
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        <span>${course.cost}</span>
                      </div>
                    )}
                    {course.duration_hours && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{course.duration_hours}h</span>
                      </div>
                    )}
                    {course.difficulty && (
                      <Badge variant="secondary" className="text-[10px]">
                        {course.difficulty}
                      </Badge>
                    )}
                  </div>

                  {/* Validation & Endorsement */}
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex-1">
                      <div className="text-[10px] text-muted-foreground mb-1">Validation Score</div>
                      <div className="flex items-center gap-1">
                        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500"
                            style={{ width: `${course.validation_score}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{course.validation_score}%</span>
                      </div>
                    </div>
                    {course.mentor_endorsed && (
                      <div title="Mentor Endorsed">
                        <Award className="h-4 w-4 text-amber-500" />
                      </div>
                    )}
                  </div>

                  {/* Skill Tags */}
                  {course.skill_tags && course.skill_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {course.skill_tags.slice(0, 4).map((tag, i) => (
                        <Badge key={i} variant="outline" className="text-[9px]">
                          {tag}
                        </Badge>
                      ))}
                      {course.skill_tags.length > 4 && (
                        <Badge variant="outline" className="text-[9px]">
                          +{course.skill_tags.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Select Button */}
                  <Button
                    size="sm"
                    onClick={() => onSelectCourse(missingCourseId, course)}
                    className="w-full"
                    disabled={hasErrors}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    {hasErrors ? 'Cannot Select' : `Select for ${missingCourseId}`}
                  </Button>
                </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
