import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { normalizeProviderCode } from '@/lib/providerNormalization';
import type { ProviderPricingData, InstitutionalPricingData } from '../adapters/degreeTemplateAdapter';

interface PricingMapsResult {
  providerPricing: Map<string, ProviderPricingData>;
  institutionalPricing: Map<string, InstitutionalPricingData>;
}

/**
 * Hook to load pricing data from alt_provider_pricing_packs and institution_pricing_packs
 * Returns typed maps ready to pass to adaptDegreeTemplate
 * 
 * SCHEMA NOTES:
 * - alt_provider_pricing_packs uses: monthly_usd, per_exam_usd, per_credit_usd, avg_credits_per_month
 * - institution_pricing_packs uses: per_credit_usd, required_fees_usd
 */
export function usePricingMaps(institutionCode?: string) {
  return useQuery<PricingMapsResult>({
    // Include institutionCode in queryKey to prevent cache leaks across schools
    queryKey: ['pricing-maps', institutionCode ?? 'global'],
    staleTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      console.log('[usePricingMaps] Fetching pricing data...');

      // Fetch provider pricing packs (alt credit providers like Sophia, CLEP, etc.)
      const { data: providerPacks, error: providerError } = await supabase
        .from('alt_provider_pricing_packs')
        .select('provider_code, provider_name, pricing_data, status')
        .eq('status', 'active');

      if (providerError) {
        console.warn('[usePricingMaps] Provider packs error:', providerError);
      }

      // Debug logging - confirm data shape
      console.log('[usePricingMaps] providerPacks:', providerPacks?.length, providerPacks?.[0]);

      // Fetch institutional pricing packs for per-credit costs
      // @ts-ignore - table exists after scraper runs
      const { data: pricingPacks, error: pricingError } = await supabase
        .from('institution_pricing_packs' as any)
        .select('institution_code, pricing_data, status')
        .eq('status', 'active');

      if (pricingError) {
        console.warn('[usePricingMaps] Institutional pricing packs error:', pricingError);
      }

      // Debug logging - confirm data shape
      console.log('[usePricingMaps] institution pricingPacks:', pricingPacks?.length, pricingPacks?.[0]);

      // Build provider pricing map with dual-key support for schema evolution
      const providerPricing = new Map<string, ProviderPricingData>();
      (providerPacks || []).forEach((pack) => {
        const normalizedCode = normalizeProviderCode(pack.provider_code);
        const pricingData = pack.pricing_data as Record<string, unknown> | null;
        
        if (!pricingData) {
          console.warn(`[usePricingMaps] Missing pricing_data for provider: ${pack.provider_code}`);
          return;
        }

        // Support both key styles: per_exam_usd (new) AND per_exam_cost (legacy)
        const pricing: ProviderPricingData = {
          providerCode: normalizedCode,
          model: (pricingData.model as ProviderPricingData['model']) || 'per_course',
          // Dual-key support for schema evolution
          perCourseCost: (pricingData.per_course_usd ?? pricingData.per_course_cost) as number | undefined,
          perExamCost: (pricingData.per_exam_usd ?? pricingData.per_exam_cost) as number | undefined,
          perCreditCost: (pricingData.per_credit_usd ?? pricingData.per_credit_cost) as number | undefined,
          monthlySubscription: (pricingData.monthly_usd ?? pricingData.monthly_subscription) as number | undefined,
          avgCreditsPerMonth: pricingData.avg_credits_per_month as number | undefined,
          effectiveCostPerCredit: (pricingData.effective_cost_per_credit_usd ?? pricingData.effective_cost_per_credit) as number | undefined,
          notes: pricingData.notes as string | undefined,
        };

        providerPricing.set(normalizedCode, pricing);
      });

      console.log('[usePricingMaps] Loaded', providerPricing.size, 'provider pricing entries');

      // Build institutional pricing map
      const institutionalPricing = new Map<string, InstitutionalPricingData>();
      const pricingPacksTyped = (pricingPacks || []) as unknown as Array<{ institution_code: string; pricing_data: unknown }>;
      pricingPacksTyped.forEach((pack) => {
        const pricingData = pack.pricing_data as Record<string, unknown> | null;
        if (!pricingData) {
          console.warn(`[usePricingMaps] Missing pricing_data for institution: ${pack.institution_code}`);
          return;
        }

        // Support both key styles: per_credit_usd (new) AND per_credit_cost (legacy)
        const perCreditCost = (pricingData.per_credit_usd ?? pricingData.per_credit_cost ?? pricingData.perCreditCost) as number | undefined;
        const avgCourseDurationWeeks = (pricingData.avg_course_duration_weeks ?? pricingData.avgCourseDurationWeeks) as number | undefined
          || 12; // Default to 12 weeks

        if (perCreditCost) {
          institutionalPricing.set(pack.institution_code, {
            institutionCode: pack.institution_code,
            perCreditCost,
            avgCourseDurationWeeks,
            notes: pricingData.notes as string | undefined,
          });
        } else {
          console.warn(`[usePricingMaps] No per_credit_cost found for institution: ${pack.institution_code}`);
        }
      });

      console.log('[usePricingMaps] Loaded', institutionalPricing.size, 'institutional pricing entries');

      return { providerPricing, institutionalPricing };
    },
  });
}

/**
 * Build provider pricing map from raw pricing pack data
 * For use outside React components
 */
export function buildProviderPricingMap(
  packs: Array<{ provider_code: string; pricing_data: unknown }>
): Map<string, ProviderPricingData> {
  const map = new Map<string, ProviderPricingData>();
  
  packs.forEach((pack) => {
    const normalizedCode = normalizeProviderCode(pack.provider_code);
    const pricingData = pack.pricing_data as Record<string, unknown> | null;
    
    if (!pricingData) return;

    // Support both key styles: per_exam_usd (new) AND per_exam_cost (legacy)
    map.set(normalizedCode, {
      providerCode: normalizedCode,
      model: (pricingData.model as ProviderPricingData['model']) || 'per_course',
      perCourseCost: (pricingData.per_course_usd ?? pricingData.per_course_cost) as number | undefined,
      perExamCost: (pricingData.per_exam_usd ?? pricingData.per_exam_cost) as number | undefined,
      perCreditCost: (pricingData.per_credit_usd ?? pricingData.per_credit_cost) as number | undefined,
      monthlySubscription: (pricingData.monthly_usd ?? pricingData.monthly_subscription) as number | undefined,
      avgCreditsPerMonth: pricingData.avg_credits_per_month as number | undefined,
      effectiveCostPerCredit: (pricingData.effective_cost_per_credit_usd ?? pricingData.effective_cost_per_credit) as number | undefined,
      notes: pricingData.notes as string | undefined,
    });
  });

  return map;
}

/**
 * Build institutional pricing map from raw policy pack data
 * For use outside React components
 */
export function buildInstitutionalPricingMap(
  packs: Array<{ institution_code: string; policy_data?: unknown; pricing_data?: unknown }>
): Map<string, InstitutionalPricingData> {
  const map = new Map<string, InstitutionalPricingData>();
  
  packs.forEach((pack) => {
    // Support both policy_data (from policy packs) and pricing_data (from pricing packs)
    const data = (pack.pricing_data ?? pack.policy_data) as Record<string, unknown> | null;
    if (!data) return;

    const tuition = data.tuition as Record<string, unknown> | undefined;
    // Support both key styles: per_credit_usd (new) AND per_credit_cost (legacy)
    const perCreditCost = (data.per_credit_usd ?? tuition?.per_credit_cost ?? data.per_credit_cost) as number | undefined;
    const avgCourseDurationWeeks = (data.avg_course_duration_weeks ?? data.avgCourseDurationWeeks) as number | undefined
      || 12;

    if (perCreditCost) {
      map.set(pack.institution_code, {
        institutionCode: pack.institution_code,
        perCreditCost,
        avgCourseDurationWeeks,
        notes: (data.notes ?? tuition?.notes) as string | undefined,
      });
    }
  });

  return map;
}
