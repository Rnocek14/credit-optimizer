import React, { useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useCareerReadiness } from '@/hooks/useCareerReadiness';
import { useAICareerGraph } from '@/hooks/useAICareerGraph';
import { UnifiedCareerCanvas } from '@/components/UnifiedCareerCanvas';
import { AchievementsRail } from './AchievementsRail';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Brain, Target, TrendingUp } from 'lucide-react';
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

  // Get career graph data
  const { 
    nodes: aiNodes, 
    loading: graphLoading, 
    error: graphError,
    loadNodes 
  } = useAICareerGraph();

  // Transform AI nodes to match expected format
  const nodes = React.useMemo(() => {
    if (!aiNodes) return [];
    
    return aiNodes.map(node => ({
      id: node.id,
      type: node.node_type,
      title: node.title,
      name: node.title,
      data: {
        ...node,
        name: node.title,
        category: node.category || 'general',
        description: node.description || '',
        xpValue: node.estimated_time_hours || 0,
        difficultyLevel: node.difficulty_level || 1
      },
      position: { x: 0, y: 0 } // Will be calculated by layout algorithm
    }));
  }, [aiNodes]);

  // Load edges separately from career_graph_edges
  const [edges, setEdges] = useState([]);

  useEffect(() => {
    const loadEdges = async () => {
      if (!aiNodes?.length) return;
      
      const { data: edgeData, error } = await supabase
        .from('career_graph_edges')
        .select('*');
        // Removed is_validated filter since it's causing zero results
      
      if (error) {
        console.error('Error loading edges:', error);
        return;
      }

      const transformedEdges = edgeData.map(edge => ({
        id: edge.id,
        source: edge.from_id,
        target: edge.to_id,
        type: edge.edge_type,
        data: {
          ...edge,
          weight: edge.importance_weight || 1,
          confidence: edge.confidence_score || 0.8
        }
      }));

      setEdges(transformedEdges);
    };

    loadEdges();
  }, [aiNodes]);

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
          // Trigger re-fetch of progress data
          setTimeout(() => {
            // This will cause the useCareerReadiness hook to refetch
            window.location.reload();
          }, 500);
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

  // Enhanced nodes with CRI styling and progress data
  const enhancedNodes = React.useMemo(() => {
    if (!nodes) return [];
    
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        style: getNodeStyle(node.id),
        criLevel: criScore ? getReadinessLevel(criScore.overall).level : 'Unknown',
        userProgress: userProgress?.find(p => p.skillId === node.id || p.stepId === node.id)
      }
    }));
  }, [nodes, criScore, userProgress, getReadinessLevel]);

  const isLoading = criLoading || graphLoading;

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
            <p className="text-destructive mb-4">Error loading skill tree</p>
            <p className="text-sm text-muted-foreground mb-4">{graphError}</p>
            <Button onClick={() => window.location.reload()}>
              Reload
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const readiness = criScore ? getReadinessLevel(criScore.overall) : null;

  return (
    <div className="space-y-6">
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
              <div className="h-[600px] relative">
                <ReactFlowProvider>
                  <UnifiedCareerCanvas
                    nodes={enhancedNodes}
                    edges={edges || []}
                    onNodeClick={handleNodeClick}
                    layoutAlgorithm="semantic-hierarchy"
                    showPivotPaths={false}
                    focusMode={false}
                  />
                </ReactFlowProvider>
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