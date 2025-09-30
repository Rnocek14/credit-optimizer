import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { warnOnce } from '@/utils/warnOnce';
import { MARKETPLACE_VERSION as VERSION, EVIDENCE_VERSION, IN_CHUNK } from '@/config/versions';
import { ENV } from '@/config/env';
import type { MPInfo, MPMap } from '@/pages/EduTree/utils/gateAggregation';

// Module-scope cache for key generation with versioning
const __mpCache = new Map<string, string[]>();

// Clear cache on version changes (e.g., during hot reload)
if (typeof window !== 'undefined' && (window as any).__mpCacheVersion !== VERSION) {
  __mpCache.clear?.();
  (window as any).__mpCacheVersion = VERSION;
}

// Reverse mapping from seed data IDs to database slugs
const SEED_TO_DB_SLUG: Record<string, string> = {
  'y1-found': 'foundations',
  'y1-math': 'mathematics',
  'y1-genedab': 'general-education',
  'y2-cs-core': 'core-i',
  'y2-cs-elec': 'cs-elec',
  'y2-it-core': 'core-i',
  'y2-it-elec': 'it-elec',
  'y3-se-core': 'core-ii',
  'y3-se-elec': 'se-elec',
  'y3-ds-core': 'core-ii',
  'y3-ds-elec': 'ds-elec',
  'y4-se-cap': 'se-cap',
  'y4-ds-cap': 'ds-cap',
  'y4-it-cap': 'it-cap',
};

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

  // Add reverse mapping from seed data ID to database slug
  const dbSlug = SEED_TO_DB_SLUG[base];
  if (dbSlug) {
    candidates.push(dbSlug);                 // foundations
    // Also try year-prefixed version of the slug
    const yearMatch = base.match(/^y(\d)-/);
    if (yearMatch) {
      candidates.push(`y${yearMatch[1]}-${dbSlug}`); // y1-foundations
    }
    
    // Track seed IDs using reverse map (dev auditing)
    if (typeof window !== 'undefined' && !ENV.PROD) {
      (window as any).__mpSlugBackfills ??= new Set();
      (window as any).__mpSlugBackfills.add(base);
    }
  }

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

// Dev banner (once per load; never in prod or SSR)
if (typeof window !== 'undefined' && !ENV.PROD) {
  warnOnce('dev-banner', '[Dev] Marketplace v%s, Evidence v%s, IN_CHUNK=%d', VERSION, EVIDENCE_VERSION, IN_CHUNK);
  
  // Warn about seed IDs relying on slug backfill
  setTimeout(() => {
    if ((window as any).__mpSlugBackfills?.size) {
      warnOnce('mp-backfills', '[Audit] Seed IDs using slug backfill map:', 
        Array.from((window as any).__mpSlugBackfills));
    }
  }, 1000);
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
      const resultMap: MPMap = new Map<string, MPInfo>();
      for (const d of rows) {
        const dbSlug = String(d.block_id).toLowerCase();
        const nodeId = pickNodeId(dbSlug);
        
        const info: MPInfo = {
          optionsCount: Number(d.options_count ?? d.count ?? 0),
          hasAceCredit: !!d.has_ace_credit,
          hasClep: !!d.has_clep,
        };

        // Dual-key strategy: key by both resolved nodeId (seed id) and raw DB slug
        // This makes lookup tolerant to seed-ID vs DB-slug differences
        if (nodeId) {
          const existing = resultMap.get(nodeId);
          if (!existing) {
            resultMap.set(nodeId, info);
          } else {
            // Handle multi-row collisions: use max for counts, OR for booleans
            resultMap.set(nodeId, {
              optionsCount: Math.max(existing.optionsCount, info.optionsCount),
              hasAceCredit: existing.hasAceCredit || info.hasAceCredit,
              hasClep: existing.hasClep || info.hasClep,
            });
          }
        }
        
        // Also key by raw DB slug for tolerant lookup
        const existingSlug = resultMap.get(dbSlug);
        if (!existingSlug) {
          resultMap.set(dbSlug, info);
        } else {
          resultMap.set(dbSlug, {
            optionsCount: Math.max(existingSlug.optionsCount, info.optionsCount),
            hasAceCredit: existingSlug.hasAceCredit || info.hasAceCredit,
            hasClep: existingSlug.hasClep || info.hasClep,
          });
        }
      }

      // Debug visibility
      if (typeof window !== 'undefined') {
        (window as any).__lastReqIds = requirementIds;
        (window as any).__mpCandidateKeys = uniqueKeys;
        (window as any).__mpResultNodeIds = Array.from(resultMap.keys());
        // DIAGNOSTIC: Expose map for manual testing (Step 4/5c from checklist)
        (window as any).__MP_MAP = resultMap;
        // DIAGNOSTIC: Print sample keys for validation (Step 4 from checklist)
        console.log('[MP-MAP:keys] Sample of resultMap keys (first 50):', 
          Array.from(resultMap.keys()).slice(0, 50)
        );
      }

      // Log misses for debugging (one warning per mount)
      const misses = requirementIds.filter(id => !resultMap.has(id));
      if (misses.length > 0) {
        warnOnce('mp-misses', '[MP-BATCH] ⚠️ No marketplace data for:', misses);
      }

      // Warn about blocks with 0 options (data quality issue)
      const zeroes = requirementIds.filter(id => resultMap.get(id)?.optionsCount === 0);
      if (zeroes.length > 0) {
        if (!window.__mpZeroWarned) window.__mpZeroWarned = new Set();
        const newZeroes = zeroes.filter(id => !window.__mpZeroWarned?.has(id));
        if (newZeroes.length > 0) {
          console.warn(
            `[MP-BATCH] ⚠️ ${newZeroes.length} blocks have 0 course options:`,
            newZeroes,
            '\nFix: Add courses to block_members and refresh marketplace counts'
          );
          newZeroes.forEach(id => window.__mpZeroWarned?.add(id));
        }
      }

      console.log('[MP-BATCH] ✅ Query returned', rows.length, 'rows');

      return resultMap;
    },
  });
}
