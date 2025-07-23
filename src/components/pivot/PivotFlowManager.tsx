import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Route, Eye, EyeOff, X, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { PivotFlowVisualization } from './PivotFlowVisualization';

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

interface PivotFlowManagerProps {
  activePivotPaths: PivotPath[];
  visible: boolean;
  onToggleVisibility: () => void;
  className?: string;
}

export const PivotFlowManager: React.FC<PivotFlowManagerProps> = ({
  activePivotPaths,
  visible,
  onToggleVisibility,
  className = '',
}) => {
  const [generatedRoadmaps, setGeneratedRoadmaps] = useState<Map<string, PivotRoadmapStep[]>>(new Map());
  const [loadingPivots, setLoadingPivots] = useState<Set<string>>(new Set());
  const [expandedPivots, setExpandedPivots] = useState<Set<string>>(new Set());

  // Combine all roadmap steps for visualization
  const allRoadmapSteps = useMemo(() => {
    const steps: PivotRoadmapStep[] = [];
    generatedRoadmaps.forEach((roadmapSteps, key) => {
      console.log(`🔍 Adding roadmap steps for ${key}:`, roadmapSteps);
      steps.push(...roadmapSteps);
    });
    console.log(`🔍 Total allRoadmapSteps:`, steps.length, steps);
    return steps;
  }, [generatedRoadmaps]);

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

      console.log('🔍 Raw edge function response:', { data, error });

      if (error) {
        throw new Error(`Failed to generate roadmap: ${error.message}`);
      }

      if (!data.success || !data.roadmaps) {
        console.error('🔍 Invalid response structure:', data);
        throw new Error('Invalid roadmap response');
      }

      console.log('🔍 Roadmaps data:', data.roadmaps);
      console.log('🔍 Fastest path:', data.roadmaps.fastest_path);
      console.log('🔍 Steps:', data.roadmaps.fastest_path?.steps);

      // Convert roadmap steps
      const roadmapSteps = (data.roadmaps.fastest_path?.steps || []).map((step: any, index: number) => {
        console.log(`🔍 Processing step ${index}:`, step);
        return {
          id: `pivot_${pivotKey}_${index}`,
          title: step.title,
          description: step.description,
          skills_needed: step.skills_needed || [],
          skills_already_have: step.skills_already_have || [],
          estimated_time: step.estimated_time,
          estimated_cost: step.estimated_cost,
          learning_resources: step.learning_resources || [],
          pivotSource: pivot.new_career
        };
      }) as PivotRoadmapStep[];

      console.log('🔍 Converted roadmap steps:', roadmapSteps);

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
    <div className={`space-y-4 ${className}`}>
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Career Pivot Roadmaps</h2>
          <p className="text-sm text-muted-foreground">
            Visual progression paths for career transitions
          </p>
        </div>
        <Button
          onClick={onToggleVisibility}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <EyeOff className="w-4 h-4" />
          Hide
        </Button>
      </div>

      {/* Pivot Controls */}
      <div className="bg-muted/30 rounded-lg p-4 space-y-3">
        <h3 className="text-sm font-semibold">Available Pivot Paths</h3>
        
        {activePivotPaths.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <Route className="w-8 h-8 mx-auto text-muted-foreground" />
            <div>
              <p className="font-medium">🎯 Pivot Mode Active!</p>
              <p className="text-sm text-muted-foreground">
                Click any skill in the tree to explore career pivot opportunities.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activePivotPaths.map((pivot, index) => {
              const pivotKey = `${pivot.new_career}_${pivot.roi_score}`;
              const isLoading = loadingPivots.has(pivotKey);
              const hasRoadmap = generatedRoadmaps.has(pivotKey);
              const stepCount = generatedRoadmaps.get(pivotKey)?.length || 0;
              
              return (
                <div key={pivotKey} className="bg-background border rounded-lg p-3 space-y-3">
                  <div>
                    <h4 className="font-medium text-sm">{pivot.new_career}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        ROI {pivot.roi_score.toFixed(1)}x
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {pivot.estimated_time}
                      </Badge>
                      {hasRoadmap && (
                        <Badge className="text-xs">
                          {stepCount} steps
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    <p><strong>Missing:</strong> {pivot.missing_skills.slice(0, 2).join(', ')}</p>
                    <p><strong>Cost:</strong> {pivot.estimated_cost}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => generatePivotRoadmap(pivot)}
                      disabled={isLoading || hasRoadmap}
                      size="sm"
                      className="flex-1 gap-2"
                    >
                      {isLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : hasRoadmap ? (
                        <>Generated <ArrowRight className="w-3 h-3" /></>
                      ) : (
                        <>Generate Roadmap <RefreshCw className="w-3 h-3" /></>
                      )}
                    </Button>
                    
                    {hasRoadmap && (
                      <Button
                        onClick={() => removePivotRoadmap(pivotKey)}
                        variant="outline"
                        size="sm"
                        className="gap-2"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Flow Visualization */}
      <PivotFlowVisualization 
        pivotRoadmapSteps={allRoadmapSteps}
        className="min-h-[500px]"
      />
    </div>
  );
};