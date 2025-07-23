import React, { useState, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { Route, Eye, EyeOff, X, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PivotRoadmapStep {
  id: string;
  title: string;
  description?: string;
  skills_needed?: string[];
  skills_already_have?: string[];
  estimated_time?: string;
  estimated_cost?: string;
  learning_resources?: Array<{
    title: string;
    provider: string;
    cost: string;
    duration: string;
    reasoning: string;
  }>;
  x?: number;
  y?: number;
  pivotSource: string; // Which pivot generated this step
}

interface PivotPath {
  new_career: string;
  shared_skills: string[];
  missing_skills: string[];
  roi_score: number;
  estimated_time: string;
  estimated_cost: string;
  reasoning: string;
}

interface PivotRoadmapOverlayProps {
  activePivotPaths: PivotPath[];
  skillPositions: Map<string, { x: number; y: number }>;
  zoomLevel: number;
  panOffset: { x: number; y: number };
  showOverlay: boolean;
  onToggleOverlay: () => void;
  onPivotStepClick?: (step: PivotRoadmapStep) => void;
}

export const PivotRoadmapOverlay: React.FC<PivotRoadmapOverlayProps> = ({
  activePivotPaths,
  skillPositions,
  zoomLevel,
  panOffset,
  showOverlay,
  onToggleOverlay,
  onPivotStepClick
}) => {
  const [generatedRoadmaps, setGeneratedRoadmaps] = useState<Map<string, PivotRoadmapStep[]>>(new Map());
  const [loadingPivots, setLoadingPivots] = useState<Set<string>>(new Set());
  const [expandedPivots, setExpandedPivots] = useState<Set<string>>(new Set());

  // Generate roadmap for a specific pivot
  const generatePivotRoadmap = useCallback(async (pivot: PivotPath) => {
    const pivotKey = `${pivot.new_career}_${pivot.roi_score}`;
    
    if (generatedRoadmaps.has(pivotKey)) {
      console.log(`Roadmap already exists for ${pivot.new_career}`);
      return;
    }

    setLoadingPivots(prev => new Set(prev).add(pivotKey));
    
    try {
      console.log(`🚀 Generating roadmap for pivot: ${pivot.new_career}`);
      
      const { data, error } = await supabase.functions.invoke('generate-roadmap', {
        body: {
          goal: pivot.new_career,
          user_skills: pivot.shared_skills,
          max_time: pivot.estimated_time,
          max_budget: pivot.estimated_cost
        }
      });

      if (error) {
        throw new Error(`Failed to generate roadmap: ${error.message}`);
      }

      if (!data.success || !data.roadmaps) {
        throw new Error('Invalid roadmap response');
      }

      // Convert roadmap steps to overlay steps with positioning
      const roadmapSteps = convertRoadmapToOverlaySteps(
        data.roadmaps.fastest_path?.steps || [],
        pivot,
        pivotKey
      );

      setGeneratedRoadmaps(prev => new Map(prev).set(pivotKey, roadmapSteps));
      setExpandedPivots(prev => new Set(prev).add(pivotKey));
      
      toast.success(`Generated roadmap for ${pivot.new_career}`, {
        description: `${roadmapSteps.length} steps created`
      });

    } catch (error) {
      console.error(`Failed to generate roadmap for ${pivot.new_career}:`, error);
      toast.error(`Failed to generate roadmap`, {
        description: error.message
      });
    } finally {
      setLoadingPivots(prev => {
        const newSet = new Set(prev);
        newSet.delete(pivotKey);
        return newSet;
      });
    }
  }, [generatedRoadmaps]);

  // Convert roadmap steps to positioned overlay steps
  const convertRoadmapToOverlaySteps = (
    steps: any[],
    pivot: PivotPath,
    pivotKey: string
  ): PivotRoadmapStep[] => {
    const baseY = 100; // Offset above main skill tree
    const stepSpacing = 200;
    
    return steps.map((step, index) => {
      // Try to position near related skills or use default layout
      const skillPosition = findBestPositionForStep(step, pivot);
      
      return {
        id: `pivot_${pivotKey}_${index}`,
        title: step.title,
        description: step.description,
        skills_needed: step.skills_needed || [],
        skills_already_have: step.skills_already_have || [],
        estimated_time: step.estimated_time,
        estimated_cost: step.estimated_cost,
        learning_resources: step.learning_resources || [],
        x: skillPosition.x,
        y: skillPosition.y - baseY - (index * 50), // Stack above base tree
        pivotSource: pivot.new_career
      };
    });
  };

  // Find best position for a step based on related skills
  const findBestPositionForStep = (step: any, pivot: PivotPath) => {
    const relatedSkills = [
      ...(step.skills_needed || []),
      ...(step.skills_already_have || []),
      ...pivot.shared_skills
    ];

    // Find positions of related skills
    const relatedPositions: { x: number; y: number }[] = [];
    
    skillPositions.forEach((position, skillId) => {
      // Simple skill name matching - could be improved with fuzzy matching
      const skillMatches = relatedSkills.some(skillName => 
        skillId.toLowerCase().includes(skillName.toLowerCase()) ||
        skillName.toLowerCase().includes(skillId.toLowerCase())
      );
      
      if (skillMatches) {
        relatedPositions.push(position);
      }
    });

    if (relatedPositions.length > 0) {
      // Calculate centroid of related skills
      const avgX = relatedPositions.reduce((sum, pos) => sum + pos.x, 0) / relatedPositions.length;
      const avgY = relatedPositions.reduce((sum, pos) => sum + pos.y, 0) / relatedPositions.length;
      return { x: avgX, y: avgY };
    }

    // Default position if no related skills found
    return { x: 200, y: 200 };
  };

  // Remove a pivot roadmap
  const removePivotRoadmap = useCallback((pivotKey: string) => {
    setGeneratedRoadmaps(prev => {
      const newMap = new Map(prev);
      newMap.delete(pivotKey);
      return newMap;
    });
    setExpandedPivots(prev => {
      const newSet = new Set(prev);
      newSet.delete(pivotKey);
      return newSet;
    });
  }, []);

  // Toggle pivot expansion
  const togglePivotExpansion = useCallback((pivotKey: string) => {
    setExpandedPivots(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pivotKey)) {
        newSet.delete(pivotKey);
      } else {
        newSet.add(pivotKey);
      }
      return newSet;
    });
  }, []);

  // Get all visible roadmap steps
  const visibleSteps = useMemo(() => {
    const steps: PivotRoadmapStep[] = [];
    
    generatedRoadmaps.forEach((roadmapSteps, pivotKey) => {
      if (expandedPivots.has(pivotKey)) {
        steps.push(...roadmapSteps);
      }
    });
    
    return steps;
  }, [generatedRoadmaps, expandedPivots]);

  // Generate dependency edges between pivot steps
  const pivotEdges = useMemo(() => {
    const edges: Array<{
      from: PivotRoadmapStep;
      to: PivotRoadmapStep;
      path: string;
    }> = [];

    generatedRoadmaps.forEach((steps) => {
      for (let i = 0; i < steps.length - 1; i++) {
        const fromStep = steps[i];
        const toStep = steps[i + 1];
        
        // Create Bezier curve path
        const path = `M ${fromStep.x},${fromStep.y} Q ${(fromStep.x + toStep.x) / 2},${fromStep.y - 50} ${toStep.x},${toStep.y}`;
        
        edges.push({ from: fromStep, to: toStep, path });
      }
    });

    return edges;
  }, [generatedRoadmaps]);

  if (!showOverlay) {
    return (
      <div className="fixed top-4 right-4 z-10">
        <Button
          onClick={onToggleOverlay}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Route className="w-4 h-4" />
          Show Pivot Roadmaps
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-10 space-y-2">
      {/* Toggle Button */}
      <Button
        onClick={onToggleOverlay}
        variant="outline"
        size="sm"
        className="gap-2"
      >
        <EyeOff className="w-4 h-4" />
        Hide Pivot Roadmaps
      </Button>

      {/* Pivot Controls */}
      <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 max-w-80 space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Pivot Roadmaps</h3>
        
        {activePivotPaths.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No active pivot paths. Use the skill tree to explore pivots.
          </p>
        ) : (
          <div className="space-y-2">
            {activePivotPaths.map((pivot, index) => {
              const pivotKey = `${pivot.new_career}_${pivot.roi_score}`;
              const isLoading = loadingPivots.has(pivotKey);
              const hasRoadmap = generatedRoadmaps.has(pivotKey);
              const isExpanded = expandedPivots.has(pivotKey);
              const stepCount = generatedRoadmaps.get(pivotKey)?.length || 0;
              
              return (
                <div key={pivotKey} className="border rounded p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{pivot.new_career}</p>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs px-1">
                          ROI {pivot.roi_score.toFixed(1)}x
                        </Badge>
                        {hasRoadmap && (
                          <Badge variant="outline" className="text-xs px-1">
                            {stepCount} steps
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      {hasRoadmap && (
                        <>
                          <Button
                            onClick={() => togglePivotExpansion(pivotKey)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                          >
                            {isExpanded ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                          <Button
                            onClick={() => removePivotRoadmap(pivotKey)}
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                      
                      <Button
                        onClick={() => generatePivotRoadmap(pivot)}
                        disabled={isLoading || hasRoadmap}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        {isLoading ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  {hasRoadmap && isExpanded && (
                    <div className="text-xs text-muted-foreground">
                      <p>Skills needed: {pivot.missing_skills.slice(0, 3).join(', ')}</p>
                      <p>Est. time: {pivot.estimated_time}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SVG Overlay for Roadmap Steps */}
      {visibleSteps.length > 0 && (
        <svg
          className="fixed inset-0 pointer-events-none"
          style={{ zIndex: 5 }}
          width="100%"
          height="100%"
        >
          <defs>
            <marker
              id="pivot-step-arrow"
              viewBox="0 0 10 10"
              refX="9"
              refY="3"
              markerWidth="6"
              markerHeight="6"
              orient="auto"
            >
              <path d="M0,0 L0,6 L9,3 z" fill="#8b5cf6" />
            </marker>
          </defs>
          
          <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoomLevel})`}>
            {/* Dependency edges */}
            {pivotEdges.map(({ from, to, path }, index) => (
              <path
                key={`edge-${index}`}
                d={path}
                stroke="#8b5cf6"
                strokeWidth="2"
                strokeDasharray="5,5"
                fill="none"
                markerEnd="url(#pivot-step-arrow)"
                opacity="0.8"
                className="animate-pulse"
              />
            ))}
            
            {/* Roadmap steps */}
            {visibleSteps.map((step) => (
              <TooltipProvider key={step.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <g 
                      transform={`translate(${step.x}, ${step.y})`}
                      className="cursor-pointer pointer-events-auto animate-fade-in"
                      onClick={() => onPivotStepClick?.(step)}
                    >
                      {/* Step background */}
                      <rect
                        x="-75"
                        y="-30"
                        width="150"
                        height="60"
                        rx="8"
                        fill="hsl(var(--background))"
                        stroke="#8b5cf6"
                        strokeWidth="2"
                        strokeDasharray="3,3"
                        className="animate-pulse"
                      />
                      
                      {/* Step content */}
                      <text
                        textAnchor="middle"
                        className="fill-foreground text-xs font-medium"
                        dy="-5"
                      >
                        {step.title.length > 20 ? `${step.title.slice(0, 20)}...` : step.title}
                      </text>
                      
                      <text
                        textAnchor="middle"
                        className="fill-muted-foreground text-xs"
                        dy="10"
                      >
                        {step.pivotSource}
                      </text>
                      
                      {/* Pivot indicator */}
                      <circle
                        cx="65"
                        cy="-20"
                        r="6"
                        fill="#8b5cf6"
                        className="animate-pulse"
                      />
                      <text
                        x="65"
                        y="-16"
                        textAnchor="middle"
                        className="fill-white text-xs font-bold"
                      >
                        P
                      </text>
                    </g>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="max-w-60">
                      <p className="font-semibold">{step.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pivot: {step.pivotSource}
                      </p>
                      {step.description && (
                        <p className="text-sm mt-1">{step.description}</p>
                      )}
                      {step.skills_needed && step.skills_needed.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-medium">Skills needed:</p>
                          <p className="text-xs">{step.skills_needed.slice(0, 3).join(', ')}</p>
                        </div>
                      )}
                      {step.estimated_time && (
                        <p className="text-xs mt-1">Time: {step.estimated_time}</p>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </g>
        </svg>
      )}
    </div>
  );
};