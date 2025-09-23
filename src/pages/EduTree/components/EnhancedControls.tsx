/**
 * Enhanced control panel for EduTree with improved UX and accessibility
 */

import React, { useState } from 'react';
import { Settings, Eye, Filter, Layout, MapPin, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface EnhancedControlsProps {
  isVisible?: boolean;
  onVisibilityToggle?: (visible: boolean) => void;
  
  // View options
  viewMode?: 'overview' | 'detailed' | 'comparison';
  onViewModeChange?: (mode: 'overview' | 'detailed' | 'comparison') => void;
  
  // Filter options
  showCompleted?: boolean;
  onShowCompletedChange?: (show: boolean) => void;
  
  showPrerequisites?: boolean;
  onShowPrerequisitesChange?: (show: boolean) => void;
  
  // Layout options
  layoutDensity?: 'compact' | 'comfortable' | 'spacious';
  onLayoutDensityChange?: (density: 'compact' | 'comfortable' | 'spacious') => void;
  
  // Progress tracking
  progressStats?: {
    completed: number;
    inProgress: number;
    total: number;
  };
}

export function EnhancedControls({
  isVisible = true,
  onVisibilityToggle,
  viewMode = 'overview',
  onViewModeChange,
  showCompleted = true,
  onShowCompletedChange,
  showPrerequisites = true,
  onShowPrerequisitesChange,
  layoutDensity = 'comfortable',
  onLayoutDensityChange,
  progressStats
}: EnhancedControlsProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    try {
      return localStorage.getItem('edutree-controls-expanded') !== 'false';
    } catch {
      return false; // Default collapsed for cleaner UI
    }
  });

  const toggleExpanded = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    try {
      localStorage.setItem('edutree-controls-expanded', String(newExpanded));
    } catch {
      // ignore localStorage errors
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Button
          onClick={() => onVisibilityToggle?.(true)}
          variant="outline"
          size="sm"
          className="bg-background/95 backdrop-blur-sm shadow-lg"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Card className="fixed top-4 right-4 z-50 w-80 bg-background/95 backdrop-blur-sm shadow-lg">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" />
              View Controls
            </CardTitle>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <HelpCircle className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>Customize how courses and tracks are displayed</p>
                </TooltipContent>
              </Tooltip>
              {onVisibilityToggle && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onVisibilityToggle(false)}
                  className="h-6 w-6 p-0"
                >
                  <Eye className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {/* Progress Summary */}
          {progressStats && (
            <div className="flex items-center gap-2 pt-2">
              <Badge variant="outline" className="text-xs">
                {progressStats.completed}/{progressStats.total} Complete
              </Badge>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ 
                    width: `${(progressStats.completed / progressStats.total) * 100}%` 
                  }}
                />
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* View Mode Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Layout className="w-3 h-3" />
              View Mode
            </label>
            <Select 
              value={viewMode} 
              onValueChange={(value: any) => onViewModeChange?.(value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Overview</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
                <SelectItem value="comparison">Comparison</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Layout Density */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Layout Density
            </label>
            <Select 
              value={layoutDensity} 
              onValueChange={(value: any) => onLayoutDensityChange?.(value)}
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact</SelectItem>
                <SelectItem value="comfortable">Comfortable</SelectItem>
                <SelectItem value="spacious">Spacious</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Advanced Options */}
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={toggleExpanded}
                className="w-full justify-between h-6 text-xs px-0"
              >
                <span className="flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  Advanced Options
                </span>
                <div className="text-muted-foreground text-[10px]">
                  {isExpanded ? '−' : '+'}
                </div>
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-3 pt-2">
              {/* Filter Toggles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Show Completed</label>
                  <Switch
                    checked={showCompleted}
                    onCheckedChange={onShowCompletedChange}
                    className="scale-75"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">Show Prerequisites</label>
                  <Switch
                    checked={showPrerequisites}
                    onCheckedChange={onShowPrerequisitesChange}
                    className="scale-75"
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-1 pt-2 border-t border-border">
                <Button variant="outline" size="sm" className="h-6 text-[10px] flex-1">
                  Reset View
                </Button>
                <Button variant="outline" size="sm" className="h-6 text-[10px] flex-1">
                  Center Graph
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}