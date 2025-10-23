import { useCallback } from 'react';
import { applyTemplate, type ApplyTemplateParams } from '../engine/applyTemplate';
import type { ModuleTemplate } from '../types/templates';
import { usePlanBasket } from '../state/usePlanBasket';
import { toast } from 'sonner';
import { trackTelemetryEvent } from '@/utils/telemetry';
import { logEvent } from '@/lib/analytics';

/**
 * Hook for applying templates with toast notifications, undo, and telemetry
 * Wraps the core applyTemplate engine with UX layer
 */
export function useApplyTemplate() {
  const basket = usePlanBasket(s => s.items);
  const constraints = usePlanBasket(s => s.constraints);
  const addItem = usePlanBasket(s => s.addItem);
  const removeItem = usePlanBasket(s => s.removeItem);

  const apply = useCallback(
    (template: ModuleTemplate, allOptions: any[]) => {
      // Validate template has valid moduleId
      if (!template.moduleId || template.moduleId.length < 10) {
        console.error('[Apply] ❌ Template missing valid moduleId:', {
          templateId: template.id,
          label: template.label,
          moduleId: template.moduleId,
        });
        toast.error('Invalid template: missing module identifier', {
          description: 'This template cannot be applied. Please contact support.',
        });
        return;
      }

      console.log('[Apply] 🚀 Starting template application:', {
        templateId: template.id,
        label: template.label,
        moduleId: template.moduleId,
        coursesCount: template.options.length,
        basketSize: basket.length,
      });

      // Map template to apply params
      const params: Omit<ApplyTemplateParams, 'currentBasket' | 'constraints'> = {
        scope: 'module',
        scopeId: template.moduleId,
        templateId: template.id,
        options: template.options,
        allOptions,
      };

      // Execute apply
      const result = applyTemplate({
        ...params,
        currentBasket: basket,
        constraints,
      });

      console.log('[Apply] 📊 Apply result:', {
        added: result.added.length,
        removed: result.removed.length,
        conflicts: result.conflicts.length,
        addedCourseIds: result.added.map(i => i.courseId),
        addedModuleIds: [...new Set(result.added.map(i => i.moduleId))],
      });

      // Show conflicts as warnings (non-blocking)
      if (result.conflicts.length > 0) {
        result.conflicts.forEach(conflict => {
          if (conflict.severity === 'warning') {
            toast.message(`⚠️ ${conflict.reason}`, { duration: 4000 });
          }
        });
      }

      // Remove old items (in scope)
      result.removed.forEach(item => removeItem(item.courseId));

      // Add new items
      result.added.forEach(item => addItem(item));

      // Unified toast with diff + undo
      const { costDelta, weeksDelta, creditsDelta } = result.diff;
      const diffDescription = [
        costDelta !== 0 && `${costDelta >= 0 ? '+' : ''}$${costDelta}`,
        weeksDelta !== 0 && `${weeksDelta >= 0 ? '+' : ''}${weeksDelta}w`,
        creditsDelta !== 0 && `${creditsDelta >= 0 ? '+' : ''}${creditsDelta}cr`,
      ]
        .filter(Boolean)
        .join(' • ');

      toast.success(`Applied: ${template.label}`, {
        description: diffDescription || 'No net change',
        action: {
          label: 'Undo All',
          onClick: () => {
            // Restore snapshot
            result.added.forEach(item => removeItem(item.courseId));
            result.undoSnapshot.forEach(item => addItem(item));
            toast.message('Template reverted');

            void trackTelemetryEvent({
              task: 'template_undo',
              scope: params.scope,
              complexity: {
                templateId: template.id,
                itemsReverted: result.added.length,
              },
            });

            logEvent('template_undo', {
              templateId: template.id,
              scope: params.scope,
            });
          },
        },
        duration: 8000,
      });

      // Telemetry
      void trackTelemetryEvent({
        task: 'template_applied',
        scope: params.scope,
        complexity: {
          templateId: template.id,
          scopeId: params.scopeId,
          itemsAdded: result.added.length,
          itemsRemoved: result.removed.length,
          conflicts: result.conflicts.length,
          diff: result.diff,
        },
      });

      logEvent('template_applied', {
        templateId: template.id,
        scope: params.scope,
        itemsAdded: result.added.length,
        itemsRemoved: result.removed.length,
      });

      return result;
    },
    [basket, constraints, addItem, removeItem]
  );

  return { applyTemplate: apply };
}
