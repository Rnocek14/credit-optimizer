// Zod Validation Schemas for Course Intelligence
// Ensures type safety and request validation

import { z } from "zod";

// Request Validation Schemas
export const CriRequestSchema = z.object({
  userId: z.string().uuid(),
  trackId: z.string().uuid(),
  forceRecompute: z.boolean().optional().default(false)
});

export const RecoRequestSchema = z.object({
  userId: z.string().uuid(),
  trackId: z.string().uuid(),
  limit: z.number().int().min(1).max(20).optional().default(6),
  strategy: z.enum(["gap_fill", "foundations", "accelerate"]).optional().default("gap_fill"),
  excludeCourseIds: z.array(z.string().uuid()).optional().default([])
});

// Response Validation Schemas
export const CRIComponentSchema = z.object({
  skillId: z.string().uuid(),
  target: z.number(),
  current: z.number(),
  weight: z.number()
});

export const CRIResultSchema = z.object({
  success: z.literal(true),
  userId: z.string().uuid(),
  trackId: z.string().uuid(),
  cri: z.number(),
  components: z.array(CRIComponentSchema),
  modelVersion: z.string(),
  computedAt: z.string(),
  cached: z.boolean()
});

export const CIPlatformSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: z.string(),
  url: z.string()
});

export const CIInstructorSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  org: z.string().optional(),
  reputation: z.number().min(0).max(5)
});

export const CICourseSchema = z.object({
  id: z.string().uuid(),
  platform: CIPlatformSchema,
  instructor: CIInstructorSchema.optional(),
  title: z.string(),
  slug: z.string(),
  url: z.string(),
  difficulty: z.number().int().min(1).max(5),
  durationHours: z.number()
});

export const CIRecoCoverSchema = z.object({
  skillId: z.string().uuid(),
  from: z.number(),
  to: z.number(),
  weight: z.number()
});

export const CIRecommendationSchema = z.object({
  course: CICourseSchema,
  reason: z.string(),
  score: z.number().min(0).max(1),
  covers: z.array(CIRecoCoverSchema),
  expectedCRIChange: z.number()
});

export const RecoResultSchema = z.object({
  success: z.literal(true),
  userId: z.string().uuid(),
  trackId: z.string().uuid(),
  recommendations: z.array(CIRecommendationSchema),
  metrics: z.object({
    candidateCount: z.number(),
    selected: z.number(),
    criBefore: z.number().optional(),
    criAfterEstimate: z.number().optional()
  }),
  modelVersion: z.string()
});

export const CITelemetrySchema = z.object({
  latency_ms: z.number(),
  tokens_in: z.number(),
  tokens_out: z.number(),
  db_reads: z.number(),
  db_writes: z.number(),
  strategy: z.string().optional()
});

// Type inference
export type CriRequestInput = z.infer<typeof CriRequestSchema>;
export type RecoRequestInput = z.infer<typeof RecoRequestSchema>;
export type CRIResultValidated = z.infer<typeof CRIResultSchema>;
export type RecoResultValidated = z.infer<typeof RecoResultSchema>;