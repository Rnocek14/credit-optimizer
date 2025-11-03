/**
 * Year-level Template Generator (Phase 2)
 * Wraps buildYearPlan with different presets to create year templates
 */

import { buildYearPlan, YEAR_PRESETS, type YearPreset } from './yearPlanner';
import type { YearTemplate } from '../types/templates';
import type { ModuleData, MarketplaceOption } from '../types/v5';
import type { BasketItem, Constraints } from '../state/usePlanBasket';
import type { RequirementBlock } from '@/lib/types/eduTree';
import type { PartnerPolicy } from './yearPlanner';

interface YearTemplateProfile {
  name: string;
  badge: 'Cheapest' | 'Fastest' | 'Balanced' | 'Prestige';
  presetId: string;
  icon: string;
}

// Map generation profiles to year planner presets
const YEAR_TEMPLATE_PROFILES: YearTemplateProfile[] = [
  {
    name: 'Budget-Optimized',
    badge: 'Cheapest',
    presetId: 'transfer-maximizer', // Max ACE credits = lowest cost
    icon: '💰',
  },
  {
    name: 'Fast-Track',
    badge: 'Fastest',
    presetId: 'sprint-18-12', // Front-load Fall for faster completion
    icon: '⚡',
  },
  {
    name: 'Balanced',
    badge: 'Balanced',
    presetId: 'balanced-15-15', // Even distribution
    icon: '⚖️',
  },
  {
    name: 'Premium Quality',
    badge: 'Prestige',
    presetId: 'residency-closer', // Institutional courses = highest quality
    icon: '🏆',
  },
];

/**
 * Generate year templates by calling buildYearPlan with different presets
 * Returns 3-4 templates (filtered to only those with courses)
 */
export function generateYearTemplates(
  year: number,
  modules: ModuleData[],
  blocks: RequirementBlock[],
  allOptions: MarketplaceOption[],
  basket: BasketItem[],
  constraints: Constraints,
  anchorPolicy?: PartnerPolicy
): YearTemplate[] {
  const startTime = Date.now();
  console.log('[YearTemplateGenerator] Starting generation:', {
    year,
    modulesCount: modules.length,
    blocksCount: blocks.length,
    basketSize: basket.length,
    anchorPolicy: anchorPolicy?.partner_name,
  });

  const templates: YearTemplate[] = [];

  for (const profile of YEAR_TEMPLATE_PROFILES) {
    const preset = YEAR_PRESETS.find(p => p.id === profile.presetId);
    if (!preset) {
      console.warn('[YearTemplateGenerator] Preset not found:', profile.presetId);
      continue;
    }

    const profileStart = Date.now();

    try {
      // Call year planner with this preset
      const plan = buildYearPlan(
        preset,
        year,
        modules,
        blocks,
        allOptions,
        basket,
        constraints,
        anchorPolicy
      );

      // Skip empty plans
      const totalCourses = plan.fall.length + plan.spring.length;
      if (totalCourses === 0) {
        console.log('[YearTemplateGenerator] Empty plan, skipping:', {
          profile: profile.name,
          preset: preset.id,
        });
        continue;
      }

      // Build module breakdown for this template
      const moduleTemplates = modules.map(module => {
        const moduleCourses = [...plan.fall, ...plan.spring].filter(
          item => item.moduleId === module.id
        );
        return {
          moduleId: module.id,
          options: moduleCourses.map(item => {
            const fullOption = allOptions.find(o => o.courseId === item.courseId);
            return fullOption || (item as any);
          }),
          recommendedCourseId: moduleCourses[0]?.courseId,
          targetCanonicalIds: module.requiredCanonicalIds ?? [],
        };
      }).filter(mt => mt.options.length > 0);

      // Extract first warning for preview
      const firstWarning = plan.warnings[0];

      // Debug: Check metadata before template creation
      console.log('[YearTemplateGenerator] 📊 Metadata check:', {
        profile: profile.name,
        planMetadata: plan.metadata,
        fallItems: plan.fall.length,
        springItems: plan.spring.length,
        sampleCost: plan.fall[0]?.cost_usd,
        sampleWeeks: plan.fall[0]?.duration_weeks,
        sampleCri: plan.fall[0]?.cri_score,
      });

      // Build YearTemplate with fallbacks
      const est = {
        costUsd: plan.metadata.totalCost ?? 0,
        weeks: plan.metadata.totalWeeks ?? 0,
        credits: plan.metadata.totalCredits ?? 0,
        cri: Math.round(plan.metadata.avgCri ?? 0),
        workloadHours: [...plan.fall, ...plan.spring].reduce(
          (sum, i) => sum + (i.workload_weekly_hours ?? i.credits * 2.5),
          0
        ),
      };

      const template: YearTemplate = {
        id: `year-${year}-${profile.badge.toLowerCase()}`,
        kind: 'year',
        year,
        label: `${profile.icon} ${profile.name} Year ${year}`,
        summary: `${est.credits}cr • $${est.costUsd} • ${est.weeks}w • CRI ${est.cri}`,
        badge: profile.badge,
        moduleTemplates,
        est,
        // Add semester distribution (extended field)
        semesterDistribution: {
          fall: plan.fall,
          spring: plan.spring,
        },
        warnings: plan.warnings,
      } as YearTemplate & { semesterDistribution: any; warnings: any };

      templates.push(template);

      console.log('[YearTemplateGenerator] Generated template:', {
        profile: profile.name,
        preset: preset.id,
        coursesAdded: totalCourses,
        fallLoad: plan.metadata.fallLoad,
        springLoad: plan.metadata.springLoad,
        cost: plan.metadata.totalCost,
        warnings: plan.warnings.length,
        firstWarning: firstWarning?.message,
        duration: Date.now() - profileStart,
      });
    } catch (error) {
      console.error('[YearTemplateGenerator] Error generating template:', {
        profile: profile.name,
        preset: preset.id,
        error,
      });
    }
  }

  console.log('[YearTemplateGenerator] Generation complete:', {
    templatesGenerated: templates.length,
    totalDuration: Date.now() - startTime,
  });

  return templates;
}
