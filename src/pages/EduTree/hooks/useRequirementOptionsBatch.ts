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

// Subset of course fields we fetch for options
type CourseData = Pick<DBCourse, 'id' | 'code' | 'title' | 'area' | 'credits' | 'is_core' | 'is_capstone' | 'description'>;

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

      // Step 1: Build reliable ID maps (slug <-> UUID)
      const { data: reqs, error: reqsError } = await supabase
        .from('requirement_blocks')
        .select('id, slug');
      
      if (reqsError) throw reqsError;

      const idBySlug = new Map((reqs || []).map(r => [String(r.slug).toLowerCase(), String(r.id).toLowerCase()]));
      const slugById = new Map((reqs || []).map(r => [String(r.id).toLowerCase(), String(r.slug).toLowerCase()]));

      // Normalize incoming blockIds → UUIDs where possible
      const normalizedIds = [...new Set(blockIds
        .map(k => (idBySlug.get(String(k).toLowerCase()) ?? String(k).toLowerCase()))
      )];

      trace({
        stage: 'MP_BATCH',
        t: Date.now(),
        note: 'ID_RESOLUTION',
        mp: { 
          count: normalizedIds.length,
          signature: `resolve|${blockIds.length}→${normalizedIds.length}`
        }
      });

      if (blockIds.length > 0 && normalizedIds.length === 0) {
        console.error('[MP_BATCH] ⚠️ ID resolution produced zero UUIDs', {
          scope,
          blockIdsSample: blockIds.slice(0, 8),
        });
        trace({ stage: 'MP_BATCH', t: Date.now(), note: 'ID_RESOLUTION_EMPTY' });
        return new Map<string, CourseOption[]>();
      }

      // Step 2: Probe query to discover actual option_kind values (no filter)
      const { data: probe, error: probeErr } = await supabase
        .from('requirement_options')
        .select('requirement_id, option_kind, option_ref_id')
        .in('requirement_id', normalizedIds)
        .limit(50); // Small sample is fine

      if (probeErr) throw probeErr;

      const kindCounts = (probe || []).reduce((acc, r) => {
        const kind = r.option_kind ?? 'NULL';
        acc[kind] = (acc[kind] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      trace({
        stage: 'MP_BATCH',
        t: Date.now(),
        note: 'DB_PROBE',
        mp: { 
          count: probe?.length ?? 0, 
          signature: `probe|${probe?.length ?? 0}|${Object.keys(kindCounts).join(',')}`
        }
      });

      console.log('[MP_BATCH][DB_PROBE]', {
        scope,
        probeRows: probe?.length ?? 0,
        kindCounts,
        normalizedIdsSample: normalizedIds.slice(0, 5),
      });

      // Step 3: Main query - use 'course' if found in probe, otherwise no filter
      const hasCourseKind = kindCounts['course'] > 0;
      
      let query = supabase
        .from('requirement_options')
        .select('requirement_id, option_kind, option_ref_id, transfer_eligible, credits_awarded')
        .in('requirement_id', normalizedIds);

      // Only filter by 'course' if the probe confirmed it exists
      if (hasCourseKind) {
        query = query.eq('option_kind', 'course');
      }

      const { data: optionsData, error: optionsError } = await query;

      trace({
        stage: 'MP_BATCH',
        t: Date.now(),
        note: 'DB_FETCH',
        mp: { 
          count: optionsData?.length ?? 0,
          signature: `fetch|${optionsData?.length ?? 0}|${hasCourseKind ? 'course' : 'all'}`
        },
      });
      
      console.log('[MP_BATCH][DB_FETCH]', {
        scope,
        normalizedIdsCount: normalizedIds.length,
        normalizedIdsSample: normalizedIds.slice(0, 5),
        optionsDataCount: optionsData?.length ?? 0,
        hasCourseKind,
        kindCounts,
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
          hasCourseKind,
          kindCounts,
        });
        trace({ stage: 'MP_BATCH', t: Date.now(), note: 'NO_ROWS' });
        mark('mp_batch:end');
        return new Map<string, CourseOption[]>();
      }

      // Step 4: Fetch courses for all option_ref_ids
      const courseIds = [...new Set(optionsData.map(opt => opt.option_ref_id))].filter(Boolean);
      
      const { data: coursesData, error: coursesError } = await supabase
        .from('edu_courses')
        .select('id, code, title, area, credits, is_core, is_capstone, description')
        .in('id', courseIds);

      if (coursesError) {
        console.error('[MP_BATCH][COURSES_ERROR]', { scope, error: coursesError });
        throw coursesError;
      }

      // Build course map
      const courseMap = new Map<string, CourseData>();
      (coursesData || []).forEach(course => {
        courseMap.set(course.id, course);
      });

      trace({
        stage: 'MP_BATCH',
        t: Date.now(),
        note: 'COURSES_FETCHED',
        mp: { 
          count: coursesData?.length ?? 0,
          signature: `courses|${coursesData?.length ?? 0}`
        }
      });

      // Step 5: Group options by block ID
      const resultMap = new Map<string, CourseOption[]>();
      
      for (const row of optionsData) {
        if (!row.option_ref_id) continue;
        
        const course = courseMap.get(row.option_ref_id);
        if (!course) {
          console.warn('[MP_BATCH] Course not found for option_ref_id', { option_ref_id: row.option_ref_id });
          continue;
        }
        const evidence = typeof course.description === 'string' 
          ? tryParseEvidence(course.description)
          : { ace: false, clep: false };

        const courseOption: CourseOption = {
          courseId: course.id,
          code: course.code,
          title: course.title,
          provider: course.area || 'Unknown',
          credits: course.credits,
          cost: undefined,
          evidence,
        };

        const uuidKey = String(row.requirement_id).toLowerCase();
        const slugKey = slugById.get(uuidKey);

        for (const k of [uuidKey, slugKey].filter(Boolean) as string[]) {
          if (!resultMap.has(k)) resultMap.set(k, []);
          resultMap.get(k)!.push(courseOption);
        }
      }
      
      // GROUPING_SUMMARY
      const sample = Array.from(resultMap.entries()).slice(0, 3).map(([k, v]) => ({ k, n: v.length }));
      trace({
        stage: 'MP_BATCH',
        t: Date.now(),
        note: 'GROUPED',
        mp: { 
          count: resultMap.size,
          signature: `grouped|${resultMap.size}|${sample.map(s => s.k).join(',')}`
        },
      });
      console.log('[MP_BATCH][GROUPED]', {
        scope,
        mapSize: resultMap.size,
        sample,
        allKeys: Array.from(resultMap.keys()).slice(0, 10),
      });
      
      // SMOKE ASSERT: Empty result when we expected data
      if (blockIds.length > 0 && resultMap.size === 0) {
        console.error('[MP_BATCH] ⚠️ No options mapped to any block', {
          scope,
          blockIdsCount: blockIds.length,
          blockIdsSample: blockIds.slice(0, 8),
          normalizedIdsCount: normalizedIds.length,
          optionsDataCount: optionsData.length,
          coursesDataCount: coursesData?.length ?? 0,
          kindCounts,
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
