/**
 * Domain types for EduTree — requirement blocks, courses, gates.
 */
import type { Database } from '@/integrations/supabase/types';

/** Full edu_courses row */
export type EduCourseRow = Database['public']['Tables']['edu_courses']['Row'];

/** Full requirement_blocks row */
export type RequirementBlockRow = Database['public']['Tables']['requirement_blocks']['Row'];

/** Full block_members row */
export type BlockMemberRow = Database['public']['Tables']['block_members']['Row'];

/** Full block_gates row */
export type BlockGateRow = Database['public']['Tables']['block_gates']['Row'];
