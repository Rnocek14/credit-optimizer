// Calm Skill Tree Controls: Progressive Disclosure UI
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Focus, 
  Expand, 
  Filter,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export interface CalmControlsProps {
  // Current state
  visibleDepth: number;
  focusNodeId: string | null;
  showCrossLaneEdges: boolean;
  expandedClusters: Set<string>;
  
  // Filters
  hideCompleted: boolean;
  showOnlyMyTrack: boolean;
  showNext4Weeks: boolean;
  
  // Metadata
  visibleNodes: number;
  totalNodes: number;
  visibleEdges: number;
  clusterCount: number;
  
  // Actions
  onDepthChange: (depth: number) => void;
  onToggleCrossLaneEdges: (show: boolean) => void;
  onResetView: () => void;
  onExitFocus: () => void;
  onExpandNeighbors: () => void;
  onToggleFilter: (filter: string, enabled: boolean) => void;
  onSearch: (query: string) => void;
  onToggleOrphanDrawer: () => void;
}

export const CalmSkillTreeControls: React.FC<CalmControlsProps> = ({
  visibleDepth,
  focusNodeId,
  showCrossLaneEdges,
  expandedClusters,
  hideCompleted,
  showOnlyMyTrack,
  showNext4Weeks,
  visibleNodes,
  totalNodes,
  visibleEdges,
  clusterCount,
  onDepthChange,
  onToggleCrossLaneEdges,
  onResetView,
  onExitFocus,
  onExpandNeighbors,
  onToggleFilter,
  onSearch,
  onToggleOrphanDrawer
}) => {
  const [isFilterOpen, setIsFilterOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Visibility Status */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {visibleNodes}/{totalNodes} nodes
            </Badge>
            {clusterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {clusterCount} clusters
              </Badge>
            )}
          </div>

          {/* Depth Control */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Depth:</span>
            <div className="w-24">
              <Slider
                value={[visibleDepth]}
                onValueChange={([depth]) => onDepthChange(depth)}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
            </div>
            <span className="text-xs text-muted-foreground w-8">{visibleDepth}</span>
          </div>

          {/* Focus Mode Controls */}
          {focusNodeId ? (
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">
                <Focus className="h-3 w-3 mr-1" />
                Focus Mode
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={onExpandNeighbors}
                className="text-xs"
              >
                <Expand className="h-3 w-3 mr-1" />
                Expand
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={onExitFocus}
                className="text-xs"
              >
                Exit Focus
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Search */}
              <form onSubmit={handleSearchSubmit} className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="Search nodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="text-xs px-2 py-1 border rounded w-32 h-8"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="outline"
                  className="h-8 px-2"
                >
                  <Search className="h-3 w-3" />
                </Button>
              </form>

              {/* Filters Toggle */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="text-xs h-8"
              >
                <Filter className="h-3 w-3 mr-1" />
                Filters
                {isFilterOpen ? (
                  <ChevronUp className="h-3 w-3 ml-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 ml-1" />
                )}
              </Button>
            </div>
          )}

          {/* Edge Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Cross-lane edges:</span>
            <Switch
              checked={showCrossLaneEdges}
              onCheckedChange={onToggleCrossLaneEdges}
            />
            {showCrossLaneEdges ? (
              <Eye className="h-3 w-3 text-muted-foreground" />
            ) : (
              <EyeOff className="h-3 w-3 text-muted-foreground" />
            )}
          </div>

          {/* Reset View */}
          <Button
            size="sm"
            variant="outline"
            onClick={onResetView}
            className="text-xs"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Reset View
          </Button>
        </div>

        {/* Expanded Filters */}
        {isFilterOpen && (
          <div className="mt-4 pt-4 border-t">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Hide completed</span>
                <Switch
                  checked={hideCompleted}
                  onCheckedChange={(checked) => onToggleFilter('hideCompleted', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Only my track</span>
                <Switch
                  checked={showOnlyMyTrack}
                  onCheckedChange={(checked) => onToggleFilter('showOnlyMyTrack', checked)}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm">Next 4 weeks</span>
                <Switch
                  checked={showNext4Weeks}
                  onCheckedChange={(checked) => onToggleFilter('showNext4Weeks', checked)}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};