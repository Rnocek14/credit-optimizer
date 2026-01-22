import { useCallback } from 'react';
import { applyTemplate, type ApplyTemplateParams } from '../engine/applyTemplate';
import type { ModuleTemplate } from '../types/templates';
import { usePlanBasket, type BasketItem } from '../state/usePlanBasket';
import { toast } from 'sonner';
import { trackTelemetryEvent } from '@/utils/telemetry';
import { logEvent } from '@/lib/analytics';
import { checkTransferRule } from '../engine/transferEngine';
import { checkForDeadEnd } from '../engine/deadEndDetector';
import { courseToBasketItem } from '../engine/courseToBasketItem';

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
    async (template: ModuleTemplate, allOptions: any[], opts?: { keepPinned?: boolean }) => {
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

      // ============ Phase 4: Transfer Safety Pre-Flight Validation ============
      const targetSchool = constraints.target_school;
      
      if (targetSchool && typeof targetSchool === 'string') {
        const issues: Array<{ courseId: string; title: string; reason: string }> = [];
        
        for (const opt of template.options) {
          const providerCode = opt.providerCode || opt.provider || '';
          const courseId = opt.courseId;
          
          if (!courseId) {
            issues.push({
              courseId: '(missing)',
              title: opt.title || '(missing title)',
              reason: 'Missing course code; cannot validate transfer',
            });
            continue;
          }
          
          // Institutional courses are always safe
          if (providerCode.toUpperCase() === targetSchool.toUpperCase()) {
            continue;
          }
          
          // Use requirement type from option metadata if available
          const requirementType = (opt as any).requirementType || 
                                 (opt as any).requirementKind || 
                                 'major';
          
          const rule = await checkTransferRule(
            providerCode,
            courseId,
            targetSchool,
            { requirementType }
          );
          
          if (!rule.accepted) {
            issues.push({
              courseId,
              title: opt.title || courseId,
              reason: rule.confidence === 0
                ? 'No transfer rule found for this anchor school'
                : `Low transfer confidence (${Math.round(rule.confidence * 100)}%)`,
            });
          }
        }
        
        if (issues.length > 0) {
          toast.error('Template cannot be applied', {
            description: `${issues.length} course${issues.length > 1 ? 's' : ''} in this template do not appear to transfer safely to ${targetSchool}.`,
            duration: 9000,
          });
          
          console.error('[ApplyTemplate] 🚫 Blocked non-transferable courses:', issues);
          return;
        }
        
        console.log('[ApplyTemplate] ✅ All courses passed transfer validation');
      }

      // ============ Phase 5: Aggregate Dead-End Validation ============
      // Check if applying the FULL template would violate policy caps
      // This prevents bulk-adding courses that collectively exceed limits
      const simulatedItems: BasketItem[] = template.options.map(opt => 
        courseToBasketItem(opt, template.moduleId)
      );
      
      // Calculate aggregate totals after all template items would be added
      const aggregateBasket = [...basket, ...simulatedItems];
      
      // Check against the last item (which represents the final state)
      if (simulatedItems.length > 0) {
        // Use basket WITHOUT the last item to check if adding it creates dead-end
        const basketWithoutLast = aggregateBasket.slice(0, -1);
        
        const deadEndCheck = checkForDeadEnd(
          template.options[template.options.length - 1],
          basketWithoutLast,
          constraints,
          [] // No remaining modules for template bulk-apply check
        );
        
        if (deadEndCheck.isDeadEnd) {
          const primaryReason = deadEndCheck.reasons[0] || 'Would violate policy constraints';
          
          toast.error('Template exceeds policy limits', {
            description: primaryReason,
            duration: 9000,
          });
          
          console.error('[ApplyTemplate] 🚫 Blocked: template would create dead-end', {
            templateId: template.id,
            reasons: deadEndCheck.reasons,
            snapshot: deadEndCheck.snapshot,
            totalCreditsInTemplate: simulatedItems.reduce((s, i) => s + i.credits, 0),
            currentBasketCredits: basket.reduce((s, i) => s + i.credits, 0),
          });
          
          return;
        }
        
        console.log('[ApplyTemplate] ✅ Template passes aggregate dead-end check');
      }

      // Map template to apply params
      const params: Omit<ApplyTemplateParams, 'currentBasket' | 'constraints'> = {
        scope: 'module',
        scopeId: template.moduleId,
        templateId: template.id,
        options: template.options,
        allOptions,
      };

      // Capture module state BEFORE applying template (for undo restoration)
      const previousModuleState = template.moduleId 
        ? usePlanBasket.getState().moduleStates[template.moduleId] 
        : undefined;

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

      // Log non-UUID moduleIds but don't block (fixtures use friendly IDs)
      const nonUuidItems = result.added.filter(item => 
        !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(item.moduleId)
      );
      if (nonUuidItems.length > 0) {
        console.warn('[Apply] ⚠️ Non-UUID moduleIds detected (fixtures mode):', 
          nonUuidItems.map(i => ({ courseId: i.courseId, moduleId: i.moduleId }))
        );
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
            // Restore basket items
            finalAdded.forEach(item => removeItem(item.courseId));
            result.undoSnapshot.forEach(item => addItem(item));
            
            // Restore module state to pre-template snapshot
            if (template.moduleId) {
              const clearModuleState = usePlanBasket.getState().clearModuleState;
              const setModuleState = usePlanBasket.getState().setModuleState;
              
              if (previousModuleState) {
                // Restore exact previous state
                setModuleState(template.moduleId, previousModuleState);
                console.log('[Undo] Module state restored to previous:', {
                  moduleId: template.moduleId,
                  restoredTemplateId: previousModuleState.templateId
                });
              } else {
                // No previous state - clear it
                clearModuleState(template.moduleId);
                console.log('[Undo] Module state cleared:', {
                  moduleId: template.moduleId
                });
              }
            }
            
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
