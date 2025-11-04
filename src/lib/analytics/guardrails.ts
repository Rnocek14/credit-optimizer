import { twoProportionZTest } from '@/utils/statisticalSignificance';
import { logEvent } from '@/lib/analytics';
import { supabase } from '@/integrations/supabase/client';

export type GuardrailInput = {
  exploredA: number; appliedA: number;
  exploredB: number; appliedB: number;
  minPerBucket?: number;   // default 200
  alpha?: number;          // default 0.05
};

export function evaluateSmartRecsGuardrail(inp: GuardrailInput) {
  const { exploredA, appliedA, exploredB, appliedB, minPerBucket = 200, alpha = 0.05 } = inp;
  const stats = twoProportionZTest(appliedA, exploredA, appliedB, exploredB, alpha);
  const rateA = exploredA ? appliedA / exploredA : 0;
  const rateB = exploredB ? appliedB / exploredB : 0;
  const liftPct = 100 * (rateB - rateA);
  const shouldDisable = stats.sampleSizeAdequate && stats.isSignificant && liftPct < 0;
  return { shouldDisable, liftPct, stats };
}

export async function applyGuardrailIfNeeded(res: ReturnType<typeof evaluateSmartRecsGuardrail>) {
  if (!res.shouldDisable) return false;
  localStorage.setItem('V5_SMART_RECS', 'false');
  logEvent('smart_recs_auto_guard', {
    reason: 'significant_negative_lift',
    liftPct: Number(res.liftPct.toFixed(2)),
    pValue: Number(res.stats.pValue.toFixed(4)),
    ciLower: Number((res.stats.confidenceInterval.lower * 100).toFixed(1)),
    ciUpper: Number((res.stats.confidenceInterval.upper * 100).toFixed(1)),
  });
  // optional DB audit (safe no-op if table missing)
  try {
    // @ts-ignore - table may not exist in types yet
    const { error } = await supabase
      // @ts-ignore
      .from('smart_recs_guardrail_audit')
      .insert({
        lift_pct: res.liftPct, p_value: res.stats.pValue,
        ci_lower: res.stats.confidenceInterval.lower * 100,
        ci_upper: res.stats.confidenceInterval.upper * 100,
        action: 'auto_disable',
      } as any);
  } catch { /* ignore */ }
  return true;
}
