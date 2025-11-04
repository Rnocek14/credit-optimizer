import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { TemplateCard } from '../TemplateCard';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlanBasket } from '../../state/usePlanBasket';
import { rankTemplates } from '../../engine/templateValidator';
import { generateModuleTemplates } from '../../engine/templateGenerator';
import type { ModuleData } from '../../types/v5';
import type { ModuleTemplate } from '../../types/templates';
import { trackTelemetryEvent } from '@/utils/telemetry';
import { logEvent } from '@/lib/analytics';
import { useUserEvidence } from '@/pages/EduTree/hooks/useUserEvidence';
import { useApplyTemplate } from '../../hooks/useApplyTemplate';
import { previewTemplate } from '../../engine/previewTemplate';
import { TemplateDiffStrip } from '../TemplateDiffStrip';
import type { TemplatePreview } from '../../engine/previewTemplate';
import { X } from 'lucide-react';
import { FEATURE_FLAGS } from '../../config/featureFlags';
import { getTemplateCourses, sanitizeTelemetryPayload } from '../../utils/templateHelpers';

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
  const queryClient = useQueryClient();
  
  const [previewingTemplate, setPreviewingTemplate] = useState<ModuleTemplate | null>(null);
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  
  // Log exploration flag state on mount for telemetry correlation
  useEffect(() => {
    if (explorationEnabled) {
      logEvent('exploration_mode_active', { moduleId: module.id });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [keepPinned, setKeepPinned] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const allOptions = useMemo(() => allModules.flatMap(m => m.marketplaceOptions ?? []), [allModules]);
  const basketKey = useMemo(() => basket.map(b => b.courseId).sort().join('|'), [basket]);
  
  // Check if module is satisfied (exploration mode)
  const isSatisfied = (module.creditsEarned ?? 0) >= (module.creditsRequired ?? 0);
  const explorationEnabled = FEATURE_FLAGS.V5_EXPLORATION_MODE;
  
  const { data: rankedTemplates, isLoading } = useQuery({
    queryKey: ['module-templates-ranked', module.id, basketKey, constraints, evidence.raw?.completed?.length ?? 0, isSatisfied, explorationEnabled],
    queryFn: async () => {
      console.log('[ModuleTemplatesPanel] 🔍 Pre-generation check:', {
        moduleId: module.id,
        moduleLabel: module.label,
        hasMarketplaceOptions: !!module.marketplaceOptions,
        optionsCount: module.marketplaceOptions?.length ?? 0,
        basketSize: basket.length,
        allModulesCount: allModules.length,
        constraintsKeys: Object.keys(constraints),
        sampleOption: module.marketplaceOptions?.[0],
        creditsEarned: module.creditsEarned,
        creditsRequired: module.creditsRequired,
        creditsNeeded: (module.creditsRequired ?? 0) - (module.creditsEarned ?? 0)
      });
      
      // Defensive: warn if marketplaceOptions is undefined (not just empty)
      if (module.marketplaceOptions === undefined) {
        console.warn('[ModuleTemplatesPanel] ⚠️ marketplaceOptions is undefined (should be array or null)', {
          moduleId: module.id,
          moduleLabel: module.label
        });
      }
      
      // Generate templates dynamically from module data
      // Enable exploration mode for satisfied modules to show alternatives (if feature enabled)
      const templates = await generateModuleTemplates(module, basket, constraints, {
        explorationMode: explorationEnabled && isSatisfied
      });
      console.log('[ModuleTemplatesPanel] ✅ Generation result:', {
        moduleId: module.id,
        isSatisfied,
        explorationEnabled,
        explorationMode: explorationEnabled && isSatisfied,
        templatesGenerated: templates.length,
        templateBadges: templates.map(t => t.badge)
      });
      return await rankTemplates(templates, basket, constraints, allOptions, evidence.raw);
    },
    staleTime: 5000,
    // Always try to generate if module has options (exploration mode handles satisfied modules)
    enabled: !!module.id && !!module.marketplaceOptions && module.marketplaceOptions.length > 0
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
    
    void trackTelemetryEvent({ 
      task: isSatisfied ? 'module_template_explored' : 'template_preview_shown',
      scope: 'module', 
      complexity: sanitizeTelemetryPayload({ 
        schema_version: 1,
        template_id: template.id, 
        module_id: module.id,
        template_label: template.label,
        was_exploratory: isSatisfied
      })
    });
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
      
      const templateCourses = getTemplateCourses(previewingTemplate);
      
      void trackTelemetryEvent({ 
        task: isSatisfied ? 'module_replaced_with_template' : 'template_preview_confirmed',
        scope: 'module', 
        complexity: sanitizeTelemetryPayload({ 
          schema_version: 1,
          template_id: previewingTemplate.id,
          module_id: module.id,
          was_exploratory: isSatisfied,
          keep_pinned: keepPinned,
          cost_delta: preview.costDelta,
          weeks_delta: preview.weeksDelta,
        })
      });
      
      // Track decision applied
      void trackTelemetryEvent({
        task: 'decision_applied',
        route: '/edu-tree-v5',
        complexity: sanitizeTelemetryPayload({
          schema_version: 1,
          action: 'template_applied',
          template_id: previewingTemplate.id,
          module_id: module.id,
          courses_added: templateCourses.length,
          credit_delta: templateCourses.reduce((sum, c) => sum + (c.credits || 0), 0),
          keep_pinned: keepPinned
        })
      });
      
      setPreviewingTemplate(null);
      setPreview(null);
      onAddTemplate(previewingTemplate);
      
      // Invalidate queries to refresh UI (predicate-based for robustness)
      void queryClient.invalidateQueries({
        predicate: q => Array.isArray(q.queryKey) 
          && q.queryKey[0] === 'module-templates-ranked'
          && q.queryKey[1] === module.id
      });
    } catch (err) {
      console.error('Failed to apply template:', err);
      toast.error("Couldn't apply template");
    } finally {
      setIsApplying(false);
    }
  };

  const handleCancelPreview = () => {
    setPreviewingTemplate(null);
    setPreview(null);
    setKeepPinned(false);
    
    void trackTelemetryEvent({ 
      task: 'template_preview_cancelled', 
      scope: 'module', 
      complexity: sanitizeTelemetryPayload({ 
        schema_version: 1,
        template_id: previewingTemplate?.id, 
        module_id: module.id 
      })
    });
  };

  if (isLoading) return <Skeleton className="h-32" />;
  
  // Empty state: no templates available (respects exploration mode)
  if (!rankedTemplates?.length) {
    const message = explorationEnabled && isSatisfied 
      ? "No alternative templates available for this module"
      : "No templates available for this module";
    
    return (
      <div className="text-center py-8 space-y-2">
        <div className="text-4xl">📝</div>
        <div className="text-muted-foreground text-sm">{message}</div>
        <div className="text-xs text-muted-foreground">
          {isSatisfied ? "Your current plan already satisfies this module" : "Add courses manually or check back later"}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Exploration Mode Banner - Show when feature enabled + module satisfied + has templates */}
      {explorationEnabled && isSatisfied && rankedTemplates && rankedTemplates.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="px-3 py-2.5 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800/30 rounded-lg"
        >
          <div className="flex items-start gap-2">
            <span className="text-green-600 dark:text-green-400 text-lg shrink-0">✅</span>
            <div className="flex-1 text-sm space-y-0.5">
              <p className="font-medium text-green-900 dark:text-green-100">
                Module Satisfied • Explore Alternatives
              </p>
              <p className="text-xs text-green-700 dark:text-green-300">
                Your plan won't change until you apply a template. Use this to compare different approaches.
              </p>
            </div>
          </div>
        </div>
      )}
      
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
      
      <div className="template-gallery" role="list" aria-label="Available module templates">
        {filteredTemplates.length > 0 ? (
          filteredTemplates.map(rt => (
            <div key={rt.template.id} role="listitem">
              <TemplateCard 
                template={rt.template} 
                validation={rt.validation} 
                onAdd={() => handlePreviewTemplate(rt.template)} 
              />
            </div>
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
