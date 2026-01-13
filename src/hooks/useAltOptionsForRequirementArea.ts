import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AltCreditOption {
  id: string;
  sourceCode: string;
  identifier: string;
  title: string;
  creditsAwarded: number;
  level: number;
  confidence: number;
  costUsd: number | null;
  durationWeeks: number | null;
  examBased: boolean;
  providerUrl: string | null;
}

interface UseAltOptionsParams {
  institutionCode: string;
  requirementArea: string;
  enabled?: boolean;
}

/**
 * Fetches alt-credit options for a specific requirement area at an institution.
 * Returns alternatives sorted by confidence (highest first).
 */
export function useAltOptionsForRequirementArea({
  institutionCode,
  requirementArea,
  enabled = true,
}: UseAltOptionsParams) {
  return useQuery({
    queryKey: ['altOptions', institutionCode, requirementArea],
    queryFn: async (): Promise<AltCreditOption[]> => {
      // Get institution ID
      const { data: inst, error: instError } = await supabase
        .from('institutions')
        .select('id')
        .eq('code', institutionCode)
        .single();

      if (instError || !inst) {
        console.warn(`[useAltOptionsForRequirementArea] Institution not found: ${institutionCode}`);
        return [];
      }

      // Query equivalencies with alt_credit details
      const { data, error } = await supabase
        .from('cross_institution_equivalencies')
        .select(`
          id,
          credits_awarded,
          level,
          confidence,
          alt_credits!inner (
            id,
            source_code,
            identifier,
            title,
            cost_usd,
            duration_estimate_weeks,
            exam_based,
            provider_url
          )
        `)
        .eq('institution_id', inst.id)
        .eq('requirement_area', requirementArea)
        .order('confidence', { ascending: false });

      if (error) {
        console.error('[useAltOptionsForRequirementArea] Query error:', error);
        throw error;
      }

      // Transform to clean interface
      return (data || []).map((row: any) => ({
        id: row.id,
        sourceCode: row.alt_credits.source_code,
        identifier: row.alt_credits.identifier,
        title: row.alt_credits.title,
        creditsAwarded: row.credits_awarded,
        level: row.level,
        confidence: row.confidence,
        costUsd: row.alt_credits.cost_usd,
        durationWeeks: row.alt_credits.duration_estimate_weeks,
        examBased: row.alt_credits.exam_based ?? false,
        providerUrl: row.alt_credits.provider_url,
      }));
    },
    enabled: enabled && !!institutionCode && !!requirementArea,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Batch fetch alt options for multiple requirement areas at once.
 * More efficient than calling useAltOptionsForRequirementArea multiple times.
 */
export function useAltOptionsForSlots({
  institutionCode,
  requirementAreas,
  enabled = true,
}: {
  institutionCode: string;
  requirementAreas: string[];
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['altOptionsBatch', institutionCode, requirementAreas.sort().join(',')],
    queryFn: async (): Promise<Record<string, AltCreditOption[]>> => {
      if (!requirementAreas.length) return {};

      // Get institution ID
      const { data: inst, error: instError } = await supabase
        .from('institutions')
        .select('id')
        .eq('code', institutionCode)
        .single();

      if (instError || !inst) {
        console.warn(`[useAltOptionsForSlots] Institution not found: ${institutionCode}`);
        return {};
      }

      // Query all equivalencies for these requirement areas
      const { data, error } = await supabase
        .from('cross_institution_equivalencies')
        .select(`
          id,
          requirement_area,
          credits_awarded,
          level,
          confidence,
          alt_credits!inner (
            id,
            source_code,
            identifier,
            title,
            cost_usd,
            duration_estimate_weeks,
            exam_based,
            provider_url
          )
        `)
        .eq('institution_id', inst.id)
        .in('requirement_area', requirementAreas)
        .order('confidence', { ascending: false });

      if (error) {
        console.error('[useAltOptionsForSlots] Query error:', error);
        throw error;
      }

      // Group by requirement_area
      const result: Record<string, AltCreditOption[]> = {};
      for (const area of requirementAreas) {
        result[area] = [];
      }

      for (const row of data || []) {
        const area = row.requirement_area;
        if (!result[area]) result[area] = [];
        
        result[area].push({
          id: row.id,
          sourceCode: (row as any).alt_credits.source_code,
          identifier: (row as any).alt_credits.identifier,
          title: (row as any).alt_credits.title,
          creditsAwarded: row.credits_awarded,
          level: row.level,
          confidence: row.confidence,
          costUsd: (row as any).alt_credits.cost_usd,
          durationWeeks: (row as any).alt_credits.duration_estimate_weeks,
          examBased: (row as any).alt_credits.exam_based ?? false,
          providerUrl: (row as any).alt_credits.provider_url,
        });
      }

      return result;
    },
    enabled: enabled && !!institutionCode && requirementAreas.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
