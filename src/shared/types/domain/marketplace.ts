/**
 * Domain types for the course marketplace.
 */
import type { Database } from '@/integrations/supabase/types';

/** Full marketplace_courses row from Supabase */
export type MarketplaceCourseRow = Database['public']['Tables']['marketplace_courses']['Row'];

/** Requirement options view row (by block) */
export type RequirementOptionViewRow = Database['public']['Views']['requirement_options_view_by_block']['Row'];

/** Requirement option counts view row */
export type RequirementOptionCountRow = Database['public']['Views']['requirement_option_counts']['Row'];

/** Slim marketplace option used in UI consumers */
export interface MarketplaceOptionLite {
  id: string;
  code: string;
  title: string;
  credits: number;
  cost_usd: number | null;
  duration_weeks: number | null;
  cri_score: number | null;
  providerCode: string | null;
  providerType: string | null;
  level: number | null;
}
