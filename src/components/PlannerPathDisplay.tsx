import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock, 
  DollarSign, 
  TrendingUp, 
  ArrowRight, 
  Brain, 
  Target,
  Plus,
  CheckCircle,
  List,
  Network,
  Heart
} from "lucide-react";
import { SemanticCareerCanvas } from "@/components/SemanticCareerCanvas";
import { useSemanticPlanning } from "@/hooks/useSemanticPlanning";
import { useSemanticVisualization } from "@/hooks/useSemanticVisualization";
import { SemanticNodeModal } from "@/components/modals/SemanticNodeModal";
import { PathComparisonModal } from "@/components/modals/PathComparisonModal";
import { ContextualAIAssistant } from "@/components/ContextualAIAssistant";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAnalytics } from "@/lib/analytics";
import type { LearningPath } from "@/hooks/useAIPlanningEngine";
import type { SemanticNode, SemanticPath, SubstitutionOption, PivotOpportunity } from "@/types/semantic";

interface PlannerPathDisplayProps {
  learningPaths: LearningPath[];
  loading: boolean;
  userId?: string;
}

export function PlannerPathDisplay({ learningPaths, loading, userId }: PlannerPathDisplayProps) {
  const [savingPaths, setSavingPaths] = useState<Set<string>>(new Set());
  const [selectedPathId, setSelectedPathId] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<SemanticNode | null>(null);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [currentPath, setCurrentPath] = useState<SemanticPath | null>(null);
  const { trackPlannerSetGoal } = useAnalytics();
  
  // Convert regular learning paths to enhanced format for semantic system
  const enhancedPaths = learningPaths.map(path => ({
    ...path,
    personalization_score: path.confidence_score || 0.75,
    time_feasibility: path.total_time < 100 ? 0.8 : path.total_time < 200 ? 0.6 : 0.4,
    budget_feasibility: path.total_cost < 500 ? 0.9 : path.total_cost < 1000 ? 0.7 : 0.5,
    location_relevance: 0.8, // Default - could be enhanced with location data
    semantic_substitutions: [],
    adapted_nodes: []
  }));
  
  const { semanticPaths } = useSemanticVisualization(enhancedPaths);
  
  const handleNodeClick = (nodeId: string) => {
    const path = semanticPaths.find(p => p.nodes.some(n => n.id === nodeId));
    const node = path?.nodes.find(n => n.id === nodeId);
    
    if (node && path) {
      setSelectedNode(node);
      setCurrentPath(path);
      setShowNodeModal(true);
    }
  };

  const handleSemanticNodeClick = (node: SemanticNode) => {
    const path = semanticPaths.find(p => p.nodes.some(n => n.id === node.id));
    if (path) {
      setSelectedNode(node);
      setCurrentPath(path);
      setShowNodeModal(true);
    }
  };
  
  const handleSubstitutionSelect = (substitution: SubstitutionOption) => {
    toast.success(`Alternative selected: ${substitution.title}`, {
      description: `${Math.round(substitution.substitution_score * 100)}% match confidence`
    });
  };
  
  const handlePivotSelect = (pivot: PivotOpportunity) => {
    toast.success(`Career pivot opportunity found!`, {
      description: `${Math.round(pivot.skill_overlap_percentage)}% skill overlap - ${pivot.estimated_timeline}`
    });
  };

  const handleComparePathsClick = () => {
    if (semanticPaths.length > 1) {
      setCurrentPath(semanticPaths[0]);
      setShowComparisonModal(true);
    }
  };

  const handleSelectPath = (path: SemanticPath) => {
    setSelectedPathId(path.id);
    setCurrentPath(path);
    setShowComparisonModal(false);
    toast.success(`Selected: ${path.title}`);
  };

  const handleNodeAction = (nodeId: string, action: string) => {
    toast.success(`${action} for node`);
  };

  const getPathTypeColor = (type: string) => {
    switch (type) {
      case 'fastest': return 'bg-primary/10 text-primary border-primary/20';
      case 'cheapest': return 'bg-green-500/10 text-green-700 border-green-500/20';
      case 'highest_roi': return 'bg-purple-500/10 text-purple-700 border-purple-500/20';
      case 'easiest': return 'bg-blue-500/10 text-blue-700 border-blue-500/20';
      default: return 'bg-secondary/10 text-secondary-foreground border-secondary/20';
    }
  };

  const getPathTypeIcon = (type: string) => {
    switch (type) {
      case 'fastest': return <Clock className="w-3 h-3" />;
      case 'cheapest': return <DollarSign className="w-3 h-3" />;
      case 'highest_roi': return <TrendingUp className="w-3 h-3" />;
      case 'easiest': return <Heart className="w-3 h-3" />;
      default: return null;
    }
  };

  const getPathTypeLabel = (type: string) => {
    switch (type) {
      case 'fastest': return '⚡ Fastest';
      case 'cheapest': return '💰 Cheapest';
      case 'highest_roi': return '🎯 Highest ROI';
      case 'easiest': return '💙 Easiest';
      default: return type.replace('_', ' ');
    }
  };

  const handleSetAsGoal = async (path: LearningPath) => {
    if (!userId) {
      toast.error("Please sign in to save goals");
      return;
    }

    setSavingPaths(prev => new Set(prev).add(path.id));

    try {
      // Create a career goal based on the learning path
      const goalTitle = `Become ${path.nodes.find(n => n.type === 'job')?.title || 'Target Role'}`;
      const goalDescription = `Learning path via ${path.path_type.replace('_', ' ')} route. ` +
        `Estimated time: ${path.total_time}h, Cost: $${path.total_cost}, ROI: ${(path.average_roi * 100).toFixed(0)}%`;

      const { error } = await supabase
        .from('career_goals')
        .insert({
          user_id: userId,
          title: goalTitle,
          description: goalDescription,
          target_role: path.nodes.find(n => n.type === 'job')?.title || null,
          active: true
        });

      if (error) throw error;

      // Track analytics
      trackPlannerSetGoal(userId, {
        target_job: path.nodes.find(n => n.type === 'job')?.title,
        path_type: path.path_type,
        total_time: path.total_time,
        total_cost: path.total_cost,
        average_roi: path.average_roi
      });

      toast.success("Goal saved successfully!", {
        description: "Added to your career goals"
      });
    } catch (error) {
      console.error("Error saving goal:", error);
      toast.error("Failed to save goal", {
        description: "Please try again"
      });
    } finally {
      setSavingPaths(prev => {
        const newSet = new Set(prev);
        newSet.delete(path.id);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <Card className="w-full h-96 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <div className="space-y-2">
            <p className="text-lg font-medium">🧠 AI is planning your path...</p>
            <p className="text-sm text-muted-foreground">
              Analyzing skills, courses, and market demand
            </p>
          </div>
        </div>
      </Card>
    );
  }

  if (learningPaths.length === 0) {
    return (
      <Card className="w-full h-96 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Brain className="w-16 h-16 mx-auto text-muted-foreground/50" />
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Ready to Plan Your Future?</h3>
            <p className="text-muted-foreground max-w-md">
              Enter your target job title to get personalized learning roadmaps 
              optimized for time, cost, and ROI.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">🚀 Your Learning Paths</h2>
          <p className="text-muted-foreground">
            AI-generated roadmaps optimized for your success
          </p>
          {semanticPaths.length > 1 && (
            <Button 
              variant="outline" 
              size="sm"
              className="mt-2"
              onClick={handleComparePathsClick}
            >
              Compare All Paths
            </Button>
          )}
        </div>
        <Badge variant="outline" className="text-sm">
          {learningPaths.length} paths found
        </Badge>
      </div>

      {/* View Toggle */}
      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="w-4 h-4" />
            List View
          </TabsTrigger>
          <TabsTrigger value="visual" className="flex items-center gap-2">
            <Network className="w-4 h-4" />
            Visual View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          {/* Learning Paths List */}
          <div className="space-y-4">
            {learningPaths.map((path) => (
              <Card key={path.id} className="border border-border/40 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  {/* Path Header */}
                  <div className="flex items-center justify-between mb-4">
                    <Badge className={`${getPathTypeColor(path.path_type)} text-sm font-medium`}>
                      {getPathTypeIcon(path.path_type)}
                      <span className="ml-1">{getPathTypeLabel(path.path_type)}</span>
                    </Badge>
                    
                     <div className="flex gap-4 text-sm">
                       <div className="flex items-center gap-1 text-muted-foreground">
                         <Clock className="w-4 h-4" />
                         <span className="font-medium">{path.total_time}h</span>
                       </div>
                       <div className="flex items-center gap-1 text-muted-foreground">
                         <DollarSign className="w-4 h-4" />
                         <span className="font-medium">${path.total_cost}</span>
                       </div>
                       <div className="flex items-center gap-1 text-muted-foreground">
                         <TrendingUp className="w-4 h-4" />
                         <span className="font-medium">{(path.average_roi * 100).toFixed(0)}%</span>
                       </div>
                       {path.confidence_score && (
                         <div className="flex items-center gap-1 text-green-600">
                           <CheckCircle className="w-4 h-4" />
                           <span className="font-medium">{(path.confidence_score * 100).toFixed(0)}%</span>
                         </div>
                       )}
                       {path.pivot_score && path.pivot_score > 0.6 && (
                         <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                           🔄 Pivot-Friendly
                         </Badge>
                       )}
                     </div>
                  </div>

                  {/* Path Flow */}
                  <div className="mb-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      {path.nodes.map((node, index) => (
                        <React.Fragment key={node.id}>
                          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-muted/40 border">
                            <div className="text-sm">
                              <div className="font-medium text-foreground">{node.title}</div>
                              <div className="text-xs text-muted-foreground capitalize flex items-center gap-1">
                                <span>{node.type}</span>
                                {node.estimated_time_hours > 0 && (
                                  <span>• {node.estimated_time_hours}h</span>
                                )}
                                {node.cost_estimate > 0 && (
                                  <span>• ${node.cost_estimate}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {index < path.nodes.length - 1 && (
                            <ArrowRight className="w-5 h-5 text-primary flex-shrink-0" />
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-between items-center">
                    <div>
                      <Button 
                        variant="outline" 
                        onClick={() => handleSetAsGoal(path)}
                        disabled={savingPaths.has(path.id)}
                        className="hover:bg-primary/10 hover:border-primary/30"
                      >
                        {savingPaths.has(path.id) ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2 animate-pulse" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Target className="w-4 h-4 mr-2" />
                            Set as Goal
                          </>
                        )}
                      </Button>
                    </div>
                    <div>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          import('@/state/transcriptStore').then(({ useTranscriptStore }) => {
                            const add = useTranscriptStore.getState().addEntry;
                            add({
                              title: (path as any).title || (path as any).nodes?.[0]?.title || 'Planned Step Completed',
                              skill_tags: ['Demo'],
                              cri_score: Math.round((path.average_roi || 0.75) * 10),
                              difficulty: 'intermediate',
                              instructor: 'Maya (demo)',
                              created_at: new Date().toISOString(),
                            });
                            import('sonner').then(({ toast }) => toast.success('Marked Step Complete (demo)'));
                          });
                        }}
                      >
                        Mark Step Complete (demo)
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="visual" className="mt-6">
          <div className="space-y-4">
            {semanticPaths.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-sm">
                  Select path to explore interactive features
                </Badge>
                {semanticPaths.map((path, index) => (
                  <Button
                    key={path.id}
                    variant={selectedPathId === path.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedPathId(path.id)}
                    className="text-xs"
                  >
                    Path {index + 1}: {getPathTypeLabel(learningPaths[index]?.path_type || 'standard')}
                  </Button>
                ))}
              </div>
            )}
            
            <Card className="h-[600px] overflow-hidden border border-border/40">
              <SemanticCareerCanvas
                paths={semanticPaths}
                selectedPathId={selectedPathId || semanticPaths[0]?.id}
                onNodeClick={handleSemanticNodeClick}
                onSubstitutionSelect={handleSubstitutionSelect}
                onPivotSelect={handlePivotSelect}
                showPersonalization={true}
                className="w-full h-full"
              />
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Enhanced Modals */}
      <SemanticNodeModal
        isOpen={showNodeModal}
        onClose={() => setShowNodeModal(false)}
        node={selectedNode}
        pathContext={currentPath || undefined}
      />

      <PathComparisonModal
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
        primaryPath={currentPath}
        alternatives={semanticPaths.filter(p => p.id !== currentPath?.id).slice(0, 2)}
        onSelectPath={handleSelectPath}
      />

      {/* Contextual AI Assistant */}
      <ContextualAIAssistant
        currentPath={currentPath}
        selectedNode={selectedNode}
        onNodeAction={handleNodeAction}
      />
    </div>
  );
}