import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LifePathCanvas from '@/components/lifePathGraph/LifePathCanvas';
import PathComparison from '@/components/lifePathGraph/PathComparison';
import PathfindingControls from '@/components/lifePathGraph/PathfindingControls';
import { useLifePathGraph } from '@/hooks/useLifePathGraph';
import { GraphNode, PathResult, ScoringConfig } from '@/types/lifePathGraph';
import { Route, MapPin, Clock, DollarSign, BookOpen, Target } from 'lucide-react';

export default function SkillTree3() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [activeGoal, setActiveGoal] = useState<string>('bachelor-cs');
  const [scoringConfig, setScoringConfig] = useState<ScoringConfig>({
    objectives: {
      time: { weight: 0.3, minimize: true },
      cost: { weight: 0.3, minimize: true },
      creditLoss: { weight: 0.2, minimize: true },
      difficulty: { weight: 0.1, minimize: true },
      roi: { weight: 0.1, maximize: true },
    },
    constraints: {
      maxCost: 50000,
      maxTime: 48, // months
    },
    userContext: {
      experienceLevel: 'intermediate',
      availableTime: 'part-time',
      riskTolerance: 'medium',
    },
  });

  const { 
    graph, 
    pathfindingResult, 
    loading, 
    error,
    findPaths,
    calculateCreditTransfer
  } = useLifePathGraph(activeGoal, scoringConfig);

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
  }, []);

  const handleFindPaths = useCallback(() => {
    if (activeGoal) {
      findPaths(activeGoal);
    }
  }, [activeGoal, findPaths]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Route className="w-6 h-6 text-primary" />
                Life Path Graph
              </h1>
              <p className="text-muted-foreground">
                Unified Career Pathfinding with Credit Transfer
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-primary/10">
                Phase 0 - Prototype
              </Badge>
              <Button onClick={handleFindPaths} disabled={loading}>
                {loading ? 'Computing...' : 'Find Optimal Paths'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Goal Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Career Goal</label>
                  <select 
                    value={activeGoal} 
                    onChange={(e) => setActiveGoal(e.target.value)}
                    className="w-full mt-1 p-2 border rounded-md bg-background"
                  >
                    <option value="bachelor-cs">Bachelor's in Computer Science</option>
                    <option value="associate-nursing">Associate's in Nursing</option>
                    <option value="certification-aws">AWS Cloud Certification</option>
                  </select>
                </div>
                
                <PathfindingControls 
                  config={scoringConfig}
                  onChange={setScoringConfig}
                />
              </CardContent>
            </Card>

            {/* Selected Node Details */}
            {selectedNode && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">{selectedNode.title}</CardTitle>
                  <Badge variant="secondary">{selectedNode.type}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4" />
                    {selectedNode.estimatedHours} hours
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4" />
                    ${selectedNode.cost.toLocaleString()}
                  </div>
                  {selectedNode.credits && (
                    <div className="flex items-center gap-2 text-sm">
                      <BookOpen className="w-4 h-4" />
                      {selectedNode.credits} credits
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4" />
                    {selectedNode.modality}
                  </div>
                  
                  {selectedNode.description && (
                    <p className="text-sm text-muted-foreground mt-3">
                      {selectedNode.description}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="graph" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="graph">Path Graph</TabsTrigger>
                <TabsTrigger value="comparison">Path Comparison</TabsTrigger>
                <TabsTrigger value="analysis">Analysis</TabsTrigger>
              </TabsList>

              <TabsContent value="graph" className="mt-6">
                <Card>
                  <CardContent className="p-0">
                    <LifePathCanvas
                      graph={graph}
                      pathfindingResult={pathfindingResult}
                      onNodeClick={handleNodeClick}
                      selectedNode={selectedNode}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="comparison" className="mt-6">
                {pathfindingResult && (
                  <PathComparison
                    result={pathfindingResult}
                    graph={graph}
                  />
                )}
              </TabsContent>

              <TabsContent value="analysis" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pathfindingResult && (
                    <>
                      <Card>
                        <CardHeader>
                          <CardTitle>Path Metrics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <div className="text-sm text-muted-foreground">Fastest Path</div>
                              <div className="font-semibold">{pathfindingResult.fastest.totalTime} months</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Cheapest Path</div>
                              <div className="font-semibold">${pathfindingResult.cheapest.totalCost.toLocaleString()}</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Credit Optimized</div>
                              <div className="font-semibold">{pathfindingResult.creditMaximized.creditLoss} credits lost</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Pareto Options</div>
                              <div className="font-semibold">{pathfindingResult.paretoFrontier.length} alternatives</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Recommendations</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div>
                              <div className="font-medium">{pathfindingResult.recommendations.primary.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {pathfindingResult.recommendations.reasoning}
                              </div>
                            </div>
                            
                            {pathfindingResult.ghostPaths.length > 0 && (
                              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                <div className="font-medium text-amber-800 dark:text-amber-200">
                                  Ghost Paths Detected
                                </div>
                                <div className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                                  {pathfindingResult.ghostPaths.length} alternative routes found with missing prerequisites
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}