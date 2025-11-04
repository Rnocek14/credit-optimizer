import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

/* ----------------------------- Zod Schemas ----------------------------- */

export const BucketSplitRow = z.object({
  bucket: z.string(),                    // 'A' | 'B'
  users: z.number().int().nonnegative(), // DISTINCT users
  assignment_events: z.number().int().nonnegative(),
});
export type BucketSplitRow = z.infer<typeof BucketSplitRow>;

export const FunnelRow = z.object({
  bucket: z.string(),                    // 'A' | 'B'
  explored: z.number().int().nonnegative(),
  applied: z.number().int().nonnegative(),
  apply_rate_pct: z.number(),            // numeric from SQL
});
export type FunnelRow = z.infer<typeof FunnelRow>;

export const DailyRow = z.object({
  day: z.string(),                       // 'YYYY-MM-DD' (date)
  bucket: z.string(),
  explored: z.number().int().nonnegative(),
  applied: z.number().int().nonnegative(),
  apply_rate_pct: z.number(),
});
export type DailyRow = z.infer<typeof DailyRow>;

/* ----------------------------- Param Types ----------------------------- */

export type ExplorationParams = {
  /** e.g., '21 days', '30 days'; defaults to function default */
  since?: string;
  moduleCategory?: string | null;
  planYear?: number | null;
  providerType?: string | null;
};

function buildParams(p?: ExplorationParams) {
  return {
    _since: p?.since ?? undefined,
    _module_category: p?.moduleCategory ?? null,
    _plan_year: p?.planYear ?? null,
    _provider_type: p?.providerType ?? null,
  };
}

/* ----------------------------- RPC Wrappers ---------------------------- */

export async function getBucketSplit(
  client: SupabaseClient,
  params?: ExplorationParams
): Promise<BucketSplitRow[]> {
  const { data, error } = await client.rpc("exploration_bucket_split", buildParams(params));
  if (error) throw error;
  const parsed = z.array(BucketSplitRow).safeParse(data ?? []);
  if (!parsed.success) throw new Error(`[getBucketSplit] Validation failed: ${parsed.error.message}`);
  return parsed.data;
}

export async function getFunnel(
  client: SupabaseClient,
  params?: ExplorationParams
): Promise<FunnelRow[]> {
  const { data, error } = await client.rpc("exploration_funnel", buildParams(params));
  if (error) throw error;
  const parsed = z.array(FunnelRow).safeParse(data ?? []);
  if (!parsed.success) throw new Error(`[getFunnel] Validation failed: ${parsed.error.message}`);
  return parsed.data;
}

export async function getDailyRollup(
  client: SupabaseClient,
  params?: Omit<ExplorationParams, "since"> & { days?: number }
): Promise<DailyRow[]> {
  const callParams = {
    _days: params?.days ?? 30,
    _module_category: params?.moduleCategory ?? null,
    _plan_year: params?.planYear ?? null,
    _provider_type: params?.providerType ?? null,
  };
  const { data, error } = await client.rpc("exploration_daily_rollup", callParams);
  if (error) throw error;
  const parsed = z.array(DailyRow).safeParse(data ?? []);
  if (!parsed.success) throw new Error(`[getDailyRollup] Validation failed: ${parsed.error.message}`);
  return parsed.data;
}

/* ----------------------- Smart Re-Ranker Weights ----------------------- */

export const SmartWeights = z.object({
  bias: z.number(),
  w_cost: z.number(),
  w_weeks: z.number(),
  w_cri: z.number(),
  w_transfer_ok: z.number(),
  w_provider_ace: z.number(),
  w_provider_clep: z.number(),
  w_provider_nccrs: z.number(),
  w_provider_other: z.number(),
  w_exploratory_bonus: z.number(),
});
export type SmartWeights = z.infer<typeof SmartWeights>;

export async function loadActiveWeights(
  client: SupabaseClient
): Promise<SmartWeights> {
  const { data, error } = await client.rpc("get_active_re_rank_weights");
  if (error) {
    console.warn("[SmartRecs] Using fallback weights due to RPC error:", error);
    return {
      bias: 0,
      w_cost: -0.20,
      w_weeks: -0.10,
      w_cri: 0.25,
      w_transfer_ok: 0.30,
      w_provider_ace: 0.05,
      w_provider_clep: 0.03,
      w_provider_nccrs: 0.02,
      w_provider_other: 0.0,
      w_exploratory_bonus: 0.0,
    };
  }
  const parsed = SmartWeights.safeParse(data);
  if (!parsed.success) {
    console.warn("[SmartRecs] RPC returned invalid shape; falling back:", parsed.error.message);
    return {
      bias: 0,
      w_cost: -0.20,
      w_weeks: -0.10,
      w_cri: 0.25,
      w_transfer_ok: 0.30,
      w_provider_ace: 0.05,
      w_provider_clep: 0.03,
      w_provider_nccrs: 0.02,
      w_provider_other: 0.0,
      w_exploratory_bonus: 0.0,
    };
  }
  return parsed.data;
}

/* ------------------------- Convenience Combos -------------------------- */

export async function getExplorationAnalytics(
  client: SupabaseClient,
  params?: ExplorationParams
) {
  const [split, funnel, daily] = await Promise.all([
    getBucketSplit(client, params),
    getFunnel(client, params),
    getDailyRollup(client, { ...params, days: 30 }),
  ]);
  return { split, funnel, daily };
}
