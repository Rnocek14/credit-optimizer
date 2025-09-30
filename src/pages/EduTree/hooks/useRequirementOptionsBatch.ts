/**
 * Batched hook for fetching course options for multiple requirement blocks
 * Returns Map<block_id, Course[]> with full course details + evidence
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QUERY_KEYS } from '@/lib/queryKeys';
import type { Database } from '@/integrations/supabase/types';

type DBCourse = Database['public']['Tables']['edu_courses']['Row'];

export interface CourseOption {
  courseId: string;
  code: string;
  title: string;
  provider: string;
  credits: number;
  cost?: number;
  evidence: {
    ace?: boolean;
    clep?: boolean;
    url?: string;
  };
}

export interface RequirementOptionsBatchResult {
  optionsByBlock: Map<string, CourseOption[]>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch course options for multiple blocks in a single batched query
 * @param blockIds - Array of requirement block IDs
 * @param scope - Scope string for cache key (e.g., "bs_cs|se|compare-programs")
 * @param enabled - Whether to run the query
 */
export function useRequirementOptionsBatch(
  blockIds: string[],
  scope: string,
  enabled = true
): RequirementOptionsBatchResult {
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.requirementOptionsBatch(blockIds, scope),
    queryFn: async () => {
      if (blockIds.length === 0) return new Map<string, CourseOption[]>();

      // Normalize block IDs (handle both UUID and slug formats)
      const normalizedIds = blockIds.map(id => id.toLowerCase());

      // Step 1: Fetch requirement_options for all blocks
      // Schema: requirement_id, option_kind (enum), option_ref_id (UUID pointing to course)
      const { data: optionsData, error: optionsError } = await supabase
        .from('requirement_options')
        .select('requirement_id, option_kind, option_ref_id, transfer_eligible, credits_awarded')
        .in('requirement_id', normalizedIds)
        .eq('option_kind', 'course'); // Filter to only course options

      if (optionsError) throw optionsError;
      if (!optionsData || optionsData.length === 0) {
        return new Map<string, CourseOption[]>();
      }

      // Step 2: Get unique course IDs (from option_ref_id which points to edu_courses)
      const courseIds = [...new Set(optionsData.map(opt => opt.option_ref_id))].filter(Boolean);

      // Step 3: Fetch full course details
      const { data: coursesData, error: coursesError } = await supabase
        .from('edu_courses')
        .select('id, code, title, area, credits, is_core, is_capstone, description')
        .in('id', courseIds);

      if (coursesError) throw coursesError;

      // Step 4: Build map of course_id -> CourseOption
      const courseMap = new Map<string, CourseOption>();
      (coursesData || []).forEach((course: DBCourse) => {
        const evidence = typeof course.description === 'string' 
          ? tryParseEvidence(course.description)
          : { ace: false, clep: false };

        courseMap.set(course.id, {
          courseId: course.id,
          code: course.code,
          title: course.title,
          provider: course.area || 'Unknown',
          credits: course.credits,
          cost: undefined, // TODO: Add cost field to edu_courses or join with pricing table
          evidence,
        });
      });

      // Step 5: Group options by block ID
      const resultMap = new Map<string, CourseOption[]>();
      optionsData.forEach(opt => {
        if (!opt.option_ref_id) return;
        
        const course = courseMap.get(opt.option_ref_id);
        if (!course) return;

        const blockId = opt.requirement_id.toLowerCase();
        if (!resultMap.has(blockId)) {
          resultMap.set(blockId, []);
        }
        resultMap.get(blockId)!.push(course);
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('[useRequirementOptionsBatch] Fetched:', {
          blockIds: blockIds.slice(0, 3),
          totalOptions: optionsData.length,
          coursesFound: coursesData?.length || 0,
          resultMapSize: resultMap.size,
        });
      }

      return resultMap;
    },
    enabled: enabled && blockIds.length > 0,
    staleTime: 30000, // 30s cache
  });

  return {
    optionsByBlock: data || new Map(),
    isLoading,
    error: error as Error | null,
  };
}

/**
 * Try to parse ACE/CLEP evidence from course description or metadata
 */
function tryParseEvidence(description: string): { ace?: boolean; clep?: boolean; url?: string } {
  const lower = description.toLowerCase();
  return {
    ace: lower.includes('ace') || lower.includes('american council on education'),
    clep: lower.includes('clep') || lower.includes('college level examination'),
  };
}
