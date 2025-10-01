/**
 * Batched hook for fetching course options for multiple requirement blocks
 * Returns Map<block_id, Course[]> with full course details + evidence
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QUERY_KEYS } from '@/lib/queryKeys';
import type { Database } from '@/integrations/supabase/types';
import { trace, mark, measure } from '../utils/debug';

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
      mark('mp_batch:start');
      
      if (blockIds.length === 0) return new Map<string, CourseOption[]>();

      // Normalize block IDs (handle both UUID and slug formats)
      const normalized = blockIds.map(id => id.toLowerCase());
      
      // Resolve slugs -> UUIDs if any IDs are non-UUID (best-effort)
      const slugCandidates = normalized.filter(id => !/^[0-9a-f-]{36}$/.test(id));
      let uuidSet = new Set(normalized.filter(id => /^[0-9a-f-]{36}$/.test(id)));
      
      if (slugCandidates.length > 0) {
        const { data: slugRows } = await supabase
          .from('requirement_blocks')
          .select('id, slug')
          .in('slug', slugCandidates);
        slugRows?.forEach(r => uuidSet.add(String(r.id).toLowerCase()));
      }
      
      const normalizedIds = Array.from(uuidSet);

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

      // Step 1b: fetch slugs for these requirement_ids so we can alias keys
      const uniqueReqIds = [...new Set(optionsData.map(o => String(o.requirement_id).toLowerCase()))];
      const { data: rbRows, error: rbErr } = await supabase
        .from('requirement_blocks')
        .select('id, slug')
        .in('id', uniqueReqIds);
      if (rbErr) throw rbErr;
      const slugById = new Map<string, string>();
      (rbRows || []).forEach(r => {
        if (r?.id && r?.slug) slugById.set(String(r.id).toLowerCase(), String(r.slug).toLowerCase());
      });

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

      // Step 5: Group options by block ID, and also alias by slug
      const resultMap = new Map<string, CourseOption[]>();
      optionsData.forEach(opt => {
        if (!opt.option_ref_id) return;
        
        const course = courseMap.get(opt.option_ref_id);
        if (!course) return;

        const uuidKey = String(opt.requirement_id).toLowerCase();
        const slugKey = slugById.get(uuidKey);
        if (!resultMap.has(uuidKey)) resultMap.set(uuidKey, []);
        resultMap.get(uuidKey)!.push(course);
        if (slugKey) {
          if (!resultMap.has(slugKey)) resultMap.set(slugKey, []);
          resultMap.get(slugKey)!.push(course);
        }
      });

      if (process.env.NODE_ENV === 'development') {
        const sampleBlock = resultMap.size > 0 ? Array.from(resultMap.entries())[0] : null;
        console.log('[useRequirementOptionsBatch] Fetched:', {
          scope,
          blockIdsCount: blockIds.length,
          blockIdsSample: blockIds.slice(0, 3),
          totalOptions: optionsData.length,
          coursesFound: coursesData?.length || 0,
          resultMapSize: resultMap.size,
          sampleBlock: sampleBlock ? {
            blockId: sampleBlock[0],
            optionsCount: sampleBlock[1].length,
            firstCourse: sampleBlock[1][0]?.code
          } : null
        });
      }
      
      // STAGE 1: MP_BATCH - Log all blocks with options
      measure('mp_batch:total', 'mp_batch:start', 'mp_batch:end');
      for (const [blockKey, items] of resultMap.entries()) {
        if (!items?.length) continue;
        trace({
          stage: 'MP_BATCH',
          t: Date.now(),
          blockId: blockKey,
          mp: { 
            count: items.length, 
            optionsLen: items.length, 
            signature: `raw|${blockKey}|${items.length}` 
          },
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
