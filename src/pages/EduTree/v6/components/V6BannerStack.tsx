import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, Info } from 'lucide-react';
import { V6_COPY } from '../copy';

interface V6BannerStackProps {
  /** Primary banner — always visible if provided */
  primary?: ReactNode;
  /** Additional banners — collapsed by default */
  secondary?: ReactNode[];
}

export function V6BannerStack({ primary, secondary = [] }: V6BannerStackProps) {
  const [expanded, setExpanded] = useState(false);
  
  const visibleSecondary = secondary.filter(Boolean);
  const hasSecondary = visibleSecondary.length > 0;
  
  if (!primary && !hasSecondary) return null;

  return (
    <div className="mb-6 space-y-2">
      {/* Primary banner */}
      {primary}
      
      {/* Secondary banners — collapsed */}
      {hasSecondary && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            <Info className="w-3 h-3" />
            {expanded ? V6_COPY.hideDetails : V6_COPY.showDetails}
            {!expanded && (
              <span className="text-muted-foreground/60 ml-1">
                ({visibleSecondary.length} more)
              </span>
            )}
          </button>
          
          {expanded && (
            <div className="space-y-2 mt-2 animate-in fade-in-0 slide-in-from-top-1 duration-200">
              {visibleSecondary.map((banner, i) => (
                <div key={i}>{banner}</div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
