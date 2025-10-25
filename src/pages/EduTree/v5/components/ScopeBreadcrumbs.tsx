import { ChevronRight } from 'lucide-react';
import type { PanelScope } from '../hooks/useScopedPanel';

interface ScopeBreadcrumbsProps {
  scope: PanelScope;
  nodeLabel?: string;
  year?: number;
  degreeTitle?: string;
  onNavigate: (scope: PanelScope, nodeId?: string) => void;
}

export function ScopeBreadcrumbs({ scope, nodeLabel, year, degreeTitle, onNavigate }: ScopeBreadcrumbsProps) {
  const getScopeColor = (s: PanelScope) => {
    switch (s) {
      case 'degree': return 'text-purple-600 dark:text-purple-400';
      case 'year': return 'text-blue-600 dark:text-blue-400';
      case 'module': return 'text-green-600 dark:text-green-400';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex items-center gap-2 text-sm mb-4">
      <button
        onClick={() => onNavigate('degree')}
        aria-current={scope === 'degree' ? 'page' : undefined}
        title="Go to Degree overview"
        className={`hover:underline transition-colors ${
          scope === 'degree' ? getScopeColor('degree') : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        🎓 {degreeTitle || 'BS Computer Science'}
      </button>

      {(scope === 'year' || scope === 'module') && year !== undefined && (
        <>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <button
            onClick={() => onNavigate('year', String(year))}
            aria-current={scope === 'year' ? 'page' : undefined}
            title={`Go to Year ${year} overview`}
            className={`hover:underline transition-colors ${
              scope === 'year' ? getScopeColor('year') : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            📅 Year {year}
          </button>
        </>
      )}

      {scope === 'module' && nodeLabel && (
        <>
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
          <span className={getScopeColor('module')}>
            📐 {nodeLabel}
          </span>
        </>
      )}
    </div>
  );
}
