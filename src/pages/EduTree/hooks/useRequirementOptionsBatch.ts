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
    queryKey: ['reqOptionsBatch', scope, [...blockIds].sort()], // Stable cache key
    queryFn: async () => {
      mark('mp_batch:start');
      
      // STAGE 0: INPUT - Log what we're asking for
      trace({
        stage: 'MP_BATCH',
        t: Date.now(),
        note: 'INPUT',
        mp: { count: blockIds.length },
      });
      
      if (blockIds.length === 0) {
        trace({ stage: 'MP_BATCH', t: Date.now(), note: 'EMPTY_BLOCKIDS' });
        return new Map<string, CourseOption[]>();
      }
      
      console.log('[MP_BATCH][INPUT]', {
        scope,
        blockIdsCount: blockIds.length,
        blockIdsSample: blockIds.slice(0, 8),
      });

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

      // STAGE 1: DB_FETCH - Log what came back
      trace({
        stage: 'MP_BATCH',
        t: Date.now(),
        note: 'DB_FETCH',
        mp: { count: optionsData?.length ?? 0 },
      });
      
      console.log('[MP_BATCH][DB_FETCH]', {
        scope,
        normalizedIdsCount: normalizedIds.length,
        normalizedIdsSample: normalizedIds.slice(0, 5),
        optionsDataCount: optionsData?.length ?? 0,
        error: optionsError ? String(optionsError) : null,
      });

      if (optionsError) {
        console.error('[MP_BATCH][DB_ERROR]', { scope, error: optionsError });
        throw optionsError;
      }
      
      if (!optionsData || optionsData.length === 0) {
        console.warn('[MP_BATCH] ⚠️ No requirement_options rows returned', {
          scope,
          normalizedIdsCount: normalizedIds.length,
          normalizedIdsSample: normalizedIds.slice(0, 5),
        });
        mark('mp_batch:end');
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

      // Step 5: Group options by block ID using robust key resolution
      const resultMap = new Map<string, CourseOption[]>();
      const idSet = new Set(blockIds.map(s => s.toLowerCase()));
      
      // Helper to find best key for this row
      const keyFromRow = (opt: any): string[] => {
        const uuidKey = String(opt.requirement_id).toLowerCase();
        const slugKey = slugById.get(uuidKey);
        
        const candidates = [
          uuidKey,
          slugKey,
        ].filter(Boolean) as string[];
        
        return candidates;
      };
      
      optionsData.forEach(opt => {
        if (!opt.option_ref_id) return;
        
        const course = courseMap.get(opt.option_ref_id);
        if (!course) return;

        const keys = keyFromRow(opt);
        for (const k of keys) {
          if (!resultMap.has(k)) resultMap.set(k, []);
          resultMap.get(k)!.push(course);
        }
      });
      
      // STAGE 1.5: GROUPING_SUMMARY
      if (optionsData.length > 0) {
        const sample = Array.from(resultMap.entries()).slice(0, 3).map(([k, v]) => ({ k, n: v.length }));
        trace({
          stage: 'MP_BATCH',
          t: Date.now(),
          note: 'GROUPED',
          mp: { count: resultMap.size },
        });
        console.log('[MP_BATCH][GROUPED]', {
          mapSize: resultMap.size,
          sample,
          allKeys: Array.from(resultMap.keys()),
        });
      }
      
      // SMOKE ASSERT: Empty result when we expected data
      if (blockIds.length > 0 && resultMap.size === 0) {
        console.warn('[MP_BATCH] ⚠️ No options for any block', {
          scope,
          blockIdsCount: blockIds.length,
          blockIdsSample: blockIds.slice(0, 8),
          normalizedIdsCount: normalizedIds.length,
          optionsDataCount: optionsData.length,
          coursesDataCount: coursesData?.length ?? 0,
        });
      }

      // STAGE 2: MP_BATCH - Log all blocks with options
      mark('mp_batch:end');
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
