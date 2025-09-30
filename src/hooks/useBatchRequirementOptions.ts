import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { warnOnce } from '@/utils/warnOnce';
import { MARKETPLACE_VERSION as VERSION, IN_CHUNK } from '@/config/versions';

// Module-scope cache for key generation with versioning
const __mpCache = new Map<string, string[]>();

// Clear cache on version changes (e.g., during hot reload)
if (typeof window !== 'undefined' && (window as any).__mpCacheVersion !== VERSION) {
  __mpCache.clear?.();
  (window as any).__mpCacheVersion = VERSION;
}

// Generate candidate marketplace keys from a node ID (deterministic, ordered by distance)
export function marketplaceKeysFromNodeId(id: string): string[] {
  const raw = String(id ?? '').trim().toLowerCase();
  if (!raw) return [];
  if (__mpCache.has(raw)) return __mpCache.get(raw)!;

  const base = raw.replace(/\s+/g, '-');
  const candidates: string[] = [
    base,                                    // y2-it-core
    base.replace(/^y\d-/, ''),               // it-core
    base.replace(/:.*$/, ''),                // drop suffix after :
    base.replace(/_/g, '-'),                 // underscores → dashes
    base.replace(/^year-\d-/, ''),           // safeguard for alt seeds
  ];

  // de-dupe while preserving order
  const out = candidates.filter((k, i, a) => k && a.indexOf(k) === i);
  __mpCache.set(raw, out);
  return out;
}

// Chunk array for large IN() queries (Postgres limit ~32k params)
function chunk<T>(arr: T[], size = IN_CHUNK): T[][] {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => 
    arr.slice(i * size, (i + 1) * size)
  );
}

export function useBatchRequirementOptions(requirementIds: string[]) {
  return useQuery({
    queryKey: ['req-opt-batch', VERSION, [...requirementIds].map(String).sort()],
    enabled: Array.isArray(requirementIds) && requirementIds.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!Array.isArray(requirementIds) || requirementIds.length === 0) {
        console.log('[MP-BATCH] ⛔ Skipping: empty requirementIds');
        return new Map<string, any>();
      }

      // Generate all candidate keys for each node ID
      const uniqueKeys = Array.from(new Set(requirementIds.flatMap(marketplaceKeysFromNodeId)));
      
      // Build reverse map: candidateKey -> Set(nodeIds) for collision handling
      const keyToNodeIds = new Map<string, Set<string>>();
      for (const nodeId of requirementIds) {
        for (const k of marketplaceKeysFromNodeId(nodeId)) {
          if (!keyToNodeIds.has(k)) keyToNodeIds.set(k, new Set());
          keyToNodeIds.get(k)!.add(nodeId);
        }
      }

      // Pick best nodeId for a DB row key (tie-breaker for collisions)
      const pickNodeId = (key: string): string | undefined => {
        const nodeIds = keyToNodeIds.get(key);
        if (!nodeIds || nodeIds.size === 0) return;

        // Prefer exact match before relaxed matches
        const exact = Array.from(nodeIds).find(n => n.toLowerCase() === key);
        if (exact) return exact;

        // Prefer same key with year prefix present
        const yearish = Array.from(nodeIds).find(n => /^y\d-/.test(n.toLowerCase()));
        return yearish ?? Array.from(nodeIds)[0];
      };

      // Chunk large IN() queries (Postgres param limit)
      const rows: any[] = [];
      for (const part of chunk(uniqueKeys, 500)) {
        const { data, error } = await supabase
          .from('requirement_option_counts_by_block')
          .select('block_id, options_count, has_ace_credit, has_clep')
          .in('block_id', part);
        
        if (error) {
          console.warn('[MP-BATCH] ❌ Query error for chunk:', error);
          continue;
        }
        if (data) rows.push(...data);
      }

      console.log('[MP-BATCH]', { 
        candidateKeys: uniqueKeys.length, 
        rows: rows.length, 
        chunks: Math.ceil(uniqueKeys.length / IN_CHUNK) 
      });

      // Map results back to original node IDs (use max/sum for collisions)
      const resultMap = new Map<string, { optionsCount: number; hasAceCredit: boolean; hasClep: boolean }>();
      for (const d of rows) {
        const nodeId = pickNodeId(String(d.block_id).toLowerCase());
        if (!nodeId) continue;
        
        const next = {
          optionsCount: d.options_count ?? 0,
          hasAceCredit: !!d.has_ace_credit,
          hasClep: !!d.has_clep,
        };

        const existing = resultMap.get(nodeId);
        if (!existing) {
          resultMap.set(nodeId, next);
        } else {
          // Handle multi-row collisions: use max for counts, OR for booleans
          resultMap.set(nodeId, {
            optionsCount: Math.max(existing.optionsCount, next.optionsCount),
            hasAceCredit: existing.hasAceCredit || next.hasAceCredit,
            hasClep: existing.hasClep || next.hasClep,
          });
        }
      }

      // Debug visibility
      if (typeof window !== 'undefined') {
        (window as any).__lastReqIds = requirementIds;
        (window as any).__mpCandidateKeys = uniqueKeys;
        (window as any).__mpResultNodeIds = Array.from(resultMap.keys());
      }

      // Log misses for debugging (one warning per mount)
      const misses = requirementIds.filter(id => !resultMap.has(id));
      if (misses.length > 0) {
        warnOnce('mp-misses', '[MP-BATCH] ⚠️ No marketplace data for:', misses);
      }

      return resultMap;
    },
  });
}
