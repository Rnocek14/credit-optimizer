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

      // Helper: strip gate nodes and generate slug candidates
      const dropGate = (k: string) => !k.startsWith('gate-');
      const toSlugCandidates = (raw: string) => {
        const s = raw.toLowerCase();
        const noYear = s.replace(/^y\d-/, '');                  // y3-se-elec -> se-elec
        const last2 = s.split('-').slice(-2).join('-');         // y3-se-elec -> se-elec
        return [s, noYear, last2];
      };

      // Canonicalize incoming IDs -> block UUIDs
      const blockUUIDs = new Set<string>();
      const unresolved: string[] = [];

      for (const k of blockIds.filter(Boolean).map(String).filter(dropGate)) {
        // Already a UUID?
        if (/^[0-9a-f-]{36}$/i.test(k)) {
          blockUUIDs.add(k.toLowerCase());
          continue;
        }
        // Try slug candidates
        const hit = toSlugCandidates(k)
          .map((c) => idBySlug.get(c))
          .find(Boolean);
        if (hit) blockUUIDs.add(hit);
        else unresolved.push(k);
      }

      trace({
        stage: 'MP_BATCH',
        t: Date.now(),
        note: 'ID_RESOLUTION',
        mp: { 
          count: blockUUIDs.size,
          signature: `resolve|${blockIds.length}→${blockUUIDs.size}|unresolved:${unresolved.length}`
        }
      });

      console.log('[MP_BATCH][UUIDS]', { in: blockIds.length, uuids: Array.from(blockUUIDs).slice(0, 5) });

      if (blockUUIDs.size === 0) {
        trace({ stage: 'MP_BATCH', t: Date.now(), note: 'EMPTY_AFTER_NORMALIZATION' });
        return new Map();
      }

      // Step 3a: Get all options using the view (already joins requirements → blocks)
      const { data: options, error: optErr } = await supabase
        .from('requirement_options_view_by_block')
        .select('*')
        .in('block_id', Array.from(blockUUIDs));

      if (optErr) throw optErr;

      const seenKinds = [...new Set((options ?? []).map((o: any) => o.option_kind).filter(Boolean))];
      console.log('[MP_BATCH][OPTS]', { rows: options?.length, kinds: seenKinds, blockUUIDs: Array.from(blockUUIDs).slice(0, 3) });

      if (!options?.length) {
        trace({ stage: 'MP_BATCH', t: Date.now(), note: 'NO_OPTIONS', mp: { count: 0 } });
        return new Map();
      }

      // Step 3b: Fetch courses for course options
      const courseRefIds = [...new Set(options.filter((o: any) => o.option_kind === 'course' && o.provider_id).map((o: any) => o.provider_id))];
      let courseMap = new Map<string, CourseData>();

      if (courseRefIds.length) {
        const { data: courses, error: cErr } = await supabase
          .from('edu_courses')
          .select('id, code, title, area, credits, is_core, is_capstone, description')
          .in('id', courseRefIds);

        if (cErr) throw cErr;
        courseMap = new Map((courses ?? []).map(c => [String(c.id).toLowerCase(), c]));
        console.log('[MP_BATCH][COURSES]', { wanted: courseRefIds.length, got: courseMap.size });
      }

      trace({ 
        stage: 'MP_BATCH', 
        t: Date.now(), 
        note: 'DB_FETCH', 
        mp: { 
          count: options.length,
          signature: `fetch|opts:${options.length}|courses:${courseMap.size}|kinds:${seenKinds.join(',')}`
        } 
      });

      // Step 4: Group options by block UUID + slug
      const resultMap = new Map<string, CourseOption[]>();

      for (const o of options as any[]) {
        if (o.option_kind !== 'course') continue;

        const course = courseMap.get(String(o.provider_id).toLowerCase());
        if (!course) continue;

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

        const blockUuid = String(o.block_id).toLowerCase();
        const slug = slugById.get(blockUuid);

        for (const k of [blockUuid, slug].filter(Boolean) as string[]) {
          if (!resultMap.has(k)) resultMap.set(k, []);
          resultMap.get(k)!.push(courseOption);
        }
      }

      trace({
        stage: 'MP_BATCH',
        t: Date.now(),
        note: 'GROUPED',
        mp: { 
          count: resultMap.size,
          signature: `grouped|${resultMap.size}|kinds:${seenKinds.join(',')}`
        }
      });

      if (blockIds.length > 0 && resultMap.size === 0) {
        console.warn('[MP_BATCH] ⚠️ No options mapped to any block', {
          scope,
          blockIdsCount: blockIds.length,
          optionsCount: options?.length,
          coursesCount: courseMap.size,
          blockUUIDs: Array.from(blockUUIDs).slice(0, 5),
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
