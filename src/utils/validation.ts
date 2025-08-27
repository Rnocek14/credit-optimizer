import { z } from 'zod';

// Course Intelligence API Response Schemas
export const CIComponentSchema = z.object({
  skillId: z.string(),
  target: z.number().min(0).max(100),
  current: z.number().min(0).max(100),
  weight: z.number().min(0).max(1)
});

export const CITelemetrySchema = z.object({
  latency_ms: z.number().positive(),
  db_reads: z.number().nonnegative(),
  db_writes: z.number().nonnegative(),
  strategy: z.string()
});

export const CRIResponseSchema = z.object({
  success: z.boolean(),
  userId: z.string().uuid(),
  trackId: z.string().uuid(),
  cri: z.number().min(0).max(100),
  components: z.array(CIComponentSchema),
  modelVersion: z.string(),
  computedAt: z.string().datetime(),
  cached: z.boolean(),
  telemetry: CITelemetrySchema
});

export const CIPlatformSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  url: z.string().url()
});

export const CIInstructorSchema = z.object({
  id: z.string(),
  name: z.string(),
  org: z.string().nullable(),
  reputation: z.number().min(0).max(5).nullable()
});

export const CICourseSchema = z.object({
  id: z.string().uuid(),
  platform: CIPlatformSchema,
  instructor: CIInstructorSchema.nullable(),
  title: z.string().min(1),
  slug: z.string(),
  url: z.string().url(),
  difficulty: z.number().int().min(1).max(5),
  durationHours: z.number().positive()
});

export const CISkillCoverageSchema = z.object({
  skillId: z.string(),
  from: z.number().min(0).max(100),
  to: z.number().min(0).max(100),
  weight: z.number().min(0).max(1)
});

export const CIRecommendationSchema = z.object({
  course: CICourseSchema,
  reason: z.string(),
  score: z.number().min(0).max(1),
  covers: z.array(CISkillCoverageSchema),
  expectedCRIChange: z.number().min(0)
});

export const RecommendationsResponseSchema = z.object({
  success: z.boolean(),
  userId: z.string().uuid(),
  trackId: z.string().uuid(),
  recommendations: z.array(CIRecommendationSchema),
  metrics: z.object({
    candidateCount: z.number().nonnegative(),
    selected: z.number().nonnegative(),
    criBefore: z.number().min(0).max(100),
    criAfterEstimate: z.number().min(0).max(100)
  }),
  modelVersion: z.string(),
  telemetry: CITelemetrySchema
});

// Input validation schemas
export const CourseEventInputSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  courseId: z.string().uuid('Invalid course ID format'),
  eventType: z.enum(['saved', 'enrolled', 'completed', 'assessed'], {
    errorMap: () => ({ message: 'Event type must be saved, enrolled, completed, or assessed' })
  }),
  score: z.number().min(0).max(100).optional(),
  notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional()
});

export const SearchQuerySchema = z.object({
  query: z.string().max(200, 'Search query too long').optional(),
  filters: z.object({
    platform: z.string().optional(),
    difficulty: z.enum(['1-2', '3', '4-5']).optional(),
    skills: z.array(z.string()).max(10, 'Too many skill filters').optional()
  }).optional()
});

export const TelemetryEventSchema = z.object({
  task: z.string().min(1, 'Task name is required'),
  route: z.string().optional(),
  complexity: z.record(z.unknown()).optional(),
  success: z.boolean().optional(),
  function_name: z.string().optional()
});

// Utility functions
export function validateApiResponse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      throw new Error(`API response validation failed: ${errorMessage}`);
    }
    throw error;
  }
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .trim()
    .slice(0, 1000); // Limit length
}

export function validateUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateCRIScore(score: number): boolean {
  return typeof score === 'number' && score >= 0 && score <= 100 && !isNaN(score);
}

export function validateDifficulty(difficulty: number): boolean {
  return Number.isInteger(difficulty) && difficulty >= 1 && difficulty <= 5;
}