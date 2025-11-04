import type { SupabaseClient } from "@supabase/supabase-js";
import { loadActiveWeights, SmartWeights } from "./explorationApi";

export type { SmartWeights } from "./explorationApi";

export async function getSmartWeightsOrDefault(client: SupabaseClient): Promise<SmartWeights> {
  return loadActiveWeights(client);
}
