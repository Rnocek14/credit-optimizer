import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, GraduationCap, DollarSign, Clock, Globe, ChevronDown, ChevronUp, Eye, Scale } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { CourseOption } from '@/hooks/useRequirementOptions';

interface MarketplaceCourseCardProps {
  course: CourseOption;
  requirementTitle: string;
  onAddToPlan: (courseId: string, providerId: string) => void;
  onCompareToggle?: (courseId: string, selected: boolean) => void;
  isAdding?: boolean;
  disabled?: boolean;
  isComparing?: boolean;
}

export function MarketplaceCourseCard({
  course,
  requirementTitle,
  onAddToPlan,
  onCompareToggle,
  isAdding = false,
  disabled = false,
  isComparing = false,
}: MarketplaceCourseCardProps) {
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);

  const getConfidenceBadgeVariant = (fit: string) => {
    switch (fit) {
      case 'excellent':
        return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
      case 'good':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
      case 'fair':
        return 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getModalityIcon = (modality: string) => {
    return <Globe className="h-3 w-3" />;
  };

  return (
    <Collapsible open={isQuickViewOpen} onOpenChange={setIsQuickViewOpen}>
      <div className={`group relative rounded-lg border bg-card transition-all p-4 ${
        isComparing ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50 hover:shadow-md'
      }`}>
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

        {/* Quick View Content */}
        <CollapsibleContent className="mb-4 space-y-3 pt-3 border-t border-border">
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase">Transfer Confidence</h5>
            <p className="text-sm">
              This course has <span className="font-medium text-foreground">{course.transfer_fit}</span> transfer evidence.
              {course.transfer_fit === 'excellent' && ' Backed by ACE/NCCRS credit recommendation.'}
              {course.transfer_fit === 'good' && ' Has documented transfer articulation agreements.'}
              {course.transfer_fit === 'fair' && ' Transfer based on historical acceptance patterns.'}
            </p>
          </div>
          
          <div className="space-y-2">
            <h5 className="text-xs font-semibold text-muted-foreground uppercase">Course Details</h5>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Credits:</span>
                <span className="font-medium">{course.credits}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Format:</span>
                <span className="font-medium capitalize">{course.modality.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">{course.duration_weeks} weeks</span>
              </div>
            </div>
          </div>
        </CollapsibleContent>

        {/* Action Buttons */}
        <div className="space-y-2">
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
          
          <div className="flex gap-2">
            <CollapsibleTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
              >
                {isQuickViewOpen ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5 mr-1" />
                    Less
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5 mr-1" />
                    Quick View
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
            
            {onCompareToggle && (
              <Button
                variant={isComparing ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => onCompareToggle(course.course_id, !isComparing)}
              >
                <Scale className="h-3.5 w-3.5 mr-1" />
                {isComparing ? 'Selected' : 'Compare'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Collapsible>
  );
}
