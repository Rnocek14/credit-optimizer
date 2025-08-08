import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

export const CourseIntegratorInput = z.object({
  plan_id: z.string().uuid().optional(),
  course_id: z.string().optional(),
  action: z.enum(['approve','reject']).optional(),
});
export type TCourseIntegratorInput = z.infer<typeof CourseIntegratorInput>;
