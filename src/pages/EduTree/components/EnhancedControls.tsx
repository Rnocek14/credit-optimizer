/**
 * Enhanced control panel for EduTree with improved UX and accessibility
 */

import React, { useState, useEffect } from 'react';
import { Settings, Eye, Filter, Layout, MapPin, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { COPY } from '../constants/copy';

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
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('edutree:v2:controls-expanded') !== 'false';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('edutree:v2:controls-expanded', String(isExpanded));
    }
  }, [isExpanded]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (!isVisible) {
    return (
      <div className="enhanced-controls fixed top-4 right-4 z-40">
        <Button
          onClick={() => onVisibilityToggle?.(true)}
          variant="outline"
          size="sm"
          className="bg-background/95 backdrop-blur-sm shadow-lg"
          aria-label={COPY.showControls}
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Card 
        className="enhanced-controls fixed top-4 right-4 z-40 w-80 bg-background/95 backdrop-blur-sm shadow-lg pointer-events-auto"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {COPY.viewControls}
            </CardTitle>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" aria-label="Help">
                    <HelpCircle className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{COPY.viewControlsTooltip}</p>
                </TooltipContent>
              </Tooltip>
              {onVisibilityToggle && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onVisibilityToggle(false)}
                  className="h-6 w-6 p-0"
                  aria-label={COPY.hideControls}
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
                {progressStats.completed}/{progressStats.total} {COPY.complete}
              </Badge>
              <div 
                className="flex-1 h-2 bg-muted rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={progressStats.completed}
                aria-valuemax={progressStats.total}
                aria-valuetext={`${progressStats.completed} of ${progressStats.total} complete`}
              >
                <div 
                  className="h-full bg-primary transition-all duration-300"
                  style={{ 
                    width: `${progressStats.total > 0 ? (progressStats.completed / progressStats.total) * 100 : 0}%` 
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
              {COPY.viewMode}
            </label>
            <Select 
              value={viewMode} 
              onValueChange={(value: any) => onViewModeChange?.(value)}
            >
              <SelectTrigger className="h-8 text-xs" data-clickable="true">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">{COPY.overview}</SelectItem>
                <SelectItem value="detailed">{COPY.detailed}</SelectItem>
                <SelectItem value="comparison">{COPY.comparison}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Layout Density */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {COPY.layoutDensity}
            </label>
            <Select 
              value={layoutDensity} 
              onValueChange={(value: any) => onLayoutDensityChange?.(value)}
            >
              <SelectTrigger className="h-8 text-xs" data-clickable="true">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">{COPY.compact}</SelectItem>
                <SelectItem value="comfortable">{COPY.comfortable}</SelectItem>
                <SelectItem value="spacious">{COPY.spacious}</SelectItem>
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
                aria-label={isExpanded ? COPY.collapseAdvanced : COPY.expandAdvanced}
                aria-expanded={isExpanded}
              >
                <span className="flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  {COPY.advancedOptions}
                </span>
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
            </CollapsibleTrigger>

            <CollapsibleContent className="space-y-3 pt-2">
              {/* Filter Toggles */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">{COPY.showCompleted}</label>
                  <Switch
                    checked={showCompleted}
                    onCheckedChange={onShowCompletedChange}
                    className="scale-75"
                    role="switch"
                    aria-label={COPY.showCompleted}
                    data-clickable="true"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-xs text-muted-foreground">{COPY.showPrerequisites}</label>
                  <Switch
                    checked={showPrerequisites}
                    onCheckedChange={onShowPrerequisitesChange}
                    className="scale-75"
                    role="switch"
                    aria-label={COPY.showPrerequisites}
                    data-clickable="true"
                  />
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-1 pt-2 border-t border-border">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-[10px] flex-1"
                  onMouseDown={(e) => e.stopPropagation()}
                  aria-label={COPY.resetView}
                >
                  {COPY.resetView}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-6 text-[10px] flex-1"
                  onMouseDown={(e) => e.stopPropagation()}
                  aria-label={COPY.centerGraph}
                >
                  {COPY.centerGraph}
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}