import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RotateCcw, Zap, Eye, Settings } from 'lucide-react';

export interface EnhancedLayoutControlsProps {
  layoutAlgorithm: 'semantic-hierarchy' | 'category-cluster' | 'goal-focused' | 'progressive-disclosure';
  onLayoutAlgorithmChange: (algorithm: 'semantic-hierarchy' | 'category-cluster' | 'goal-focused' | 'progressive-disclosure') => void;
  onRecalculateLayout: () => void;
  onResetView: () => void;
  
  // Enhanced controls
  focusMode: boolean;
  onFocusModeChange: (enabled: boolean) => void;
  
  showOnlyGoalPath: boolean;
  onShowOnlyGoalPathChange: (enabled: boolean) => void;
  
  // Statistics
  nodeCount: number;
  edgeCount: number;
  isCalculating?: boolean;
  
  // Search and filtering
  searchTerm?: string;
  selectedCareerPath?: string | null;
}

export const EnhancedLayoutControls: React.FC<EnhancedLayoutControlsProps> = ({
  layoutAlgorithm,
  onLayoutAlgorithmChange,
  onRecalculateLayout,
  onResetView,
  focusMode,
  onFocusModeChange,
  showOnlyGoalPath,
  onShowOnlyGoalPathChange,
  nodeCount,
  edgeCount,
  isCalculating = false,
  searchTerm,
  selectedCareerPath
}) => {
  
  const algorithmDescriptions = {
    'semantic-hierarchy': 'Organizes nodes by type and dependencies with skills at top, jobs at bottom',
    'category-cluster': 'Groups nodes by category (Programming, Design, etc.) in distinct clusters',
    'goal-focused': 'Centers layout around selected career goal with related nodes in proximity',
    'progressive-disclosure': 'Shows only relevant nodes based on selected career path'
  };

  const algorithmLabels = {
    'semantic-hierarchy': 'Semantic Hierarchy',
    'category-cluster': 'Category Clusters', 
    'goal-focused': 'Goal-Focused',
    'progressive-disclosure': 'Progressive Disclosure'
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Enhanced Layout Controls
        </CardTitle>
        <CardDescription>
          Configure how your career graph is displayed and organized
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Layout Algorithm Selection */}
        <div className="space-y-2">
          <Label htmlFor="layout-algorithm" className="text-sm font-medium">Layout Algorithm</Label>
          <Select value={layoutAlgorithm} onValueChange={onLayoutAlgorithmChange}>
            <SelectTrigger id="layout-algorithm">
              <SelectValue placeholder="Choose layout algorithm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semantic-hierarchy">
                <div className="flex items-center gap-2">
                  📊 {algorithmLabels['semantic-hierarchy']}
                </div>
              </SelectItem>
              <SelectItem value="category-cluster">
                <div className="flex items-center gap-2">
                  🎯 {algorithmLabels['category-cluster']}
                </div>
              </SelectItem>
              <SelectItem value="goal-focused">
                <div className="flex items-center gap-2">
                  🔍 {algorithmLabels['goal-focused']}
                </div>
              </SelectItem>
              <SelectItem value="progressive-disclosure">
                <div className="flex items-center gap-2">
                  📈 {algorithmLabels['progressive-disclosure']}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          {/* Algorithm Description */}
          <p className="text-xs text-muted-foreground">
            {algorithmDescriptions[layoutAlgorithm]}
          </p>
        </div>

        {/* Enhanced Controls */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="focus-mode" className="text-sm font-medium">Focus Mode</Label>
              <p className="text-xs text-muted-foreground">
                Dim non-matching nodes when searching
              </p>
            </div>
            <Switch
              id="focus-mode"
              checked={focusMode}
              onCheckedChange={onFocusModeChange}
            />
          </div>

          {selectedCareerPath && (
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="goal-path-only" className="text-sm font-medium">Goal Path Only</Label>
                <p className="text-xs text-muted-foreground">
                  Show only nodes relevant to selected career path
                </p>
              </div>
              <Switch
                id="goal-path-only"
                checked={showOnlyGoalPath}
                onCheckedChange={onShowOnlyGoalPathChange}
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={onRecalculateLayout}
            variant="default"
            size="sm"
            disabled={isCalculating}
            className="flex-1"
          >
            {isCalculating ? (
              <>
                <Zap className="h-4 w-4 mr-2 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Recalculate
              </>
            )}
          </Button>
          
          <Button 
            onClick={onResetView}
            variant="outline"
            size="sm"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset View
          </Button>
        </div>

        {/* Graph Statistics */}
        <div className="space-y-3 pt-3 border-t">
          <h4 className="text-sm font-medium">Graph Statistics</h4>
          <div className="grid grid-cols-2 gap-2">
            <Badge variant="secondary" className="justify-center">
              Nodes: {nodeCount}
            </Badge>
            <Badge variant="secondary" className="justify-center">
              Edges: {edgeCount}
            </Badge>
          </div>
          
          {/* Current Filters */}
          {(searchTerm || selectedCareerPath) && (
            <div className="space-y-2">
              <h5 className="text-xs font-medium text-muted-foreground">Active Filters</h5>
              <div className="flex flex-wrap gap-1">
                {searchTerm && (
                  <Badge variant="outline" className="text-xs">
                    <Eye className="h-3 w-3 mr-1" />
                    Search: {searchTerm}
                  </Badge>
                )}
                {selectedCareerPath && (
                  <Badge variant="outline" className="text-xs">
                    🎯 Career Path
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Layout Status */}
        <div className="text-xs text-muted-foreground text-center">
          Layout: <span className="font-medium">{algorithmLabels[layoutAlgorithm]}</span>
          {isCalculating && <span className="ml-2 animate-pulse">⚡ Processing...</span>}
        </div>
      </CardContent>
    </Card>
  );
};