import React, { useState, useCallback, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Route, 
  Target, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  Zap,
  ArrowRight,
  BarChart3,
  Lightbulb,
  CheckCircle
} from 'lucide-react';
import { useCareerGraph } from '@/hooks/useCareerGraph';
import { usePivotRecommendations } from '@/hooks/usePivotRecommendations';

interface CareerPathfindingPanelProps {
  currentSkills: string[];
  targetRole?: string;
  selectedLocation?: string;
  onPathSelected?: (path: any) => void;
  onPivotSelected?: (pivot: any) => void;
}

export const CareerPathfindingPanel: React.FC<CareerPathfindingPanelProps> = ({
  currentSkills,
  targetRole,
  selectedLocation = 'united-states',
  onPathSelected,
  onPivotSelected
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [pathfindingCriteria, setPathfindingCriteria] = useState<'time' | 'cost' | 'difficulty' | 'roi'>('time');
  const [selectedFromSkill, setSelectedFromSkill] = useState<string>('');
  const [selectedToSkill, setSelectedToSkill] = useState<string>('');
  const [activeTab, setActiveTab] = useState('paths');

  // Career graph integration
  const { 
    nodes: graphNodes, 
    edges: graphEdges,
    findOptimalPaths,
    findPivotOpportunities,
    searchNodes,
    getNodesByType,
    loading: graphLoading,
    statistics
  } = useCareerGraph();

  // Pivot recommendations
  const { 
    data: pivotRecommendations, 
    isLoading: pivotLoading 
  } = usePivotRecommendations({
    current_career: targetRole || 'Software Developer',
    user_skills: currentSkills,
    preferred_locations: [selectedLocation],
    enabled: !!targetRole && currentSkills.length > 0
  });

  // Find skill nodes for dropdowns
  const skillNodes = useMemo(() => 
    getNodesByType('skill').filter(node => 
      node.title.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 10),
    [getNodesByType, searchQuery]
  );

  const jobNodes = useMemo(() => 
    getNodesByType('job').slice(0, 10),
    [getNodesByType]
  );

  // Calculate optimal paths
  const optimalPaths = useMemo(() => {
    if (!selectedFromSkill || !selectedToSkill || graphNodes.length === 0) {
      return [];
    }

    try {
      return findOptimalPaths('skill', selectedFromSkill, 'skill', selectedToSkill, pathfindingCriteria);
    } catch (error) {
      console.error('Error finding paths:', error);
      return [];
    }
  }, [selectedFromSkill, selectedToSkill, pathfindingCriteria, findOptimalPaths, graphNodes]);

  // Handle path selection
  const handlePathSelect = useCallback((path: any) => {
    if (onPathSelected) {
      onPathSelected(path);
    }
  }, [onPathSelected]);

  // Handle pivot selection
  const handlePivotSelect = useCallback((pivot: any) => {
    if (onPivotSelected) {
      onPivotSelected(pivot);
    }
  }, [onPivotSelected]);

  // Format time duration
  const formatDuration = (hours: number) => {
    if (hours < 24) return `${hours}h`;
    if (hours < 168) return `${Math.round(hours / 24)}d`;
    if (hours < 720) return `${Math.round(hours / 168)}w`;
    return `${Math.round(hours / 720)}mo`;
  };

  // Format cost
  const formatCost = (cost: number) => {
    if (cost === 0) return 'Free';
    if (cost < 1000) return `$${cost}`;
    return `$${(cost / 1000).toFixed(1)}k`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Statistics */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Route className="h-5 w-5" />
              Career Pathfinding
            </h3>
            <p className="text-sm text-muted-foreground">
              Find optimal learning paths and career transitions
            </p>
          </div>
          {statistics && (
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold">{statistics.totalNodes}</div>
                <div className="text-muted-foreground">Nodes</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{statistics.totalEdges}</div>
                <div className="text-muted-foreground">Connections</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{statistics.averageConnections.toFixed(1)}</div>
                <div className="text-muted-foreground">Avg Connections</div>
              </div>
            </div>
          )}
        </div>

        {/* Search and Criteria */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="search">Search Skills</Label>
            <Input
              id="search"
              placeholder="Type to search skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="criteria">Optimization Criteria</Label>
            <Select value={pathfindingCriteria} onValueChange={(value: any) => setPathfindingCriteria(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Fastest Path
                  </div>
                </SelectItem>
                <SelectItem value="cost">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Lowest Cost
                  </div>
                </SelectItem>
                <SelectItem value="difficulty">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Easiest Path
                  </div>
                </SelectItem>
                <SelectItem value="roi">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Best ROI
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="paths" className="flex items-center gap-2">
            <Route className="h-4 w-4" />
            Learning Paths
          </TabsTrigger>
          <TabsTrigger value="pivots" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Career Pivots
          </TabsTrigger>
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            AI Insights
          </TabsTrigger>
        </TabsList>

        {/* Learning Paths Tab */}
        <TabsContent value="paths" className="space-y-4">
          <Card className="p-4">
            <h4 className="font-medium mb-4">Path Builder</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="from-skill">From Skill</Label>
                <Select value={selectedFromSkill} onValueChange={setSelectedFromSkill}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select starting skill" />
                  </SelectTrigger>
                  <SelectContent>
                    {skillNodes.map(node => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="to-skill">To Skill</Label>
                <Select value={selectedToSkill} onValueChange={setSelectedToSkill}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select target skill" />
                  </SelectTrigger>
                  <SelectContent>
                    {skillNodes.map(node => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Optimal Paths Results */}
            {optimalPaths.length > 0 && (
              <div className="space-y-3">
                <h5 className="font-medium">Recommended Paths</h5>
                {optimalPaths.slice(0, 3).map((path, index) => (
                  <Card key={index} className="p-3 border border-muted hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        Path {index + 1} {index === 0 && "(Optimal)"}
                      </Badge>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(path.total_time_hours)}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {formatCost(path.total_cost)}
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3" />
                          {path.average_difficulty.toFixed(1)}/10
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {path.roi_score.toFixed(1)}x ROI
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      {path.nodes.slice(0, 5).map((node: any, nodeIndex: number) => (
                        <React.Fragment key={node.id}>
                          <span className="text-xs px-2 py-1 bg-muted rounded">
                            {node.title}
                          </span>
                          {nodeIndex < Math.min(4, path.nodes.length - 1) && (
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          )}
                        </React.Fragment>
                      ))}
                      {path.nodes.length > 5 && (
                        <span className="text-xs text-muted-foreground">
                          +{path.nodes.length - 5} more
                        </span>
                      )}
                    </div>
                    
                    <Button 
                      onClick={() => handlePathSelect(path)}
                      className="w-full"
                      variant={index === 0 ? "default" : "outline"}
                    >
                      Start This Path
                    </Button>
                  </Card>
                ))}
              </div>
            )}

            {selectedFromSkill && selectedToSkill && optimalPaths.length === 0 && !graphLoading && (
              <div className="text-center py-8 text-muted-foreground">
                <Target className="h-8 w-8 mx-auto mb-2" />
                <p>No direct path found between these skills.</p>
                <p className="text-sm">Try selecting different skills or check if they're connected.</p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Career Pivots Tab */}
        <TabsContent value="pivots" className="space-y-4">
          <Card className="p-4">
            <h4 className="font-medium mb-4">Career Transition Opportunities</h4>
            
            {pivotLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : pivotRecommendations && pivotRecommendations.length > 0 ? (
              <div className="space-y-3">
                {pivotRecommendations.map((pivot, index) => (
                  <Card key={index} className="p-3 border border-muted hover:border-primary/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium">{pivot.new_career}</h5>
                      <Badge>ROI {pivot.roi_score.toFixed(1)}x</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Shared Skills:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {pivot.shared_skills.slice(0, 3).map(skill => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {pivot.shared_skills.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{pivot.shared_skills.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Missing Skills:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {pivot.missing_skills.slice(0, 3).map(skill => (
                            <Badge key={skill} variant="outline" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {pivot.missing_skills.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{pivot.missing_skills.length - 3}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-3 text-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {pivot.estimated_time}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {pivot.estimated_cost}
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">
                      {pivot.reasoning}
                    </p>

                    <Button 
                      onClick={() => handlePivotSelect(pivot)}
                      className="w-full"
                      variant="outline"
                    >
                      Explore This Pivot
                    </Button>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2" />
                <p>No pivot opportunities found.</p>
                <p className="text-sm">
                  {!targetRole 
                    ? "Select a target role to see pivot recommendations."
                    : "Try adjusting your target role or current skills."
                  }
                </p>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card className="p-4">
            <h4 className="font-medium mb-4">AI-Powered Career Insights</h4>
            
            <div className="space-y-4">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Skills Mastered</span>
                  </div>
                  <div className="text-2xl font-bold">{currentSkills.length}</div>
                  <p className="text-xs text-muted-foreground">In your profile</p>
                </Card>
                
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Available Paths</span>
                  </div>
                  <div className="text-2xl font-bold">{optimalPaths.length}</div>
                  <p className="text-xs text-muted-foreground">To your goals</p>
                </Card>
                
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Career Options</span>
                  </div>
                  <div className="text-2xl font-bold">{pivotRecommendations?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">Pivot opportunities</p>
                </Card>
              </div>

              {/* Recommendations */}
              <div className="space-y-3">
                <h5 className="font-medium">Personalized Recommendations</h5>
                
                <Card className="p-3 border-l-4 border-l-blue-500">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Focus on High-Impact Skills</p>
                      <p className="text-xs text-muted-foreground">
                        Based on your career path, prioritize skills with the highest ROI and market demand.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-3 border-l-4 border-l-green-500">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Leverage Your Strengths</p>
                      <p className="text-xs text-muted-foreground">
                        You have {currentSkills.length} skills that can accelerate your learning in related areas.
                      </p>
                    </div>
                  </div>
                </Card>

                <Card className="p-3 border-l-4 border-l-purple-500">
                  <div className="flex items-start gap-2">
                    <Route className="h-4 w-4 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Consider Alternative Paths</p>
                      <p className="text-xs text-muted-foreground">
                        Multiple learning paths exist for your goals. Explore options that match your preferred timeline and budget.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};