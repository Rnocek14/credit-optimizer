import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CheckCircle, AlertCircle, AlertTriangle, Info, GripVertical } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import type { ModuleTemplate, TemplateValidation } from '../types/templates';
import { getTemplateCourses } from '../utils/templateHelpers';

interface TemplateCardProps {
  template: ModuleTemplate;
  validation: TemplateValidation;
  onAdd: () => void;
  isDraggable?: boolean;
}

export function TemplateCard({ template, validation, onAdd, isDraggable = true }: TemplateCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `template-${template.id}`,
    data: {
      type: 'template',
      template,
      validation
    },
    disabled: !isDraggable || !validation.isValid
  });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;
  
  // Badge color mapping
  const badgeColor = useMemo(() => {
    switch (template.badge) {
      case 'Cheapest': return 'bg-green-500 hover:bg-green-600';
      case 'Fastest': return 'bg-blue-500 hover:bg-blue-600';
      case 'Balanced': return 'bg-purple-500 hover:bg-purple-600';
      case 'Prestige': return 'bg-amber-500 hover:bg-amber-600';
      default: return 'bg-muted';
    }
  }, [template.badge]);
  
  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`template-card flex flex-col h-full min-h-[200px] p-4 transition-all ${
        validation.isValid ? "bg-card hover:bg-accent/50 hover:shadow-md" : "bg-muted/50 opacity-75"
      }`}
    >
      <div className="flex items-start gap-3 flex-1">
        {/* Drag Handle */}
        {isDraggable && validation.isValid && (
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-1">
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-medium text-sm truncate">{template.label}</h4>
            
            {/* Badge */}
            {template.badge && (
              <Badge className={`${badgeColor} text-white text-xs`}>
                {template.badge}
              </Badge>
            )}
            
            {/* Validity Icon */}
            {validation.isValid ? (
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            )}
          </div>
          
          {/* Summary - grows to fill space */}
          <p className="text-sm text-muted-foreground mb-3 flex-grow">{template.summary}</p>
          
          {/* Canonical Fit Badge */}
          {validation.canonicalFit.complete ? (
            <div className="flex items-center gap-1 mb-2">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-700 dark:text-green-400">
                Fulfills: {validation.canonicalFit.satisfied.join(', ')}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 mb-2">
              <AlertTriangle className="h-3 w-3 text-yellow-600" />
              <span className="text-xs text-yellow-700 dark:text-yellow-400">
                May not satisfy: {validation.canonicalFit.missing.join(', ')}
              </span>
            </div>
          )}
          
          {/* Transfer Status Badge (if anchor school set) */}
          {validation.transferStatus && (
            <div className="mb-2">
              {validation.transferStatus.accepted ? (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-700 dark:text-green-400">
                    Transfers to {template.targetSchool || 'target school'}
                  </span>
                </div>
              ) : validation.transferStatus.electiveOnly ? (
                <div className="flex items-center gap-1">
                  <Info className="h-3 w-3 text-blue-600" />
                  <span className="text-xs text-blue-700 dark:text-blue-400">
                    Elective credit only
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-destructive" />
                  <span className="text-xs text-destructive">
                    Not accepted by {template.targetSchool || 'target school'}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Impact Deltas - Phase 1: improved formatting */}
          {validation.isValid && (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-3">
              <span>+${validation.impact.costDelta.toLocaleString()}</span>
              <span>·</span>
              <span>+{validation.impact.weeksDelta}w</span>
              {validation.impact.aceDelta > 0 && (
                <>
                  <span>·</span>
                  <span className="text-blue-600">+{validation.impact.aceDelta} ACE</span>
                </>
              )}
              <span>·</span>
              <span>CRI {validation.impact.criDelta}</span>
            </div>
          )}
          
          {/* Phase 1c: Empty state message when all courses satisfied */}
          {getTemplateCourses(template).length === 0 && (
            <div className="mt-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
              ✓ All courses in this template are already satisfied by your completed work or current plan.
            </div>
          )}
          
          {/* Blocked Reasons */}
          {validation.blockedReasons.length > 0 && (
            <div className="space-y-1 mb-3">
              {validation.blockedReasons.map((reason, i) => (
                <div key={i} className="flex items-start gap-1">
                  <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-destructive">{reason}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Warnings (Collapsible) */}
          {validation.warnings.length > 0 && validation.isValid && (
            <details className="text-xs text-yellow-700 dark:text-yellow-400 mb-3">
              <summary className="cursor-pointer">
                ⚠️ {validation.warnings.length} warning(s)
              </summary>
              <ul className="list-disc list-inside mt-1 space-y-1">
                {validation.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>
      
      {/* Action Button - pinned to bottom */}
      <div className="mt-auto pt-3 border-t">
        <Button
          size="sm"
          onClick={onAdd}
          disabled={!validation.isValid}
          aria-disabled={!validation.isValid}
          role="button"
          className="w-full"
        >
          {validation.isValid ? 'Add' : 'Blocked'}
        </Button>
      </div>
    </Card>
  );
}
