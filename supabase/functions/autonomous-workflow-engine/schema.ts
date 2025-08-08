import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

export const WorkflowInput = z.object({
  workflow_template: z.string().min(1).optional(),
  user_id: z.string().uuid().optional(),
  dry_run: z.boolean().optional(),
});
export type TWorkflowInput = z.infer<typeof WorkflowInput>;
