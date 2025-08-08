import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

export const PdfExportInput = z.object({
  resume_id: z.string().uuid().optional(),
});
export type TPdfExportInput = z.infer<typeof PdfExportInput>;
