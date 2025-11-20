import { DegreeAnalyzerPanel } from './DegreeAnalyzerPanel';
import { YearMarketplacePanel } from './YearMarketplacePanel';
import { MarketplacePanel } from './MarketplacePanel';
import { DecisionDockRouter } from './DecisionDockRouter';
import { FEATURE_FLAGS } from '../config/featureFlags';
import type { PanelScope } from '../hooks/useScopedPanel';
import type { DegreeSummary, ModuleData } from '../types/v5';
import { usePlanBasket } from '../state/usePlanBasket';
import { useRequirementBlocks } from '../hooks/useRequirementBlocks';
import { useV5DatabaseData } from '../hooks/useV5DatabaseData';

interface ScopePanelRouterProps {
  // Panel state
  scope: PanelScope;
  nodeId?: string;
  nodeData?: any;
  activeTab?: string;
  
  // Handlers
  onClose: () => void;
  onNavigate: (scope: PanelScope, nodeId?: string, nodeData?: any) => void;
  onTabChange: (tab: string) => void;
  
  // Degree-specific
  degreeSummary?: DegreeSummary;
  
  // Year-specific
  year?: number;
  yearModules?: ModuleData[];
  onOpenModulePanel?: (module: ModuleData) => void;
  
  // Module-specific (existing MarketplacePanel props)
  moduleId?: string;
  moduleLabel?: string;
  creditsEarned?: number;
  creditsRequired?: number;
  options?: any[];
  sortBy?: 'cheapest' | 'shortest' | 'credits' | 'best-match';
  setSortBy?: (v: 'cheapest' | 'shortest' | 'credits' | 'best-match') => void;
  yearEarned?: number;
  yearCap?: number;
  allModules?: any[];
  allOptions?: any[]; // Marketplace options for templates and optimizer
}

export function ScopePanelRouter(props: ScopePanelRouterProps) {
  const { scope, nodeId, activeTab, onClose, onNavigate, onTabChange } = props;
  
  console.log('[ScopePanelRouter] 🚀 Rendering:', {
    scope,
    nodeId,
    yearModulesCount: props.yearModules?.length,
    dockFlag: FEATURE_FLAGS.v5_decision_dock
  });
  
  // Fetch data needed for year templates
  const constraints = usePlanBasket(s => s.constraints);
  const programId = 'bs_cs'; // TODO: Pass programId from parent when degree selection is implemented
  const { data: requirementBlocks = [] } = useRequirementBlocks(programId);
  const { data: dbData } = useV5DatabaseData({ programId, enabled: true });
  
  // Use allOptions from parent if provided (computed from allModules), otherwise fallback to dbData
  const allOptionsResolved = props.allOptions ?? Object.values(dbData?.modulesByYear || {})
    .flat()
    .flatMap(m => m.marketplaceOptions || []);
  const anchorPolicy = constraints.target_school 
    ? {
        partner_name: constraints.target_school,
        max_alt_credits: constraints.max_ace_credits ?? 90,
        min_residency_credits: 30, // Default from common anchor policies
        upper_division_min: 30, // Default from common anchor policies
      }
    : undefined;

  // Feature flag check: use Decision Dock if enabled
  console.log('[ScopePanelRouter] Feature flag check:', {
    flag: FEATURE_FLAGS.v5_decision_dock,
    willUseDock: !!FEATURE_FLAGS.v5_decision_dock
  });
  
  if (FEATURE_FLAGS.v5_decision_dock) {
    console.log('[ScopePanelRouter] ✅ Routing to DecisionDockRouter');
    return <DecisionDockRouter {...props} />;
  }
  
  console.log('[ScopePanelRouter] ⚠️ Routing to legacy Sheet panels');

  // Legacy Sheet-based panels
  if (!scope) return null;

  switch (scope) {
    case 'degree':
      return (
        <DegreeAnalyzerPanel
          open={true}
          onOpenChange={onClose}
          degreeSummary={props.degreeSummary!}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onNavigate={onNavigate}
        />
      );

    case 'year':
      return (
        <YearMarketplacePanel
          open={true}
          onOpenChange={onClose}
          year={props.year!}
          modules={props.yearModules || []}
          degreeTitle={props.degreeSummary?.degreeTitle}
          onNavigate={onNavigate}
          onOpenModulePanel={props.onOpenModulePanel!}
          requirementBlocks={requirementBlocks}
          allOptions={allOptionsResolved}
          anchorPolicy={anchorPolicy}
          programId={programId}
        />
      );

    case 'module':
      return (
        <MarketplacePanel
          open={true}
          onOpenChange={onClose}
          moduleId={props.moduleId!}
          moduleLabel={props.moduleLabel!}
          creditsEarned={props.creditsEarned!}
          creditsRequired={props.creditsRequired!}
          options={props.options || []}
          sortBy={props.sortBy || 'best-match'}
          setSortBy={props.setSortBy!}
          yearEarned={props.yearEarned!}
          yearCap={props.yearCap!}
          allModules={props.allModules || []}
        />
      );

    default:
      return null;
  }
}
