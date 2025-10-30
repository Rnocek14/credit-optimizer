/**
 * Node progress summary for visualization
 * Computed from basket selections at degree/year/module level
 */
export interface NodeSelectedSummary {
  scope: 'degree' | 'year' | 'module';
  credits: number;
  creditsRequired: number;
  cost: number;
  weeks: number;
  avgCri: number;
  courseCount: number;
  progressPercent: number;
  isComplete: boolean;
  isEmpty: boolean;
  templateSource?: string; // Which template filled this node
  
  // Week 1: Anchor-aware metrics
  unmetRequirements?: Array<{
    blockId: string;
    blockSlug: string;
    label: string;
    rule_type: 'ALL' | 'K_OF_N' | 'CREDITS';
    creditsNeeded: number;
    moduleIds: string[];
    violations?: string[];
  }>;
  transferMetrics?: {
    aceUsed: number;
    aceCap: number;
    residencyEarned: number;
    residencyRequired: number;
    upperDivisionEarned: number;
    upperDivisionRequired: number;
  };
  policyWarnings?: Array<{
    type: 'transfer_cap' | 'residency' | 'upper_division' | 'prerequisite';
    severity: 'error' | 'warning' | 'info';
    message: string;
    affectedModuleIds: string[];
  }>;
}

/**
 * Compute module-level selection summary
 */
export function computeModuleSummary(
  moduleId: string,
  creditsRequired: number,
  basketItems: Array<{
    moduleId: string;
    credits: number;
    cost_usd: number | null;
    duration_weeks: number | null;
    cri_score: number;
    status?: string;
    autoFillReason?: string;
  }>
): NodeSelectedSummary {
  const moduleItems = basketItems.filter(item => item.moduleId === moduleId);

  const totalCredits = moduleItems.reduce((sum, i) => sum + i.credits, 0);
  const totalCost = moduleItems.reduce((sum, i) => sum + (i.cost_usd ?? 0), 0);
  const maxWeeks = Math.max(...moduleItems.map(i => i.duration_weeks ?? 0), 0);
  const avgCri =
    moduleItems.length > 0
      ? moduleItems.reduce((sum, i) => sum + i.cri_score, 0) / moduleItems.length
      : 0;

  // Detect template source using structured provenance (fallback to autoFillReason)
  const templateSources = new Set(
    moduleItems
      .filter(i => i.status === 'auto-filled')
      .map(i => {
        // Prefer structured source
        if ((i as any).source?.templateLabel) {
          return `From template: ${(i as any).source.templateLabel}`;
        }
        // Fallback to legacy autoFillReason
        return (i as any).autoFillReason;
      })
      .filter(Boolean)
  );
  const templateSource = templateSources.size === 1 ? Array.from(templateSources)[0] : undefined;

  return {
    scope: 'module',
    credits: totalCredits,
    creditsRequired,
    cost: totalCost,
    weeks: maxWeeks,
    avgCri,
    courseCount: moduleItems.length,
    progressPercent: creditsRequired > 0 ? (totalCredits / creditsRequired) * 100 : 0,
    isComplete: totalCredits >= creditsRequired,
    isEmpty: moduleItems.length === 0,
    templateSource,
  };
}

/**
 * Compute year-level selection summary (Week 1: Extended with anchor metrics)
 */
export function computeYearSummary(
  year: number,
  modulesInYear: Array<{ 
    id: string; 
    creditsRequired: number;
    requirement_block_id?: string;
    upper_division?: boolean;
  }>,
  basketItems: Array<{
    moduleId: string;
    credits: number;
    cost_usd: number | null;
    duration_weeks: number | null;
    cri_score: number;
    providerType?: 'university' | 'mooc' | 'bootcamp' | 'testing_center' | null;
    level?: number;
  }>,
  blocks?: Array<{ 
    id: string; 
    slug?: string; 
    title: string; 
    rule_type: 'ALL' | 'K_OF_N' | 'CREDITS'; 
    credits_needed?: number | null;
  }>,
  anchorPolicy?: { 
    max_alt_credits: number; 
    min_residency_credits: number; 
    upper_division_min: number;
  }
): NodeSelectedSummary {
  const moduleIds = new Set(modulesInYear.map(m => m.id));
  const yearItems = basketItems.filter(item => moduleIds.has(item.moduleId));

  const totalCreditsRequired = modulesInYear.reduce((sum, m) => sum + m.creditsRequired, 0);
  const totalCredits = yearItems.reduce((sum, i) => sum + i.credits, 0);
  const totalCost = yearItems.reduce((sum, i) => sum + (i.cost_usd ?? 0), 0);
  const maxWeeks = Math.max(...yearItems.map(i => i.duration_weeks ?? 0), 0);
  const avgCri =
    yearItems.length > 0 ? yearItems.reduce((sum, i) => sum + i.cri_score, 0) / yearItems.length : 0;

  // Week 1: Compute unmet requirements (placeholder - requires isBlockComplete)
  let unmetRequirements: NodeSelectedSummary['unmetRequirements'];
  if (blocks) {
    const yearBlocks = blocks.filter(b => 
      modulesInYear.some(m => m.requirement_block_id === b.id)
    );
    
    // TODO: Integrate isBlockComplete() to filter unmet blocks
    unmetRequirements = yearBlocks.map(block => ({
      blockId: block.id,
      blockSlug: block.slug || '',
      label: block.title,
      rule_type: block.rule_type,
      creditsNeeded: block.credits_needed || 0,
      moduleIds: modulesInYear.filter(m => m.requirement_block_id === block.id).map(m => m.id),
      violations: [], // Placeholder
    }));
  }

  // Week 1: Compute transfer/residency metrics
  let transferMetrics: NodeSelectedSummary['transferMetrics'];
  if (anchorPolicy) {
    transferMetrics = {
      aceUsed: yearItems.filter(i => i.providerType === 'mooc' || i.providerType === 'testing_center').reduce((sum, i) => sum + i.credits, 0),
      aceCap: anchorPolicy.max_alt_credits,
      residencyEarned: yearItems.filter(i => i.providerType === 'university').reduce((sum, i) => sum + i.credits, 0),
      residencyRequired: anchorPolicy.min_residency_credits,
      upperDivisionEarned: yearItems.filter(i => (i.level || 0) >= 300).reduce((sum, i) => sum + i.credits, 0),
      upperDivisionRequired: anchorPolicy.upper_division_min,
    };
  }

  return {
    scope: 'year',
    credits: totalCredits,
    creditsRequired: totalCreditsRequired,
    cost: totalCost,
    weeks: maxWeeks,
    avgCri,
    courseCount: yearItems.length,
    progressPercent: totalCreditsRequired > 0 ? (totalCredits / totalCreditsRequired) * 100 : 0,
    isComplete: totalCredits >= totalCreditsRequired,
    isEmpty: yearItems.length === 0,
    unmetRequirements,
    transferMetrics,
  };
}
