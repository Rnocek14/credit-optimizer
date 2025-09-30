import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeatureFlags } from '@/lib/featureFlags';

import { type FilterMode } from '../data/seedDataV2';

interface DevOverrides {
  filterMode?: FilterMode;
  eduTreeLayoutMode?: 'legacy' | 'manual_v1' | 'grid_v2';
  eduTreeV2Grid?: boolean;
}

interface CompactDevPanelProps {
  dev: DevOverrides;
  setDev: React.Dispatch<React.SetStateAction<DevOverrides>>;
  effectiveFlags: {
    eduTreeV2Grid?: boolean;
    eduTreeLayoutMode?: string;
  };
  effectiveFilterMode?: FilterMode;
  isAutoMode?: boolean;
}

export function CompactDevPanel({ dev, setDev, effectiveFlags, effectiveFilterMode, isAutoMode }: CompactDevPanelProps) {
  const flags = useFeatureFlags();
  const [isExpanded, setIsExpanded] = React.useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('edutree:v2:dev-panel:expanded') === 'true';
  });

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('edutree:v2:dev-panel:expanded', String(isExpanded));
    }
  }, [isExpanded]);

  // Show in dev mode OR if localStorage flag is set (allows testing in Preview)
  const showDevControls = process.env.NODE_ENV === 'development' || 
    (typeof window !== 'undefined' && localStorage.getItem('dev') === '1');

  if (!showDevControls) {
    return null;
  }

  return (
    <Card className="w-64">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Dev Controls
          </div>
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                aria-label={isExpanded ? "Collapse dev controls" : "Expand dev controls"}
              >
                <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </CardTitle>
      </CardHeader>
      
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {/* Filter Mode */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Filter Mode</label>
              <select
                value={dev.filterMode || 'compare-tracks'}
                onChange={e => setDev(d => ({ ...d, filterMode: e.target.value as any }))}
                className="w-full mt-1 text-xs border rounded px-2 py-1 bg-background"
              >
                <option value="compare-tracks">Compare Tracks</option>
                <option value="compare-programs">Compare Programs</option>
                <option value="compare-any">Compare Any</option>
                <option value="se">SE Only</option>
                <option value="ds">DS Only</option>
              </select>
              
              {/* Auto-mode indicator */}
              {isAutoMode && (
                <div className="mt-1 text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded border">
                  🤖 Auto: Program comparison
                </div>
              )}
              
              {effectiveFilterMode && effectiveFilterMode !== (dev.filterMode || 'compare-tracks') && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Effective: {effectiveFilterMode}
                </div>
              )}
            </div>

            {/* Layout Mode */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">Layout Mode</label>
              <select
                value={dev.eduTreeLayoutMode || effectiveFlags.eduTreeLayoutMode}
                onChange={e => setDev(d => ({ ...d, eduTreeLayoutMode: e.target.value as any }))}
                className="w-full mt-1 text-xs border rounded px-2 py-1 bg-background"
              >
                <option value="legacy">Legacy</option>
                <option value="manual_v1">Manual V1</option>
                <option value="grid_v2">Grid V2</option>
              </select>
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={!!effectiveFlags.eduTreeV2Grid}
                  onChange={e => setDev(d => ({ ...d, eduTreeV2Grid: e.target.checked }))}
                  className="rounded"
                />
                Grid V2
              </label>

              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={!!flags.eduTreeV2EdgeKinds}
                  onChange={e => {
                    const url = new URL(window.location.href);
                    const newValue = e.target.checked ? 'true' : 'false';
                    url.searchParams.set('eduTreeV2EdgeKinds', newValue);
                    window.location.href = url.toString();
                  }}
                  className="rounded"
                />
                V2 Edge Kinds
              </label>

              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={typeof window !== 'undefined' && window.localStorage?.getItem('mp') === '1'}
                  onChange={e => {
                    if (e.target.checked) {
                      localStorage.setItem('mp', '1');
                    } else {
                      localStorage.removeItem('mp');
                    }
                    location.reload();
                  }}
                  className="rounded"
                />
                Enable Marketplace
              </label>
            </div>

            {/* Reset Button */}
            <Button
              onClick={() => setDev({})}
              variant="outline"
              size="sm"
              className="w-full text-xs"
            >
              Reset All
            </Button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}