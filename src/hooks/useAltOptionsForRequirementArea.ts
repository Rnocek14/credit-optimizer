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

// Cache institution IDs to avoid repeated lookups
const institutionIdCache = new Map<string, string>();

async function getInstitutionId(code: string): Promise<string | null> {
  if (institutionIdCache.has(code)) {
    return institutionIdCache.get(code)!;
  }
  
  const { data, error } = await supabase
    .from('institutions')
    .select('id')
    .eq('code', code)
    .single();
  
  if (error || !data) {
    console.warn(`[useAltOptions] Institution not found: ${code}`);
    return null;
  }
  
  institutionIdCache.set(code, data.id);
  return data.id;
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
      const instId = await getInstitutionId(institutionCode);
      if (!instId) return [];

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
        .eq('institution_id', instId)
        .eq('requirement_area', requirementArea)
        .order('confidence', { ascending: false });

      if (error) {
        console.error('[useAltOptionsForRequirementArea] Query error:', error);
        throw error;
      }

      // Transform to clean interface
      return (data || []).map((row) => {
        const altCredit = row.alt_credits as unknown as {
          id: string;
          source_code: string;
          identifier: string;
          title: string;
          cost_usd: number | null;
          duration_estimate_weeks: number | null;
          exam_based: boolean | null;
          provider_url: string | null;
        };
        return {
          id: row.id,
          sourceCode: altCredit.source_code,
          identifier: altCredit.identifier,
          title: altCredit.title,
          creditsAwarded: row.credits_awarded,
          level: row.level ?? 100,
          confidence: row.confidence ?? 0,
          costUsd: altCredit.cost_usd,
          durationWeeks: altCredit.duration_estimate_weeks,
          examBased: altCredit.exam_based ?? false,
          providerUrl: altCredit.provider_url,
        };
      });
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
  // Create stable, deduped cache key
  const areas = Array.from(new Set(requirementAreas)).sort();
  
  return useQuery({
    queryKey: ['altOptionsBatch', institutionCode, areas.join(',')],
    queryFn: async (): Promise<Record<string, AltCreditOption[]>> => {
      if (!areas.length) return {};

      const instId = await getInstitutionId(institutionCode);
      if (!instId) return {};

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
        .eq('institution_id', instId)
        .in('requirement_area', areas)
        .order('confidence', { ascending: false });

      if (error) {
        console.error('[useAltOptionsForSlots] Query error:', error);
        throw error;
      }

      // Initialize result with empty arrays for all requested areas
      const result: Record<string, AltCreditOption[]> = {};
      for (const area of areas) {
        result[area] = [];
      }

      // Group by requirement_area
      for (const row of data || []) {
        const area = row.requirement_area;
        if (!area || !result[area]) continue;
        
        const altCredit = row.alt_credits as unknown as {
          id: string;
          source_code: string;
          identifier: string;
          title: string;
          cost_usd: number | null;
          duration_estimate_weeks: number | null;
          exam_based: boolean | null;
          provider_url: string | null;
        };
        
        result[area].push({
          id: row.id,
          sourceCode: altCredit.source_code,
          identifier: altCredit.identifier,
          title: altCredit.title,
          creditsAwarded: row.credits_awarded,
          level: row.level ?? 100,
          confidence: row.confidence ?? 0,
          costUsd: altCredit.cost_usd,
          durationWeeks: altCredit.duration_estimate_weeks,
          examBased: altCredit.exam_based ?? false,
          providerUrl: altCredit.provider_url,
        });
      }

      return result;
    },
    enabled: enabled && !!institutionCode && requirementAreas.length > 0,
    staleTime: 5 * 60 * 1000,
  });
}
