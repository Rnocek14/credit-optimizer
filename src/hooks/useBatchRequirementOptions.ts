import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Generate candidate marketplace keys from a node ID
function marketplaceKeysFromNodeId(id: string): string[] {
  const s = String(id).toLowerCase();
  const candidates = [
    s,                          // exact: y2-cs-core
    s.replace(/^y\d+-?/, ''),  // drop year: cs-core
    s.replace(/_/g, '-'),       // normalize: y2-cs-core (already dashed)
    s.replace(/^y\d+-?/, '').replace(/_/g, '-'), // drop year + normalize: cs-core
  ];
  return Array.from(new Set(candidates.filter(Boolean)));
}

export function useBatchRequirementOptions(requirementIds: string[]) {
  return useQuery({
    queryKey: ['req-opt-batch', requirementIds],
    enabled: Array.isArray(requirementIds) && requirementIds.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!Array.isArray(requirementIds) || requirementIds.length === 0) {
        console.log('[MP-BATCH] ⛔ Skipping: empty requirementIds');
        return new Map<string, any>();
      }

      // Generate all candidate keys for each node ID
      const allCandidateKeys = requirementIds.flatMap(id => marketplaceKeysFromNodeId(id));
      const uniqueKeys = Array.from(new Set(allCandidateKeys));
      
      if (typeof window !== 'undefined') {
        (window as any).__lastReqIds = requirementIds;
        (window as any).__mpCandidateKeys = uniqueKeys;
      }
      console.log('[MP-BATCH] 🔎 Fetching for node IDs:', requirementIds);
      console.log('[MP-BATCH] 🗝️ Trying candidate keys:', uniqueKeys);

      const { data, error } = await supabase
        .from('requirement_option_counts_by_block')
        .select('*')
        .in('block_id', uniqueKeys);

      if (error) {
        console.error('[MP-BATCH] ❌ Query error:', error);
        throw error;
      }

      console.log('[MP-BATCH] ✅ Query returned', (data ?? []).length, 'rows');
      
      // Build reverse map: candidate key -> original node ID
      const keyToNodeId = new Map<string, string>();
      requirementIds.forEach(nodeId => {
        const candidates = marketplaceKeysFromNodeId(nodeId);
        candidates.forEach(key => {
          if (!keyToNodeId.has(key)) keyToNodeId.set(key, nodeId);
        });
      });

      // Map results back to original node IDs (use first match per node)
      const resultMap = new Map<string, any>();
      (data ?? []).forEach(d => {
        const nodeId = keyToNodeId.get(d.block_id);
        if (nodeId && !resultMap.has(nodeId)) {
          resultMap.set(nodeId, {
            optionsCount: d.options_count ?? 0,
            hasAceCredit: !!d.has_ace_credit,
            hasClep: !!d.has_clep,
          });
        }
      });

      // Log misses for debugging
      const misses = requirementIds.filter(id => !resultMap.has(id));
      if (misses.length > 0) {
        console.warn('[MP-BATCH] ⚠️ No marketplace data for:', misses);
      }

      return resultMap;
    },
  });
}
