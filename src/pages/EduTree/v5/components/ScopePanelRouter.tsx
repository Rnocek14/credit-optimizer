import { DegreeAnalyzerPanel } from './DegreeAnalyzerPanel';
import { YearMarketplacePanel } from './YearMarketplacePanel';
import { MarketplacePanel } from './MarketplacePanel';
import { DecisionDockRouter } from './DecisionDockRouter';
import { FEATURE_FLAGS } from '../config/featureFlags';
import type { PanelScope } from '../hooks/useScopedPanel';
import type { DegreeSummary, ModuleData } from '../types/v5';

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
}

export function ScopePanelRouter(props: ScopePanelRouterProps) {
  const { scope, nodeId, activeTab, onClose, onNavigate, onTabChange } = props;

  // Feature flag check: use Decision Dock if enabled
  if (FEATURE_FLAGS.v5_decision_dock) {
    return <DecisionDockRouter {...props} />;
  }

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
