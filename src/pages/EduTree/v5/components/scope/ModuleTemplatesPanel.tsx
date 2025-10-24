import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TemplateCard } from '../TemplateCard';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlanBasket } from '../../state/usePlanBasket';
import { rankTemplates } from '../../engine/templateValidator';
import { getTemplatesForModule } from '../../data/templates';
import type { ModuleData } from '../../types/v5';
import type { ModuleTemplate } from '../../types/templates';
import { trackTelemetryEvent } from '@/utils/telemetry';
import { useUserEvidence } from '@/pages/EduTree/hooks/useUserEvidence';
import { useApplyTemplate } from '../../hooks/useApplyTemplate';
import { previewTemplate } from '../../engine/previewTemplate';
import { TemplateDiffStrip } from '../TemplateDiffStrip';
import type { TemplatePreview } from '../../engine/previewTemplate';

interface ModuleTemplatesPanelProps {
  module: ModuleData;
  allModules: ModuleData[];
  onAddTemplate: (template: ModuleTemplate) => void;
}

export function ModuleTemplatesPanel({ module, allModules, onAddTemplate }: ModuleTemplatesPanelProps) {
  const basket = usePlanBasket(s => s.items);
  const constraints = usePlanBasket(s => s.constraints);
  const evidence = useUserEvidence({ enabled: true });
  const { applyTemplate: applyTemplateFn } = useApplyTemplate();
  
  const [previewingTemplate, setPreviewingTemplate] = useState<ModuleTemplate | null>(null);
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const [keepPinned, setKeepPinned] = useState(false);
  
  const allOptions = useMemo(() => allModules.flatMap(m => m.marketplaceOptions ?? []), [allModules]);
  const basketKey = useMemo(() => basket.map(b => b.courseId).sort().join('|'), [basket]);
  
  const { data: rankedTemplates, isLoading } = useQuery({
    queryKey: ['module-templates-ranked', module.id, basketKey, constraints, evidence.raw?.completed?.length ?? 0],
    queryFn: async () => {
      const templates = getTemplatesForModule(module.id);
      return await rankTemplates(templates, basket, constraints, allOptions, evidence.raw);
    },
    staleTime: 5000,
    enabled: !!module.id
  });

  const handlePreviewTemplate = (template: ModuleTemplate) => {
    const previewResult = previewTemplate({ template, moduleId: module.id, currentBasket: basket, constraints, allOptions, keepPinned: false });
    setPreviewingTemplate(template);
    setPreview(previewResult);
    setKeepPinned(false); // Reset toggle when previewing new template
    void trackTelemetryEvent({ task: 'template_preview_shown', scope: 'module', complexity: { templateId: template.id }});
  };

  // Live preview update when keepPinned changes
  useEffect(() => {
    if (previewingTemplate) {
      const updated = previewTemplate({
        template: previewingTemplate,
        moduleId: module.id,
        currentBasket: basket,
        constraints,
        allOptions,
        keepPinned,
      });
      setPreview(updated);
    }
  }, [keepPinned, previewingTemplate, basket, constraints, allOptions, module.id]);

  const handleApplyPreview = (keepPinned: boolean) => {
    if (!previewingTemplate) return;
    applyTemplateFn(previewingTemplate, allOptions, { keepPinned });
    
    void trackTelemetryEvent({ 
      task: 'template_preview_confirmed', 
      scope: 'module', 
      complexity: { 
        templateId: previewingTemplate.id, 
        keepPinned,
        costDelta: preview?.costDelta,
        weeksDelta: preview?.weeksDelta,
      }
    });
    
    setPreviewingTemplate(null);
    setPreview(null);
    onAddTemplate(previewingTemplate);
  };

  const handleCancelPreview = () => {
    setPreviewingTemplate(null);
    setPreview(null);
    setKeepPinned(false);
    void trackTelemetryEvent({ task: 'template_preview_cancelled', scope: 'module', complexity: { templateId: previewingTemplate?.id }});
  };

  if (isLoading) return <Skeleton className="h-32" />;
  if (!rankedTemplates?.length) return <div>No templates</div>;

  return (
    <div className="space-y-4">
      {preview && previewingTemplate && (
        <TemplateDiffStrip 
          preview={preview} 
          templateLabel={previewingTemplate.label} 
          keepPinned={keepPinned}
          onKeepPinnedChange={setKeepPinned}
          onApply={() => handleApplyPreview(keepPinned)} 
          onCancel={handleCancelPreview} 
        />
      )}
      <div className="template-gallery">
        {rankedTemplates.map(rt => <TemplateCard key={rt.template.id} template={rt.template} validation={rt.validation} onAdd={() => handlePreviewTemplate(rt.template)} />)}
      </div>
    </div>
  );
}
