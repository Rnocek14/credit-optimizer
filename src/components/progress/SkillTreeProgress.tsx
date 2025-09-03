import React, { useEffect, useState } from 'react';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { useCareerGraph } from '@/hooks/useCareerGraph';
import { SkillTreeEngine } from '@/components/unified/SkillTreeEngine';
import { AchievementsRail } from './AchievementsRail';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Target, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export const SkillTreeProgress: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [progressData, setProgressData] = useState({
    completedCourses: 0,
    activeProjects: 0,
    totalXP: 0,
    criScore: 0
  });

  // Calm mode feature flag from URL
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const calmEnabled = urlParams.get('st_calm') === '1';

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

  // 🔬 SURGICAL DIAGNOSTIC FLAGS
  const __forceCanary = !!(typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('st_canary'));
  const __slimMode = !!(typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('st_slim'));

  // 🐣 CANARY NODES (hard-coded test data)
  const canaryNodes = [{
    id: 'canary-progress',
    type: 'skill',
    position: { x: 200, y: 200 },
    title: 'Progress Canary',
    data: { title: 'Progress Canary', 'data-testid': 'skill-node' }
  }];

  // 📊 DATA GATING CHECKS
  console.log('[progress] query enable gates', {
    graphLoading,
    criLoading,
    userId: user?.id,
    hasUser: !!user?.id,
    graphError: !!graphError
  });

  // 🔄 RAW PIPELINE LOGS (right before engine)
  const nodesForEngine = __forceCanary ? canaryNodes : (graphNodes || []);
  const edgesForEngine = __forceCanary ? [] : (graphEdges || []);

  console.log('[progress→engine] raw', {
    canaryMode: __forceCanary,
    slimMode: __slimMode,
    nodesType: Array.isArray(graphNodes),
    nodesLen: graphNodes?.length ?? null,
    edgesType: Array.isArray(graphEdges),
    edgesLen: graphEdges?.length ?? null,
    finalNodesLen: nodesForEngine.length,
    finalEdgesLen: edgesForEngine.length
  });

  if (__forceCanary) {
    console.info('[progress] CANARY MODE', { active: true });
  }
  const statsComponent = (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Career Readiness</p>
              <p className="text-2xl font-bold">{criScore?.overall || 0}%</p>
              {criScore && (
                <Badge variant="outline" className={criScore ? getReadinessLevel(criScore.overall).color : ''}>
                  {criScore ? getReadinessLevel(criScore.overall).level : 'Unknown'}
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
  );

  return (
    <div className="h-[800px] min-h-[600px] w-full">
      <SkillTreeEngine
        nodes={nodesForEngine}
        edges={edgesForEngine}
        loading={isLoading}
        error={graphError}
        onNodeClick={handleNodeClick}
        onReload={reload}
        mode="progress"
        showStats={!__slimMode}
        showRightRail={!__slimMode}
        layoutAlgorithm={'semantic-hierarchy' as const}
        statsComponent={__slimMode ? undefined : statsComponent}
        rightRailComponent={__slimMode ? undefined : <AchievementsRail />}
        // Pass CRI data as enrichment props instead of node mutation
        criScore={criScore}
        userProgress={userProgress}
        getReadinessLevel={getReadinessLevel}
        // Calm mode configuration
        calmMode={calmEnabled}
      />
    </div>
  );
};