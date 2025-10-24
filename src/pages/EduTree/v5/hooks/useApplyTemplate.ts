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
    (template: ModuleTemplate, allOptions: any[], opts?: { keepPinned?: boolean }) => {
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

      // Execute apply - captures undoSnapshot BEFORE any filtering
      // This ensures undo can restore the exact pre-apply state
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
        addedModuleIds: result.added.map(i => ({ courseId: i.courseId, moduleId: i.moduleId })),
      });

      // Verify all added items have valid UUID moduleIds
      const invalidItems = result.added.filter(item => 
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(item.moduleId)
      );
      if (invalidItems.length > 0) {
        console.error('[Apply] ❌ Invalid moduleIds detected:', invalidItems.map(i => ({
          courseId: i.courseId,
          moduleId: i.moduleId
        })));
        toast.error('Template application failed: invalid module identifiers', {
          description: 'Some courses could not be added. Please contact support.',
        });
        return;
      }
      
      // Capture module state after successful template application
      if (result.added.length > 0 && template.moduleId) {
        const firstItem = result.added[0];
        const setModuleState = usePlanBasket.getState().setModuleState;
        
        setModuleState(template.moduleId, {
          templateId: template.id,
          templateVersion: 1,
          templateLabel: firstItem.source?.templateLabel,
          appliedAt: new Date().toISOString(),
          originalCourseIds: result.added.map(i => i.courseId),
        });
        
        console.log('[Apply] ✅ Module state captured:', {
          moduleId: template.moduleId,
          templateId: template.id,
          courseCount: result.added.length,
        });
      }

      // Show conflicts as warnings (non-blocking)
      if (result.conflicts.length > 0) {
        result.conflicts.forEach(conflict => {
          if (conflict.severity === 'warning') {
            toast.message(`⚠️ ${conflict.reason}`, { duration: 4000 });
          }
        });
      }

      // Respect keepPinned option (filtering happens AFTER snapshot capture)
      // This ensures undoSnapshot contains the original state before keepPinned logic
      let finalAdded = result.added;
      let finalRemoved = result.removed;
      
      if (opts?.keepPinned) {
        const removedPinned = result.removed.filter(i => i.status === 'pinned');
        if (removedPinned.length > 0) {
          const pinnedIds = new Set(removedPinned.map(i => i.courseId));
          finalRemoved = result.removed.filter(i => !pinnedIds.has(i.courseId));
          finalAdded = result.added.filter(i => !pinnedIds.has(i.courseId));
          
          console.log('[Apply] ✅ Kept pinned items:', {
            pinnedCount: removedPinned.length,
            keptIds: removedPinned.map(i => i.courseId),
          });
        }
      }

      // Remove old items (in scope)
      finalRemoved.forEach(item => removeItem(item.courseId));

      // Add new items
      finalAdded.forEach(item => addItem(item));

      // Unified toast with diff + undo (using final counts)
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
            finalAdded.forEach(item => removeItem(item.courseId));
            result.undoSnapshot.forEach(item => addItem(item));
            toast.message('Template reverted');

            void trackTelemetryEvent({
              task: 'template_undo',
              scope: params.scope,
              complexity: {
                templateId: template.id,
                itemsReverted: finalAdded.length,
                keptPinned: opts?.keepPinned,
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
        itemsAdded: finalAdded.length,
        itemsRemoved: finalRemoved.length,
        keptPinned: opts?.keepPinned,
      });

      return { ...result, added: finalAdded, removed: finalRemoved };
    },
    [basket, constraints, addItem, removeItem]
  );

  return { applyTemplate: apply };
}
