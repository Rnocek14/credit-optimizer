/**
 * Apply Year Template Hook (Phase 2)
 * Handles year template application with semester tagging and undo
 */

import { useCallback } from 'react';
import { usePlanBasket } from '../state/usePlanBasket';
import { toast } from 'sonner';
import { safeTrack } from '../utils/safeTelemetry';
import type { YearTemplate } from '../types/templates';
import type { BasketItem } from '../state/usePlanBasket';

export function useApplyYearTemplate() {
  const basket = usePlanBasket(s => s.items);
  const addItem = usePlanBasket(s => s.addItem);
  const removeItem = usePlanBasket(s => s.removeItem);

  const apply = useCallback(
    (template: YearTemplate & { semesterDistribution: { fall: BasketItem[]; spring: BasketItem[] }; warnings?: any[] }) => {
      try {
        console.log('[ApplyYearTemplate] Starting', {
          templateId: template.id,
          label: template.label,
          fallCourses: template.semesterDistribution.fall.length,
          springCourses: template.semesterDistribution.spring.length,
        });

      // Capture undo snapshot (all courses in this year's modules)
      const yearModuleIds = new Set(template.moduleTemplates.map(mt => mt.moduleId));
      const undoSnapshot = basket.filter(item => yearModuleIds.has(item.moduleId));

      console.log('[ApplyYearTemplate] Undo snapshot:', {
        moduleIds: Array.from(yearModuleIds),
        coursesInYear: undoSnapshot.length,
        courseIds: undoSnapshot.map(i => i.courseId),
      });

      // Remove existing courses in this year's modules
      undoSnapshot.forEach(item => {
        console.log('[ApplyYearTemplate] Removing existing course:', {
          courseId: item.courseId,
          moduleId: item.moduleId,
        });
        removeItem(item.courseId);
      });

      // Add fall courses with semester='fall'
      const fallAdded: BasketItem[] = [];
      template.semesterDistribution.fall.forEach(item => {
        // Defensive check: Skip items with missing moduleId
        if (!item.moduleId) {
          console.error('[ApplyYearTemplate] Missing moduleId for Fall course, skipping:', item);
          return;
        }

        const newItem: BasketItem = {
          ...item,
          semester: `${template.year}-fall`,
          status: 'pinned' as const, // Use pinned instead of user-selected
          source: {
            type: 'template',
            templateId: template.id,
            templateLabel: template.label,
          },
        };
        addItem(newItem);
        fallAdded.push(newItem);
        console.log('[ApplyYearTemplate] Added Fall course:', {
          courseId: newItem.courseId,
          moduleId: newItem.moduleId,
          title: newItem.title,
        });
      });

      // Add spring courses with semester='spring'
      const springAdded: BasketItem[] = [];
      template.semesterDistribution.spring.forEach(item => {
        // Defensive check: Skip items with missing moduleId
        if (!item.moduleId) {
          console.error('[ApplyYearTemplate] Missing moduleId for Spring course, skipping:', item);
          return;
        }

        const newItem: BasketItem = {
          ...item,
          semester: `${template.year}-spring`,
          status: 'pinned' as const, // Use pinned instead of user-selected
          source: {
            type: 'template',
            templateId: template.id,
            templateLabel: template.label,
          },
        };
        addItem(newItem);
        springAdded.push(newItem);
        console.log('[ApplyYearTemplate] Added Spring course:', {
          courseId: newItem.courseId,
          moduleId: newItem.moduleId,
          title: newItem.title,
        });
      });

      const totalAdded = fallAdded.length + springAdded.length;

      console.log('[ApplyYearTemplate] Application complete:', {
        fallAdded: fallAdded.length,
        springAdded: springAdded.length,
        totalAdded,
        removed: undoSnapshot.length,
      });

      // Show success toast with undo
      toast.success(`Applied: ${template.label}`, {
        description: `Added ${totalAdded} courses • ${template.est.credits}cr • $${template.est.costUsd}`,
        action: {
          label: 'Undo',
          onClick: () => {
            console.log('[ApplyYearTemplate] Undo clicked');

            // Remove added courses
            [...fallAdded, ...springAdded].forEach(item => {
              console.log('[ApplyYearTemplate] Undo: Removing added course:', item.courseId);
              removeItem(item.courseId);
            });

            // Restore previous courses
            undoSnapshot.forEach(item => {
              console.log('[ApplyYearTemplate] Undo: Restoring previous course:', item.courseId);
              addItem(item);
            });

            toast.message('Year template reverted');

            safeTrack({
              task: 'year_template_undo',
              scope: 'year',
              complexity: {
                templateId: template.id,
                year: template.year,
                coursesReverted: totalAdded,
              },
            });
          },
        },
        duration: 8000,
      });

      // Show first warning in separate toast if exists
      if (template.warnings?.[0]) {
        const warning = template.warnings[0];
        toast.message(`⚠️ ${warning.message}`, {
          duration: 6000,
        });
      }

        // Telemetry
        safeTrack({
          task: 'year_template_applied',
          scope: 'year',
          complexity: {
            templateId: template.id,
            year: template.year,
            coursesAdded: totalAdded,
            fallCount: fallAdded.length,
            springCount: springAdded.length,
            creditsAdded: template.est.credits,
            costAdded: template.est.costUsd,
          },
        });
      } catch (error) {
        console.error('[ApplyYearTemplate] Failed', error);
        toast.error('Could not apply template. Your plan was not changed.');
      }
    },
    [basket, addItem, removeItem]
  );

  return { applyYearTemplate: apply };
}
