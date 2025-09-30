/**
 * Batched hook for fetching transfer rules for multiple requirement blocks
 * Returns Map<block_id, TransferRule[]> with transfer states and scores
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QUERY_KEYS } from '@/lib/queryKeys';

export type TransferState = 'accepted' | 'conditional' | 'rejected' | 'unknown';

export interface TransferRule {
  id: string;
  blockId: string;
  courseId: string;
  providerId?: string;
  transferState: TransferState;
  score: number; // 0-1 quality/acceptance score
  notes?: string;
  updatedAt: string;
}

export interface TransferRulesBatchResult {
  rulesByBlock: Map<string, TransferRule[]>;
  rulesByCourse: Map<string, TransferRule>;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetch transfer rules for multiple blocks in a single batched query
 * @param blockIds - Array of requirement block IDs (UUIDs)
 * @param scope - Scope string for cache key (e.g., "bs_cs|se|compare-programs")
 * @param enabled - Whether to run the query
 */
export function useTransferRulesByBlock(
  blockIds: string[],
  scope: string,
  enabled = true
): TransferRulesBatchResult {
  const { data, isLoading, error } = useQuery({
    queryKey: QUERY_KEYS.transferRulesBatch(blockIds, scope),
    queryFn: async () => {
      if (blockIds.length === 0) {
        return {
          rulesByBlock: new Map<string, TransferRule[]>(),
          rulesByCourse: new Map<string, TransferRule>(),
        };
      }

      // Fetch transfer rules for all provided block IDs
      const { data: rulesData, error: rulesError } = await supabase
        .from('transfer_rules')
        .select('id, block_id, course_id, transfer_state, score, notes, updated_at')
        .in('block_id', blockIds);

      if (rulesError) throw rulesError;

      const rulesByBlock = new Map<string, TransferRule[]>();
      const rulesByCourse = new Map<string, TransferRule>();

      (rulesData || []).forEach((rule: any) => {
        const transferRule: TransferRule = {
          id: rule.id,
          blockId: rule.block_id,
          courseId: rule.course_id || '',
          providerId: undefined, // Not in schema yet
          transferState: (rule.transfer_state || 'unknown') as TransferState,
          score: Number(rule.score) || 0.5,
          notes: rule.notes || undefined,
          updatedAt: rule.updated_at || new Date().toISOString(),
        };

        // Group by block
        if (!rulesByBlock.has(rule.block_id)) {
          rulesByBlock.set(rule.block_id, []);
        }
        rulesByBlock.get(rule.block_id)!.push(transferRule);

        // Index by course (for quick lookup when rendering options)
        if (rule.course_id) {
          rulesByCourse.set(rule.course_id, transferRule);
        }
      });

      if (process.env.NODE_ENV === 'development') {
        const sampleBlock = rulesByBlock.size > 0 ? Array.from(rulesByBlock.entries())[0] : null;
        console.log('[useTransferRulesByBlock] Fetched:', {
          scope,
          blockIdsCount: blockIds.length,
          blockIdsSample: blockIds.slice(0, 3),
          totalRules: rulesData?.length || 0,
          blocksWithRules: rulesByBlock.size,
          coursesWithRules: rulesByCourse.size,
          sampleBlock: sampleBlock ? {
            blockId: sampleBlock[0],
            rulesCount: sampleBlock[1].length,
            firstState: sampleBlock[1][0]?.transferState,
            firstScore: sampleBlock[1][0]?.score
          } : null
        });
      }

      return { rulesByBlock, rulesByCourse };
    },
    enabled: enabled && blockIds.length > 0,
    staleTime: 30000, // 30s cache
  });

  return {
    rulesByBlock: data?.rulesByBlock || new Map(),
    rulesByCourse: data?.rulesByCourse || new Map(),
    isLoading,
    error: error as Error | null,
  };
}
