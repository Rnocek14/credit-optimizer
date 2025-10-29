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
import { X } from 'lucide-react';
import { FEATURE_FLAGS } from '../../config/featureFlags';

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
  const [isApplying, setIsApplying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
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
    const previewResult = previewTemplate({ 
      template, 
      moduleId: module.id, 
      currentBasket: basket, 
      constraints, 
      allOptions, 
      keepPinned: false,
      moduleCreditsRequired: module.creditsRequired
    });
    setPreviewingTemplate(template);
    setPreview(previewResult);
    setKeepPinned(false); // Reset toggle when previewing new template
    void trackTelemetryEvent({ task: 'template_preview_shown', scope: 'module', complexity: { templateId: template.id }});
  };

  // Debounce search query (200ms)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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
        moduleCreditsRequired: module.creditsRequired
      });
      setPreview(updated);
    }
  }, [keepPinned, previewingTemplate, basket, constraints, allOptions, module.id, module.creditsRequired]);

  // Filter templates by search query
  const filteredTemplates = useMemo(() => {
    if (!rankedTemplates) return [];
    if (!debouncedSearch.trim()) return rankedTemplates;
    
    const query = debouncedSearch.toLowerCase();
    return rankedTemplates.filter(rt => 
      rt.template.label.toLowerCase().includes(query) ||
      rt.template.summary?.toLowerCase().includes(query)
    );
  }, [rankedTemplates, debouncedSearch]);

  const handleApplyPreview = async (keepPinned: boolean) => {
    if (!previewingTemplate || !preview || isApplying) return;
    
    // Guard: ensure template ID still matches using preview.templateId
    if (preview.templateId !== previewingTemplate.id) {
      console.warn('[Apply] Template mismatch detected, aborting');
      return;
    }
    
    setIsApplying(true);
    
    try {
      applyTemplateFn(previewingTemplate, allOptions, { keepPinned });
      
      void trackTelemetryEvent({ 
        task: 'template_preview_confirmed', 
        scope: 'module', 
        complexity: { 
          templateId: previewingTemplate.id, 
          keepPinned,
          costDelta: preview.costDelta,
          weeksDelta: preview.weeksDelta,
        }
      });
      
      // Track decision applied
      void trackTelemetryEvent({
        task: 'decision_applied',
        route: '/edu-tree-v5',
        complexity: {
          action: 'template_applied',
          template_id: previewingTemplate.id,
          module_id: module.id,
          courses_added: previewingTemplate.options.length,
          credit_delta: previewingTemplate.options.reduce((sum, c) => sum + (c.credits || 0), 0),
          keep_pinned: keepPinned
        }
      });
      
      setPreviewingTemplate(null);
      setPreview(null);
      onAddTemplate(previewingTemplate);
    } finally {
      setIsApplying(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewingTemplate(null);
    setPreview(null);
    setKeepPinned(false);
    void trackTelemetryEvent({ task: 'template_preview_cancelled', scope: 'module', complexity: { templateId: previewingTemplate?.id }});
  };

  if (isLoading) return <Skeleton className="h-32" />;
  if (!rankedTemplates?.length) {
    return (
      <div className="text-center py-8 space-y-2">
        <div className="text-4xl">📝</div>
        <div className="text-muted-foreground text-sm">
          No templates available for this module
        </div>
        <div className="text-xs text-muted-foreground">
          Add courses manually or check back later
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {preview && previewingTemplate && FEATURE_FLAGS.V5_SIMPLIFIED_CARDS && (
        <TemplateDiffStrip 
          preview={preview} 
          templateLabel={previewingTemplate.label}
          moduleId={module.id}
          keepPinned={keepPinned}
          onKeepPinnedChange={setKeepPinned}
          onApply={() => handleApplyPreview(keepPinned)}
          onCancel={handleCancelPreview}
          isApplying={isApplying}
        />
      )}
      
      {/* Search Input */}
      {rankedTemplates && rankedTemplates.length > 5 && (
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      
      <div className="template-gallery">
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map(rt => (
            <TemplateCard 
              key={rt.template.id} 
              template={rt.template} 
              validation={rt.validation} 
              onAdd={() => handlePreviewTemplate(rt.template)} 
            />
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No templates match "{searchQuery}"
          </div>
        )}
      </div>
    </div>
  );
}
