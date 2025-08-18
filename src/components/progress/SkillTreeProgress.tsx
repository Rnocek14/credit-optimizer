import React, { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { useCareerGraph } from '@/hooks/useCareerGraph';
import { UnifiedCareerCanvas } from '@/components/UnifiedCareerCanvas';
import { AchievementsRail } from './AchievementsRail';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Brain, Target, TrendingUp, AlertCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
// import SkillTreeHarness from "@/components/SkillTreeHarness";

export const SkillTreeProgress: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [progressData, setProgressData] = useState({
    completedCourses: 0,
    activeProjects: 0,
    totalXP: 0,
    criScore: 0
  });

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Get career readiness data
  const {
    criScore,
    userProgress,
    isLoading: criLoading,
    getReadinessLevel,
    markCompleted,
    markInProgress
  } = useCareerReadiness({
    userId: user?.id,
    enabled: !!user?.id
  });

  // Get unified career graph data
  const { 
    nodes: graphNodes, 
    edges: graphEdges,
    loading: graphLoading, 
    error: graphError,
    reload
  } = useCareerGraph();

  // 🧪 SKILL TREE DIAGNOSTIC - First render after data load
  React.useEffect(() => {
    if (graphNodes && graphEdges && !graphLoading) {
      console.log('🧪 ST DIAG', {
        nodesCount: graphNodes?.length,
        edgesCount: graphEdges?.length,
        sampleNode: graphNodes?.[0],
        sampleEdge: graphEdges?.[0],
        validNodes: Array.isArray(graphNodes) && graphNodes.every(n => n?.id && n?.type && n?.title),
        validEdges: Array.isArray(graphEdges) && graphEdges.every(e => e?.from_id && e?.to_id),
      });
    }
  }, [graphNodes, graphEdges, graphLoading]);

  console.log('🧩 SkillTreeProgress load', {
    nodes: graphNodes?.length, 
    edges: graphEdges?.length
  });

  const isLoading = criLoading || graphLoading;

  // Direct pass-through: let layout engine handle positioning
  const nodes = React.useMemo(() => {
    return Array.isArray(graphNodes) ? graphNodes : [];
  }, [graphNodes]);

  // Add canary node fallback when no data loads
  const SHOW_CANARY = (nodes?.length ?? 0) === 0 && !isLoading;
  const canaryNodes = SHOW_CANARY ? [{
    id: 'canary-node',
    type: 'skill' as const,
    position: { x: 100, y: 100 },  // ✅ Add required position for React Flow
    title: '👋 Canary Node - Data Loading Test',
    description: 'This node proves the canvas is working',
    data: {
      title: '👋 Canary Node - Data Loading Test',
      category: 'debug',
      'data-testid': 'skill-node',
      'data-node-type': 'skill',
      'data-node-id': 'canary-node',
    }
  }] : [];

  const renderNodes = SHOW_CANARY ? canaryNodes : nodes;

  // Direct pass-through for edges
  const edges = React.useMemo(() => {
    return Array.isArray(graphEdges) ? graphEdges : [];
  }, [graphEdges]);

  const renderEdges = SHOW_CANARY ? [] : edges;

  // Debug global bridge for console inspection
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__skillTreeDiag = {
        nodesCount: renderNodes?.length,
        edgesCount: renderEdges?.length,
        firstNode: renderNodes?.[0],
        firstEdge: renderEdges?.[0],
        isCanary: SHOW_CANARY,
        originalNodes: graphNodes?.length,
        originalEdges: graphEdges?.length,
      };
    }
  }, [renderNodes, renderEdges, SHOW_CANARY, graphNodes, graphEdges]);

  // Listen for real-time progress updates
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('progress-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_skill_progress'
        },
        (payload) => {
           console.log('📈 Progress update received:', payload);
           // Trigger re-fetch without full page reload - debounced
           setTimeout(() => reload(), 500);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_course_progress'
        },
        (payload) => {
          console.log('📚 Course progress update:', payload);
          toast.success('Course progress updated!');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Debug bridge for runtime diagnostics
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__skillTreeDiag = {
        nodesCount: nodes.length,
        edgesCount: edges.length,
        sampleNode: nodes[0],
        sampleEdge: edges[0],
        graphLoading: graphLoading,
        userProgress: userProgress?.length || 0
      };
      console.log('🔬 ST DEBUG BRIDGE', (window as any).__skillTreeDiag);
    }
  }, [nodes, edges, graphLoading, userProgress]);

  // Enhanced node click handler with deep linking
  const handleNodeClick = (node: any) => {
    console.log('🎯 Skill node clicked:', node);
    
    const skill = node.title || node.name;
    const nodeType = node.type || 'skill';
    
    // Show node tooltip or modal with actions
    if (nodeType === 'skill') {
      // Find courses action
      const findCoursesAction = () => {
        navigate(`/discover?skills=${encodeURIComponent(skill)}`);
      };
      
      // Plan project action  
      const planProjectAction = () => {
        navigate(`/plan?tab=proof&seed=${encodeURIComponent(skill)}`);
      };
      
      // Add to resume action
      const addToResumeAction = () => {
        navigate(`/progress?tab=resume&add=${encodeURIComponent(skill)}`);
      };

      // For now, show toast with actions - in real implementation would show modal
      toast.success(`${skill} selected`, {
        description: 'Click to explore actions',
        action: {
          label: 'Find Courses',
          onClick: findCoursesAction
        }
      });
    }
  };

  // Get CRI-based node styling
  const getNodeStyle = (nodeId: string) => {
    if (!criScore) return {};
    
    const readiness = getReadinessLevel(criScore.overall);
    
    // Apply tinting based on CRI level
    switch (readiness.level) {
      case 'Ready':
        return { backgroundColor: 'hsl(142 76% 36%)', opacity: 0.9 }; // Green tint
      case 'Nearly Ready':
        return { backgroundColor: 'hsl(43 96% 56%)', opacity: 0.8 }; // Yellow tint
      case 'In Progress':
        return { backgroundColor: 'hsl(221 83% 53%)', opacity: 0.7 }; // Blue tint
      case 'Getting Started':
        return { backgroundColor: 'hsl(25 95% 53%)', opacity: 0.6 }; // Orange tint
      default:
        return { backgroundColor: 'hsl(210 14% 53%)', opacity: 0.5 }; // Gray tint
    }
  };

  // Enhanced nodes with CRI styling and progress data
  const enhancedNodes = React.useMemo(() => {
    if (!renderNodes) return [];
    
    return renderNodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        style: getNodeStyle(node.id),
        criLevel: criScore ? getReadinessLevel(criScore.overall).level : 'Unknown',
        userProgress: userProgress?.find(p => p.skillId === node.id || p.stepId === node.id)
      }
    }));
  }, [renderNodes, criScore, userProgress, getReadinessLevel]);

  // Render meaningful empty state (not a blank canvas)
  if ((graphNodes?.length ?? 0) === 0 && !isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-6 text-center max-w-md">
          <CardContent className="space-y-4">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg">No skills to display</h3>
              <p className="text-sm text-muted-foreground">
                We couldn't load any skill nodes. Check active data in career_graph_nodes.
              </p>
            </div>
            <Button onClick={reload} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reload
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-6">
          <CardContent className="flex items-center gap-4">
            <Loader2 className="h-6 w-6 animate-spin" />
            <div>
              <p className="font-medium">Loading Skill Tree</p>
              <p className="text-sm text-muted-foreground">
                Fetching your progress and skill data...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (graphError) {
    return (
      <div className="flex items-center justify-center h-96">
        <Card className="p-6">
          <CardContent className="text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <p className="text-destructive mb-4">Error loading skill tree</p>
            <p className="text-sm text-muted-foreground mb-4">{graphError}</p>
            <Button onClick={reload} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reload
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const readiness = criScore ? getReadinessLevel(criScore.overall) : null;

  return (
    <div className="space-y-6" data-testid="skill-tree-canvas">
      {/* CRI Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Career Readiness</p>
                <p className="text-2xl font-bold">{criScore?.overall || 0}%</p>
                {readiness && (
                  <Badge variant="outline" className={readiness.color}>
                    {readiness.level}
                  </Badge>
                )}
              </div>
              <Brain className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Skills Completed</p>
                <p className="text-2xl font-bold">
                  {criScore?.breakdown?.completedSkills || 0}
                </p>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Growth Score</p>
                <p className="text-2xl font-bold">
                  {Math.round((criScore?.breakdown?.completedSkills || 0) / (criScore?.breakdown?.totalSkills || 1) * 100)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content: Skill Tree + Right Rail */}
      <div className="grid gap-6 lg:grid-cols-4">
        {/* Skill Tree Canvas */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Your Skill Journey</CardTitle>
              <CardDescription>
                Explore skills, track progress, and discover learning paths
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="min-h-[800px] h-[800px] relative">
                {/* 🧪 STEP 1: Harness mode - uncomment to test ReactFlow rendering */}
                {/* {typeof window !== 'undefined' && localStorage.getItem('ST_HARNESS') === '1' ? (
                  <SkillTreeHarness />
                ) : ( */}
                <ReactFlowProvider>
                  <UnifiedCareerCanvas
                    nodes={renderNodes}
                    edges={renderEdges || []}
                    onNodeClick={handleNodeClick}
                    layoutAlgorithm="semantic-hierarchy"
                    showPivotPaths={false}
                    focusMode={false}
                  />
                </ReactFlowProvider>
                {/* )} */}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Rail */}
        <div className="lg:col-span-1">
          <AchievementsRail />
        </div>
      </div>

      {/* Node Actions Help */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use Your Skill Tree</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="text-center p-3 border rounded-lg">
              <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
              <h4 className="font-medium mb-1">Click Skills</h4>
              <p className="text-xs text-muted-foreground">
                Explore courses, projects, and career paths
              </p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <Brain className="h-6 w-6 mx-auto mb-2 text-blue-500" />
              <h4 className="font-medium mb-1">Track Progress</h4>
              <p className="text-xs text-muted-foreground">
                See your CRI score and skill completion
              </p>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-green-500" />
              <h4 className="font-medium mb-1">Plan Growth</h4>
              <p className="text-xs text-muted-foreground">
                Discover next steps and opportunities
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};