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

const VALID_OPTION_KINDS = new Set(['course', 'exam', 'cert']);

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

/**
 * Runtime guard: detect broken join assumptions and unknown option_kind values.
 * Warns in dev, degrades gracefully in prod.
 */
function validateOptions(options: DbOption[]): void {
  const brokenJoinCount = options.filter(
    (o) => (o as any).educational_courses !== undefined
  ).length;
  const unknownKinds = options.filter(
    (o) => !VALID_OPTION_KINDS.has(o.option_kind)
  );
  const unresolvedCount = options.filter(
    (o) => !o.marketplace_courses && !o.edu_courses
  ).length;

  if (brokenJoinCount > 0) {
    const msg = `[transformDbToV5] ${brokenJoinCount} options have stale "educational_courses" nested join — this table does not exist. Check query aliases.`;
    if (!ENV.PROD) throw new Error(msg);
    console.warn(msg);
  }

  if (unknownKinds.length > 0) {
    const kinds = [...new Set(unknownKinds.map((o) => o.option_kind))];
    console.warn(
      `[transformDbToV5] ${unknownKinds.length} options have unknown option_kind: ${kinds.join(', ')}. Update VALID_OPTION_KINDS + transform logic.`
    );
  }

  if (!ENV.PROD && unresolvedCount > 0 && options.length > 0) {
    const pct = Math.round((unresolvedCount / options.length) * 100);
    console.debug(
      `[transformDbToV5] ${unresolvedCount}/${options.length} options (${pct}%) have no resolved course — these will be filtered out.`
    );
  }
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
    cost_usd: opt.cost_usd ?? 89,
    duration_weeks: opt.duration_weeks ?? 6,
    workload_weekly_hours: opt.workload_weekly_hours ?? credits * 2.5,
    providerType: opt.providerType ?? (opt.provider?.type || 'mooc'),
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
  // Runtime guard: catch broken joins + unknown option_kinds early
  validateOptions(allOptions);

  const modulesByYear: Record<number, ModuleData[]> = {
    1: [],
    2: [],
    3: [],
    4: [],
  };
  
  const warnedProviders = new Set<string>();

  requirements.forEach((req) => {
    const reqOptions = allOptions.filter((opt) => opt.requirement_id === req.id);
    
    const marketplaceOptions = reqOptions
      .map((opt) => {
        const course = opt.marketplace_courses || opt.edu_courses;
        if (!course) return null;

        const provider = opt.provider || (opt.edu_courses ? {
          id: 'edu',
          name: 'University',
          type: 'university',
          website_url: null,
          provider_code: 'EDU'
        } : null);
        
        const providerId = normalizeProviderId(provider?.id);
        const pDefaults = providerId ? PROVIDER_DEFAULTS[providerId] : undefined;
        
        if (provider?.id && !pDefaults && !warnedProviders.has(provider.id)) {
          warnedProviders.add(provider.id);
          if (!ENV.PROD) {
            console.warn(`[CRI] Provider not in registry: "${provider.id}" (normalized: "${providerId}")`);
          }
        }

        return {
          // Use requirement_option.id for stable selection identity
          // This prevents collision when same course satisfies multiple requirements
          id: opt.id,
          courseId: course.code,
          title: course.title,
          credits: course.credits,
          subject: opt.marketplace_courses ? 'Marketplace' : 'University',
          provider: provider?.name || 'University',
          providerType: provider?.type?.toLowerCase() || null,
          providerCode: provider?.provider_code || null,
          level: 100,
          cost_usd: opt.marketplace_courses?.cost_usd ?? null,
          duration_weeks: opt.marketplace_courses?.duration_weeks ?? null,
          // CRITICAL: Preserve requirement_id for coverage calculation
          requirementId: opt.requirement_id,
          // CRI signals from provider registry
          aceNccrs: pDefaults?.aceNccrs,
          proctored: pDefaults?.proctored,
          providerRep: pDefaults?.rep,
          // Phase 1 additions
          pace_type: 'self_paced',
          start_windows: [],
          workload_weekly_hours: course.credits * 2.5,
          satisfies_requirements: [],
          prereq_course_ids: [],
          unlocks_count: 0,
          equivalency_key: undefined,
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
      courses: [],
      creditsEarned: selectedSummary.credits,
      creditsRequired: req.credits_required ?? 0,
      isCollapsed: false,
      optionsCount: 0,
      selectedSummary,
    };

    if (marketplaceOptions.length > 0) {
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
