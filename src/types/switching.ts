import { z } from 'zod';

export const SwitchMetricsSchema = z.object({
  skillOverlap: z.number().int().min(0).max(100),
  transferCredit: z.number().int().min(0).max(100),
  timeGained: z.number().nonnegative(),
  timeLost: z.number().nonnegative(),
  switchCost: z.number().nonnegative(),
  roi3yr: z.number(),
  breakEvenMonths: z.number().int().nonnegative(),
  criDelta: z.number(),
});
export type SwitchMetrics = z.infer<typeof SwitchMetricsSchema>;

export const RiskBreakdownSchema = z.object({
  automation_risk: z.number().min(0).max(100),
  age_penalty_impact: z.number().min(0).max(100),
  switch_difficulty: z.number().min(0).max(100),
  market_volatility: z.number().min(0).max(100),
  skill_mismatch: z.number().min(0).max(100),
});
export type RiskBreakdown = z.infer<typeof RiskBreakdownSchema>;

export const RiskAnalysisSchema = z.object({
  riskId: z.string().uuid().optional(),
  overallRisk: z.number().min(0).max(100),
  riskLevel: z.enum(['Low','Medium','High']),
  breakdown: RiskBreakdownSchema,
  factors: z.object({
    aiJobRisk: z.number().min(0).max(100),
    agePenaltyFactor: z.number().min(0),
    switchDifficulty: z.number().min(0).max(100),
    roiVolatility: z.number().min(0).max(100),
    criMismatch: z.number().min(0).max(100)
  }),
  trackTitle: z.string().optional()
});
export type RiskAnalysis = z.infer<typeof RiskAnalysisSchema>;

export const SwitchResultSchema = z.object({
  switchId: z.string().uuid().optional(),
  metrics: SwitchMetricsSchema,
  tracks: z.object({ from: z.string().nullable(), to: z.string().nullable() })
});
export type SwitchResult = z.infer<typeof SwitchResultSchema>;

export const LocationRankSchema = z.object({
  city: z.string(),
  country: z.string(),
  currentSalary: z.number(),
  targetSalary: z.number(),
  costOfLiving: z.number(),
  netIncome: z.number(),
  breakEvenMonths: z.number().int().nullable(),
  lqi: z.number(),
  deltaROI: z.number(),
  demandScore: z.number(),
  visaRequired: z.boolean(),
  salaryMultiplier: z.number(),
  colIndex: z.number(),
});
export type LocationRank = z.infer<typeof LocationRankSchema>;

export const ProfileCardDataSchema = z.object({
  trackTitle: z.string(),
  criScore: z.number(),
  criLevel: z.string(),
  switchReadiness: z.number(),
  riskLevel: z.string(),
  overallRisk: z.number(),
  roi3yr: z.number(),
  lqi: z.number(),
  rank: z.number(),
  breakEvenMonths: z.number().optional(),
  nextMilestone: z.object({ title: z.string(), eta: z.string() }).optional(),
});
export type ProfileCardData = z.infer<typeof ProfileCardDataSchema>;
