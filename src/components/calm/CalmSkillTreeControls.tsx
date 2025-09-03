// Calm Skill Tree Controls: Interactive controls for progressive disclosure
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Eye, EyeOff, Search, RotateCcw, Focus, Expand, 
  Filter, Layers, Target, Archive
} from 'lucide-react';

export interface CalmControlsProps {
  visibleDepth: number;
  focusNodeId: string | null;
  showCrossLaneEdges: boolean;
  expandedClusters: Set<string>;
  hideCompleted: boolean;
  showOnlyMyTrack: boolean;
  showNext4Weeks: boolean;
  onDepthChange: (depth: number) => void;
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
  onDepthChange,
  onResetView,
  onExitFocus,
  onExpandNeighbors,
  onToggleFilter,
  onSearch,
  onToggleOrphanDrawer
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" />
            Calm Mode Controls
          </CardTitle>
          <Badge variant="outline">
            Depth: {visibleDepth} | Clusters: {expandedClusters.size}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="sm">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        {/* Focus Mode Controls */}
        {focusNodeId && (
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Focus className="h-4 w-4" />
              <span className="text-sm font-medium">Focus Mode Active</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onExpandNeighbors}>
                <Expand className="h-4 w-4 mr-2" />
                Expand
              </Button>
              <Button size="sm" variant="outline" onClick={onExitFocus}>
                <EyeOff className="h-4 w-4 mr-2" />
                Exit Focus
              </Button>
            </div>
          </div>
        )}

        {/* Depth Control */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Visible Depth</Label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={1}
              max={3}
              value={visibleDepth}
              onChange={(e) => onDepthChange(parseInt(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm text-muted-foreground w-8">{visibleDepth}</span>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </Label>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="cross-lane" className="text-sm">Cross-lane edges</Label>
              <Switch
                id="cross-lane"
                checked={showCrossLaneEdges}
                onCheckedChange={(checked) => onToggleFilter('showCrossLaneEdges', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="hide-completed" className="text-sm">Hide completed</Label>
              <Switch
                id="hide-completed"
                checked={hideCompleted}
                onCheckedChange={(checked) => onToggleFilter('hideCompleted', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="my-track" className="text-sm">Show only my track</Label>
              <Switch
                id="my-track"
                checked={showOnlyMyTrack}
                onCheckedChange={(checked) => onToggleFilter('showOnlyMyTrack', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="next-4weeks" className="text-sm">Next 4 weeks</Label>
              <Switch
                id="next-4weeks"
                checked={showNext4Weeks}
                onCheckedChange={(checked) => onToggleFilter('showNext4Weeks', checked)}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onResetView} className="flex-1">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset View
          </Button>
          <Button variant="outline" size="sm" onClick={onToggleOrphanDrawer} className="flex-1">
            <Archive className="h-4 w-4 mr-2" />
            Orphans
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};