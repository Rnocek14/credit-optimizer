import type {
  BasketItem,
  Constraints,
  MarketplaceOption,
} from '../types/exports';
import { resolveChain } from './prereqs';
import { calculateTotals } from '../utils/totalsCalculator';

export interface ApplyTemplateParams {
  scope: 'degree' | 'year' | 'module' | 'course';
  scopeId?: string; // yearNumber or moduleId
  templateId: string;
  options: MarketplaceOption[]; // Courses to add from template
  currentBasket: BasketItem[];
  constraints: Constraints;
  allOptions: MarketplaceOption[]; // For prereq resolution
}

export interface ApplyResult {
  added: BasketItem[];
  removed: BasketItem[];
  diff: {
    costDelta: number;
    weeksDelta: number;
    creditsDelta: number;
    criDelta: number;
    aceCredits: number;
  };
  undoSnapshot: BasketItem[];
  conflicts: Array<{
    courseId: string;
    reason: string;
    severity: 'error' | 'warning';
  }>;
  meta: {
    templateId: string;
    scope: string;
    itemsProcessed: number;
  };
}

/**
 * Unified template apply function
 * Handles scope-based replacement (degree/year/module/course)
 * with prereq resolution, deduplication, and constraint validation
 */
export function applyTemplate(params: ApplyTemplateParams): ApplyResult {
  const { scope, scopeId, templateId, options, currentBasket, constraints, allOptions } = params;

  console.log(`[Apply] Starting ${scope} apply for template ${templateId}`, {
    scope,
    scopeId,
    optionsCount: options.length,
    basketSize: currentBasket.length,
  });

  // 1. Identify items in scope to replace
  const itemsInScope = filterItemsByScope(currentBasket, scope, scopeId);
  console.log(`[Apply] Found ${itemsInScope.length} items in scope to replace`);

  // 2. Resolve prerequisites for all template options
  const withPrereqs: MarketplaceOption[] = [];
  const conflicts: ApplyResult['conflicts'] = [];

  for (const option of options) {
    const chain = resolveChain(option.courseId, allOptions, currentBasket);

    // Warn about unsatisfiable prereqs (non-blocking)
    if (chain.unsatisfiable.length > 0) {
      conflicts.push({
        courseId: option.courseId,
        reason: `Missing prerequisites: ${chain.unsatisfiable.join(', ')}`,
        severity: 'warning',
      });
    }

    // Add prereqs first (in dependency order)
    const prereqOptions = chain.chain
      .map(courseId => allOptions.find(o => o.courseId === courseId))
      .filter(Boolean) as MarketplaceOption[];

    withPrereqs.push(...prereqOptions, option);
  }

  console.log(`[Apply] After prereq resolution: ${withPrereqs.length} items (includes prereqs)`);

  // 3. Deduplicate against current basket
  const basketIds = new Set(currentBasket.map(b => b.courseId));
  const newOptions = withPrereqs.filter(opt => !basketIds.has(opt.courseId));

  console.log(`[Apply] After deduplication: ${newOptions.length} new items`);

  // 4. Convert to basket items
  const newItems: BasketItem[] = newOptions.map(opt => convertToBasketItem(opt, templateId, scopeId));

  // 5. Validate constraints (warn-only for now)
  const runningTotals = calculateTotals([...currentBasket, ...newItems], constraints);

  if (constraints.max_budget_usd && runningTotals.totalCost > constraints.max_budget_usd) {
    conflicts.push({
      courseId: 'constraint',
      reason: `Budget exceeded: $${runningTotals.totalCost} > $${constraints.max_budget_usd}`,
      severity: 'warning',
    });
  }

  if (constraints.max_ace_credits && runningTotals.aceCredits > constraints.max_ace_credits) {
    conflicts.push({
      courseId: 'constraint',
      reason: `ACE credits exceeded: ${runningTotals.aceCredits} > ${constraints.max_ace_credits}`,
      severity: 'warning',
    });
  }

  // 6. Calculate diff
  const beforeTotals = calculateTotals(currentBasket, constraints);
  const afterTotals = calculateTotals([...currentBasket.filter(item => !itemsInScope.includes(item)), ...newItems], constraints);

  const diff = {
    costDelta: afterTotals.totalCost - beforeTotals.totalCost,
    weeksDelta: afterTotals.totalWeeks - beforeTotals.totalWeeks,
    creditsDelta: afterTotals.aceCredits - beforeTotals.aceCredits,
    criDelta: 0, // TODO: Calculate CRI delta if needed
    aceCredits: afterTotals.aceCredits,
  };

  console.log(`[Apply] Diff:`, diff);

  return {
    added: newItems,
    removed: itemsInScope,
    diff,
    undoSnapshot: [...itemsInScope],
    conflicts,
    meta: {
      templateId,
      scope,
      itemsProcessed: newItems.length,
    },
  };
}

/**
 * Filter basket items by scope
 */
function filterItemsByScope(
  basket: BasketItem[],
  scope: 'degree' | 'year' | 'module' | 'course',
  scopeId?: string
): BasketItem[] {
  switch (scope) {
    case 'degree':
      // Replace entire plan
      return [...basket];
    
    case 'year':
      // Filter by year metadata (if enriched)
      // For now, we don't have year metadata in BasketItem
      // This would require enriching BasketItem with year info from module → year mapping
      console.warn('[Apply] Year-scoped replace not yet implemented (need module→year mapping)');
      return [];
    
    case 'module':
      // Filter by moduleId
      return basket.filter(item => item.moduleId === scopeId);
    
    case 'course':
      // Filter by courseId
      return basket.filter(item => item.courseId === scopeId);
    
    default:
      return [];
  }
}

/**
 * Convert MarketplaceOption to BasketItem
 */
function convertToBasketItem(
  option: MarketplaceOption,
  templateId: string,
  moduleId?: string
): BasketItem {
  // Critical: moduleId must be a valid UUID, not a fallback to subject
  // This prevents items from being orphaned with generic subjects like "Computer Science"
  if (!moduleId || moduleId.length < 10) {
    console.error(
      `[Apply] ❌ CRITICAL: Missing or invalid moduleId for course ${option.courseId}`,
      {
        moduleId,
        templateId,
        courseId: option.courseId,
        subject: option.subject,
        fallbackWouldBe: option.subject || 'unknown'
      }
    );
    // Use fallback but log loudly - this indicates a template configuration error
    moduleId = option.subject || 'unknown';
    console.warn(`[Apply] ⚠️ Using fallback moduleId: "${moduleId}" - basket item may be orphaned!`);
  }

  console.log(`[Apply] ✅ Converting to basket item:`, {
    courseId: option.courseId,
    moduleId,
    templateId
  });

  return {
    moduleId,
    courseId: option.courseId,
    title: option.title ?? option.courseId,
    credits: option.credits,
    cost_usd: option.cost_usd ?? null,
    duration_weeks: option.duration_weeks ?? null,
    workload_weekly_hours: option.workload_weekly_hours ?? (option.credits * 2.5),
    cri_score: option.cri_score ?? 0,
    status: 'auto-filled',
    providerType: option.providerType,
    autoFillReason: `From template: ${templateId}`,
  };
}
