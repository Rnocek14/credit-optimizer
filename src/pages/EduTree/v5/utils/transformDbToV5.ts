import type { ModuleData } from '../types/v5';
import { PROVIDER_DEFAULTS } from '../data/providerDefaults';
import { ENV } from '@/config/env';
import { computeModuleSummary, type NodeSelectedSummary } from '../types/nodeProgress';

// Normalize provider ID to match registry keys (kebab-case)
const normalizeProviderId = (id?: string) => 
  id?.toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');

interface DbRequirement {
  id: string;
  year: number;
  category: string;
  name: string;
  description: string | null;
  credits_required: number | null;
}

interface DbOption {
  id: string;
  requirement_id: string;
  option_kind: string;
  option_ref_id: string;
  credits_awarded: number | null;
  edu_courses?: {
    id: string;
    code: string;
    title: string;
    credits: number;
  } | null;
  marketplace_courses?: {
    id: string;
    code: string;
    title: string;
    credits: number;
    cost_usd: number | null;
    duration_weeks: number | null;
    provider_id: string;
  } | null;
  provider?: {
    id: string;
    name: string;
    type: string;
    website_url: string | null;
    provider_code?: string | null;
  } | null;
}

export function mapCategoryToIcon(category: string): string {
  switch (category.toLowerCase()) {
    case 'core':
      return '💻';
    case 'gened':
    case 'general education':
      return '📚';
    case 'capstone':
      return '🎓';
    case 'elective':
      return '🔬';
    default:
      return '📖';
  }
}

/**
 * Enrich marketplace option with sensible defaults when DB data is missing
 * Prevents scoring from failing on incomplete data
 */
function enrichOption(opt: any): any {
  const credits = opt.credits || 3;
  return {
    ...opt,
    // Cost defaults: typical ACE course pricing
    cost_usd: opt.cost_usd ?? 89,
    // Duration defaults: typical self-paced course
    duration_weeks: opt.duration_weeks ?? 6,
    // Workload estimate if missing
    workload_weekly_hours: opt.workload_weekly_hours ?? credits * 2.5,
    // Provider type fallback
    providerType: opt.providerType ?? (opt.provider?.type || 'mooc'),
    // CRI score fallback (moderate quality)
    cri_score: opt.cri_score ?? 70,
  };
}

export function transformToModuleData(
  requirements: DbRequirement[],
  allOptions: DbOption[],
  basket: Array<{
    moduleId: string;
    credits: number;
    cost_usd: number | null;
    duration_weeks: number | null;
    cri_score: number;
    status?: string;
    autoFillReason?: string;
  }> = []
): Record<number, ModuleData[]> {
  const modulesByYear: Record<number, ModuleData[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
  };
  
  // Track warned providers to prevent duplicate logs
  const warnedProviders = new Set<string>();

  requirements.forEach((req) => {
    const reqOptions = allOptions.filter((opt) => opt.requirement_id === req.id);
    
    const marketplaceOptions = reqOptions
      .map((opt) => {
        const course = opt.marketplace_courses || opt.edu_courses;
        if (!course) return null;

        // For edu courses without a provider, use a default university provider
        const provider = opt.provider || (opt.edu_courses ? {
          id: 'edu',
          name: 'University',
          type: 'university',
          website_url: null,
          provider_code: 'EDU'
        } : null);
        
        // Look up provider defaults for CRI signals (normalized to kebab-case)
        const providerId = normalizeProviderId(provider?.id);
        const pDefaults = providerId ? PROVIDER_DEFAULTS[providerId] : undefined;
        
        // Log when provider not found (helps grow coverage) - ONCE per provider
        if (provider?.id && !pDefaults && !warnedProviders.has(provider.id)) {
          warnedProviders.add(provider.id);
          if (!ENV.PROD) {
            console.warn(`[CRI] Provider not in registry: "${provider.id}" (normalized: "${providerId}")`);
          }
          // TODO: Track missing providers for registry growth
          // trackTelemetryEvent({ task: 'marketplace_provider_missing_defaults', complexity: { providerId, providerIdNormalized: providerId } });
        }

        return {
          id: course.id,
          courseId: course.code,
          title: course.title,
          credits: course.credits,
          subject: opt.marketplace_courses ? 'Marketplace' : 'University',
          provider: provider?.name || 'University',
          providerType: provider?.type?.toLowerCase() || null,
          providerCode: provider?.provider_code || null,
          level: 100, // Default level - can be enriched from DB later
          cost_usd: opt.marketplace_courses?.cost_usd ?? null,
          duration_weeks: opt.marketplace_courses?.duration_weeks ?? null,
          // Inject CRI signals from provider registry
          aceNccrs: pDefaults?.aceNccrs,
          proctored: pDefaults?.proctored,
          providerRep: pDefaults?.rep,
          // Phase 1 additions
          pace_type: 'self_paced', // Default - can be enriched from DB later
          start_windows: [], // Placeholder - will be enriched from DB
          workload_weekly_hours: course.credits * 2.5, // Estimate: 2.5 hrs/week per credit
          satisfies_requirements: [], // Placeholder - will be enriched from requirement_options
          prereq_course_ids: [], // Placeholder - will be enriched from course_prereqs
          unlocks_count: 0, // Placeholder - will be calculated
          equivalency_key: undefined, // Placeholder - will be enriched from equivalence tables
        };
      })
      .filter((opt): opt is NonNullable<typeof opt> => opt !== null);

    const cheapestOption =
      marketplaceOptions
        .filter((opt) => opt.cost_usd !== null)
        .reduce<number | null>(
          (min, opt) => (opt.cost_usd !== null && (min === null || opt.cost_usd < min) ? opt.cost_usd : min),
          null
        );

    // Compute selection summary from basket
    const selectedSummary = computeModuleSummary(
      req.id,
      req.credits_required ?? 0,
      basket
    );

    const module: ModuleData = {
      id: req.id,
      label: req.name,
      icon: mapCategoryToIcon(req.category),
      description: req.description ?? '',
      courses: [], // Empty for now - would come from user's selected courses
      creditsEarned: 0, // Would come from user progress
      creditsRequired: req.credits_required ?? 0,
      isCollapsed: false,
      selectedSummary, // Attach progress summary
    };

    // Add marketplace metadata if available
    if (marketplaceOptions.length > 0) {
      // Enrich options with defaults before attaching to module
      const enrichedOptions = marketplaceOptions.map(enrichOption);
      (module as any).optionsCount = enrichedOptions.length;
      (module as any).cheapestOption = cheapestOption;
      (module as any).marketplaceOptions = enrichedOptions;
    }

    const year = Math.min(4, Math.max(1, req.year));
    modulesByYear[year].push(module);
  });

  return modulesByYear;
}
