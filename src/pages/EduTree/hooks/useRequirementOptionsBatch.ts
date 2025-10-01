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
  // DIAGNOSTIC: Log hook invocation
  console.log('[useRequirementOptionsBatch] Hook invoked:', {
    enabled,
    blockIdsCount: blockIds.length,
    scope,
    sampleBlockIds: blockIds.slice(0, 5),
    willExecuteQuery: enabled && blockIds.length > 0,
    timestamp: Date.now()
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ['reqOptionsBatch', scope, [...blockIds].sort()], // Stable cache key
    enabled: enabled && blockIds.length > 0, // Add explicit enabled check
    queryFn: async () => {
      mark('mp_batch:start');
      
      // STAGE 0: INPUT - Log what we're asking for
      trace({
        stage: 'MP_BATCH',
        t: Date.now(),
        note: 'QUERY_START',
        mp: { count: blockIds.length },
      });
      
      console.log('[MP_BATCH][QUERY_START]', {
        scope,
        blockIdsCount: blockIds.length,
        allBlockIds: blockIds,
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

      // Step 3a: Query block_requirement_map to get requirement IDs for our blocks
      const { data: blockReqMap, error: blockReqErr } = await supabase
        .from('block_requirement_map')
        .select('block_id, requirement_id')
        .in('block_id', Array.from(blockUUIDs));

      if (blockReqErr) throw blockReqErr;

      const requirementIds = [...new Set((blockReqMap ?? []).map(br => br.requirement_id))];
      console.log('[MP_BATCH][BLOCK_REQ_MAP]', { 
        blocks: blockUUIDs.size, 
        mappings: blockReqMap?.length, 
        uniqueRequirements: requirementIds.length 
      });

      if (!requirementIds.length) {
        trace({ stage: 'MP_BATCH', t: Date.now(), note: 'NO_REQUIREMENTS_FOR_BLOCKS', mp: { count: 0 } });
        return new Map();
      }

      // Step 3b: Query requirement_options to get options for those requirements
      const { data: reqOptions, error: reqOptErr } = await supabase
        .from('requirement_options')
        .select('id, requirement_id, option_kind, option_ref_id')
        .in('requirement_id', requirementIds);

      if (reqOptErr) throw reqOptErr;

      const seenKinds = [...new Set((reqOptions ?? []).map(o => o.option_kind).filter(Boolean))];
      console.log('[MP_BATCH][REQ_OPTIONS]', { 
        rows: reqOptions?.length, 
        kinds: seenKinds,
        requirements: requirementIds.length 
      });

      if (!reqOptions?.length) {
        trace({ stage: 'MP_BATCH', t: Date.now(), note: 'NO_OPTIONS', mp: { count: 0 } });
        return new Map();
      }

      // Step 3c: Fetch courses from edu_courses (using option_ref_id which points to edu_courses)
      const courseRefIds = [...new Set(reqOptions.filter(o => o.option_kind === 'course' && o.option_ref_id).map(o => o.option_ref_id))];
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

      // Build a map: requirement_id -> block_ids[]
      const reqToBlocks = new Map<string, string[]>();
      for (const br of blockReqMap ?? []) {
        if (!reqToBlocks.has(br.requirement_id)) {
          reqToBlocks.set(br.requirement_id, []);
        }
        reqToBlocks.get(br.requirement_id)!.push(br.block_id);
      }

      // Build enriched options with block associations
      const enrichedOptions = reqOptions.map(opt => ({
        ...opt,
        block_ids: reqToBlocks.get(opt.requirement_id) || []
      }));

      trace({ 
        stage: 'MP_BATCH', 
        t: Date.now(), 
        note: 'DB_FETCH', 
        mp: { 
          count: enrichedOptions.length,
          signature: `fetch|opts:${enrichedOptions.length}|courses:${courseMap.size}|kinds:${seenKinds.join(',')}`
        } 
      });

      // Step 4: Group options by block UUID + slug
      const resultMap = new Map<string, CourseOption[]>();

      for (const o of enrichedOptions) {
        if (o.option_kind !== 'course') continue;

        const course = courseMap.get(String(o.option_ref_id).toLowerCase());
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

        // Map to all associated blocks
        for (const blockUuid of o.block_ids) {
          const blockLower = String(blockUuid).toLowerCase();
          const slug = slugById.get(blockLower);

          for (const k of [blockLower, slug].filter(Boolean) as string[]) {
            if (!resultMap.has(k)) resultMap.set(k, []);
            resultMap.get(k)!.push(courseOption);
          }
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
          optionsCount: enrichedOptions?.length,
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
