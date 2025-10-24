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
import { useUserEvidence } from '@/pages/EduTree/hooks/useUserEvidence'; // Phase 1c
import { useApplyTemplate } from '../../hooks/useApplyTemplate';

interface ModuleTemplatesPanelProps {
  module: ModuleData;
  allModules: ModuleData[];
  onAddTemplate: (template: ModuleTemplate) => void;
}

export function ModuleTemplatesPanel({ module, allModules, onAddTemplate }: ModuleTemplatesPanelProps) {
  const basket = usePlanBasket(s => s.items);
  const constraints = usePlanBasket(s => s.constraints);
  const evidence = useUserEvidence({ enabled: true }); // Phase 1c: evidence integration (opt-in)
  
  // Get all marketplace options for validation
  const allOptions = useMemo(() => 
    allModules.flatMap(m => m.marketplaceOptions ?? []),
    [allModules]
  );
  
  // Phase 1: Throttle re-ranking with basketKey memo
  const basketKey = useMemo(
    () => basket.map(b => b.courseId).sort().join('|'),
    [basket]
  );
  
  // Fetch and rank templates reactively
  const { data: rankedTemplates, isLoading } = useQuery({
    queryKey: [
      'module-templates-ranked', 
      module.id, 
      basketKey, // Phase 1: throttle via memo
      constraints,
      evidence.raw?.completed?.length ?? 0 // Phase 1c: evidence in key
    ],
    queryFn: async () => {
      console.log('[ModuleTemplatesPanel] 🔍 Query running for module:', {
        moduleId: module.id,
        moduleLabel: module.label,
        basketCount: basket.length
      });
      
      const templates = getTemplatesForModule(module.id);
      console.log('[ModuleTemplatesPanel] 📦 Templates fetched:', templates.length);
      
      if (templates.length === 0) {
        console.log('[ModuleTemplatesPanel] ⚠️ No templates found, returning empty array');
        return [];
      }
      
      const ranked = await rankTemplates(templates, basket, constraints, allOptions, evidence.raw);
      console.log('[ModuleTemplatesPanel] 📊 Ranked templates:', ranked.length);
      
      return ranked;
    },
    staleTime: 5000, // 5 seconds
    enabled: !!module.id
  });
  
  // Track template views (Phase 1c: add evidence telemetry)
  useEffect(() => {
    if (rankedTemplates && rankedTemplates.length > 0) {
      try {
        void trackTelemetryEvent({
          task: 'template_tab_opened',
          scope: 'module',
          complexity: {
            moduleId: module.id,
            templateCount: rankedTemplates.length,
            validCount: rankedTemplates.filter(t => t.validation.isValid).length,
            hasAnchorSchool: !!constraints.target_school,
            hasEvidence: !!evidence.raw?.completed?.length
          }
        });
      } catch (telemetryError) {
        console.warn('[Telemetry] Failed to track template view:', telemetryError);
      }
    }
  }, [rankedTemplates, module.id, constraints.target_school, evidence.raw]);
  
  const { applyTemplate } = useApplyTemplate();
  
  // Track template add with telemetry
  const handleAddTemplate = (template: ModuleTemplate) => {
    // Use new apply engine with automatic prereqs, deduplication, undo
    applyTemplate(template, allOptions);
    
    // Call parent callback (for UI state like tab switching)
    onAddTemplate(template);
  };
  
  if (isLoading) {
    console.log('[ModuleTemplatesPanel] ⏳ Loading templates...');
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  
  if (!rankedTemplates || rankedTemplates.length === 0) {
    console.log('[ModuleTemplatesPanel] ❌ No templates to display:', {
      rankedTemplates: rankedTemplates?.length ?? 'null',
      moduleId: module.id
    });
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No templates available for this module yet.</p>
        <p className="text-xs mt-2">Use the "Courses" tab to browse individual options.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Pre-Built Paths</h3>
        {constraints.target_school && (
          <span className="text-xs text-muted-foreground">
            Validated for {constraints.target_school}
          </span>
        )}
      </div>
      
      <div className="template-gallery">
        {rankedTemplates.map(({ template, validation }) => (
          <TemplateCard
            key={template.id}
            template={template}
            validation={validation}
            onAdd={() => handleAddTemplate(template)}
            isDraggable={true}
          />
        ))}
      </div>
      
      {!constraints.target_school && (
        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3 mt-4">
          💡 <strong>Tip:</strong> Set a graduation school in Constraints to verify transfer acceptance.
        </div>
      )}
    </div>
  );
}
