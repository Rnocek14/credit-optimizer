import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  pivotSource: string;
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

interface PivotRoadmapManagerProps {
  activePivotPaths: PivotPath[];
  onRoadmapStepsGenerated: (steps: PivotRoadmapStep[]) => void;
  visible: boolean;
  onToggleVisibility: () => void;
}

export const PivotRoadmapManager: React.FC<PivotRoadmapManagerProps> = ({
  activePivotPaths,
  onRoadmapStepsGenerated,
  visible,
  onToggleVisibility
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

      // Convert roadmap steps
      const roadmapSteps = (data.roadmaps.fastest_path?.steps || []).map((step: any, index: number) => ({
        id: `pivot_${pivotKey}_${index}`,
        title: step.title,
        description: step.description,
        skills_needed: step.skills_needed || [],
        skills_already_have: step.skills_already_have || [],
        estimated_time: step.estimated_time,
        estimated_cost: step.estimated_cost,
        learning_resources: step.learning_resources || [],
        pivotSource: pivot.new_career
      })) as PivotRoadmapStep[];

      setGeneratedRoadmaps(prev => new Map(prev).set(pivotKey, roadmapSteps));
      setExpandedPivots(prev => new Set(prev).add(pivotKey));
      
      // Send to parent component for integration
      onRoadmapStepsGenerated(roadmapSteps);
      
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
  }, [generatedRoadmaps, onRoadmapStepsGenerated]);

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
    
    // Update parent with remaining steps
    const remainingSteps: PivotRoadmapStep[] = [];
    generatedRoadmaps.forEach((steps, key) => {
      if (key !== pivotKey) {
        remainingSteps.push(...steps);
      }
    });
    onRoadmapStepsGenerated(remainingSteps);
  }, [generatedRoadmaps, onRoadmapStepsGenerated]);

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

  if (!visible) {
    return (
      <div className="fixed top-4 right-4 z-10">
        <Button
          onClick={onToggleVisibility}
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
        onClick={onToggleVisibility}
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
          <div className="text-xs text-muted-foreground space-y-1">
            <p>💡 <strong>Pivot Mode Active!</strong></p>
            <p>Click any skill in the tree to explore career pivot opportunities.</p>
            <p>Sample pivots will load automatically.</p>
          </div>
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
    </div>
  );
};