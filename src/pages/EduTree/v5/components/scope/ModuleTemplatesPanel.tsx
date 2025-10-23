import { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TemplateCard } from '../TemplateCard';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlanBasket } from '../../state/usePlanBasket';
import { rankTemplates } from '../../engine/templateValidator';
import { getTemplatesForModule } from '../../data/templates';
import type { ModuleData } from '../../types/v5';
import type { ModuleTemplate } from '../../types/templates';
import { trackTelemetryEvent } from '@/utils/telemetry';

interface ModuleTemplatesPanelProps {
  module: ModuleData;
  allModules: ModuleData[];
  onAddTemplate: (template: ModuleTemplate) => void;
}

export function ModuleTemplatesPanel({ module, allModules, onAddTemplate }: ModuleTemplatesPanelProps) {
  const basket = usePlanBasket(s => s.items);
  const constraints = usePlanBasket(s => s.constraints);
  
  // Get all marketplace options for validation
  const allOptions = useMemo(() => 
    allModules.flatMap(m => m.marketplaceOptions ?? []),
    [allModules]
  );
  
  // Fetch and rank templates reactively
  const { data: rankedTemplates, isLoading } = useQuery({
    queryKey: ['module-templates-ranked', module.id, basket, constraints],
    queryFn: async () => {
      const templates = getTemplatesForModule(module.id);
      if (templates.length === 0) return [];
      
      return await rankTemplates(templates, basket, constraints, allOptions);
    },
    staleTime: 5000, // 5 seconds
    enabled: !!module.id
  });
  
  // Track template views
  useEffect(() => {
    if (rankedTemplates && rankedTemplates.length > 0) {
      void trackTelemetryEvent({
        task: 'templates_viewed',
        scope: 'module',
        complexity: {
          moduleId: module.id,
          templateCount: rankedTemplates.length,
          validCount: rankedTemplates.filter(t => t.validation.isValid).length,
          hasAnchorSchool: !!constraints.target_school
        }
      });
    }
  }, [rankedTemplates, module.id, constraints.target_school]);
  
  // Track template add with telemetry
  const handleAddTemplate = (template: ModuleTemplate) => {
    void trackTelemetryEvent({
      task: 'template_added',
      scope: 'module',
      complexity: {
        templateId: template.id,
        badge: template.badge,
        costDelta: template.est.costUsd,
        weeksDelta: template.est.weeks,
        criDelta: template.est.cri
      }
    });
    
    onAddTemplate(template);
  };
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  
  if (!rankedTemplates || rankedTemplates.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No templates available for this module yet.</p>
        <p className="text-xs mt-2">Use the "Courses" tab to browse individual options.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium">Pre-Built Paths</h3>
        {constraints.target_school && (
          <span className="text-xs text-muted-foreground">
            Validated for {constraints.target_school}
          </span>
        )}
      </div>
      
      {rankedTemplates.map(({ template, validation }) => (
        <TemplateCard
          key={template.id}
          template={template}
          validation={validation}
          onAdd={() => handleAddTemplate(template)}
          isDraggable={true}
        />
      ))}
      
      {!constraints.target_school && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 mt-4">
          💡 <strong>Tip:</strong> Set a graduation school in Constraints to verify transfer acceptance.
        </div>
      )}
    </div>
  );
}
