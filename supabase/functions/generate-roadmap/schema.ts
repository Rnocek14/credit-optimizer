import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

export const GenerateRoadmapInput = z.object({
  goal: z.string().optional(),
  user_skills: z.array(z.string()).optional(),
  max_time: z.string().optional(),
  max_budget: z.string().optional(),
  preferred_locations: z.array(z.string()).optional(),
});
export type TGenerateRoadmapInput = z.infer<typeof GenerateRoadmapInput>;
