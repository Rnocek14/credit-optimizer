/**
 * DAL for the Pipeline Health admin panel.
 * Reads the six v_pipeline_health_* views + computes pack promotion ratios
 * (lifetime + live) from institution_policy_packs.
 *
 * Source of truth: docs/pipeline-health/AUDIT_ADDENDUM_2026-05-21.md
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from './client';

export const PIPELINE_HEALTH_QUERY_KEYS = {
  scrapeSuccessWeekly: ['pipeline-health', 'scrape-success-weekly'] as const,
  stamped7d: ['pipeline-health', 'stamped-7d'] as const,
  templateStampFreshness: ['pipeline-health', 'template-stamp-freshness'] as const,
  templateInventory: ['pipeline-health', 'template-inventory'] as const,
  funnelMonthly: ['pipeline-health', 'funnel-monthly'] as const,
  gateBlocks: ['pipeline-health', 'gate-blocks'] as const,
  packPromotionRatios: ['pipeline-health', 'pack-promotion-ratios'] as const,
};

// Cohorts — matches addendum verdict-revision section.
export const COHORT_ORIGINAL_5 = ['COSC', 'EMPIRE', 'TESU', 'WGU', 'EXCELSIOR'] as const;
export const COHORT_V2_EXPANSION_5 = ['ASUO', 'GCU', 'LIBERTY', 'SNHU', 'UMGC'] as const;
export const ALL_INSTITUTIONS = [...COHORT_ORIGINAL_5, ...COHORT_V2_EXPANSION_5];

export type Cohort = 'original' | 'v2' | 'other';
export function cohortOf(institutionCode: string): Cohort {
  if ((COHORT_ORIGINAL_5 as readonly string[]).includes(institutionCode)) return 'original';
  if ((COHORT_V2_EXPANSION_5 as readonly string[]).includes(institutionCode)) return 'v2';
  return 'other';
}

// ── Row types (mirror view columns) ──

export interface Stamped7dRow {
  institution_code: string;
  most_recent_stamp: string | null;
  stamped_within_7d: boolean | null;
  successful_scrapes_7d: number | null;
}

export interface TemplateStampFreshnessRow {
  institution_code: string;
  most_recent_template_stamp: string | null;
  template_stamped_within_7d: boolean | null;
  templates_active: number | null;
  templates_stamped_7d: number | null;
}

export interface TemplateInventoryRow {
  institution_code: string;
  templates_total: number | null;
  templates_active: number | null;
  templates_disabled: number | null;
  templates_changed: number | null;
  templates_stale_30d: number | null;
}

export interface ScrapeSuccessWeeklyRow {
  week: string;
  institution_code: string;
  attempts: number | null;
  successes: number | null;
  success_ratio: number | null;
}

export interface FunnelMonthlyRow {
  month: string;
  institution_code: string;
  scrapes_successful: number | null;
  packs_total: number | null;
  packs_promoted: number | null;
  packs_via_merge: number | null;
  packs_via_validate: number | null;
  scrape_to_pack_ratio: number | null;
  pack_promotion_ratio: number | null;
}

export interface GateBlockRow {
  institution_code: string;
  blocked_reason: string | null;
  packs_blocked: number | null;
}

export interface PackPromotionRatioRow {
  institution_code: string;
  packs_total: number;
  packs_promoted: number;
  pack_promotion_ratio: number | null; // lifetime
  packs_live: number; // non-deprecated
  packs_live_promoted: number;
  pack_promotion_ratio_live: number | null; // live
}

// ── Hooks ──

const STALE_MS = 60_000; // panel is read-only; 1-minute stale is fine.

export function useStamped7d() {
  return useQuery({
    queryKey: PIPELINE_HEALTH_QUERY_KEYS.stamped7d,
    staleTime: STALE_MS,
    queryFn: async (): Promise<Stamped7dRow[]> => {
      const { data, error } = await supabase
        .from('v_pipeline_health_stamped_7d')
        .select('*');
      if (error) throw error;
      return (data ?? []) as Stamped7dRow[];
    },
  });
}

export function useTemplateStampFreshness() {
  return useQuery({
    queryKey: PIPELINE_HEALTH_QUERY_KEYS.templateStampFreshness,
    staleTime: STALE_MS,
    queryFn: async (): Promise<TemplateStampFreshnessRow[]> => {
      const { data, error } = await supabase
        .from('v_pipeline_health_template_stamp_freshness')
        .select('*');
      if (error) throw error;
      return (data ?? []) as TemplateStampFreshnessRow[];
    },
  });
}

export function useTemplateInventory() {
  return useQuery({
    queryKey: PIPELINE_HEALTH_QUERY_KEYS.templateInventory,
    staleTime: STALE_MS,
    queryFn: async (): Promise<TemplateInventoryRow[]> => {
      const { data, error } = await supabase
        .from('v_pipeline_health_template_inventory')
        .select('*');
      if (error) throw error;
      return (data ?? []) as TemplateInventoryRow[];
    },
  });
}

export function useScrapeSuccessWeekly() {
  return useQuery({
    queryKey: PIPELINE_HEALTH_QUERY_KEYS.scrapeSuccessWeekly,
    staleTime: STALE_MS,
    queryFn: async (): Promise<ScrapeSuccessWeeklyRow[]> => {
      const { data, error } = await supabase
        .from('v_pipeline_health_scrape_success_weekly')
        .select('*')
        .order('week', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as ScrapeSuccessWeeklyRow[];
    },
  });
}

export function useFunnelMonthly() {
  return useQuery({
    queryKey: PIPELINE_HEALTH_QUERY_KEYS.funnelMonthly,
    staleTime: STALE_MS,
    queryFn: async (): Promise<FunnelMonthlyRow[]> => {
      const { data, error } = await supabase
        .from('v_pipeline_health_funnel_monthly')
        .select('*')
        .order('month', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as FunnelMonthlyRow[];
    },
  });
}

export function useGateBlocks() {
  return useQuery({
    queryKey: PIPELINE_HEALTH_QUERY_KEYS.gateBlocks,
    staleTime: STALE_MS,
    queryFn: async (): Promise<GateBlockRow[]> => {
      const { data, error } = await supabase
        .from('v_pipeline_health_gate_blocks')
        .select('*');
      if (error) throw error;
      return (data ?? []) as GateBlockRow[];
    },
  });
}

/**
 * Pack promotion ratios: lifetime and live (non-deprecated) side by side.
 * Computed in JS from institution_policy_packs since no view exposes both.
 */
export function usePackPromotionRatios() {
  return useQuery({
    queryKey: PIPELINE_HEALTH_QUERY_KEYS.packPromotionRatios,
    staleTime: STALE_MS,
    queryFn: async (): Promise<PackPromotionRatioRow[]> => {
      const { data, error } = await supabase
        .from('institution_policy_packs')
        .select('institution, status, promoted_at')
        .limit(5000);
      if (error) throw error;

      const byInst = new Map<string, PackPromotionRatioRow>();
      for (const row of data ?? []) {
        const inst = (row as { institution: string }).institution;
        const status = (row as { status: string | null }).status;
        const promotedAt = (row as { promoted_at: string | null }).promoted_at;
        if (!inst) continue;
        let agg = byInst.get(inst);
        if (!agg) {
          agg = {
            institution_code: inst,
            packs_total: 0,
            packs_promoted: 0,
            pack_promotion_ratio: null,
            packs_live: 0,
            packs_live_promoted: 0,
            pack_promotion_ratio_live: null,
          };
          byInst.set(inst, agg);
        }
        agg.packs_total += 1;
        if (promotedAt) agg.packs_promoted += 1;
        const isLive = status !== 'deprecated';
        if (isLive) {
          agg.packs_live += 1;
          if (promotedAt) agg.packs_live_promoted += 1;
        }
      }
      for (const agg of byInst.values()) {
        agg.pack_promotion_ratio =
          agg.packs_total > 0 ? agg.packs_promoted / agg.packs_total : null;
        agg.pack_promotion_ratio_live =
          agg.packs_live > 0 ? agg.packs_live_promoted / agg.packs_live : null;
      }
      return Array.from(byInst.values()).sort((a, b) =>
        a.institution_code.localeCompare(b.institution_code)
      );
    },
  });
}
