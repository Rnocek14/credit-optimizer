import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, GraduationCap, DollarSign, Clock, Globe } from 'lucide-react';
import type { CourseOption } from '@/hooks/useRequirementOptions';

interface MarketplaceCourseCardProps {
  course: CourseOption;
  requirementTitle: string;
  onAddToPlan: (courseId: string, providerId: string) => void;
  isAdding?: boolean;
  disabled?: boolean;
}

export function MarketplaceCourseCard({
  course,
  requirementTitle,
  onAddToPlan,
  isAdding = false,
  disabled = false,
}: MarketplaceCourseCardProps) {
  const getConfidenceBadgeVariant = (fit: string) => {
    switch (fit) {
      case 'excellent':
        return 'bg-success/10 text-success border-success/20';
      case 'good':
        return 'bg-info/10 text-info border-info/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getModalityIcon = (modality: string) => {
    return <Globe className="h-3 w-3" />;
  };

  return (
    <div className="group relative rounded-lg border border-border bg-card hover:border-primary/50 hover:shadow-md transition-all p-4">
      {/* Header: Title + Provider */}
      <div className="space-y-2 mb-3">
        <h4 className="font-semibold text-base leading-tight line-clamp-2">
          {course.title}
        </h4>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <GraduationCap className="h-3.5 w-3.5" />
          <span>{course.provider_name}</span>
        </div>
      </div>

      {/* Fulfills Badge */}
      <div className="mb-3">
        <Badge variant="secondary" className="text-xs">
          Satisfies: {requirementTitle} ({course.credits} cr)
        </Badge>
      </div>

      {/* Core Info Grid */}
      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
        {/* Price */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <DollarSign className="h-3.5 w-3.5" />
          <span className="font-medium text-foreground">${course.cost_usd}</span>
        </div>

        {/* Duration */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{course.duration_weeks} weeks</span>
        </div>
      </div>

      {/* Modality & Confidence */}
      <div className="flex items-center gap-2 mb-4">
        <Badge variant="outline" className="text-xs capitalize">
          {getModalityIcon(course.modality)}
          <span className="ml-1">{course.modality.replace('_', ' ')}</span>
        </Badge>
        <Badge 
          variant="outline" 
          className={`text-xs capitalize ${getConfidenceBadgeVariant(course.transfer_fit)}`}
        >
          {course.transfer_fit} fit
        </Badge>
      </div>

      {/* Action Button */}
      <Button
        onClick={() => onAddToPlan(course.course_id, course.provider_id)}
        disabled={disabled || isAdding}
        className="w-full"
        size="sm"
      >
        {isAdding ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Adding...
          </>
        ) : (
          'Add to Plan'
        )}
      </Button>
    </div>
  );
}
