import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getBucketSplit,
  getFunnel,
  getDailyRollup,
  getExplorationAnalytics,
  loadActiveWeights,
  type BucketSplitRow,
  type FunnelRow,
  type DailyRow,
  type SmartWeights,
} from "../explorationApi";

/* ------------------------ Supabase RPC mock helper ----------------------- */

function mockClient(rpcImpl: (fn: string, args?: any) => any): SupabaseClient {
  return {
    rpc: vi.fn(async (fn: string, args?: any) => {
      const res = await rpcImpl(fn, args);
      return res;
    }),
  } as unknown as SupabaseClient;
}

/* -------------------------------- Fixtures ------------------------------- */

const splitRows: BucketSplitRow[] = [
  { bucket: "A", users: 120, assignment_events: 150 },
  { bucket: "B", users: 118, assignment_events: 149 },
];

const funnelRows: FunnelRow[] = [
  { bucket: "A", explored: 300, applied: 45, apply_rate_pct: 15.0 },
  { bucket: "B", explored: 320, applied: 64, apply_rate_pct: 20.0 },
];

const dailyRows: DailyRow[] = [
  { day: "2025-11-01", bucket: "A", explored: 10, applied: 1, apply_rate_pct: 10.0 },
  { day: "2025-11-01", bucket: "B", explored: 12, applied: 3, apply_rate_pct: 25.0 },
];

const weights: SmartWeights = {
  bias: 0,
  w_cost: -0.2,
  w_weeks: -0.1,
  w_cri: 0.25,
  w_transfer_ok: 0.3,
  w_provider_ace: 0.12,
  w_provider_clep: 0.06,
  w_provider_nccrs: 0.04,
  w_provider_other: 0,
  w_exploratory_bonus: 0.05,
};

let calls: { fn: string; args?: any }[] = [];

beforeEach(() => {
  calls = [];
});

/* --------------------------------- Tests --------------------------------- */

describe("explorationApi SDK", () => {
  it("getBucketSplit returns validated data and passes filters", async () => {
    const client = mockClient(async (fn, args) => {
      calls.push({ fn, args });
      if (fn === "exploration_bucket_split") return { data: splitRows, error: null };
      return { data: null, error: null };
    });
    const out = await getBucketSplit(client, {
      since: "21 days",
      moduleCategory: "gen_ed",
      planYear: 1,
      providerType: "ACE",
    });
    expect(out).toEqual(splitRows);
    expect(calls[0].fn).toBe("exploration_bucket_split");
    expect(calls[0].args).toEqual({
      _since: "21 days",
      _module_category: "gen_ed",
      _plan_year: 1,
      _provider_type: "ACE",
    });
  });

  it("getFunnel validates shape and throws on RPC error", async () => {
    const clientErr = mockClient(async (fn) => ({ data: null, error: { message: "boom" } }));
    await expect(getFunnel(clientErr)).rejects.toBeTruthy();

    const clientOk = mockClient(async (fn) => ({ data: funnelRows, error: null }));
    const out = await getFunnel(clientOk);
    expect(out).toEqual(funnelRows);
  });

  it("getDailyRollup uses default 30 days and validates", async () => {
    const client = mockClient(async (fn, args) => {
      calls.push({ fn, args });
      if (fn === "exploration_daily_rollup") return { data: dailyRows, error: null };
      return { data: null, error: null };
    });
    const out = await getDailyRollup(client, { moduleCategory: null, planYear: null, providerType: null });
    expect(out).toEqual(dailyRows);
    expect(calls[0].args).toEqual({
      _days: 30,
      _module_category: null,
      _plan_year: null,
      _provider_type: null,
    });
  });

  it("getExplorationAnalytics calls all three RPCs in parallel", async () => {
    const client = mockClient(async (fn) => {
      if (fn === "exploration_bucket_split") return { data: splitRows, error: null };
      if (fn === "exploration_funnel") return { data: funnelRows, error: null };
      if (fn === "exploration_daily_rollup") return { data: dailyRows, error: null };
      return { data: null, error: null };
    });
    const res = await getExplorationAnalytics(client, { since: "14 days" });
    expect(res.split).toEqual(splitRows);
    expect(res.funnel).toEqual(funnelRows);
    expect(res.daily).toEqual(dailyRows);
  });

  it("loadActiveWeights returns DB row or sensible fallback on error", async () => {
    const clientOk = mockClient(async (fn) => ({ data: weights, error: null }));
    const w1 = await loadActiveWeights(clientOk);
    expect(w1).toEqual(weights);

    const clientFail = mockClient(async (fn) => ({ data: null, error: { message: "no rpc" } }));
    const w2 = await loadActiveWeights(clientFail);
    expect(w2).toMatchObject({
      w_cri: 0.25,
      w_transfer_ok: 0.30,
    });
  });

  it("zod validation rejects malformed data", async () => {
    const bad = [{ bucket: "A", users: "not-a-number", assignment_events: 1 }];
    const client = mockClient(async (fn) => ({ data: bad, error: null }));
    await expect(getBucketSplit(client)).rejects.toThrow(/Validation failed/i);
  });
});
