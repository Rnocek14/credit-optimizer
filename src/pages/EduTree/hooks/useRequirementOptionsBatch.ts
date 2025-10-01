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

      console.log('[MP_BATCH][ID_RESOLUTION]', {
        scope,
        inputCount: blockIds.length,
        resolvedCount: blockUUIDs.size,
        unresolvedCount: unresolved.length,
        unresolvedSample: unresolved.slice(0, 5),
      });

      if (blockUUIDs.size === 0) {
        console.error('[MP_BATCH] ⚠️ ID resolution produced zero UUIDs', {
          scope,
          blockIdsSample: blockIds.slice(0, 8),
          unresolved: unresolved.slice(0, 10),
        });
        trace({ stage: 'MP_BATCH', t: Date.now(), note: 'ID_RESOLUTION_EMPTY' });
        return new Map<string, CourseOption[]>();
      }

      // Step 2: Probe query to discover actual option_kind values
      // JOIN requirements and filter on requirements.block_id (the correct FK)
      const { data: probe, error: probeErr } = await supabase
        .from('requirement_options')
        .select('option_kind, requirements!inner(block_id)')
        .in('requirements.block_id', Array.from(blockUUIDs))
        .limit(50);

      if (probeErr) throw probeErr;

      const kindCounts = (probe || []).reduce((acc, r: any) => {
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
        blockUUIDsSample: Array.from(blockUUIDs).slice(0, 5),
      });

      // Step 3: Main query - JOIN requirements and courses, filter on requirements.block_id
      const allowedKinds = Object.keys(kindCounts).filter(k => k && k !== 'NULL') as ('cert' | 'course' | 'exam')[];
      
      const { data: rows, error: rowsErr } = await supabase
        .from('requirement_options')
        .select(`
          option_kind,
          option_ref_id,
          transfer_eligible,
          credits_awarded,
          requirements!inner ( id, block_id ),
          edu_courses!inner ( id, code, title, area, credits, is_core, is_capstone, description )
        `)
        .in('requirements.block_id', Array.from(blockUUIDs))
        .in('option_kind', allowedKinds.length > 0 ? allowedKinds : ['course'] as const);

      trace({
        stage: 'MP_BATCH',
        t: Date.now(),
        note: 'DB_FETCH',
        mp: { 
          count: rows?.length ?? 0,
          signature: `fetch|${rows?.length ?? 0}|kinds:${allowedKinds.join(',')}`
        },
      });
      
      console.log('[MP_BATCH][DB_FETCH]', {
        scope,
        blockUUIDsCount: blockUUIDs.size,
        blockUUIDsSample: Array.from(blockUUIDs).slice(0, 5),
        rowsCount: rows?.length ?? 0,
        allowedKinds,
        error: rowsErr ? String(rowsErr) : null,
      });

      if (rowsErr) {
        console.error('[MP_BATCH][DB_ERROR]', { scope, error: rowsErr });
        throw rowsErr;
      }
      
      if (!rows || rows.length === 0) {
        console.warn('[MP_BATCH] ⚠️ No requirement_options rows returned', {
          scope,
          blockUUIDsCount: blockUUIDs.size,
          blockUUIDsSample: Array.from(blockUUIDs).slice(0, 5),
          allowedKinds,
          kindCounts,
        });
        trace({ stage: 'MP_BATCH', t: Date.now(), note: 'NO_ROWS' });
        mark('mp_batch:end');
        return new Map<string, CourseOption[]>();
      }

      // Step 4: Group options by block UUID/slug
      const resultMap = new Map<string, CourseOption[]>();
      
      for (const r of rows as any[]) {
        const c = r.edu_courses;
        if (!c) continue;
        
        const evidence = typeof c.description === 'string' 
          ? tryParseEvidence(c.description)
          : { ace: false, clep: false };

        const courseOption: CourseOption = {
          courseId: c.id,
          code: c.code,
          title: c.title,
          provider: c.area || 'Unknown',
          credits: c.credits,
          cost: undefined,
          evidence,
        };

        // Key by block UUID and slug (from requirements.block_id)
        const blockUuid = String(r.requirements.block_id).toLowerCase();
        const slug = slugById.get(blockUuid);

        for (const k of [blockUuid, slug].filter(Boolean) as string[]) {
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
          blockUUIDsCount: blockUUIDs.size,
          rowsCount: rows.length,
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
