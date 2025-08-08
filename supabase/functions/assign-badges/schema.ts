import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

export const AssignBadgesInput = z.object({
  user_id: z.string().uuid().optional(),
  dry_run: z.boolean().optional(),
});
export type TAssignBadgesInput = z.infer<typeof AssignBadgesInput>;
